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

## Deutung und Notiz (Entwurf vom 3. November 2026)

Im Ordner [`deutung/`](deutung/) liegt der (freigegebene und umgesetzte) Entwurf für Deutungen und Notizen im Log (siehe
*Deutungen und Notizen* im [Domänenmodell](../domain-model.md)).

| Datei | Inhalt |
|---|---|
| `deutung/Entwurf.html` | Orakel-Screen mit der Schreibzeile: ein Textfeld, der Knopf entscheidet, was der Text wird (Ja/Nein und Karte: Frage, *Deuten*: Deutung zum gold markierten Ergebnis, *Notiz*: freier Eintrag). Ergebnis antippen wählt das Ziel der Deutung; Deutungen stehen im Kasten ihres Ergebnisses; lange drücken löscht, ein Ergebnis mit seinen Deutungen |

Anders als die übrigen Entwürfe ist diese Datei eine gewöhnliche HTML-Datei mit den Stilen der App
und lässt sich direkt im Browser öffnen.

## Hinweise

- Die Dateien sind im *Design-Component-Format* (`.dc.html`) der Entwurfsfläche geschrieben. Sie brauchen deren Laufzeit (`support.js`) und lassen sich nicht direkt im Browser öffnen.
- Der Entwurf ist ein **Prototyp**, kein Produktivcode. Er zeigt Bedienung und Regeln; die Inhalte der Karte sind Platzhalter.
- Regeln und Begriffe stehen in der [Haupt-README](../../README.md) und im [GMA2e-Glossar](../gma2e-begriffe.md).

## Wurffelder der Karte (Entwurf vom 3. November 2026)

Im Ordner [`kartensymbol/`](kartensymbol/) liegt der Entwurf für die drei Wurffelder oben auf der
Inspirationskarte (siehe *Wurffelder der Karte* im [Domänenmodell](../domain-model.md)), noch nicht
freigegeben.

| Datei | Inhalt |
|---|---|
| `kartensymbol/Entwurf.html` | Glockenzahl 1–10 mit kleiner Glockenkurve, Streuwürfel als Windrose mit Pfeil (Volltreffer als Stern, Fehlschlag als roter Strich), Kartensymbol als Raum von oben mit Wegen nach N, O, S, W und Pfeilen nach oben und unten; Legende der Wegarten; Übernehmen zeigt, wie es im Log steht. „Neu ziehen“ würfelt mit den Gewichten aus dem Modell |

Wie der Entwurf zur Deutung ist es eine gewöhnliche HTML-Datei, die sich direkt im Browser öffnen lässt.
