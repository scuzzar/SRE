# UI-Entwurf (mobil, Version 1)

Klickbarer Entwurf der mobilen Oberfläche. Live ansehen: <https://claude.ai/artifact/Hr51NPBTQSkyHVm9wfyTgN> (privat, nur für Berechtigte).

## Dateien

| Datei | Inhalt |
|---|---|
| `Main.dc.html` | Die ganze App in einer Datei: Orakel-Screen (Log, Ja/Nein, Karte ziehen, 2W6, Stufenauswahl), Inspirationskarte mit Auswahl, Charakter-Screen mit Proben und Ergebnis-Popup |
| `Karte.dc.html` | Zeigt `Main` mit geöffneter Inspirationskarte und Beispielauswahl |
| `Charaktere.dc.html` | Zeigt `Main` im Charakter-Screen mit vorbereiteter Probe |
| `canvas.json` | Anordnung der drei Screens auf der Entwurfsfläche |

## Charakter-Leiste (Entwurf vom 2. November 2026)

Im Ordner [`charakter-leiste/`](charakter-leiste/) liegt der Entwurf für den Orakel-Screen mit den
Charakteren oben. Live ansehen: <https://claude.ai/artifact/BKD1bwg72M83kKLxj4n75J> (privat, nur für
Berechtigte).

| Datei | Inhalt |
|---|---|
| `charakter-leiste/Main.dc.html` | Orakel-Screen mit Charakter-Leiste zum Wischen und Einklappen, Proben direkt dort (Fertigkeit antippen, Attribute dazu, „Probe würfeln“ statt „2W6“), Ergebnis-Popup, Menü ☰ statt ⓘ |
| `charakter-leiste/Menue.dc.html` | Zeigt `Main` mit offenem Menü: Kampagne (wechseln, neu, umbenennen, exportieren, importieren) und App (Installieren, Vibration, Über) |
| `charakter-leiste/Ohne-Charaktere.dc.html` | Zeigt `Main` ohne lebenden Charakter: oben nur „Charakter anlegen“ und „Nach Regeln erschaffen“ |
| `charakter-leiste/canvas.json` | Anordnung der drei Screens auf der Entwurfsfläche |

Mira Okonkwo ist nur für den Entwurf erfunden, damit man durch drei Charaktere wischen kann.

## Hinweise

- Die Dateien sind im *Design-Component-Format* (`.dc.html`) der Entwurfsfläche geschrieben. Sie brauchen deren Laufzeit (`support.js`) und lassen sich nicht direkt im Browser öffnen.
- Der Entwurf ist ein **Prototyp**, kein Produktivcode. Er zeigt Bedienung und Regeln; die Inhalte der Karte sind Platzhalter.
- Regeln und Begriffe stehen in der [Haupt-README](../../README.md) und im [GMA2e-Glossar](../gma2e-begriffe.md).
