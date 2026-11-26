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
Jeder Baustein hat genau einen Namen; „Blatt“, „Reihe“, „Leiste“ oder „Fenster“ allein meinen nichts
Bestimmtes und werden nicht als Name benutzt (bis 26. November 2026 hießen die Bausteine Reiter,
Umschalter, Reihe, großes und kleines Blatt, Würfelfenster und Hinweis).

| Deutsch | Code | Was |
|---|---|---|
| Grundkarte | (View) | Was auf dem Handy wie im Desktop-Modus unter allem liegt: der Globus der offenen Welt, beim Start der des Aufenthaltsorts (sobald seine Oberflächenkarte entstanden ist); mit ✕ oder ganz herausgezoomt der Subsektor, in dem ein Tippen auf eine Welt deren Globus öffnet |
| Ziehblatt | `Tray` (Smartphone; Stufe `TrayStop`) | Das Blatt unten über der Grundkarte, wie in einer Karten-App. Es rastet beim Loslassen immer auf einer von vier **Stufen** ein: versteckt (nur der Griff, mit Abstand zum Rand; Aktionsleiste und Navigationsleiste rutschen hinaus), eingeklappt (Kopf, Aktionsleiste und Navigationsleiste, bei einem offenen Feld auch dessen Feldkopf), halb und voll; nach einem Wisch eine Stufe weiter in seine Richtung. Ziehen lässt es sich am Griff, an Aktions- und Navigationsleiste und im Inhalt nach unten, wenn der ganz oben steht. Das Gerät merkt sich die Stufe, nicht die Höhe. Von oben nach unten: Griff, der gewählte Bereich oder das angetippte Feld (dafür fährt es mindestens auf halbe Höhe, und die Karte holt das Feld über das Blatt), die Aktionsleiste, ganz unten die Navigationsleiste |
| Desktop-Modus | (View, media query) | Das Layout ab 1024 px Bildschirmbreite: links die **Seitenspalte** mit der Navigationsleiste oben, darunter das Log mit der Charakterleiste; ein Bereich (oder ein angetipptes Feld) steht an der Stelle des Logs in derselben Spalte, ✕ führt zurück; unten die Aktionsleiste; den Rest füllt die Grundkarte. Gleiche Screens, gleiche Komponenten wie auf dem Smartphone |
| Navigationsleiste | (View, `nav` „Bereiche“) | Die Leiste mit den fünf Bereichen, ganz unten im Ziehblatt bzw. oben in der Seitenspalte. Ein Tipp darauf öffnet den Bereich und bricht einen laufenden Ablauf ab (NSC platzieren, Ort wählen) |
| Bereich | `Screen` | Einer der fünf Teile der App: **Log, Begegnung, Charaktere, Schiff, Missionen** (Missionen seit 2026-11-18). Begegnung und Charaktere haben Unterreiter |
| Unterreiter | `SubTabs` | Die Wahl oben in einem Bereich, welcher Teil zu sehen ist: im Bereich Begegnung *Begegnung · Kampf*, im Bereich Charaktere *SC · Kasse · NSC*, im Bereich Schiff *Deckplan · Crew · Computer*, an der Weltkarte *Welt · System* |
| Aktionsleiste | `…Dock` (`OracleDock`, `EncounterDock`, `FieldDock`) | Die drei bis fünf gleich breiten Knöpfe zum Handeln über der Navigationsleiste, im Daumenbereich. Im Log *Notiz, Tag, 2W6, Karte*, am angetippten Feld *Hierhin reisen, Gruppe setzen, NSC platzieren, Einkaufen* |
| Charakterleiste | `CharacterStrip` | Oben im Log, im Kampf ohne Begegnung und im Shop: die Karte des Charakters oben (Name, UPP, Fertigkeiten bzw. Waffen), Wischen wechselt ihn, ein Tipp auf den Namen klappt sie ein |
| Feld | (View; `FieldDock`, `WorldSheet`) | Das angetippte Feld des Globus bzw. das gewählte des Subsektors, an der Stelle des Bereichs; oben sein **Feldkopf** (Name und Werte), der auch eingeklappt stehen bleibt |
| Dialog | `Sheet` mit ✕ (`overlay`) | Groß, für vieles zum Ausfüllen: oben Titel und ✕, unten die Hauptaktion. Charakter-Editor, Erschaffung, Kauf … |
| Kurzdialog | `Sheet` ohne ✕ (`overlay`) | Klein, für eine kurze Eingabe oder Entscheidung: unten „Abbrechen“ und die Hauptaktion. Notiz, Beute, Wahl der Begegnungsart … |
| Würfelbühne | `DiceRoll`, `encounterRoll` | Jeder Wurf groß und kurz animiert: Zielwert, Würfel, DMs, Urteil. Nach einem Begegnungswurf zeigt sie den Würfel des Tests, was herauskam und was danach geht („Als NSC“, Rettungswürfe); kam es zur Begegnung, folgt ihre Übersicht. Ohne Würfel nur ein Satz, etwa dass der Test schon gemacht ist |
| Meldung | `NoticeToast` (`notice-toast`) | Oben, wenn nach einem Tipp etwas nicht ging, mit dem Grund; ✕ nimmt sie weg |
| Wartenscheibe | `NpcRunDisc` | Die kleine Scheibe in der Mitte, solange die App ohne Animation rechnet |
| Weltsymbol | (View, aus `Hex`) | Das kleine 3D-Bild einer fertigen Welt aus Größe, Atmosphäre, Wasser, Bevölkerung, TL, Temperatur und Leben; auf der Sektorkarte, im Feldkopf und oben auf dem Globus; auf der Weltkarte nicht, dort steht es schon auf der Karte daneben. Nur Darstellung, nichts davon wird gespeichert |
| Globus | (View, aus `SurfaceMap`) | Die drehbare Kugel mit der Oberflächenkarte; nur Darstellung |
| Raumkarte | (View, Grundkarte) | Der Raum um eine Welt, von ein paar tausend bis zu Millionen Kilometern, in 2D: die Welt als Himmelskörper, die Einheiten mit Bahnen und die Sprunggrenzen. Neben Subsektor und Globus die dritte Grundkarte; man erreicht sie über den Knopf „Raum“ (2026-11-18c) |
| Knopf „Raum“ | (View) | Öffnet die Raumkarte einer Welt, am Globus und an der Welt im Subsektor; ein Tippen auf eine Welt öffnet weiter ihren Globus (2026-11-18c) |
| Schubkreis | (View) | Der Kreis um eine eigene Einheit, so groß wie ihr höchster Schub; jedes Tippen oder Ziehen darin setzt den Schubvektor vom Schiff zum Finger, ohne die Einheit auszuwählen (2026-11-18c) |
| Einrasten | (View) | Der Schubvektor springt auf eine Marke am Schubkreis, wenn er ihr auf etwa 5° nahekommt: prograd, retrograd, aufs Ziel, vom Ziel weg, angleichen (2026-11-18c) |

