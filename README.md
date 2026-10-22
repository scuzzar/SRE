# Solo RPG Engine

Eine App für **Solo-Rollenspiel mit Classic Traveller**. Sie soll zwei Dinge in einem Werkzeug vereinen:

1. **Die Regeln von Classic Traveller** – vollständig implementiert, damit Würfe, Tabellen und Abläufe nicht mehr von Hand nachgeschlagen werden müssen.
2. **Ein Orakel**, das die Spielleitung ersetzt – angelehnt teils an **Mythic** (Mythic Game Master Emulator) und teils an den **Game Master's Apprentice (GMA)**.

> Status: Konzeptphase. Wir fangen klein an, mit einer **mobilen Version 1** (siehe [Version 1](#version-1-mobil)). Architektur und Technik sind noch offen (siehe [Offene Fragen](#offene-fragen)).

---

## Version 1 (mobil)

Die erste Version ist bewusst klein und **für das Smartphone** gebaut. Eine Desktop-Version ist später denkbar, hat aber keine Priorität.

**Hauptscreen (Orakel)**, klar und ohne Ablenkung. Aufbau wie ein Chat: oben der **Log**, der nach oben wächst (das Neueste steht unten, direkt über den Knöpfen). Unten, im Daumenbereich, sitzen fest **Orakel, „Karte ziehen“ und „2W6“**.
- **Optionale Frage**: Ein Fragefeld über den Knöpfen gilt für das Orakel **und** für die Karte. Die Frage wird mit der Antwort bzw. der Kartenauswahl im Log gespeichert.
- **Ja/Nein-Orakel** mit drei Stufen wie beim GMA: Gering (25 %), Mittel (50 %), Hoch (75 %).
- **Knopf „Karte ziehen“**: zieht eine Inspirationskarte im Aufbau des GMA2e (Zufallsereignis, Sinne, Szenentyp, Besitz, Situation, Namen, Merkmale, Flavortext). Die Karte landet **nicht direkt im Log**, sondern erscheint im Vordergrund:
  - Eine gestellte Frage steht oben auf der Karte.
  - Man tippt die Einträge an, die man nutzen will (**Mehrfachauswahl**, auch über mehrere Themen hinweg).
  - Unten bestätigt ein **Haken** die Auswahl: Nur die ausgewählten Einträge kommen in den Log.
  - Außerdem: Karte verwerfen oder neu ziehen.
- **Knopf „2W6“**: ein einfacher Würfelwurf durch die App.
- **Log**: Orakelantworten, Würfe und die ausgewählten Karteneinträge landen untereinander im Log, das neueste unten.

**Zweiter Screen: Charaktere**
- Karten für die **Spielercharaktere** mit UPP, Fertigkeiten, Ausrüstung, Credits und Notiz.

**Bewusst noch nicht in Version 1:** physisches Würfeln, Kampf, Welten- und Charaktererschaffung, Sektorkarte, Schiffe, NSC-Karten, Chaosfaktor.

---

## Ziele

- Eine komplette Solo-Kampagne in Classic Traveller spielen können, ohne einen Stapel Papiere neben dem Journal zu brauchen.
- Regeln und Orakel greifen ineinander: Das Orakel kennt den aktuellen Spielstand (Charaktere, Welt, Schiff, offene Handlungsfäden) und die Regel-Engine liefert die Würfe, wenn das Orakel eine Situation auslöst.
- **Echte Würfel bleiben erlaubt** (ab einer späteren Version): Wo man selbst würfeln will, gibt man das Ergebnis ein (siehe [Physische Würfel](#physische-würfel-später)).

### Was die App ersetzt und was nicht

Heute läuft eine Solo-Session auf Papier: ein Journal und daneben viele Karten. Die App ersetzt **die Karten**, nicht das Journal.

| Heute auf Papier | In der App |
|---|---|
| Indexkarten für SC und NSCs | Charakterkarten mit UPP, Fertigkeiten, Ausrüstung und Notizen. NSCs lassen sich aus Namen, Merkmalen und Besitz der Inspirationskarte anlegen. |
| Indexkarten für Schiffe | Schiffskarten mit Werten, Treibstoff, Fracht und Schäden |
| Karte für die Waffen-×-Rüstungs-Matrix | Fällt als Karte weg: Im Kampf rechnet die App den DM selbst aus Waffe und Rüstung |
| Sektorkarte | Interaktive Hex-Karte; ein Klick auf ein System öffnet die Planetenkarte |
| Planetenkarten | Weltkarten mit UWP im Klartext, Handelscodes, Raumhafen und Notizen |

**Journal:** Das erzählerische Journal bleibt vorerst **auf Papier**. Die App führt nur einen schlanken **Verlauf** aller Würfe, Orakelantworten und Ziehungen, damit man nachschlagen kann, was passiert ist. Der Verlauf kann als Markdown exportiert werden. Ein voller Journal-Editor kann später auf diesem Verlauf aufbauen.

### Physische Würfel (später)

Nicht in Version 1. Später gilt: Für **Weltenerschaffung**, **Charaktererschaffung** und **Kampf** muss man auf jeden Fall mit echten Würfeln spielen können:

- Jeder Wurf hat zwei Modi: **„App würfelt“** oder **„Ich würfle selbst“**. Die Voreinstellung lässt sich je Bereich festlegen.
- Beim eigenen Würfeln sagt die App genau an, was zu würfeln ist (z. B. „2W6, Ziel 8+, DM +2“). Man gibt die Augen ein, und die App rechnet DMs, Ergebnis und Folgen aus.
- Welten- und Charaktererschaffung laufen **Schritt für Schritt** ab, ein Wurf nach dem anderen, damit man jeden Wurf selbst machen kann.
- Im Verlauf ist vermerkt, ob ein Wurf von der App oder von Hand kam.

---

## Teil 1: Classic-Traveller-Regeln

Geplanter Umfang (Classic Traveller, Books 1–3 als Basis, Erweiterungen später):

| Bereich | Inhalt |
|---|---|
| **Charaktererschaffung** | Attribute (UPP), Dienstzweige, Musterung, Dienstzeiten, Überleben, Beförderung, Fertigkeiten, Altern, Ausmusterung und Abfindung |
| **Fertigkeiten & Würfe** | 2W6-Würfe mit DMs, Fertigkeitswürfe, Schwierigkeit nach Rule 68A (siehe [Proben und Schwierigkeit](#proben-und-schwierigkeit)) |
| **Persönlicher Kampf** | Reichweiten, Waffen- und Rüstungsmatrix, Schaden an Attributen, Bewusstlosigkeit, Tod |
| **Raumschiffe** | Schiffsdesign, Sprungantrieb, Treibstoff, Wartung, Raumkampf |
| **Handel & Spekulation** | Fracht, Passagiere, Post, spekulativer Handel |
| **Welten & Subsektoren** | Erzeugung von Welten (UWP), Raumhäfen, Basen, Handelscodes, Subsektorkarten |
| **Begegnungen** | Tierbegegnungen, Patrons, zufällige Begegnungen, Reaktionen von NSCs |
| **Ausrüstung** | Ausrüstungslisten, Preise, Tech Level |

### Proben und Schwierigkeit

**Grundlage in Classic Traveller:** Classic Traveller kennt keine feste Skala mit benannten Schwierigkeitsstufen. Die Standardprobe ist **2W6 + DMs, Erfolg bei 8+**. Die Schwierigkeit legt die Spielleitung über DMs fest (oder über einen anderen Zielwert). Benannte Stufen wie *Simple, Routine, Difficult, Formidable* kamen erst mit späteren Task-Systemen, vor allem MegaTraveller.

**Hausregel: Rule 68A.** Für Proben nutzt die App vorerst nur Rule 68A, einen verbreiteten Leitfaden aus der Classic-Traveller-Community. Das ist kein eigenes Task-System; die Regel hilft nur dabei, Zielwerte für normale CT-Würfe festzulegen. Der Name ist die hexadezimale Schreibweise von 6-8-10.

1. Grundstufe wählen: **Einfach 6+**, **Durchschnittlich 8+**, **Schwierig 10+**.
2. Bei Bedarf um **einen Punkt feinjustieren** (z. B. eine besonders harte schwierige Aufgabe: 11+).

Bei einer Probe kommen DMs aus Fertigkeiten und Attributen wie gewohnt dazu. Die Skala liegt als Daten vor und kann angepasst werden.

---

## Teil 2: Das Orakel

Das Orakel übernimmt die Rolle der Spielleitung. Es besteht aus zwei getrennten Werkzeugen:

1. **Ja/Nein-Orakel** (nach Mythic) für konkrete Fragen an die Geschichte.
2. **Inspirationskarte** (nach dem GM's Apprentice) für Prompts und Ideen, etwa für Aufträge, NSCs und Begegnungen.

### Ja/Nein-Orakel

- Der Spieler stellt eine Frage und wählt eine von **drei Wahrscheinlichkeitsstufen**, wie beim GMA: **Gering**, **Mittel**, **Hoch**.
- Die Antwort kommt aus Mythics **Fate Chart**. Sie hängt vom **Chaosfaktor** ab und kann „Außergewöhnlich Ja/Nein“ sowie **Zufallsereignisse** auslösen.

### Inspirationskarte

**Vorlage für Inhalt und Layout der Karte:** GameMaster's Apprentice, Second Edition (Base Deck). Die Kategorien auf Englisch und Deutsch stehen im Glossar [docs/gma2e-begriffe.md](docs/gma2e-begriffe.md).

Das Vorbild für Bedienung und Aufbau ist die Web-Umsetzung des Game Master's Apprentice von James Turner:
<https://jamesturneronline.net/game-masters-apprentice/>

Das Prinzip: **Ein Klick auf „Neu ziehen“ erzeugt alles auf einmal.** Danach liegt eine komplette „Karte“ vor dir. Du liest nur die Felder, die zu deiner aktuellen Situation passen, und ignorierst den Rest.

Die Karte ist vorerst **nur für Prompts** da. Ja/Nein-Antworten, Schwierigkeiten und Würfe gehören nicht auf die Karte.

**Aufbau nach GMA2e:** Inhalt und Layout folgen der Karte des GameMaster's Apprentice, Second Edition. Von oben nach unten (Begriffe siehe [Glossar](docs/gma2e-begriffe.md)):

| Bereich auf der Karte | Felder (einzeln antippbar) |
|---|---|
| Zufallsereignis | Verb · Adjektiv · Substantiv |
| Sinneseindrücke | Hören, Sehen, Fühlen, Riechen |
| Szenentyp | Eine Szenenidee |
| Besitz | Eine Kategorie mit drei Beispielen |
| Situation | Auslöser, Ort, Einsatz |
| Namen | Drei Vornamen |
| Merkmale | Tugend, Laster, Merkmal |
| Flavortext | Ein aufgeschnapptes Zitat |

Besitz und Situation stehen wie auf der GMA-Karte links, Namen und Merkmale rechts daneben.

**Themen-Reiter (vorläufig):** Unter der Karte hängen die Traveller-Reiter **Auftrag, NSC, Begegnung, Welt, Schiff, Handel**, deren Felder ebenfalls antippbar sind und mit in den Log gehen. Sie sollen später an einen anderen Ort in der App wandern; wohin, ist noch offen. Die Inhalte der App sind eigene Listen mit Traveller-Bezug, nicht die Texte des GMA-Decks.

**Noch nicht auf der Karte:** Chancen (dafür gibt es das eigene Ja/Nein-Orakel), Schwierigkeitsgenerator, Würfelrad, Impuls-Symbole, Kartensymbol, Kartennummer.

**Was sich gegenüber dem Vorbild ändert**

- **Kontext statt Leerlauf**: Ereignisse greifen auf die Listen der Kampagne zu (Threads, Charaktere, aktuelle Welt).
- **Verlauf**: Jeder Zug landet im Verlauf der App und kann von dort ins Papier-Journal übertragen werden. Im Original gibt es keinen Verlauf.
- **Direkter Regelbezug**: Felder wie „Situation“ oder „Merkmale“ können später direkt die passenden Traveller-Regeln aufrufen (z. B. einen NSC anlegen).

### Ideen aus den beiden Systemen im Detail

#### Von Mythic übernommen
- **Ja/Nein-Fragen über die Fate Chart**, beschränkt auf drei Stufen (Gering, Mittel, Hoch), inklusive „Außergewöhnlich Ja/Nein“.
- **Chaosfaktor**, der steuert, wie unvorhersehbar die Geschichte verläuft.
- **Zufallsereignisse** mit Ereignisfokus, Aktion und Thema.
- **Szenenstruktur**: Erwartete Szene, veränderte Szene, unterbrochene Szene.
- **Listen** für Handlungsfäden (Threads) und Charaktere, aus denen Ereignisse gezogen werden.

#### Vom Game Master's Apprentice übernommen
- **Ein Zug – viele Antworten**: Eine einzige Ziehung liefert gleichzeitig mehrere Prompts (Inspirationswörter, Ereignis, Namen, Details), statt für jede Idee eine eigene Tabelle zu bemühen.
- **Inspirationsorientiert**: Kurze Stichworte, die zur Interpretation einladen, statt fester Ergebnisse.
- **Science-Fiction-Bezug**: Begriffe und Namen passend zum Traveller-Setting.

#### Verzahnung mit den Regeln
- Orakelergebnisse können direkt Regelmechaniken auslösen (z. B. „Begegnung“ → Begegnungstabelle der aktuellen Welt, „Gefahr“ → Kampf).
- Der Kontext des Spiels (aktuelle Welt, Schiff, NSCs, Threads) fließt in die Ereignisse ein.

---

## Offene Fragen

Diese Punkte werden als Nächstes gemeinsam geklärt:

### UI
- **Entschieden: mobil zuerst.** Offen ist, ob als Web-App (PWA) oder als native App.
- Später: Wie gibt man physische Würfe am schnellsten ein (z. B. Würfelaugen antippen, Summe eintippen)?
- Später: Wie wächst die App über Version 1 hinaus, ohne den Hauptscreen zu überladen?
- Wohin wandern die Themen-Reiter (Auftrag, NSC, Begegnung, Welt, Schiff, Handel), die vorläufig unter der Karte hängen?

### Architektur
- Trennung von **Regel-Engine**, **Orakel-Engine** und **UI** als eigenständige Module?
- Regeln und Tabellen als **Daten** (z. B. JSON/YAML) statt fest im Code, damit Erweiterungen und Hausregeln leicht möglich sind?
- Speicherung: lokal (Datei, Browser-Speicher) oder mit Synchronisation?
- Technologie-Stack (z. B. TypeScript, Kotlin, Python …).

---

## Rechtlicher Hinweis

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Larcenous Designs, LLC; die Web-Version stammt von James Turner. Dieses Projekt ist ein inoffizielles Fan-Projekt; Lizenz- und Fair-Use-Bedingungen der jeweiligen Rechteinhaber werden vor einer Veröffentlichung geprüft.
