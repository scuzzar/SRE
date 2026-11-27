# Solo RPG Engine

Eine App für **Solo-Rollenspiel mit Classic Traveller**. Sie vereint zwei Dinge in einem Werkzeug:

1. **Die Regeln von Classic Traveller**, damit Würfe, Tabellen und Abläufe nicht mehr von Hand nachgeschlagen werden müssen.
2. **Ein Orakel**, das die Spielleitung ersetzt, angelehnt an **Mythic** (Mythic Game Master Emulator) und den **Game Master's Apprentice (GMA)**.

> Status: **Version 1 in Arbeit.** Gebaut für das Smartphone (nur Hochformat), ab 1024 px Breite mit einem **Desktop-Modus**. Umgesetzt sind Orakel und Proben, Charaktere mit Erschaffung nach den Regeln (18 Laufbahnen), NSC, Begegnungen, Kampf, Spielzeit, Reisen und Fahrten über die Oberfläche, Shop und Gruppenkasse, Subsektor mit Welten und Globus, Missionen sowie das Schiff mit Systemflug, Raumkampf und Handel.

## Wo was steht

Diese README sagt, **was die App können soll**. Wie es im Modell aussieht, mit allen Einzelheiten und Hausregeln, steht im Domänenmodell; es führt, der Code folgt.

| Dokument | Inhalt |
|---|---|
| [docs/domain-model.md](docs/domain-model.md) | Domänenmodell: Diagramm, Begriffe, allgemeine Regeln, was der Code noch nicht kann |
| [docs/modell/](docs/modell/) | Die Regeln des Modells je Bereich und der Verlauf der Freigaben |
| [docs/gui-handbuch.md](docs/gui-handbuch.md) | Bedienkonzept: Ziehblatt, Navigationsleiste, Aktionsleiste, Dialoge, Gesten, Farben |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technik, MVC-Aufbau, Schichten, Befehle |
| [AGENTS.md](AGENTS.md) | Wie an der App gearbeitet wird |
| [TODO.md](TODO.md) | Was als Nächstes ansteht |
| [docs/regeln-kampf.md](docs/regeln-kampf.md) | Regeln zu Kampf und Begegnungen, mit Stand in der App |
| [docs/regeln-laufbahnen.md](docs/regeln-laufbahnen.md) | Laufbahnen der Charakter- und NSC-Erschaffung |
| [docs/regeln-schiffe.md](docs/regeln-schiffe.md) | Schiffe, Crew, Computer, Raumkampf, Vektorbewegung |
| [docs/regeln-sternsystem.md](docs/regeln-sternsystem.md) | Sternsysteme nach Book 6 für die Raumkarte |
| [docs/gma2e-begriffe.md](docs/gma2e-begriffe.md) | Glossar der Inspirationskarte (GMA2e) |
| [docs/ui-entwurf](docs/ui-entwurf/), [docs/mock](docs/mock/) | Klickbare UI-Entwürfe |

---

## Version 1

### Bedienung: Die Karte führt

- Unter allem liegt die **Grundkarte**: der Globus der offenen Welt, beim Start der des Aufenthaltsorts. Weiter herausgezoomt (✕, −, Mausrad, zwei Finger) kommt man zum **Subsektor**.
- Auf dem Smartphone liegt unten ein **Ziehblatt** wie in einer Karten-App, mit vier Stufen (versteckt, eingeklappt, halb, voll) und der Navigationsleiste mit fünf Bereichen: **Log, Begegnung, Charaktere, Schiff, Missionen**.
- Ein angetipptes Feld des Globus zeigt, was dort ist und geschah, mit der Aktionsleiste **Hierhin reisen**, **Gruppe setzen**, **NSC platzieren** und **Einkaufen**.
- Im **Desktop-Modus** stehen dieselben Bereiche in einer Spalte links, die Karte füllt den Rest. Tastatur: K Karte, W Würfeln, N Notiz, T ein Tag, Ziffern für die Bereiche, Esc schließt. Wie die Oberfläche aufgebaut ist, steht im [GUI-Handbuch](docs/gui-handbuch.md).
- Das **Menü ☰** führt zu Kampagnen, Export und dem Bildschirm „Über“ (Installieren, Vibration, Quellen).

### Kampagnen und Speicherung

