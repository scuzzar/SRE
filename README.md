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

Das Orakel übernimmt die Rolle der Spielleitung. Es kombiniert Ideen aus zwei Systemen:

### Von Mythic übernommen
- **Ja/Nein-Fragen mit Wahrscheinlichkeiten** (Fate Chart / Fate Check), inklusive „Außergewöhnlich Ja/Nein“.
- **Chaosfaktor**, der steuert, wie unvorhersehbar die Geschichte verläuft.
- **Zufallsereignisse** mit Ereignisfokus, Aktion und Thema.
- **Szenenstruktur**: Erwartete Szene, veränderte Szene, unterbrochene Szene.
- **Listen** für Handlungsfäden (Threads) und Charaktere, aus denen Ereignisse gezogen werden.

### Vom Game Master's Apprentice übernommen
- **Ein Zug – viele Antworten**: Eine einzige Ziehung liefert gleichzeitig mehrere Informationen (Ja/Nein-Antwort, Ereignis, Inspirationswörter, Namen, Details), statt für jede Frage eine eigene Tabelle zu bemühen.
- **Inspirationsorientiert**: Kurze Stichworte, die zur Interpretation einladen, statt fester Ergebnisse.
- **Science-Fiction-Bezug**: Begriffe und Namen passend zum Traveller-Setting.

### Verzahnung mit den Regeln
- Orakelergebnisse können direkt Regelmechaniken auslösen (z. B. „Begegnung“ → Begegnungstabelle der aktuellen Welt, „Gefahr“ → Kampf).
- Der Kontext des Spiels (aktuelle Welt, Schiff, NSCs, Threads) fließt in die Ereignisse ein.

---

## Offene Fragen

Diese Punkte werden als Nächstes gemeinsam geklärt:

### UI
- Plattform: Web-App, Desktop-App, Mobile – oder alles über eine Web-App (PWA)?
- Aufbau: Journal-zentriert (Chat-/Logbuch-Stil) oder Dashboard mit Panels (Charakterbogen, Orakel, Karte, Schiff)?
- Wie werden Würfe und Orakelergebnisse dargestellt (animiert, als Karten, als Logeinträge)?

### Architektur
- Trennung von **Regel-Engine**, **Orakel-Engine** und **UI** als eigenständige Module?
- Regeln und Tabellen als **Daten** (z. B. JSON/YAML) statt fest im Code, damit Erweiterungen und Hausregeln leicht möglich sind?
- Speicherung: lokal (Datei, Browser-Speicher) oder mit Synchronisation?
- Technologie-Stack (z. B. TypeScript, Kotlin, Python …).

---

## Rechtlicher Hinweis

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Ken Wickham. Dieses Projekt ist ein inoffizielles Fan-Projekt; Lizenz- und Fair-Use-Bedingungen der jeweiligen Rechteinhaber werden vor einer Veröffentlichung geprüft.
