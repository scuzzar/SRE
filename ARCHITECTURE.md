# Architektur

> **Stand: Umgesetzt für Version 1.** Dieses Dokument legt fest, wie der Code gebaut ist.

Die App ist eine Progressive Web App in **TypeScript** (Vite, React, Dexie für IndexedDB, Zod für
die Referenzdaten, Vitest und Playwright für Tests). Sie folgt **strikt MVC**: Model, View und
Controller sind getrennte Schichten mit festen Regeln, wer wen kennen darf.

Was das Model enthält, legt das [Domänenmodell](docs/domain-model.md) fest. Es führt; dieses Dokument
sagt nur, wo die Teile liegen und wie sie miteinander reden.

## Die vier Regeln

**1. Imports zeigen nur nach unten.** Jede Schicht darf nur aus den Schichten unter ihr importieren:

| # | Ordner | Schicht | Darf importieren aus |
|--:|---|---|---|
| 0 | `src/data/` | Referenzdaten: Tabellen als JSON, Schemas | — |
| 1 | `src/model/` | **Model**: der gespeicherte Stand des Domänenmodells und seine Regeln | `data` |
| 1a | `src/model/draft/` | **Model, Entwürfe**: `Card`, `Task`, `Attack`, `Wounding`, `WorldRoll`, `ShipEncounterCheck`; flüchtig, nie gespeichert | `data`, `model` |
| 2 | `src/platform/` | Was das Model von außen braucht: Speicher (Dexie), Zufall, Uhr, Schlüssel, Download, Sperre gegen ein zweites Fenster (Web Locks), OneDrive (MSAL und Microsoft Graph) | `model` ohne `draft` |
| 3 | `src/controller/` | **Controller**: eine Methode pro Absicht des Spielers | `model` mit `draft` |
| 4 | `src/view/` | **View**: React-Komponenten | `controller`, `model` mit `draft` (nur Typen) |
| 5 | `src/main.tsx` | Verdrahtung | alles |
| — | `src/service-worker.js` | Service Worker: legt die Dateien der App für offline ab, läuft im eigenen Kontext | nichts |

Plattform und Controller kennen sich nicht. Das Model definiert die Schnittstellen
(`CampaignRepository`, `Random`, `Clock`, `Keys`, `Download`, `WindowLock`, `Cloud`), `platform/` setzt sie um (Dexie,
`crypto.getRandomValues`, `Date`, `crypto.randomUUID`, ein Link mit `download`, die Web Locks API in
`platform/window-lock.ts`, OneDrive über MSAL
und Microsoft Graph in `platform/onedrive.ts`, die Client-ID in `platform/onedrive-config.ts`, zum
Ausprobieren die Probe-Wolke in `platform/probe-cloud.ts`), und `main.tsx` reicht die Umsetzungen in den Controller. Physische Würfel (später) sind eine
zweite Umsetzung von `Random`, die das Ergebnis vom Spieler erfragt.

Innerhalb des Models gilt dieselbe Richtung: `model/draft/` darf den gespeicherten Stand kennen, der
gespeicherte Stand nie `model/draft/`. Weil `platform/` nichts aus `model/draft/` importieren darf,
kann ein Entwurf gar nicht in den Speicher geraten.

**2. Der Controller nimmt jede Eingabe an.** Die View ruft für jede Eingabe genau eine
Controller-Methode auf (`src/controller/game.ts`), etwa `rollDice()`, `drawCard(question, forNote)`,
`fightAttack()`, `evade()`, `buy(item, count, character)` oder `travel()`. Der Controller entscheidet,
was daraus folgt:

- **Er ändert das Model**, als Einziger, und speichert den Spielstand über das Repository. Die Regeln
  selbst stehen im Model; der Controller ruft sie auf und reicht `Random` und `Clock` hinein. Was
  nach außen geht (Speicher, Download, OneDrive über `Cloud`), läuft über die Schnittstellen aus
  `model/ports.ts`; beim Abgleich sagt das Model, was zu tun ist (`planSync` in `model/sync.ts`), der
  Controller tut es.
- **Er hält, was flüchtig ist:** offene Karte, Probe, Angriff in Vorbereitung, Schaden beim Verteilen
  und Würfe der Weltenerschaffung sind Teil des Models (`model/draft/`), werden aber nicht gespeichert;
  sie liegen im Zustand des Controllers. Die Charaktererschaffung dagegen ist gespeicherter Stand: Sie
  hält nur die Würfe, alles andere spielt `replay` daraus nach (`model/career.ts`).
- **Er wählt, welche View zu sehen ist:** Grundkarte, Bereich und Unterreiter (`showScreen(screen)`),
  offene Blätter, Popups und Dialoge, die Stufe des Ziehblatts. Was das Gerät sich merken soll (offene
  Kampagne, Ziehblatt, eingeklappte Charakterleiste), speichert er über das Repository.
