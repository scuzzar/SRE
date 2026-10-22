# UI-Entwurf (mobil, Version 1)

Klickbarer Entwurf der mobilen Oberfläche. Live ansehen: <https://claude.ai/artifact/Hr51NPBTQSkyHVm9wfyTgN> (privat, nur für Berechtigte).

## Dateien

| Datei | Inhalt |
|---|---|
| `Main.dc.html` | Die ganze App in einer Datei: Orakel-Screen (Log, Ja/Nein, Karte ziehen, 2W6, Stufenauswahl), Inspirationskarte mit Auswahl, Charakter-Screen mit Proben und Ergebnis-Popup |
| `Karte.dc.html` | Zeigt `Main` mit geöffneter Inspirationskarte und Beispielauswahl |
| `Charaktere.dc.html` | Zeigt `Main` im Charakter-Screen mit vorbereiteter Probe |
| `canvas.json` | Anordnung der drei Screens auf der Entwurfsfläche |

## Hinweise

- Die Dateien sind im *Design-Component-Format* (`.dc.html`) der Entwurfsfläche geschrieben. Sie brauchen deren Laufzeit (`support.js`) und lassen sich nicht direkt im Browser öffnen.
- Der Entwurf ist ein **Prototyp**, kein Produktivcode. Er zeigt Bedienung und Regeln; die Inhalte der Karte sind Platzhalter.
- Regeln und Begriffe stehen in der [Haupt-README](../../README.md) und im [GMA2e-Glossar](../gma2e-begriffe.md).
