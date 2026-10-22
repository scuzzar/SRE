# Solo RPG Engine

Eine App für **Solo-Rollenspiel mit Classic Traveller**. Sie soll zwei Dinge in einem Werkzeug vereinen:

1. **Die Regeln von Classic Traveller** – vollständig implementiert, damit Würfe, Tabellen und Abläufe nicht mehr von Hand nachgeschlagen werden müssen.
2. **Ein Orakel**, das die Spielleitung ersetzt – angelehnt teils an **Mythic** (Mythic Game Master Emulator) und teils an den **Game Master's Apprentice (GMA)**.

> Status: Konzeptphase. UI und Architektur sind noch offen (siehe [Offene Fragen](#offene-fragen)).

---

## Ziele

- Eine komplette Solo-Kampagne in Classic Traveller spielen können, ohne zwischen Regelbüchern, Orakeltabellen und Notizzetteln wechseln zu müssen.
- Regeln und Orakel greifen ineinander: Das Orakel kennt den aktuellen Spielstand (Charaktere, Welt, Schiff, offene Handlungsfäden) und die Regel-Engine liefert die Würfe, wenn das Orakel eine Situation auslöst.
- Alles, was passiert, landet in einem durchgehenden **Spieljournal**.

---

## Teil 1: Classic-Traveller-Regeln

Geplanter Umfang (Classic Traveller, Books 1–3 als Basis, Erweiterungen später):

| Bereich | Inhalt |
|---|---|
| **Charaktererschaffung** | Attribute (UPP), Dienstzweige, Musterung, Dienstzeiten, Überleben, Beförderung, Fertigkeiten, Altern, Ausmusterung und Abfindung |
| **Fertigkeiten & Würfe** | 2W6-Würfe mit DMs, Schwierigkeiten, Fertigkeitswürfe |
| **Persönlicher Kampf** | Reichweiten, Waffen- und Rüstungsmatrix, Schaden an Attributen, Bewusstlosigkeit, Tod |
| **Raumschiffe** | Schiffsdesign, Sprungantrieb, Treibstoff, Wartung, Raumkampf |
| **Handel & Spekulation** | Fracht, Passagiere, Post, spekulativer Handel |
| **Welten & Subsektoren** | Erzeugung von Welten (UWP), Raumhäfen, Basen, Handelscodes, Subsektorkarten |
| **Begegnungen** | Tierbegegnungen, Patrons, zufällige Begegnungen, Reaktionen von NSCs |
| **Ausrüstung** | Ausrüstungslisten, Preise, Tech Level |

---

## Teil 2: Das Orakel

Das Orakel übernimmt die Rolle der Spielleitung.

### Vorbild: GM's Apprentice (Web-Version)

Das Vorbild für Bedienung und Aufbau ist die Web-Umsetzung des Game Master's Apprentice von James Turner:
<https://jamesturneronline.net/game-masters-apprentice/>

Das Prinzip: **Ein Klick auf „Neu ziehen“ würfelt alles auf einmal.** Danach liegt eine komplette „Karte“ vor dir. Du liest nur die Felder, die zu deiner aktuellen Frage passen, und ignorierst den Rest.

Die Karte besteht aus zwei Bereichen.

**1. Kernbereich (immer sichtbar)**

| Feld | Inhalt |
|---|---|
| Ja/Nein-Orakel | Antworten für mehrere Wahrscheinlichkeiten gleichzeitig (im Original: Niedrig 25 %, Ausgeglichen 50 %, Hoch 75 %) |
| Schwierigkeit | Eine gezogene Schwierigkeitsstufe, wahlweise als Wahrscheinlichkeit für das Orakel oder als Zielwert für eine Probe (siehe [Schwierigkeit](#schwierigkeit)) |
| Wortgenerator | Verb, Adjektiv, Substantiv als Inspirations-Dreiklang |
| Ereignisgenerator (Mythic) | Fokus, Aktion, Thema |
| Sinneseindrücke | Geräusch, Anblick, Gefühl, Geruch |
| Symbole & Richtung | Streurichtung (für Treffer/Abweichung), Symbole als Interpretationshilfe |

**2. Themen-Reiter (Tabs)**

Im Original gibt es Reiter wie *Orakel, Quest, Dungeon, Falle, Wildnis, Stadt, NSC, Begegnung, Schatz*. Jeder Reiter zeigt zusätzliche, thematisch passende Ergebnisse, die bei jedem Zug ebenfalls neu erzeugt werden.

Für die Solo RPG Engine werden diese Reiter **auf Traveller übertragen**, zum Beispiel:

| Reiter | Inhalt |
|---|---|
| **Auftrag** | Auslöser, Ziel, Ort, Komplikation (Patron-Aufträge) |
| **NSC** | Name, Status/Beruf, Motivation, Aussehen, Persönlichkeit, Eigenart, Besitz |
| **Begegnung** | Reaktion (allgemein, Kampf, Handel, Hilfe, Information, Loyalität), Kampfaktion, Spielleiter-Zug |
| **Welt & Raumhafen** | Ort auf der Welt, Stimmung, Zwischenfall am Raumhafen, Gesetzesstufe-Ereignis |
| **Raumschiff** | Schiffsbegegnung, Störung/Wartungsproblem, Ereignis im Sprung |
| **Handel** | Marktlage, Händler-Eigenart, Komplikation beim Geschäft |
| **Wildnis** | Gelände, Tageszeit, Wetter, Gefahr |

### Was sich gegenüber dem Vorbild ändert

- **Mythic statt fester Prozentwerte**: Die Ja/Nein-Antworten kommen aus Mythics Fate Chart. Sie hängen vom **Chaosfaktor** ab und können „Außergewöhnlich Ja/Nein“ sowie **Zufallsereignisse** auslösen.
- **Kontext statt Leerlauf**: Ereignisse greifen auf die Listen der Kampagne zu (Threads, Charaktere, aktuelle Welt).
- **Journal**: Jeder Zug kann mit einem Klick ins Spieljournal übernommen werden. Im Original gibt es keinen Verlauf.
- **Direkter Regelbezug**: Felder wie „Begegnung“ oder „Reaktion“ können direkt die passenden Traveller-Regeln aufrufen.
- **Keine freien Würfel**: Die Würfelleiste des Vorbilds (W4 bis W100) entfällt. Würfe macht die Regel-Engine dort, wo eine Regel sie verlangt.

### Schwierigkeit

Die Schwierigkeit auf der Karte hilft, wenn man selbst nicht weiß, wie schwer etwas ist. Sie gilt **entweder** für eine Orakelfrage **oder** für eine Probe. Die Karte zeigt beide Lesarten an, und man nutzt die, die gerade passt.

**Grundlage in Classic Traveller:** Classic Traveller kennt keine feste Skala mit benannten Schwierigkeitsstufen. Die Standardprobe ist **2W6 + DMs, Erfolg bei 8+**. Die Schwierigkeit legt die Spielleitung über DMs fest (oder über einen anderen Zielwert). Benannte Stufen wie *Simple, Routine, Difficult, Formidable* kamen erst mit späteren Task-Systemen, vor allem MegaTraveller.

**Hausregel: Rule 68A.** Die App nutzt Rule 68A, einen verbreiteten Leitfaden aus der Classic-Traveller-Community. Das ist kein eigenes Task-System; die Regel hilft nur dabei, Zielwerte für normale CT-Würfe festzulegen. Der Name ist die hexadezimale Schreibweise von 6-8-10.

1. Grundstufe wählen: **Einfach 6+**, **Durchschnittlich 8+**, **Schwierig 10+**.
2. Bei Bedarf um **einen Punkt feinjustieren** (z. B. eine besonders harte schwierige Aufgabe: 11+).

Die Karte zieht Grundstufe und Feinjustierung. Für das Orakel wird jede Stufe auf Mythics Wahrscheinlichkeiten abgebildet:

| Stufe | Probe (2W6) | Orakel (Mythic) |
|---|---|---|
| Einfach −1 | 5+ | Fast sicher |
| Einfach | 6+ | Sehr wahrscheinlich |
| Einfach +1 / Durchschnittlich −1 | 7+ | Wahrscheinlich |
| Durchschnittlich | 8+ | 50/50 |
| Durchschnittlich +1 / Schwierig −1 | 9+ | Unwahrscheinlich |
| Schwierig | 10+ | Sehr unwahrscheinlich |
| Schwierig +1 | 11+ | Fast unmöglich |

Die Zuordnung zu Mythic ist eine eigene Ergänzung: Die sieben möglichen Zielwerte (5+ bis 11+) werden der Reihe nach auf die mittleren sieben Wahrscheinlichkeitsstufen der Mythic Fate Chart gelegt. „Sicher“ und „Unmöglich“ bleiben für Fragen, die man bewusst so einstuft.

Bei einer Probe kommen DMs aus Fertigkeiten und Attributen wie gewohnt dazu. Die Skala liegt als Daten vor und kann angepasst werden.

### Ideen aus den beiden Systemen im Detail

#### Von Mythic übernommen
- **Ja/Nein-Fragen mit Wahrscheinlichkeiten** (Fate Chart / Fate Check), inklusive „Außergewöhnlich Ja/Nein“.
- **Chaosfaktor**, der steuert, wie unvorhersehbar die Geschichte verläuft.
- **Zufallsereignisse** mit Ereignisfokus, Aktion und Thema.
- **Szenenstruktur**: Erwartete Szene, veränderte Szene, unterbrochene Szene.
- **Listen** für Handlungsfäden (Threads) und Charaktere, aus denen Ereignisse gezogen werden.

#### Vom Game Master's Apprentice übernommen
- **Ein Zug – viele Antworten**: Eine einzige Ziehung liefert gleichzeitig mehrere Informationen (Ja/Nein-Antwort, Ereignis, Inspirationswörter, Namen, Details), statt für jede Frage eine eigene Tabelle zu bemühen.
- **Inspirationsorientiert**: Kurze Stichworte, die zur Interpretation einladen, statt fester Ergebnisse.
- **Science-Fiction-Bezug**: Begriffe und Namen passend zum Traveller-Setting.

#### Verzahnung mit den Regeln
- Orakelergebnisse können direkt Regelmechaniken auslösen (z. B. „Begegnung“ → Begegnungstabelle der aktuellen Welt, „Gefahr“ → Kampf).
- Der Kontext des Spiels (aktuelle Welt, Schiff, NSCs, Threads) fließt in die Ereignisse ein.

---

## Offene Fragen

Diese Punkte werden als Nächstes gemeinsam geklärt:

### UI
- Plattform: Web-App, Desktop-App, Mobile – oder alles über eine Web-App (PWA)?
- Aufbau: Journal-zentriert (Chat-/Logbuch-Stil) oder Dashboard mit Panels (Charakterbogen, Orakel, Karte, Schiff)?
- Orakel: Die Darstellung ist durch das GMA-Vorbild gesetzt (eine Karte mit Kernbereich und Themen-Reitern). Offen ist, wie die Karte mit Journal und Charakterbogen auf einem Bildschirm zusammenspielt.

### Architektur
- Trennung von **Regel-Engine**, **Orakel-Engine** und **UI** als eigenständige Module?
- Regeln und Tabellen als **Daten** (z. B. JSON/YAML) statt fest im Code, damit Erweiterungen und Hausregeln leicht möglich sind?
- Speicherung: lokal (Datei, Browser-Speicher) oder mit Synchronisation?
- Technologie-Stack (z. B. TypeScript, Kotlin, Python …).

---

## Rechtlicher Hinweis

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Larcenous Designs, LLC; die Web-Version stammt von James Turner. Dieses Projekt ist ein inoffizielles Fan-Projekt; Lizenz- und Fair-Use-Bedingungen der jeweiligen Rechteinhaber werden vor einer Veröffentlichung geprüft.