- **Er hält den Ablauf:** Steht nach einer Änderung ein anderer Charakter oben, endet die Probe; nach
  der Erschaffung geht es zum Log, wo der Neue oben steht. Was aus dem Model folgt (die Karte steht im
  Vordergrund, solange es eine offene `Card` gibt), braucht keinen eigenen Zustand.
- **Er meldet, was nicht ging** (`showError(error)`, `closeNotice()`): eine verletzte Regel
  (`DomainError`) mit ihrer Meldung, sonst „Das ging nicht: …“. `main.tsx` reicht ihm jeden Fehler,
  den sonst niemand auffängt (`error` und `unhandledrejection` am Fenster), damit eine Eingabe nie
  lautlos scheitert.

Die View liest eine gewählte Datei nur als Text ein und reicht ihn weiter; prüfen tut das Model
(`fromCampaignFile` in `model/campaign-file.ts`), anbieten zum Download der Controller über `Download`.
Wie die Bedienung aussieht, steht im [GUI-Handbuch](docs/gui-handbuch.md), nicht hier.

Die View sieht das Model nur lesend (`Readonly`-Typen); ein Schreibzugriff aus der View ist ein
Compilerfehler.

**3. Nach oben wird gemeldet, nicht gerufen.** Der Controller kennt keine Komponenten. Er wählt die
View, indem er seinen Zustand ändert, nicht indem er Komponenten aufruft. Er bietet
`subscribe(listener)` und `snapshot()` an: den Spielstand aus dem Model und seinen eigenen Zustand
(welcher Screen, ob das Popup offen ist, wessen Details aufgeklappt sind, ob die Charakterleiste eingeklappt ist, ob der Hinweis im Shop weggeklickt ist, ob die Charaktererschaffung im Vordergrund steht). Die View hängt sich mit `useSyncExternalStore` daran
und zeichnet neu, wenn sich etwas ändert. Das ist die einzige Verbindung von unten nach oben.

**4. Das Model ist frei von Seiteneffekten, die View frei von Regeln und Ablauf.**
- Das Model kennt kein DOM, keinen Speicher, kein `Math.random()` und kein `Date.now()`. Zufall und
  Uhr kommen als Schnittstellen herein (`Random`, `Clock`). So sind Tests deterministisch, und
  physische Würfel (später) sind nur eine weitere Zufallsquelle.
- Die View rechnet nichts aus, was eine Regel ist, und entscheidet nichts über den Ablauf. Welche
  Attribute wählbar sind, welcher DM gilt, was auf 2W6 nötig ist und wie wahrscheinlich das ist,
  liefert das Model über den Snapshot des Controllers. Die View hält nur, was reine Darstellung ist:
  die Anordnung von Feldern und Tafeln, den Text in Eingabefeldern während des Tippens, ob ein
  Löschen gerade bestätigt werden will, ob das Menü offen ist (`view/Menu.tsx`), wo die Charakterleiste beim
  Wischen gerade steht (`view/oracle/CharacterStrip.tsx` meldet dem Controller nur, bei welcher
  Karte sie liegen bleibt), das Erkennen von langem Drücken (auch der Knopf, der sich dabei füllt, `view/HoldButton.tsx`), die Scrollposition,
  Animationen und Vibration (`view/Dice.tsx`, `view/haptics.ts`), der Hinweis zum Installieren (`view/install.ts`). Eine Animation zeigt nur, was schon
  im Snapshot steht: Der Wurf ist geloggt, bevor die Würfel rollen. Sie darf den Aufruf des
  Controllers kurz aufschieben (die Karte gleitet hinaus, dann `confirmCard(question)`), aber nie ersetzen.
  Faustregel: Braucht der Controller es für eine Entscheidung, gehört es dem Controller.

## Wo was liegt

Je Fachbereich die wichtigsten Dateien. Allgemein: `model/campaign.ts` (die Kampagne, Charaktere,
UPP), `model/rules.ts` (Attribute, Würfe), `model/log.ts` (die Logeinträge), `model/reference.ts`
und `src/data/` (die Tabellen als JSON, Schemas in `data/schema.ts`), `model/errors.ts`
(`DomainError`). Den Snapshot für die View baut `controller/snapshot.ts`, aufbereitet je Bereich in
den `controller/*-view.ts`.

