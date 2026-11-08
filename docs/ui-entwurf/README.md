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

## Wurffelder und Namen (Entwurf vom 3. November 2026, freigegeben und umgesetzt)

Im Ordner [`kartensymbol/`](kartensymbol/) liegt der Entwurf für die drei Wurffelder oben auf der
Inspirationskarte (siehe *Wurffelder der Karte* im [Domänenmodell](../domain-model.md)). In der
App stehen die Wurffelder knapper (Bild links, Beschriftung rechts), damit alle Tafeln auf einen
Bildschirm passen; die Namenswahl zeigt Vor- und Nachnamen getrennt.

| Datei | Inhalt |
|---|---|
| `kartensymbol/Karte.html` | Die ganze Inspirationskarte der App mit allem zusammen: Wurffelder unter den Sinneseindrücken (wo bisher die Namen standen), die sechs Namen oben auf der Tafel NSC (erste Reihe irdisch, zweite spacig, je weiblich, männlich, neutral), *Handlung* ohne Gegenstand und Fund. Gebaut aus der echten Karte mit den Stilen der App; Antippen wählt aus, „Neu ziehen“ würfelt Wurffelder und Namen neu |
| `kartensymbol/Entwurf.html` | Glockenzahl 1–10 mit kleiner Glockenkurve, Streuwürfel als Windrose mit Pfeil (Volltreffer als Stern, Fehlschlag als roter Strich), Kartensymbol als Raum von oben mit Wegen nach N, O, S, W und Pfeilen nach oben und unten; Legende der Wegarten; Übernehmen zeigt, wie es im Log steht. „Neu ziehen“ würfelt mit den Gewichten aus dem Modell; auf der Tafel NSC die sechs Namen (oben irdisch, unten spacig); „Name von der Karte“ mit dem Knopf *Karte* neben dem Namensfeld, für Charakter und Welt |

Wie der Entwurf zur Deutung ist es eine gewöhnliche HTML-Datei, die sich direkt im Browser öffnen lässt.

## Entfernung in Range Bands (Entwurf vom 4. November 2026)

Im Ordner [`range-bands/`](range-bands/) liegt der (am 4. November 2026 freigegebene und umgesetzte) Entwurf für die Entfernung
der Kampfsimulation in Range Bands nach Book 1 (S. 32–33) und den Charts (S. 7). Alle SC stehen
zusammen, alle NSC auch; es gibt nur einen Abstand. Live ansehen:
<https://claude.ai/artifact/F8x2by2KML66BMnzTtVrA4> (privat, nur für Berechtigte).

| Datei | Inhalt |
|---|---|
| `range-bands/Entwurf.html` | Kampfsimulation mit der Entfernung in einer Zeile statt der fünf Knöpfe: links die Reichweite als Text („Long“, „Band 4“), daneben ein Strahl mit einem Punkt je Band und Strichen an den Grenzen (C/S, M, L, VL), zwischen zwei Pfeilen. ◀ rückt die NSC ein Band näher, ▶ weiter weg, auf den Strahl tippen setzt den Abstand. Golden der Abstand von den SC (●) zu den NSC (▲); wohin die Waffe am Zug nicht reicht, ist gestrichelt; über 20 Bands ist entkommen |

Darüber der Kopf in einer Zeile: „Runde 2 · 3 × Bandits“, dahinter knapp die Reaktion und wer zuerst
zieht („Hostile · SC zuerst“, bei Überraschung „Überraschung SC“); Antippen zeigt wie bisher die
Übersicht mit allen Würfen. Kopf und Entfernung zusammen sind 93 px hoch; die Pfeile sind 44 px breite Knöpfe, damit sie sich gut treffen lassen.

Wie die Deutung eine gewöhnliche HTML-Datei mit den Stilen der App.

## Kompakte Waffenleiste (Entwurf vom 4. November 2026)

Im Ordner [`waffen-leiste/`](waffen-leiste/) liegt der (am 4. November 2026 freigegebene und umgesetzte) Entwurf für die Leiste
mit dem Charakter oben im Reiter *Kampf* (siehe *Primär- und Sekundärwaffe* im
[Domänenmodell](../domain-model.md)). Grundlage ist der echte Kampfbildschirm der App.

| Datei | Inhalt |
|---|---|
| `waffen-leiste/Entwurf.html` | Die Attribute als schmale Zeile wie bei den NSC statt der sechs Kästen; darunter in einer Zeile höchstens drei Waffen: Primärwaffe, Sekundärwaffe, Hände. Die Waffe in der Hand zeigt ihre Fertigkeit und wird nie gekürzt, die anderen nur ihren Namen; antippen wechselt. Im Kampf ist die Kopfzeile der Karte nur so hoch wie die Schrift (30 px statt 40 px), mit weniger Abstand zwischen den Zeilen. Die Leiste ist etwa 140 px statt 235 px hoch |

## Kampf in zwei Spalten (Entwurf vom 8. November 2026)

Im Ordner [`zwei-spalten/`](zwei-spalten/) liegt ein Entwurf zum Ausprobieren, noch nicht
freigegeben: Die Kampfsimulation ohne Charakter-Leiste und NSC-Liste, stattdessen **SC links** und
**NSC rechts**, getrennt von der **Entfernung als senkrechte Leiste**. **Pfeile** zeigen, wer wen
angreift: gold gestrichelt, solange das Ziel gewählt ist, rot nach einem Treffer, grau gestrichelt
nach einem Fehlschuss; der letzte Angriff bleibt blass stehen.

| Datei | Inhalt |
|---|---|
| `zwei-spalten/Entwurf.html` | Klickbarer Entwurf mit sechs Thugs, Kira und Jonas; je Kämpfer drei Zeilen, der Zustand als ein Zeichen hinter dem Namen (Blutstropfen, Gesicht mit X-Augen, rot gefüllt schwer verwundet, Kreuz). Ziel antippen, angreifen (vereinfachte Würfe), Entfernung mit ▲ ▼, Waffen des SC am Zug unten im Zug; daneben Notizen und offene Fragen |

Die Datei hat keinen eigenen HTML-Rahmen (für die Veröffentlichung als Seite); im Browser öffnet sie
sich trotzdem.

## Entfernung je SC (Entwurf vom 8. November 2026)

Im Ordner [`entfernung-je-sc/`](entfernung-je-sc/) liegt der Entwurf zur Änderung 2026-11-08d
(siehe *Range Bands* und *Bewegen* im [Domänenmodell](../domain-model.md)): der gedrehte Strahl,
rechts fest die NSC, links die SC mit ihrem Anfangsbuchstaben, ganz links Band 20 und dahinter
„weg“ für entkommene SC. Gold gefüllt ist der vorgewählte SC (am Zug, beim NSC-Zug das Ziel).

| Datei | Inhalt |
|---|---|
| `entfernung-je-sc/Entwurf.html` | Drei Zustände: SC-Zug, NSC-Zug mit Ziel, Berührung und entkommen. Gewöhnliche HTML-Datei, direkt im Browser zu öffnen |
