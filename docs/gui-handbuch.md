# GUI-Handbuch

Das Bedienkonzept der App: **wie** die Oberfläche gebaut ist, damit jeder neue Bereich sich so
anfühlt wie die alten. Die [README](../README.md) sagt, *was* die App kann; das
[Domänenmodell](domain-model.md) sagt, wie es im Modell aussieht, und hat die Begriffe (Ziehblatt,
Reiter, Würfelfenster …). Dieses Handbuch sagt, aus welchen Bausteinen die Oberfläche besteht und
nach welchen Regeln man sie zusammensetzt.

**Neue oder geänderte Oberfläche folgt diesem Handbuch.** Braucht etwas ein Muster, das hier nicht
steht, kommt es zuerst hier hinein und wird mit dem Owner abgestimmt, dann gebaut (siehe
[AGENTS.md](../AGENTS.md)).

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
  Wort**. Im Log *Notiz, Deuten, 2W6, Karte*; im Reiter Begegnung die Würfe *Zufall, Tiere, Patron,
  Gerücht, Polizei*; am angetippten Feld *Hierhin reisen, Gruppe setzen, NSC platzieren, Einkaufen*.
- Jeder Bereich mit eigenen Handlungen bringt seine eigene Reihe mit; wo er keine hat, bleibt die
  des Logs.
- **Während eines Ablaufs** (Route planen, NSC wählen, Ort wählen) ersetzt die Reihe ihre Knöpfe durch
  **„Abbrechen“** links und die Bestätigung rechts (**„OK“**, „Losfahren“).
- Ein Knopf, der gerade nicht geht, bleibt stehen, ist ausgegraut und sagt im Titel oder in einer
  Zeile darüber, warum.
- Zählt ein Knopf etwas mit, steht das klein darunter („heute 1×“, „diese Woche 1×“).

### Blatt (Sheet) im Vordergrund

- Für alles, was man ausfüllt oder wählt: Notiz, Deutung, Editor, „Neuer NSC“, Buchung, Bestellung.
- Aufbau: oben Titel und ✕; darin die Felder (`label.field`, Auswahl als `select`); unten
  **„Abbrechen“** (`ghost`) links und die eine Hauptaktion (`primary`) rechts.
- Es dunkelt die App ab (`overlay`); Esc oder ✕ schließt es wie „Abbrechen“.
- Ein Blatt öffnet höchstens ein weiteres (die Karte über dem Editor); tiefer wird nicht gestapelt.

### Ergebnis-Popup und Würfelbühne

- Würfe mit Zielwert (Probe, Angriff, Erschaffung) laufen **groß als Popup**: erst der Zielwert, dann
  rollen die Würfel, dann jeder DM einzeln mit Namen, zuletzt das **Urteil** (Erfolg golden,
  Fehlschlag rot).
- Ein Tippen springt zum Urteil, noch ein Tippen bzw. **„Weiter“** schließt. Das Ergebnis steht dann
  schon im Log.
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

**Tastatur** (Desktop): K Karte, W Würfeln, N Notiz, D Deuten, Ziffern für die Reiter, Esc schließt das
oberste Popup (der Knopf mit `data-escape`). Solange man in ein Feld tippt, gehören die Tasten dem
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
- **Hauptaktion** (`primary`) hell gefüllt, Nebenaktion (`ghost`) ohne Füllung. Knöpfe sind
  mindestens 48 px hoch.
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
- [ ] Handlungen in einer Reihe unten, Wahl oben; im Ablauf „Abbrechen“ und Bestätigung.
- [ ] Geht auf halber Höhe des Ziehblatts und im Desktop-Modus in der Spalte.
- [ ] Jeder gesperrte Knopf sagt, warum; jeder Fehler steht als Hinweis da.
- [ ] Jede Wahl hat genau ein Bedienelement.
- [ ] Würfe als Popup oder Würfelfenster, überspringbar; Ergebnis im Log.
- [ ] Gold für die eigene Seite, Rot für die andere; Begriffe aus dem Domänenmodell.
- [ ] Esc schließt, Tastatur stört nicht beim Tippen.