---

## Grundsätze

1. **Smartphone zuerst, im Hochformat.** Alles muss mit einem Daumen gehen. Der Desktop-Modus ist
   dieselbe App mit denselben Komponenten, nur anders angeordnet.
2. **Die Karte führt.** Unter allem liegt die Grundkarte; alles andere liegt im Ziehblatt darüber
   und lässt die Karte sichtbar.
3. **Unten wird gehandelt, oben wird gewählt.** Die Knöpfe zum Handeln stehen unten im
   Daumenbereich, die Wahl, *was* man sieht (Unterreiter, Charakterleiste), steht oben.
4. **Nichts passiert still.** Was gerade nicht geht, ist ausgegraut und sagt, warum. Geht nach einem
   Tippen etwas nicht, steht oben eine Meldung.
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
│ ☰                 Welt ▾ │        │ Navigation │                         │
│                          │        │────────────│                         │
│      Grundkarte          │        │ Unterreiter│                         │
│ (Globus / Subsektor /    │        │ Bereich    │      Grundkarte         │
│  Raumkarte)              │        │            │                         │
│                          │        │ (oder Log) │                         │
│ ╭──────── ▬ ───────────╮ │        │            │                         │
│ │ Unterreiter          │ │        │────────────│                         │
│ │ Bereich              │ │        │ Aktions-   │                         │
│ │──────────────────────│ │        │ leiste     │                         │
│ │ Aktionsleiste        │ │        └────────────┴─────────────────────────┘
│ │ Navigationsleiste    │ │
│ ╰──────────────────────╯ │
└──────────────────────────┘
```

### Grundkarte

- Globus der offenen Welt, herausgezoomt der **Subsektor**, über den Knopf „Raum“ die **Raumkarte**.
- Oben links ✕ bzw. Zurück, oben rechts das **Menü ☰**. Zoom-Knöpfe nur, solange das Ziehblatt nicht über
  halb steht.
- Was man auf der Karte antippt (ein Feld, eine Welt), öffnet sich als **Feld im Ziehblatt**,
  nicht in einem eigenen Dialog. Die Karte schiebt das Angetippte über das Ziehblatt, damit es sichtbar bleibt.

### Ziehblatt (Smartphone)

- Liegt unten über der Grundkarte wie in einer Karten-App und rastet beim Loslassen immer auf einer
  von **vier Stufen** ein: **versteckt** (nur der Griff), **eingeklappt** (Kopf, Aktionsleiste, Navigationsleiste),
  **halb**, **voll**. Ein Wisch bringt es eine Stufe weiter in seine Richtung.
- Ziehen geht am Griff, an Aktions- und Navigationsleiste und im Inhalt nach unten, wenn er ganz oben steht. Ein
  Tippen auf den Griff wechselt zwischen eingeklappt und halb.
- Das Gerät merkt sich die **Stufe**, nicht die Höhe.
- Ein neuer Bereich muss auf **halber Höhe** brauchbar sein.

### Desktop-Modus

- Links die Seitenspalte: oben die Navigationsleiste, darunter der Bereich an der Stelle des Logs,
  unten die Aktionsleiste.
  Den Rest füllt die Grundkarte.
- Gleiche Screens, gleiche Komponenten; ein zweiter Klick auf den Bereich oder ✕ führt zum Log
  zurück. Unter der Maus heben sich Knöpfe und Felder hervor.

---

## Bausteine

### Navigationsleiste (unten)

- Genau fünf Bereiche: **Log, Begegnung, Charaktere, Schiff, Missionen**. Die Navigationsleiste steht
  ganz unten im Ziehblatt, im Desktop-Modus oben in der Seitenspalte.
- Etwas Neues wird kein sechster Bereich, sondern ein Teil eines bestehenden (Unterreiter) oder ein
  Dialog, den man von dort öffnet.

### Unterreiter (oben im Bereich)

- Hat ein Bereich mehrere Teile, stehen oben Unterreiter (`SubTabs`): im Bereich Begegnung
  *Begegnung · Kampf*, im Bereich Charaktere *SC · Kasse · NSC*.
- Ein Unterreiter wählt nur, was man sieht; er löst nie etwas aus.

### Aktionsleiste (unten, zum Handeln)

- Über der Navigationsleiste, im Daumenbereich: **drei bis fünf gleich breite Knöpfe mit Symbol und kurzem
  Wort**. Im Log *Notiz, Tag, 2W6, Karte* (aus „2W6“ wird mit vorbereiteter Probe „Probe“); am
  angetippten Feld *Hierhin reisen, Gruppe setzen, NSC platzieren, Einkaufen*.
- Hat ein Bereich zwei Arten von Handlungen, bekommt er **zwei Aktionsleisten** übereinander, nie eine mit
  mehr als fünf Knöpfen: im Bereich Begegnung oben die Würfe *Zufall, Tiere, Patron, Gerücht,
  Polizei*, darunter die Zeit *Tage vergehen, Woche beenden* (auf einer Fahrt *Weiterfahren*).
- **Deuten** sitzt nicht in der Aktionsleiste, sondern am Ergebnis im Log (am neuesten immer, ein älteres
  klappt man auf).
- Jeder Bereich mit eigenen Handlungen bringt seine eigene Aktionsleiste mit; wo er keine hat,
  bleibt die des Logs.
- **Während eines Ablaufs** (Route planen, NSC wählen, Ort wählen) ersetzt die Aktionsleiste ihre Knöpfe durch
  **„Abbrechen“** links und die Bestätigung rechts (**„OK“**, „Losfahren“).
- Ein Knopf, der gerade nicht geht, bleibt stehen, ist ausgegraut und sagt im Titel oder in einer
  Zeile darüber, warum.
- Zählt ein Knopf etwas mit, steht das klein darunter („heute 1×“, „diese Woche 1×“).

### Dialog und Kurzdialog

Für alles, was man ausfüllt oder wählt, im Vordergrund (`Sheet`). Er dunkelt die App ab (`overlay`);
die Felder sind `label.field`, eine Auswahl ist ein `select`. Es gibt **zwei Bauarten**, nach Größe:

```
Dialog                               Kurzdialog
┌──────────────────────────────┐     ┌──────────────────────────────┐
│ Charakter bearbeiten       ✕ │     │ Notiz                        │
│ Name  [______________]       │     │ [__________________________] │
│ UPP   [______________]       │     │                              │
│ …  (scrollt)                 │     │ [ Abbrechen ]   [ Notieren ] │
│                [ Speichern ] │     └──────────────────────────────┘
└──────────────────────────────┘
```

- **Dialog** (viele Felder, scrollt): oben Titel und **✕**, unten die eine Hauptaktion
  (`primary`). Das ✕ bleibt erreichbar, auch wenn unten weggescrollt ist. So gebaut: Charakter-Editor,
  Erschaffung, Neuer NSC, Kampagnen, Heilung, Mission, Kaufen und Verkaufen, Reise, Systemflug,
  Inspirationskarte, Ortswahl im Sektor.
- **Kurzdialog** (eine kurze Eingabe oder Entscheidung): kein ✕, unten **„Abbrechen“** (`ghost`) links
  und die Hauptaktion (`primary`) rechts, beide im Daumenbereich. So gebaut: Notiz und Deutung, Name
  von der Karte, Beute, Wahl der Begegnungsart, Würfelbühne beim Patron.
- In beiden schließt **Esc** wie ✕ bzw. „Abbrechen“: Der Knopf trägt `data-escape`.
- Ein Dialog öffnet höchstens einen weiteren (die Karte über dem Editor); tiefer wird nicht gestapelt.
- Ein Dialog, den man nur entscheiden kann (Wunden verteilen, Landeplatz), hat weder ✕ noch
  „Abbrechen“; Esc springt dort nur zum Ergebnis.

### Würfelbühne

- Würfe mit Zielwert (Probe, Angriff, Erschaffung) laufen **groß auf der Würfelbühne**: erst der Zielwert, dann
  rollen die Würfel, dann jeder DM einzeln mit Namen, zuletzt das **Urteil** (Erfolg golden,
  Fehlschlag rot).
- Ein Tippen springt zum Urteil, noch ein Tippen bzw. **„Weiter“** schließt. Das Ergebnis steht dann
  schon im Log. Esc wirkt genauso: Solange der Wurf rollt, springt es zum Ergebnis, danach schließt es
  (der Knopf trägt `data-escape` erst, wenn der Wurf steht).
- Dieselbe Würfelbühne zeigt die Tests von Begegnungen: Würfel, was herauskam, was
  danach geht („Als NSC“, „Zur Begegnung“).

### Wartenscheibe

- Rechnet die App ohne Animation eine Weile (der Lauf eines NSC), steht eine kleine Scheibe in der
  Mitte und zählt mit; sie sperrt die App darunter. Ist das Ergebnis da, bleibt sie kurz stehen.

### Charakterleiste

- Oben im Bereich die Karte eines SC, des **Charakters oben**: Name, UPP, Fertigkeiten bzw. im Kampf die Waffen.
  **Wischen** wechselt den Charakter, ein Tippen auf den Namen klappt sie ein.
- Wer oben steht, gilt für alles darunter (Probe, Kauf, Waffentabelle).

### Karten, Kacheln und Listen

- **Karten** für Personen und Dinge (Charakter, NSC, Kämpfer, Posten der Crew), mit dem **Stift**
  zum Bearbeiten im Kopf.
- **Kacheln** für Werte auf einen Blick (Treibstoff, Fracht …), zwei nebeneinander.
- Listen sind **gruppiert** (nach Rolle, Welt, Zustand); Erledigtes und Totes steht **eingeklappt**
  darunter.
- **Chips** für kurze Verweise mit Etikett („Treffpunkt · Startown“); ein Tippen führt zum Ziel.
- **Anlegen am Ende der Liste**: Neues legt ein breiter Knopf unter der Liste an (`add-character`):
  „+ Neuer Charakter“, „+ Nach Regeln erschaffen“, „+ Neuer NSC“, „+ Neue Mission“. Er gehört zur
  Liste, nicht in die Aktionsleiste.

### Meldung und Hinweis

- Ging etwas nach einem Tippen nicht, erscheint oben eine **Meldung** (`notice-toast`) mit dem Grund;
  ✕ nimmt sie weg.
- Dauerhafte Erklärungen in einem Bereich stehen als kurzer Hinweis darüber, mit ✕ zum Ausblenden;
  das merkt sich das Gerät.

---

## Gesten und Eingabe

| Geste | Bedeutung |
|---|---|
| **Tippen** | Das Übliche: wählen, auslösen, öffnen |
| **Lange drücken** | Die zweite Absicht (`HoldButton`, 0,9 s): Der Knopf füllt sich von links, erst wenn er voll ist, löst es aus. Beispiele: trotzdem würfeln, obwohl der Test schon gemacht ist; die Erschaffung durchlaufen lassen; ohne Begegnung weiter; NSC hier platzieren; eine ganze Garbe löschen. Ein kurzes Tippen sagt, dass es einen langen Druck gibt |
| **Wischen** | In der Charakterleiste zum nächsten Charakter; das Ziehblatt eine Stufe weiter |
| **Ziehen** | Das Ziehblatt; Gegenstände im Gepäck und Personen auf Posten (kurz halten, dann ziehen; gleich wischen scrollt) |
| **Zwei Finger / Mausrad** | Zoomen auf der Karte |

**Tastatur** (Desktop): K Karte, W Würfeln (2W6 oder die vorbereitete Probe), N Notiz, T ein Tag,
Ziffern für die Bereiche, Esc schließt den obersten Dialog bzw. die Würfelbühne (der Knopf mit `data-escape`). Ein Kürzel steht
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
  Hand); das Gerät merkt sich die Bedienung (Stufe des Ziehblatts, eingeklappte Charakterleiste, ausgeblendete
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
- **Zwei Größen von Knöpfen:** Knöpfe zum Handeln sind groß (Aktionsleiste 54–56 px, `primary` und `ghost`
  48–52 px). Kompakte Bedienelemente in Listen und Karten sind kleiner: Chips, Unterreiter und Zellen
  der Waffentabelle 40 px, `ghost compact` 30–36 px. Kleiner als 30 px wird nichts, was man antippt.
- **Farben nur über die Variablen** in `:root` von `styles.css`, keine festen Werte in den Regeln und
  keine im Markup. Einzige Ausnahme: die schwarzen Haltepunkte der Log-Maske (`mask-image`) sind
  Maskensteuerung und keine Farbe.
- **Der Canvas malt nach der Farbtafel** (`src/view/farbtafel.ts`). Im Canvas greift `var()` nicht,
  darum führt `FARBTAFEL` dieselben Namen noch einmal – `--welt-globus` wird `FARBTAFEL.weltGlobus`,
  derselbe Wert. Ein Test rechnet jede Tafel gegen `:root`; sobald beides auseinanderläuft, fällt er
  durch. Zeichen, die nur der Canvas kennt (Sprunggrenze, Schusstrahl, das kleine Haus einer
  Kleinstadt), tragen keinen Namen im Stylesheet und sagen das im Kommentar. **Deckkraftstufen
  bekommen nie einen eigenen Namen**: `mitDeckkraft(FARBTAFEL.weltGlobus, .35)` rechnet sie aus der
  Grundfarbe, so wie im Stylesheet `rgba(79, 209, 255, .35)` dieselbe Farbe ist. **Ausnahme: Tafeln,
  die das Model selbst wählt** – die 16 Atmosphären mit ihren Wolkenfarben, die 19 Gelände- und die
  5 Klima-Töne in `src/view/sector/world-icon.ts` – bleiben Tabellen im Rendering; der Owner will sie
  am 26. November 2026 nicht einzeln benannt haben. Die Farbe des Atmosphären-Glühens führt trotzdem
  nur eine Tabelle (`ATMOSPHERE_GLOW` in `globe-render.ts`), Weltsymbol und Globus teilen sie sich.
- **Inline-SVG malt mit `var()` im Attribut** (`fill="var(--accent)"`): das tragen alle gängigen
  Browser, und die Töne bleiben in `:root`. Im Markup steht nur, *welche* Farbe ein Teil hat; Form
  und Breite bleiben Attribute.
- **`style={{ … }}` trägt nie Gestaltung.** Farbe, Größe, Schrift und Abstand stehen in Klassen,
  auch die nackten Eigenschaften `left`, `top`, `width`, `transform` und `grid-template-columns`.
  Zahlen aus dem Model – Position des Zuggeists, Füllstand einer Anzeige, Fortschritt, Anzahl der
  Felder – kommen als eigene Variable herein (`--ghost-x`, `--share`, `--progress`, `--seg-cols`,
  `--face`, `--deal`, `--hold-ms`); die Eigenschaft, die sie benutzt, steht in der Klasse.
- **Wirkungen haben eigene Familien** in `:root`, die Zahl ist die Deckkraft in Prozent:
  `--shadow-*` Erhöhung, `--scrim-*` dunkle Fläche, `--sheen-*` heller Saum und Reflex,
  `--on-fill*` Schrift auf gefülltem Grund, `--gold-edge-*` und `--gold-glow-*` für Gold,
  `--accent-glow-*`, `--accent-fill-*` und `--accent-edge-*` für Rot, `--danger` für Gefahren.
  Ein neuer Wert bekommt eine neue Variable, nie eine feste Zahl in der Regel.
- **Stoff und Status haben eigene Familien**: `--kern-*` das warme Dunkle der Würfel und Wurfplätze,
  `--material-*` deren Kunststoff, Augen, der Kartenrücken und das Landefährt, `--papier-*` Kartenblatt
  und Staub, `--welt-*` Gruppenstand, Schiffe und Markierungen auf Globus, Karte und Reiseroute,
  `--status-*` Absicht, Gefahr und Schaden auf dem Kampfbildschirm, `--strahl-*` Triebwerk, Schuss
  und Aufschlag, `--emblem-feld` das Feld im Emblem der App.
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

- [ ] Hängt an einem bestehenden Bereich (Unterreiter oder Dialog), kein neuer Bereich.
- [ ] Handlungen in der Aktionsleiste unten (höchstens fünf Knöpfe, sonst zwei Aktionsleisten), Wahl oben; im
      Ablauf „Abbrechen“ und Bestätigung; Anlegen am Ende der Liste.
- [ ] Dialog (groß, ✕ oben) oder Kurzdialog (klein, „Abbrechen“ unten).
- [ ] Geht auf halber Höhe des Ziehblatts und im Desktop-Modus in der Spalte.
- [ ] Jeder gesperrte Knopf sagt, warum; jeder Fehler steht als Meldung da.
- [ ] Jede Wahl hat genau ein Bedienelement.
- [ ] Würfe auf der Würfelbühne, überspringbar; Ergebnis im Log.
- [ ] Gold für die eigene Seite, Rot für die andere, Farben nur über Variablen; Begriffe aus dem
      Domänenmodell.
- [ ] Esc schließt, Tastatur stört nicht beim Tippen.