| Bereich | Model | Controller | View |
|---|---|---|---|
| Log und Orakel (Karte, 2W6, Probe, Notiz) | `log.ts`, `card-roll.ts`, `draft/card.ts`, `draft/task.ts`; Tabellen `data/mythic*.json`, `odds.json`, `event-focus.json` | `game.ts` | `oracle/` |
| Spielzeit | `time.ts` | `time-view.ts` | `oracle/OracleDock.tsx` |
| Begegnungen (Personen, Patron, Gerücht, Polizei) | `encounter.ts`, `encounter-check.ts`, `patron.ts`, `npcs.ts`; `data/encounters.json` | `game.ts` | `combat/EncounterScreen.tsx`, `EncounterDock.tsx`, `EncounterRollDialog.tsx` |
| Tiere (Tabellen, Ereignisse, Fallen, Beute) | `animals.ts`, `events.ts`, `hold.ts`, `loot.ts` | `game.ts` | `combat/LootDialogs.tsx` |
| Kampf (Angriff, Kampfsimulation, Wunden, Heilung) | `combat.ts`, `fight.ts`, `stamina.ts`, `wounds.ts`, `draft/attack.ts`, `draft/wounding.ts`; `data/weapons.json` | `game.ts` | `combat/CombatScreen.tsx`, `FightScreen.tsx`, `Arena.tsx` |
| Charaktere und Erschaffung | `campaign.ts`, `generation.ts`, `career.ts`, `npcs.ts`; `data/services.json`, `skills.json` | `generation-view.ts` | `characters/` |
| Shop, Kasse, Gepäck | `shop.ts`, `stash.ts`; `data/items.json` | `game.ts` | `shop/`, `characters/FundsScreen.tsx`, `StashPanel.tsx` |
| Missionen | `mission.ts` | `game.ts` | `missions/` |
| Subsektor, Welten, Sternsystem | `sector.ts`, `star-system.ts`, `draft/world-roll.ts`; `data/worlds.json`, `stars.json` | `world-view.ts` | `sector/SectorScreen.tsx`, `WorldSheet.tsx` |
| Globus und Orte | `surface-grid.ts`, `surface-map.ts`, `place.ts` | `globe-view.ts` | `sector/GlobeScreen.tsx`, `FieldDock.tsx`; gezeichnet mit WebGL 2 in `globe-gl.ts`, ohne auf dem Prozessor in `globe-render.ts` |
| Reisen (Sprung, im System, Fahrten über Land) | `travel.ts`, `system-journey.ts`, `voyage.ts`, `trip.ts`, `trip-encounter.ts`, `vehicle.ts`; `data/vehicles.json` | `trip-view.ts` | `sector/JourneySheet.tsx`, `SystemJourneySheet.tsx`, `TripPanels.tsx` |
| Schiff (Werft, Bewaffnung, Crew, Rechner, Kosten, Landung) | `ship.ts`, `armament.ts`, `crew.ts`, `software.ts`, `upkeep.ts`, `landing.ts`; `data/ships.json` | `ship-view.ts` | `ship/`, `sector/LandingSheet.tsx` |
| Raumflug und Raumkampf | `flight.ts`, `space-combat.ts`, `ship-encounter.ts`, `draft/ship-check.ts` | `space-view.ts`, `ship-check-view.ts` | `space/` (Raumkarte mit Canvas 2D in `SpaceScreen.tsx`) |
| Kampagnen, Datei, Abgleich | `campaign-file.ts`, `sync.ts`, `draft/conflict.ts`, `demo.ts`, `ports.ts` | `game.ts` | `CampaignSheet.tsx`, `Menu.tsx` |

Rahmen der View: `App.tsx` (Grundkarte, Ziehblatt, Desktop-Modus), `Tray.tsx` (Ziehblatt),
`SubTabs.tsx` (Unterreiter), `Dice.tsx` (Würfel), `game-context.tsx` (Anschluss an den Controller).

## Wie die Regeln geprüft werden

- **Imports:** eine ESLint-Regel (`import/no-restricted-paths`) mit einer Zone pro Zeile der Tabelle.
  Ein Import nach oben bricht `npm run lint`.
