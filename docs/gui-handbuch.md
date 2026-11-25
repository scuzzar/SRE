# GUI-Handbuch

Das Bedienkonzept der App: **wie** die Oberfläche gebaut ist, damit jeder neue Bereich sich so
anfühlt wie die alten. Die [README](../README.md) sagt, *was* die App kann; das
[Domänenmodell](domain-model.md) sagt, wie es fachlich im Modell aussieht. Dieses Handbuch sagt, aus
welchen Bausteinen die Oberfläche besteht, nach welchen Regeln man sie zusammensetzt und wie ihre
Teile heißen ([Begriffe der Oberfläche](#begriffe-der-oberfläche)).

**Neue oder geänderte Oberfläche folgt diesem Handbuch.** Braucht etwas ein Muster, das hier nicht
steht, kommt es zuerst hier hinein und wird mit dem Owner abgestimmt, dann gebaut (siehe
[AGENTS.md](../AGENTS.md)).

---

## Begriffe der Oberfläche

Die gemeinsame Sprache für die Oberfläche, wie die Tabelle „Begriffe“ im
[Domänenmodell](domain-model.md) für die Fachlichkeit. Neue Begriffe der Oberfläche kommen zuerst
hierher. In der Spalte *Code* steht, wo es ihn gibt, der Zustand im Controller oder die Komponente.

| Deutsch | Code | Was |
|---|---|---|
| Grundkarte | (View) | Was auf dem Handy wie im Desktop-Modus unter allem liegt: der Globus der offenen Welt, beim Start der des Aufenthaltsorts (sobald seine Oberflächenkarte entstanden ist); mit ✕ oder ganz herausgezoomt der Subsektor, in dem ein Tippen auf eine Welt deren Globus öffnet |
| Ziehblatt | (View, Smartphone; Stufe `TrayStop`) | Das Blatt unten über der Grundkarte, wie in einer Karten-App. Es rastet beim Loslassen immer auf einer von vier **Stufen** ein: versteckt (nur der Griff, mit Abstand zum Rand; Reihe und Reiter rutschen hinaus), eingeklappt (Kopf, Reihe und Reiter, bei einem offenen Feld auch dessen Kopfzeile), halb und voll; nach einem Wisch eine Stufe weiter in seine Richtung. Ziehen lässt es sich am Griff, an Reihe und Reitern und im Inhalt nach unten, wenn der ganz oben steht. Das Gerät merkt sich die Stufe, nicht die Höhe. Oben der Griff, darunter der gewählte Bereich oder das angetippte Feld des Globus bzw. das gewählte Feld des Subsektors (dafür fährt es mindestens auf halbe Höhe, und die Karte holt das Feld über das Blatt), darunter im Log die Reihe Notiz, Tag, 2W6, Karte (bis 2026-11-22c Notiz, Deuten, 2W6, Karte), beim angetippten Feld des Globus stattdessen die Reihe Hierhin reisen (Route der *Fahrt* planen), Gruppe setzen, *NSC platzieren*, Einkaufen, ganz unten die fünf *Reiter* Log, Begegnung, Charaktere, Schiff, Missionen |
| Desktop-Modus | (View, media query) | Das Layout ab 1024 px Bildschirmbreite: links eine Spalte mit denselben Reitern wie im Ziehblatt, darunter das Log mit dem Charakter oben; ein Reiter (oder ein angetipptes Feld des Globus bzw. ein gewähltes des Subsektors) öffnet den Bereich an der Stelle des Logs in derselben Spalte, ✕ führt zurück; unten die Reihe Notiz, Tag, 2W6, Karte, wo der Bereich keine eigene hat; den Rest füllt die Grundkarte. Gleiche Screens, gleiche Komponenten wie auf dem Smartphone |
| Reiter | (View, `Screen`) | Die fünf Reiter unten im Ziehblatt bzw. oben in der Seitenspalte: Log, Begegnung, Charaktere, Schiff, Missionen (Missionen seit 2026-11-18); Begegnung und Charaktere haben oben einen Umschalter |
| Würfelfenster | (View, `encounterRoll`) | Das Fenster nach einem Begegnungswurf: der rollende Würfel des Tests, was herauskam und was danach geht („Als NSC“, Rettungswürfe); kam es zur Begegnung, folgt ihre Übersicht. Ohne Würfel nur ein Hinweis, etwa dass der Test schon gemacht ist |
| Weltsymbol | (View, aus `Hex`) | Das kleine 3D-Bild einer fertigen Welt aus Größe, Atmosphäre, Wasser, Bevölkerung, TL, Temperatur und Leben; auf der Sektorkarte, in der Kopfzeile und oben auf dem Globus; auf der Weltkarte nicht, dort steht es schon auf der Karte daneben. Nur Darstellung, nichts davon wird gespeichert |
| Globus | (View, aus `SurfaceMap`) | Die drehbare Kugel mit der Oberflächenkarte; nur Darstellung |
| Raumkarte | (View, Grundkarte) | Der Raum um eine Welt, von ein paar tausend bis zu Millionen Kilometern, in 2D: die Welt als Himmelskörper, die Einheiten mit Bahnen und die Sprunggrenzen. Neben Subsektor und Globus die dritte Grundkarte; man erreicht sie über den Knopf „Raum“ (2026-11-18c) |
| Knopf „Raum“ | (View) | Öffnet die Raumkarte einer Welt, am Globus und an der Welt im Subsektor; ein Tippen auf eine Welt öffnet weiter ihren Globus (2026-11-18c) |
| Schubkreis | (View) | Der Kreis um eine eigene Einheit, so groß wie ihr höchster Schub; jedes Tippen oder Ziehen darin setzt den Schubvektor vom Schiff zum Finger, ohne die Einheit auszuwählen (2026-11-18c) |
| Einrasten | (View) | Der Schubvektor springt auf eine Marke am Schubkreis, wenn er ihr auf etwa 5° nahekommt: prograd, retrograd, aufs Ziel, vom Ziel weg, angleichen (2026-11-18c) |

---

## Grundsätze

1. **Smartphone zuerst, im Hochformat.** Alles muss mit einem Daumen gehen. Der Desktop-Modus ist
   dieselbe App mit denselben Komponenten, nur anders angeordnet.
2. **Die Karte führt.** Unter allem liegt die Grundkarte; alles andere liegt in einem Blatt darüber
   und lässt die Karte sichtbar.
3. **Unten wird gehandelt, oben wird gewählt.** Die Knöpfe zum Handeln stehen unten im
   Daumenbereich, die Wahl, *was* man sieht (Umschalter, Charakter oben), steht oben.
4. **Nichts passiert still.** Was gerade nicht geht, ist ausgegraut und sagt, warum. Geht nach einem
   Tippen etwas nicht, steht oben ein Hinweis.
5. **Ein Tippen für das Übliche, lange drücken für die zweite Absicht.** Nie zwei gleichrangige
   Knöpfe, wo einer mit langem Druck reicht.
6. **Würfe sind ein Ereignis.** Ergebnisse erscheinen groß und kurz animiert, im Stil von Baldur's
   Gate 3; ein Tippen springt immer gleich zum Ergebnis.
7. **Eine Wahl, ein Bedienelement.** Derselbe Wert wird an einer Stelle gewählt, nicht in einem
   Auswahlfeld *und* in Knöpfen daneben.

---

## Aufbau des Bildschirms

```
Smartphone                          Desktop-Modus (ab 1024 px)
┌──────────────────────────┐        ┌────────────┬─────────────────────────┐
│ ☰                 Welt ▾ │        │ Reiter     │                         │
│                          │        │────────────│                         │
│      Grundkarte          │        │ Umschalter │                         │
│ (Globus / Subsektor /    │        │ Inhalt     │      Grundkarte         │
│  Raumkarte)              │        │ des Reiters│                         │
│                          │        │ (oder Log) │                         │
│ ╭──────── ▬ ───────────╮ │        │            │                         │
│ │ Umschalter oben      │ │        │────────────│                         │
│ │ Inhalt des Reiters   │ │        │ Reihe      │                         │
│ │──────────────────────│ │        └────────────┴─────────────────────────┘
│ │ Reihe (Handeln)      │ │
│ │ Reiter               │ │
│ ╰──────────────────────╯ │
└──────────────────────────┘
```

### Grundkarte

- Globus der offenen Welt, herausgezoomt der **Subsektor**, über den Knopf „Raum“ die **Raumkarte**.
- Oben links ✕ bzw. Zurück, oben rechts das **Menü ☰**. Zoom-Knöpfe nur, solange das Blatt nicht über
  halb steht.
- Was man auf der Karte antippt (ein Feld, eine Welt), öffnet sich **im Blatt**, nicht in einem eigenen
  Fenster. Die Karte schiebt das Angetippte über das Blatt, damit es sichtbar bleibt.

### Ziehblatt (Smartphone)

- Liegt unten über der Grundkarte wie in einer Karten-App und rastet beim Loslassen immer auf einer
  von **vier Stufen** ein: **versteckt** (nur der Griff), **eingeklappt** (Kopf, Reihe, Reiter),
  **halb**, **voll**. Ein Wisch bringt es eine Stufe weiter in seine Richtung.
- Ziehen geht am Griff, an Reihe und Reitern und im Inhalt nach unten, wenn er ganz oben steht. Ein
  Tippen auf den Griff wechselt zwischen eingeklappt und halb.
- Das Gerät merkt sich die **Stufe**, nicht die Höhe.
- Ein neuer Bereich muss auf **halber Höhe** brauchbar sein.

### Desktop-Modus

- Links eine Spalte: oben die Reiter, darunter der Bereich an der Stelle des Logs, unten die Reihe.
  Den Rest füllt die Grundkarte.
- Gleiche Screens, gleiche Komponenten; ein zweiter Klick auf den Reiter oder ✕ führt zum Log
  zurück. Unter der Maus heben sich Knöpfe und Felder hervor.

---

## Bausteine

### Reiter (unten)

- Genau fünf: **Log, Begegnung, Charaktere, Schiff, Missionen**. Sie stehen ganz unten im Blatt, im
  Desktop-Modus oben in der Spalte.
- Ein neuer Bereich wird kein sechster Reiter, sondern ein Teil eines bestehenden (Umschalter) oder
  ein Blatt, das man von dort öffnet.

### Umschalter (oben im Reiter)

- Hat ein Reiter mehrere Teile, steht oben ein Umschalter (`SubTabs`): im Reiter Begegnung
  *Begegnung · Kampf*, im Reiter Charaktere *SC · Kasse · NSC*.
- Der Umschalter wählt nur, was man sieht; er löst nie etwas aus.

### Reihe (unten, zum Handeln)

- Über den Reitern, im Daumenbereich: **drei bis fünf gleich breite Knöpfe mit Symbol und kurzem
  Wort**. Im Log *Notiz, Tag, 2W6, Karte* (aus „2W6“ wird mit vorbereiteter Probe „Probe“); am
  angetippten Feld *Hierhin reisen, Gruppe setzen, NSC platzieren, Einkaufen*.
- Hat ein Bereich zwei Arten von Handlungen, bekommt er **zwei Reihen** übereinander, nie eine mit
  mehr als fünf Knöpfen: im Reiter Begegnung oben die Würfe *Zufall, Tiere, Patron, Gerücht,
  Polizei*, darunter die Zeit *Tage vergehen, Woche beenden* (auf einer Fahrt *Weiterfahren*).
- **Deuten** sitzt nicht in der Reihe, sondern am Ergebnis im Log (am neuesten immer, ein älteres
  klappt man auf).
- Jeder Bereich mit eigenen Handlungen bringt seine eigene Reihe mit; wo er keine hat, bleibt die
  des Logs.
- **Während eines Ablaufs** (Route planen, NSC wählen, Ort wählen) ersetzt die Reihe ihre Knöpfe durch
  **„Abbrechen“** links und die Bestätigung rechts (**„OK“**, „Losfahren“).
- Ein Knopf, der gerade nicht geht, bleibt stehen, ist ausgegraut und sagt im Titel oder in einer
  Zeile darüber, warum.
- Zählt ein Knopf etwas mit, steht das klein darunter („heute 1×“, „diese Woche 1×“).

### Blatt (Sheet) im Vordergrund

Für alles, was man ausfüllt oder wählt. Es dunkelt die App ab (`overlay`); die Felder sind
`label.field`, eine Auswahl ist ein `select`. Es gibt **zwei Bauarten**, nach Größe:

```
A: großes Blatt                      B: kleines Blatt
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Charakter bearbeiten       ✕ │     │ Notiz                        │
│ Name  [______________]       │     │ [__________________________] │
│ UPP   [______________]       │     │                              │
│ …  (scrollt)                 │     │ [ Abbrechen ]   [ Notieren ] │
│                [ Speichern ] │     └──────────────────────────────┘
└──────────────────────────────┘
```

- **A, groß** (viele Felder, scrollt): oben Titel und **✕**, unten die eine Hauptaktion
  (`primary`). Das ✕ bleibt erreichbar, auch wenn unten weggescrollt ist. So gebaut: Charakter-Editor,
  Erschaffung, Neuer NSC, Kampagnen, Heilung, Mission, Kaufen und Verkaufen, Reise, Systemflug,
  Inspirationskarte, Ortswahl im Sektor.
- **B, klein** (eine kurze Eingabe oder Entscheidung): kein ✕, unten **„Abbrechen“** (`ghost`) links
  und die Hauptaktion (`primary`) rechts, beide im Daumenbereich. So gebaut: Notiz und Deutung, Name
  von der Karte, Beute, Wahl der Begegnungsart, Würfelfenster beim Patron.
- In beiden schließt **Esc** wie ✕ bzw. „Abbrechen“: Der Knopf trägt `data-escape`.
- Ein Blatt öffnet höchstens ein weiteres (die Karte über dem Editor); tiefer wird nicht gestapelt.
- Ein Blatt, das man nur entscheiden kann (Wunden verteilen, Landeplatz), hat weder ✕ noch
  „Abbrechen“; Esc springt dort nur zum Ergebnis.

### Ergebnis-Popup und Würfelbühne

- Würfe mit Zielwert (Probe, Angriff, Erschaffung) laufen **groß als Popup**: erst der Zielwert, dann
  rollen die Würfel, dann jeder DM einzeln mit Namen, zuletzt das **Urteil** (Erfolg golden,
  Fehlschlag rot).
- Ein Tippen springt zum Urteil, noch ein Tippen bzw. **„Weiter“** schließt. Das Ergebnis steht dann
  schon im Log. Esc wirkt genauso: Solange der Wurf rollt, springt es zum Ergebnis, danach schließt es
  (der Knopf trägt `data-escape` erst, wenn der Wurf steht).
- Das **Würfelfenster** ist dieselbe Bühne für Tests von Begegnungen: Würfel, was herauskam, was
  danach geht („Als NSC“, „Zur Begegnung“).

### Wartenscheibe

- Rechnet die App ohne Animation eine Weile (der Lauf eines NSC), steht eine kleine Scheibe in der
  Mitte und zählt mit; sie sperrt die App darunter. Ist das Ergebnis da, bleibt sie kurz stehen.

### Charakter oben

- Die Leiste oben mit der Karte eines SC: Name, UPP, Fertigkeiten bzw. im Kampf die Waffen.
  **Wischen** wechselt den Charakter, ein Tippen auf den Namen klappt sie ein.
- Wer oben steht, gilt für alles darunter (Probe, Kauf, Waffentabelle).

### Karten, Kacheln und Listen

- **Karten** für Personen und Dinge (Charakter, NSC, Kämpfer, Posten der Crew), mit dem **Stift**
  zum Bearbeiten im Kopf.
- **Kacheln** für Werte auf einen Blick (Treibstoff, Fracht …), zwei je Reihe.
- Listen sind **gruppiert** (nach Rolle, Welt, Zustand); Erledigtes und Totes steht **eingeklappt**
  darunter.
- **Chips** für kurze Verweise mit Etikett („Treffpunkt · Startown“); ein Tippen führt zum Ziel.
- **Anlegen am Ende der Liste**: Neues legt ein breiter Knopf unter der Liste an (`add-character`):
  „+ Neuer Charakter“, „+ Nach Regeln erschaffen“, „+ Neuer NSC“, „+ Neue Mission“. Er gehört zur
  Liste, nicht in die Reihe.

### Hinweis

- Ging etwas nach einem Tippen nicht, erscheint oben ein **Hinweis** (`notice-toast`) mit dem Grund;
  ✕ nimmt ihn weg.
- Dauerhafte Erklärungen in einem Bereich stehen als kurzer Hinweis darüber, mit ✕ zum Ausblenden;
  das merkt sich das Gerät.

---

## Gesten und Eingabe

| Geste | Bedeutung |
|---|---|
| **Tippen** | Das Übliche: wählen, auslösen, öffnen |
| **Lange drücken** | Die zweite Absicht (`HoldButton`, 0,9 s): Der Knopf füllt sich von links, erst wenn er voll ist, löst es aus. Beispiele: trotzdem würfeln, obwohl der Test schon gemacht ist; die Erschaffung durchlaufen lassen; ohne Begegnung weiter; NSC hier platzieren; eine ganze Garbe löschen. Ein kurzes Tippen sagt, dass es einen langen Druck gibt |
| **Wischen** | Zwischen Charakteren oben; das Blatt eine Stufe weiter |
| **Ziehen** | Das Blatt; Gegenstände im Gepäck und Personen auf Posten (kurz halten, dann ziehen; gleich wischen scrollt) |
| **Zwei Finger / Mausrad** | Zoomen auf der Karte |

**Tastatur** (Desktop): K Karte, W Würfeln (2W6 oder die vorbereitete Probe), N Notiz, T ein Tag,
Ziffern für die Reiter, Esc schließt das oberste Popup (der Knopf mit `data-escape`). Ein Kürzel steht
im Titel des Knopfs („Notiz (N)“). Solange man in ein Feld tippt, gehören die Tasten dem
Feld.

---

## Zustände und Sicherheit

- **Ausgegraut mit Grund**, nie ausgeblendet ohne Grund: Der Spieler soll sehen, dass es den Knopf
  gibt, und erfahren, was fehlt.
- **Löschen fragt nach** (Behalten / Löschen?). Was im Log vorkommt, wird nicht gelöscht, sondern
  ausgeblendet.
- **Buchungen bleiben stehen**; einen Fehler bucht man zurück.
- **Was sich wer merkt:** die Kampagne merkt sich, was zum Spiel gehört (Charakter oben, Waffe in der
  Hand); das Gerät merkt sich die Bedienung (Stufe des Blatts, eingeklappte Leiste, ausgeblendete
  Hinweise).

---

## Farben, Schrift und Zeichen

- **Dunkles Thema**: fast schwarzer Grund (`--bg`, `--panel`, `--card`), helle Schrift (`--text`),
  gedämpft `--muted`, `--dim`.
- **Gold** (`--gold`) für die eigene Seite und das Gewählte: SC, Auswahl, Erfolg, die Waffe in der
  Hand, wer am Zug ist.
- **Rot** (`--accent`) für die andere Seite und Gefahr: NSC im Kampf, Ziel, Fehlschlag,
  Zufallsereignis, Missionen auf der Karte.
- **Hauptaktion** (`primary`) hell gefüllt, Nebenaktion (`ghost`) ohne Füllung.
- **Zwei Größen von Knöpfen:** Knöpfe zum Handeln sind groß (Reihe 54–56 px, `primary` und `ghost`
  48–52 px). Kompakte Bedienelemente in Listen und Karten sind kleiner: Chips, Umschalter und Zellen
  der Waffentabelle 40 px, `ghost compact` 30–36 px. Kleiner als 30 px wird nichts, was man antippt.
- **Farben nur über die Variablen** in `:root` von `styles.css`, keine festen Werte (noch nicht
  überall so, siehe [TODO.md](../TODO.md)); keine `style={{ … }}` in Komponenten.
- **Wirkungen haben eigene Familien** in `:root`, die Zahl ist die Deckkraft in Prozent:
  `--shadow-*` Erhöhung, `--scrim-*` dunkle Fläche, `--sheen-*` heller Saum und Reflex,
  `--on-fill*` Schrift auf gefülltem Grund, `--gold-edge-*` und `--gold-glow-*` für Gold,
  `--accent-glow-*`, `--accent-fill-*` und `--accent-edge-*` für Rot, `--danger` für Gefahren.
  Ein neuer Wert bekommt eine neue Variable, nie eine feste Zahl in der Regel.
- **Schrift**: IBM Plex Sans, Werte und Codes (UPP, UWP) in IBM Plex Mono; zählende Zahlen mit
  festen Ziffernbreiten, damit nichts springt.
- **Zeichen**: ✕ schließen, ☰ Menü, Stift bearbeiten, ⌖ Ziel bzw. Aufenthaltsort, ▶ am Zug, ★ Anführer.

---

## Animation und Rückmeldung

- Animationen sind kurz (**unter zwei Sekunden**) und lassen sich immer mit einem Tippen überspringen.
- Mit „Bewegung reduzieren“ im System erscheint gleich das Ergebnis.
- Würfe und Karten **vibrieren**, wo das Gerät es kann.

---

## Texte

- Deutsch, kurz, mit den Begriffen aus der Tabelle „Begriffe“ im Domänenmodell; Regelbegriffe aus
  dem Buch dürfen englisch bleiben (Range Bands, Low Passage).
- Knöpfe sagen, was passiert, als Verb oder Ziel: „Angreifen“, „Würfeln“, „Zur Begegnung“,
  „Hierhin reisen“.
- Gründe stehen als ein Satz da („Die Gruppe ist hier“, „Zu weit weg: 9,2 G bis Kestrel“).

---

## Prüfliste für einen neuen Bereich

- [ ] Hängt an einem bestehenden Reiter (Umschalter oder Blatt), kein neuer Reiter.
- [ ] Handlungen in einer Reihe unten (höchstens fünf Knöpfe, sonst zwei Reihen), Wahl oben; im
      Ablauf „Abbrechen“ und Bestätigung; Anlegen am Ende der Liste.
- [ ] Blatt in Bauart A (groß, ✕ oben) oder B (klein, „Abbrechen“ unten).
- [ ] Geht auf halber Höhe des Ziehblatts und im Desktop-Modus in der Spalte.
- [ ] Jeder gesperrte Knopf sagt, warum; jeder Fehler steht als Hinweis da.
- [ ] Jede Wahl hat genau ein Bedienelement.
- [ ] Würfe als Popup oder Würfelfenster, überspringbar; Ergebnis im Log.
- [ ] Gold für die eigene Seite, Rot für die andere, Farben nur über Variablen; Begriffe aus dem
      Domänenmodell.
- [ ] Esc schließt, Tastatur stört nicht beim Tippen.
