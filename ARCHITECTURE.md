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
| 1a | `src/model/draft/` | **Model, Entwürfe**: `Card`, `Task`; flüchtig, nie gespeichert | `data`, `model` |
| 2 | `src/platform/` | Was das Model von außen braucht: Speicher (Dexie), Zufall, Uhr, Download | `model` ohne `draft` |
| 3 | `src/controller/` | **Controller**: eine Methode pro Absicht des Spielers | `model` mit `draft` |
| 4 | `src/view/` | **View**: React-Komponenten | `controller`, `model` mit `draft` (nur Typen) |
| 5 | `src/main.tsx` | Verdrahtung | alles |

Plattform und Controller kennen sich nicht. Das Model definiert die Schnittstellen
(`CampaignRepository`, `Random`, `Clock`, `Download`), `platform/` setzt sie um (Dexie,
`crypto.getRandomValues`, `Date`, ein Link mit `download`), und `main.tsx` reicht die Umsetzungen in den Controller. Physische Würfel (später) sind eine
zweite Umsetzung von `Random`, die das Ergebnis vom Spieler erfragt.

Innerhalb des Models gilt dieselbe Richtung: `model/draft/` darf den gespeicherten Stand kennen, der
gespeicherte Stand nie `model/draft/`. Weil `platform/` nichts aus `model/draft/` importieren darf,
kann ein Entwurf gar nicht in den Speicher geraten.

**2. Der Controller nimmt jede Eingabe an.** Die View ruft für jede Eingabe genau eine
Controller-Methode auf. Der Controller entscheidet, was daraus folgt:

- **Er ändert das Model**, als Einziger, und speichert den Spielstand über das Repository:
  `askOracle(question)`, `rollDice()`, `drawCard(question)`, `togglePick(slot)`, `confirmCard()`,
  `discardCard()`, `deleteLogEntry(index)`, `setOdds(odds)`, `chooseCharacter(c)`,
  `chooseSkill(c, skill)`, `toggleCharacteristic(c)`, `rollTask()`; für Kampagnen
  `openCampaign(id)`, `createCampaign(name)`, `renameCampaign(name)`, `deleteCampaign(id)`,
  `exportCampaign(id)` und `importCampaign(text)`; für die Charaktererschaffung `openGeneration()`,
  `rollGeneration()`, `chooseService(id)`, `chooseSkillTable(id)`, `chooseCascade(skill)`,
  `reenlist(wants)`, `musterOut(kind)`, `finishGeneration(name)`, `discardGeneration()` und
  `restartGeneration()`. Die Erschaffung ist gespeicherter Stand (`model/generation.ts`,
  `model/career.ts`): Sie hält nur die Würfe, alles andere spielt `replay` daraus nach. Die View liest eine gewählte Datei nur als Text
  ein und reicht ihn weiter; prüfen tut das Model (`fromCampaignFile`), anbieten zum Download der
  Controller über `Download`. Offene Karte und Probe in Vorbereitung sind Teil des
  Models (`model/draft/`), werden aber nicht gespeichert.
- **Er wählt, welche View zu sehen ist**: Orakel- oder Charakter-Screen (`showScreen(screen)`), die
  Kampagnenwahl (`showCampaigns()`, `closeCampaigns()`) und das Ergebnis-Popup, und ob die Details des Charakters der Probe aufgeklappt sind (die Fertigkeit
  antippen startet eine Probe, ohne aufzuklappen; erst der Name klappt auf). Auch der Ablauf ist
  seine Sache, etwa „nach dem Ergebnis weiter im Charakter-Screen oder zum Orakel“ (`closeResult()`,
  `closeResultToOracle()`). Die Inspirationskarte steht im Vordergrund, solange es eine offene
  `Card` gibt; das folgt aus dem Model und braucht keinen eigenen Zustand.

Die View sieht das Model nur lesend (`Readonly`-Typen); ein Schreibzugriff aus der View ist ein
Compilerfehler.