- **Schreibzugriffe:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` und
  `Readonly`-Typen für alles, was der Controller der View gibt.
- **Regeln und Ablauf:** Unit-Tests mit Vitest für Model und Controller, darunter die Beispiele aus
  der README (Kira, Jonas). Weil der Controller den Ablauf hält, lässt sich auch „wischen →
  Fertigkeit → Probe würfeln → Popup → weiter“ ohne Browser testen. Playwright prüft die Oberfläche bei 390 × 844.
- **Der Zufall in den GUI-Tests:** Gewürfelt wird nur über `crypto.getRandomValues`
  (`src/platform/random.ts`). Ein Test, dessen Ergebnis von einem Wurf abhängt, legt mit
  `wuerfelgleich(page)` aus `e2e/layout.ts` vor dem ersten `page.goto` eine gleichbleibende Zahlenfolge
  unter diese Eigenschaft und verlangt dann genau das Ergebnis dieses Wurfs, statt so lange zu
  würfeln, bis der Zufall mitspielt. Welche Welt entsteht, welche Tabellenzeile zieht und ob ein
  Schuss das fremde Schiff fallen lässt, steht damit für jeden Lauf fest; ein anderer Anfang der
  Folge (`wuerfelgleich(page, n)`) nimmt andere, aber wieder dieselben Würfe.

## Befehle

| Befehl | Was |
|---|---|
| `npm run dev` | Entwicklungsserver mit Neuladen |
| `npm run check` | Typecheck, Lint (mit den Schichtenregeln) und Unit-Tests |
| `npm run test:e2e` | GUI-Tests mit Playwright (baut vorher und startet `vite preview`); läuft nach jeder Änderung **lokal** und ist nicht Teil des CI-Jobs, der nur Typen, Schichten und Unit-Tests prüft (`.github/workflows/ci.yml`) |
| `npm run build` | Build für GitHub Pages nach `dist/` (relative Pfade, läuft in jedem Unterordner) |
| `npm run build:single` | Die ganze App als eine HTML-Datei nach `dist-single/index.html` |
| `npm run icons` | Die PNG-Icons in `public/` neu aus `public/icon.svg` rendern (nach jeder Änderung am Icon) |

**Deployment.** `.github/workflows/pages.yml` baut bei jedem Push auf `main` und veröffentlicht
`dist/` auf GitHub Pages. Einmalig nötig: in den Repo-Einstellungen unter *Pages* als Quelle
„GitHub Actions“ wählen. `.github/workflows/ci.yml` prüft jeden Pull Request (Check und GUI-Tests).

**Speicher.** `platform/repository.ts` öffnet IndexedDB über Dexie. Jede Kampagne liegt unter ihrer
Id; welche offen ist, steht daneben unter `settings`. Die eine Kampagne aus der Zeit vor mehreren
Kampagnen lag unter dem Schlüssel `current` und behält ihn als Id. Geht das nicht (privates
Fenster, eingebettete Vorschau, eine lokal geöffnete Datei auf manchen Handys), läuft die App mit
einem Speicher im Arbeitsspeicher weiter; ein Hinweis oben im Ziehblatt bzw. in der Seitenspalte und der
„Über“-Bildschirm sagen dann, dass nichts dauerhaft gespeichert wird. Läuft IndexedDB, bittet
`requestDurable()` den Browser, den Speicher dauerhaft zu halten (`navigator.storage.persist()`). Die
Antwort geht als Promise in den Controller und wartet nicht auf den Start, weil Firefox dafür den
Spieler fragt; der Snapshot meldet sie als `durable`, der „Über“-Bildschirm zeigt sie an.

**Ein Fenster schreibt.** Ist die App auf einem Gerät in zwei Fenstern offen (etwa installiert und
im Browser), überschrieben sich beide still den Spielstand. Darum hält das Fenster, das schreibt, eine
Sperre über die Web Locks API (`platform/window-lock.ts`, Schnittstelle `WindowLock`; beim Start
höchstens 1,5 Sekunden Warten, weil die alte Seite sie beim Neuladen erst kurz danach freigibt). Ein
zweites Fenster lädt nur, speichert und gleicht nichts ab und zeigt „In einem anderen Fenster offen“;
„Hier weiterspielen“ (`takeOver()`) nimmt dem ersten die Sperre, lädt den Spielstand neu und gleicht ab,
das erste zeigt dann dasselbe Fenster (Snapshot `elsewhere`). Ohne Web Locks (oder wenn der Browser sie
verweigert) und mit dem Speicher im Arbeitsspeicher schreibt jedes Fenster, wie bisher.

**Installieren und offline.** `public/manifest.webmanifest` macht die App installierbar, mit PNG-Icons
(192 und 512 px, eines maskierbar für Android) und `apple-touch-icon.png` für das iPhone; alle
entstehen mit `npm run icons` aus `icon.svg`. Beim normalen Build schreibt das Plugin `serviceWorker`
in `vite.config.ts` aus `src/service-worker.js` die Datei `dist/sw.js`, mit der Liste aller Dateien
des Builds und einer Version aus ihrem Inhalt; `main.tsx` registriert sie (nicht im
Entwicklungsserver und nicht in der Einzeldatei). Der Worker legt beim ersten Start alle Dateien ab
und liefert sie danach aus der Ablage. Beim Start fragt er zuerst das Netz nach einer neuen Version
(höchstens 3 Sekunden), sonst nimmt er die abgelegte; ein neuer Build ist also beim nächsten Start
mit Netz da. Die Schriften von Google Fonts legt er beim ersten Laden mit Netz ab; ohne sie greift
die Ersatzschrift. Spielstände berührt er nicht, die bleiben in IndexedDB.