- Alles gehört zu genau einer **Kampagne**; man kann wechseln, umbenennen, anlegen, löschen, als JSON exportieren und importieren. Beim ersten Start gibt es eine **Demo-Kampagne** (zwei SC, eine fertige Welt, Startkapital).
- Gespeichert wird lokal; auf Wunsch gleicht die App die Kampagnen mit **OneDrive** ab, ohne Netz spielt man weiter. Bei einem Konflikt wählt man *Dieses Gerät*, *OneDrive* oder *Beide behalten*.
- Die App ist eine installierbare Web-App (PWA) und läuft nach dem ersten Start ohne Netz.

### Log und Orakel

- Der **Log** wächst wie ein Chat von unten; das Neueste steht groß da, Älteres als kompakte Zeile. Unten die Aktionsleiste **Notiz, Tag, 2W6, Karte** (Tag lässt einen Tag vergehen). Jedes Ergebnis lässt sich am Ergebnis selbst **deuten**, Notizen und Deutungen lassen sich ändern.
- Oben steht der **Charakter oben** mit UPP und Fertigkeiten; Wischen wechselt den Charakter.
- **Ja/Nein-Orakel** auf der Karte: ein Wurf, die Antwort für drei Stufen (Hoch 75 %, Mittel 50 %, Gering 25 %), sechs Antworten von **Ja!** bis **Nein!** nach Mythic.
- **Zufallsereignis** wie bei Mythic bei einem Pasch bis 55, mit Ereignisfokus; ein Handlungsfaden lost eine offene Mission aus.
- **Inspirationskarte** nach dem GMA2e: Man tippt an, was man nutzen will; nur das kommt in den Log (siehe [Das Orakel](#das-orakel)).
- **2W6** und **Proben**: „2W6“ im Log öffnet die Detailseite Probe mit allen Charakteren; Fertigkeit und passende Attribute antippen, dann würfelt einer der Knöpfe Leicht, Mittel oder Schwer. Lange gedrückt würfelt „2W6“ gleich (siehe [Proben](#proben-hausregel-nach-rule-68a)).
- Würfel und Karte sind kurz animiert, ein Tippen zeigt sofort das Ergebnis, dazu Vibration, wo das Gerät es kann.

### Charaktere und NSC

- **SC** mit UPP, Fertigkeiten, Besitz, Ausrüstung, Credits, Notiz und Lebenslauf. Man legt sie von Hand an oder **erschafft sie nach den Regeln**: Attribute, Heimatwelt, eine der **18 Laufbahnen** (sechs aus dem Regelwerk, zwölf aus Supplement 4), je Term Welt, Überleben, Rang, Fertigkeiten, Altern und Weiterverpflichtung, zuletzt die Abmusterung, Wurf für Wurf animiert. Lange drücken lässt die Erschaffung durchlaufen. Die Abmusterung kann ein Schiff bringen.
- **NSC** im Bereich Charaktere, nach Rolle gruppiert, vorgegeben die des Aufenthaltsorts. Neue NSC legt man leer an oder **erzeugt sie aus einer Laufbahn**, auf Wunsch mit festem **Dienstalter** (1 bis 7 Terms, ohne Tod); eine **Wartenscheibe** zählt die verworfenen Läufe. Erzeugte NSC bewaffnen sich nach Stand, TL und Gesetz ihrer Welt.
- **Gruppengepäck** mit Traglast: Am SC bleibt nur, was er ausgerüstet hat (Primär-, Sekundärwaffe, Rüstung); Ziehen verteilt die Stücke.
- **Gruppenkasse** mit Kassenbuch: Einnahme, Ausgabe, Einzahlung, Auszahlung; sie wird nie negativ.

### Begegnungen und Spielzeit

- Im Bereich Begegnung stehen die Würfe **Zufall, Tiere, Patron, Gerücht, Polizei**, jeder mit seinem **Test** nach der Encounter Checklist und einem Würfelbühne.
- **Zufallsbegegnungen** würfeln Art und Anzahl (W6, zum Ausgleich auch W4 oder W3); die NSC entstehen vollständig. **Tiere** kommen aus einer Tiertabelle je Welt und Gelände, mit Ereignissen und Rettungswürfen. Ein **Patron** lässt sich als NSC oder als Mission übernehmen; das **Gerücht** würfelt auf der Rumors Matrix; die **Polizei** prüft gegen das Gesetz.
- **Spielzeit** im Imperialen Kalender: **Tage vergehen**, **Woche beenden**; jeder Logeintrag trägt seinen Tag. Am Ende der Woche erinnert die App an fehlende Tests.
- **Beute**: Kredite und Ausrüstung besiegter NSC, Fleisch und Fell von Tieren.

### Kampf

- Ohne Begegnung zeigt der Kampf die **Waffentabelle** des Charakters oben: der nötige Wurf je Rüstung und Reichweite; ein Tippen greift an, danach würfelt man den Schaden.
- Mit Begegnung läuft die **Kampfsimulation**: SC und NSC in zwei Spalten, Entfernung in Range Bands je SC, Ausdauer, Parade, Feuerstoß und Schrot, Munition und Nachladen, Wunden an STR, DEX und END bis zum Tod.
- **Heilung** nach den Charts (Aufwachen, Behandlung, Ruhe). Besiegte NSC lassen sich als SC oder dauerhafte NSC **übernehmen**.
- Regeln und Stand im Einzelnen: [docs/regeln-kampf.md](docs/regeln-kampf.md).

### Reisen und Fahrten

- **Reisen** zu einer anderen Welt bis 2 Parsec mit High, Middle oder Low Passage (eine Woche; Low Passage mit Aufwachwurf und Low Lottery) oder mit dem **eigenen Schiff** nach seiner Sprungzahl und mit Treibstoff.
- **Fahrten über die Oberfläche**: Zu einem Feld des Globus schlägt die App Varianten vor wie eine Karten-App (zu Fuß, eigene oder gemietete Fahrzeuge, Linienflug, auch gemischt), mit Dauer und Miete. **Weiterfahren** fährt Tag für Tag, mit dem Begegnungstest des Tages.

### Shop

- Einkaufen geht in einer **Stadt** auf der Welt der Gruppe: Waffen, Rüstung, Fahrzeuge und Sonstiges bis zum TL der Welt, zu den Preisen der Charts; was das Gesetz der Welt verbietet, kauft man mit Warnung.
- Gekauft wird für den Charakter oben aus der Gruppenkasse; **Verkaufen** schlägt den halben Preis vor, nach Verhandlung änderbar.

### Subsektor und Welten

- Ein Subsektor aus 8 × 10 Feldern: **Vorkommen würfeln**, dann die **Weltenerschaffung** Wurf für Wurf (UWP, Basen, Gasriese, Temperatur, Handelscodes), dargestellt mit Weltsymbol.
- Jede Welt hat eine **Oberfläche** nach dem World Builder's Handbook und einen **Globus** mit Gelände, Städten und Wegen, dazu eine Notiz.

### Schiff

- Die **Werft** verkauft die neun Standardentwürfe bar oder mit Bankkredit; die Monatsrate geht von selbst von der Kasse ab.
- Das Schiff zeigt Treibstoff, Fracht, Kabinen, Antrieb, Hardpoints, Computer und Restschuld, dazu **Deckpläne** (eigene Bilder je Entwurf), **Crew** mit Posten und **Computer** mit Programmen.
- **Systemflug** auf der Raumkarte mit Vektorbewegung nach Mayday, Treibstoff schöpfen am Gasriesen, Landen.
- **Raumkampf** gegen ein fremdes Schiff mit Lasern, Trefferzonen und Schaden; Beiboote mit Launch und Andocken. Regeln und Stand: [docs/regeln-schiffe.md](docs/regeln-schiffe.md).

### Handel

- Mit dem eigenen Schiff an einem Raumhafen A–E: **spekulativer Handel** mit Waren- und Preiswürfen, **Fracht** zu mehreren Zielen, **zahlende Passagiere** (auch im Kälteschlaf mit Lotterie) und **Post**; Ladungen und Fahrgäste stehen im Laderaum des Schiffes.
- **Reisezonen** (Amber, Red) setzt man von Hand an der Welt. Regeln und Stand: [docs/regeln-handel.md](docs/regeln-handel.md).

### Missionen

- Aufträge und Ziele der Gruppe: offen, erledigt, gescheitert; mit Auftraggeber, freiem Text, **Orten** auf dem Globus und **Beteiligten** mit Etikett. Offene Missionen zeigen eine Fahne auf der Karte.

### Bewusst noch nicht in Version 1

Physisches Würfeln, Deckung, Moral und Drogen im Kampf, Psionik, Charter und Shuttles im Handel, Sprungrouten, ganze Sektoren, Raketen, Sand, Ortung und Entern im Raumkampf, eigene Schiffsentwürfe, Chaosfaktor, Szenen, Feinjustierung ±1, eigene Fertigkeiten, Hausregeln in der App einstellen. Was im Einzelnen fehlt, steht im Domänenmodell unter „Wo der Code noch nicht folgt“ und in den Regeldokus.

---

## Ziele

- Eine komplette Solo-Kampagne in Classic Traveller spielen können, ohne einen Stapel Papiere neben dem Journal.
- Regeln und Orakel greifen ineinander: Das Orakel kennt den Spielstand, die Regel-Engine liefert die Würfe.
- Die App ersetzt **die Karten**, nicht das Journal: Charakter-, Schiffs- und Weltkarten, Sektorkarte und Waffenmatrix. Das erzählerische Journal bleibt auf Papier; die App führt einen schlanken Verlauf, als Markdown exportierbar.
- **Echte Würfel** (später): Für Welten- und Charaktererschaffung und Kampf soll man selbst würfeln können. Die App sagt an, was zu würfeln ist, man gibt die Augen ein, und im Verlauf steht, ob ein Wurf von Hand kam.

---

## Proben (Hausregel nach Rule 68A)

Classic Traveller kennt keine feste Skala; die Standardprobe ist 2W6 + DMs, Erfolg bei 8+. Die App vereinheitlicht das nach **Rule 68A**:

> **2W6 + Fertigkeit + gewählte Attribute + sonstige DMs ≥ Zielwert**

| Stufe (Orakel) | Probe | Zielwert | Orakel (Chance auf Ja) |
|---|---|---|---|
| Hoch | Leicht | 6+ | 75 % |
| Mittel | Mittel | 8+ | 50 % |
| Gering | Schwer | 10+ | 25 % |

- **Fertigkeit:** + Stufe; Stufe 0 (Waffen, Jack-of-all-Trades) ±0; ohne Fertigkeit −3.
- **Attribute** wählt man je Probe dazu: 9+ → +1, 6–8 → ±0, 5− → −1; mehr als ±1 je Attribut gibt es nicht.
- Vor dem Wurf zeigt die App für jede Stufe, was auf 2W6 nötig ist und wie wahrscheinlich das ist; die Stufe wählt man mit dem Knopf, der würfelt.

**Beispiele** (Kira, UPP 7A8975; Jonas, UPP 687A88):

| Situation | Zielwert | DMs | Braucht auf 2W6 |
|---|---|---|---|
| Kira fliegt ein Stunt-Manöver | Schwierig 10+ | Pilot +2, DEX A +1 | 7+ (58 %) |
| Jonas (ohne Pilot) im selben Manöver | Schwierig 10+ | ohne Fertigkeit −3, DEX 8 ±0 | 13+ (unmöglich) |

---

## Das Orakel

Das Orakel übernimmt die Rolle der Spielleitung, mit zwei Werkzeugen:

- **Ja/Nein-Orakel** nach Mythics **Fate Chart**, vorerst fest bei Chaosfaktor 5, mit „Außergewöhnlich Ja/Nein“ (**Ja!**, **Nein!**) und den gespiegelten **Ja?** und **Nein?** (Hausregel). Die Tabelle steht im Domänenmodell unter *Orakel auf der Karte*.
- **Inspirationskarte** nach dem **GameMaster's Apprentice, Second Edition**, mit der [Web-Umsetzung von James Turner](https://jamesturneronline.net/game-masters-apprentice/) als Vorbild: Ein Zug liefert alles auf einmal (Zufallsereignis, Sinneseindrücke, Namen, Wurffelder, Themen-Tafeln mit Mythics Elements-Tabellen); man liest nur, was passt. Die Inhalte sind eigene Listen mit Traveller-Bezug, nicht die Texte des GMA-Decks; Ausnahmen kommen aus Mythic GME 2e. Begriffe im [Glossar](docs/gma2e-begriffe.md).

Von **Mythic** übernommen: Ja/Nein-Fragen in drei Stufen, Zufallsereignisse mit Fokus, später Chaosfaktor, Szenen und Listen für Handlungsfäden. Vom **GMA** übernommen: ein Zug, viele Antworten; kurze Stichworte statt fester Ergebnisse. Dazu die **Verzahnung mit den Regeln**: Orakel und Karte kennen den Spielstand, und ein Ergebnis kann Regeln auslösen (Begegnung, Kampf, NSC anlegen).

---

## Offene Fragen

- Wie gibt man physische Würfe am schnellsten ein (Augen antippen, Summe eintippen)?
- Wie wächst die App über Version 1 hinaus, ohne den Hauptscreen zu überladen?
- Wohin wandern die Themen-Tafeln (NSC, NSC-Aktionen, Welt, Wesen, Handlung), die vorläufig unter der Karte stehen?

**Entschieden:** mobil zuerst als PWA (eine native App ist später über Capacitor möglich); domänengetrieben; klassisches MVC mit Regel-Engine und Orakel im Model; Regeln und Tabellen als Daten (JSON); Speicherung lokal (IndexedDB) mit Export, Import und OneDrive-Abgleich; TypeScript mit Vite, React und Dexie.

---

## Rechtlicher Hinweis

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mongoose Traveller ist ein Produkt von Mongoose Publishing. Das World Builder's Handbook ist ein Produkt von Digest Group Publications. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Larcenous Designs, LLC; die Web-Version stammt von James Turner. Dieses Projekt ist ein inoffizielles Fan-Projekt und wird kostenlos angeboten.

Was das für die Inhalte der App heißt (Stand der Prüfung: Oktober 2026; keine Rechtsberatung):

| Quelle | Was wir übernehmen dürfen | Bedingungen |
|---|---|---|
| **Mythic** (Word Mill Games, Tana Pigeon) | Den **Text** von Mythic GME 2e und weiteren Mythic-Produkten, auch die Tabellen (Fate Chart, Zufallsereignisse, Bedeutungstabellen); Übersetzen und Anpassen ist erlaubt. | Lizenz [CC BY-NC](https://wordmillgames.com/license.html): nicht kommerziell, Quellenangabe (Produkt, Autorin, Link zu Word Mill Games), Hinweis auf Änderungen, nicht als „offiziell“ ausgeben. Grafik und Gestaltung der Bücher sind nicht abgedeckt. Die Mythic-Daten behalten diese Lizenz, auch wenn der Code eine andere hat. In der App sind das die Einträge `*.mythic.*` in `src/data/sections.json`, alles in `src/data/mythic-tables.json` und der Ereignisfokus in `src/data/event-focus.json`. |
| **Game Master's Apprentice** (Larcenous Designs) | Nur den **Aufbau** der Karte (Bereiche und Felder). | Die Karteninhalte sind geschützt und nur mit Erlaubnis von Larcenous Designs nutzbar. Bis dahin füllen wir die Felder mit eigenen Einträgen. |
| **Classic Traveller** (Far Future Enterprises) | Die **Mechanik**: Würfe, DMs, Abläufe als Programm. | Nach der Fan-Policy von FFE: kostenlos, Copyright- und Markenhinweis in der App, Regeltexte nicht über etwa eine Seite hinaus abschreiben. Vor einer Veröffentlichung die aktuelle Policy prüfen. |
| **Mongoose Traveller 2e** (Mongoose Publishing) | Nur die **Mechanik** einzelner Regeln, zurzeit die Temperatur einer Welt und ihr Malus auf die Hydrographie (Core Rulebook S. 251–252). | Fair-Use-Policy für Traveller: kostenlos, nicht kommerziell; eigene deutsche Texte statt Übersetzung des Regeltexts, keine Bilder aus den Büchern. Quelle auf dem „Über“-Bildschirm nennen. Vor einer Veröffentlichung den aktuellen Wortlaut der Policy prüfen. |
| **World Builder's Handbook** (Digest Group Publications, 1989, für MegaTraveller) | Nur die **Mechanik** der Oberfläche einer Welt (Wasseranteil, Platten, Kontinente und Ozeane, einheimisches Leben; S. 68–70). | Die Rechte an den DGP-Büchern sind ungeklärt; deshalb nur Würfe und Tabellenwerte als Daten, eigene deutsche Texte, keine Bilder, Quelle auf dem „Über“-Bildschirm. Vor einer Veröffentlichung klären, wer die Rechte hält. |

Die Quellenangaben stehen schon in Version 1 in der App, auf einem „Über“-Bildschirm.