**3. Nach oben wird gemeldet, nicht gerufen.** Der Controller kennt keine Komponenten. Er wählt die
View, indem er seinen Zustand ändert, nicht indem er Komponenten aufruft. Er bietet
`subscribe(listener)` und `snapshot()` an: den Spielstand aus dem Model und seinen eigenen Zustand
(welcher Screen, ob das Popup offen ist, ob die Details des Charakters der Probe aufgeklappt sind, ob die Charaktererschaffung im Vordergrund steht). Die View hängt sich mit `useSyncExternalStore` daran
und zeichnet neu, wenn sich etwas ändert. Das ist die einzige Verbindung von unten nach oben.

**4. Das Model ist frei von Seiteneffekten, die View frei von Regeln und Ablauf.**
- Das Model kennt kein DOM, keinen Speicher, kein `Math.random()` und kein `Date.now()`. Zufall und
  Uhr kommen als Schnittstellen herein (`Random`, `Clock`). So sind Tests deterministisch, und
  physische Würfel (später) sind nur eine weitere Zufallsquelle.
- Die View rechnet nichts aus, was eine Regel ist, und entscheidet nichts über den Ablauf. Welche
  Attribute wählbar sind, welcher DM gilt, was auf 2W6 nötig ist und wie wahrscheinlich das ist,
  liefert das Model über den Snapshot des Controllers. Die View hält nur, was reine Darstellung ist:
  die Anordnung von Feldern und Tafeln, den Text in Eingabefeldern während des Tippens, ob ein
  Löschen gerade bestätigt werden will, das Erkennen von langem Drücken, die Scrollposition,
  Animationen und Vibration (`view/Dice.tsx`, `view/haptics.ts`). Eine Animation zeigt nur, was schon
  im Snapshot steht: Der Wurf ist geloggt, bevor die Würfel rollen. Sie darf den Aufruf des
  Controllers kurz aufschieben (die Karte gleitet hinaus, dann `confirmCard()`), aber nie ersetzen.
  Faustregel: Braucht der Controller es für eine Entscheidung, gehört es dem Controller.

## Wie die Regeln geprüft werden

- **Imports:** eine ESLint-Regel (`import/no-restricted-paths`) mit einer Zone pro Zeile der Tabelle.
  Ein Import nach oben bricht `npm run lint`.
- **Schreibzugriffe:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` und
  `Readonly`-Typen für alles, was der Controller der View gibt.
- **Regeln und Ablauf:** Unit-Tests mit Vitest für Model und Controller, darunter die Beispiele aus
  der README (Kira, Jonas). Weil der Controller den Ablauf hält, lässt sich auch „Probe würfeln →
  Popup → weiter oder zum Orakel“ ohne Browser testen. Playwright prüft die Oberfläche bei 390 × 844.

## Befehle

| Befehl | Was |
|---|---|
| `npm run dev` | Entwicklungsserver mit Neuladen |
| `npm run check` | Typecheck, Lint (mit den Schichtenregeln) und Unit-Tests |
| `npm run test:e2e` | GUI-Tests mit Playwright (baut vorher und startet `vite preview`) |
| `npm run build` | Build für GitHub Pages nach `dist/` (relative Pfade, läuft in jedem Unterordner) |
| `npm run build:single` | Die ganze App als eine HTML-Datei nach `dist-single/index.html` |

**Deployment.** `.github/workflows/pages.yml` baut bei jedem Push auf `main` und veröffentlicht
`dist/` auf GitHub Pages. Einmalig nötig: in den Repo-Einstellungen unter *Pages* als Quelle
„GitHub Actions“ wählen. `.github/workflows/ci.yml` prüft jeden Pull Request (Check und GUI-Tests).

**Speicher.** `platform/repository.ts` öffnet IndexedDB über Dexie. Jede Kampagne liegt unter ihrer
Id; welche offen ist, steht daneben unter `settings`. Die eine Kampagne aus der Zeit vor mehreren
Kampagnen lag unter dem Schlüssel `current` und behält ihn als Id. Geht das nicht (privates
Fenster, eingebettete Vorschau), läuft die App mit einem Speicher im Arbeitsspeicher weiter; der
„Über“-Bildschirm sagt dann, dass nichts dauerhaft gespeichert wird.
