# To-do

Was als Nächstes ansteht, der Reihe nach. Erledigtes fliegt raus (der Verlauf steht in Git). Wie
immer gilt: Was das Modell berührt, geht zuerst ins Domänenmodell und wird freigegeben, dann in den
Code ([AGENTS.md](AGENTS.md)). Die Regeln stehen in den Regeldokus unter [`docs/`](docs/) (`regeln-kampf.md`, `regeln-laufbahnen.md`,
`regeln-schiffe.md`, `regeln-sternsystem.md`).

## Die Karte führt

Grundkarte und Ziehblatt stehen (Schritt 1 und 2: Handy und Desktop). Als Nächstes:

- [ ] **Entschlacken (Schritt 3):** jeden Bereich für das Ziehblatt und die Seitenspalte des Desktops
  durchgehen: Kampf und Kampfsimulation kompakter, damit sie halb hochgezogen gehen. Die Reihe
  unten folgt dem GUI-Handbuch: die eigene Reihe eines Bereichs ersetzt die des Logs.
- [ ] **Bedienabläufe aus dem Domänenmodell lösen:** Die Begriffe der Oberfläche stehen seit dem
  25. November 2026 im GUI-Handbuch. In den Regeltexten von `docs/domain-model.md` sind Fachregel und
  Bedienung noch vermischt (rund 120 Zeilen mit Knopf, Tippen, Blatt, etwa „„+ Neuer NSC“ fragt
  zuerst nach der Rolle“). In einem eigenen Durchgang trennen, Bereich für Bereich: Die Regel
  bleibt im Modell, der Ablauf auf dem Bildschirm kommt ins Handbuch oder fällt weg.
- [ ] **Farben und Stile nach dem GUI-Handbuch** ([docs/gui-handbuch.md](docs/gui-handbuch.md)):
  am 25. November 2026 drei Durchgänge – 142 feste Werte auf Variablen in `:root` gestellt und
  15 ungenutzte Rückfallwerte wie `var(--muted, #9a9a9a)` gestrichen, wertgleich. Familien:
  `--shadow-*`, `--scrim-*`, `--sheen-*`, `--on-fill*`, `--gold-edge-*`,
  `--gold-glow-*`, `--accent-glow-*`, `--accent-fill-*`, `--accent-edge-*`, `--danger`, `--void*`,
  `--glass-*`, `--shade-*`, `--hairline`, `--line-mid`, `--line-bright`, `--pressed`. Fünf
  Fast-Duplikate (`#131313`, `#151515`, `#1b1b1b`, `#2c2c2c`, `#2a2a2a`) führt der Owner auf die
  bestehende Leiter zurück (`--panel`, `--raised`, `--rule-soft`, `--rule`; bis zu 3 von 255 Stufen).
  Am 25. November 2026 ein dritter Durchgang: die übrigen 70 festen Werte des Stylesheets auf sechs
  Familien nach den Begriffen des Owners gestellt – `--kern-*` (das warme Dunkle von Würfeln,
  Wurfplatz und Aufsetzlinie), `--material-*` (Kunststoff der Würfel, ihre Augen, Kartenrücken),
  `--papier-*` (Kartenblatt, Staub der Landung), `--welt-*` (Gruppenstand, Schiffe und Markierungen
  auf Globus, Karte und Reiseroute), `--status-*` (Absicht, Gefahr, Schaden) und `--strahl-*`
  (Triebwerk und Aufschlag), dazu `--gold-satt` für den Ladebalken. Wertgleich bewiesen: 1094
  Farbwerte vorher gegen 1094 nachher, jede Folge identisch. Die fünf Rot-Töne bleiben fünf Stufen
  (`--status-feind`, `-mittel`, `-hell`, `-licht`, `-45`) und `#ffffff` trägt zwei Namen
  (`--material-glanz` an den Würfeln, `--papier` am Kartenblatt); beides entschied der Owner am
  25. November 2026. Übrig bleiben zwei `#000` in `.log-scroll` – Haltepunkte der Maske, keine Farbe.
  Am 25. November 2026 auch die `style={{ … }}` geräumt – zuerst die 24 gestalterischen Stellen in
  Klassen überführt (neue Klassen `.sheet-head.centered`, `.section-title.small`, `.primary.wide`,
  `.remove-block`, `.roll-name`, `.roll-detail`, `.name-picker-hint`, `.haptic-answer` und die
  Mittelmarke im Lastbalken), dann die 11 Stellen, die nackt `left`, `top`, `width`, `transform`,
  `aspect-ratio` oder `grid-template-columns` setzten, auf eigene Variablen umgestellt: `--ghost-x`
  und `--ghost-y` (Zuggeist), `--share` (Lastanzeige), `--progress` (Wartenscheibe), `--land-x` und
  `--land-y` (Aufsetzpunkt), `--ratio` (Seitenverhältnis der Karte), `--seg-cols` (Spaltenzahl der
  Umschalter); die Kantenlänge des Weltsymbols steht in `.system-icon`. Das Handbuch schreibt die
  Regel jetzt vor: `style` trägt Zahlen aus dem Model als Variable, Gestaltung nie. Übrig bleibt
  damit nur noch eines: die 81 Canvas-Farben in `SpaceScreen.tsx` (33), `GlobeScreen.tsx` (26),
  `icons.tsx` (12), `Touchdown.tsx` (6) und `CardRollIcons.tsx` (4), die eine Palette in TypeScript
  brauchen, weil `var()` im Canvas nicht greift.
- [ ] **Zwei wackelnde GUI-Tests fest gegen den Zufall:** `e2e/shop.spec.ts:131` („Gruppe platzieren")
  scheiterte am 25. November 2026 an `Keine Welt entstanden`, `e2e/encounter.spec.ts:206` (Tiertabelle)
  wartete auf einen Wurf, den der Zufall gerade nicht brachte. Beide bestehen einzeln direkt danach
  wieder. In beiden Tests Welt und Würfelwerkzeug so setzen, dass das Ergebnis nicht vom Zufall hängt.

## Kampf

### 1. Weitere Regeln aus der Starter Edition

Aus [`docs/regeln-kampf.md`](docs/regeln-kampf.md), noch offen:

- [ ] **Entkommen und Ausweichen vor dem Kampf** (SE 5, SR 20): mit Überraschung immer ausweichen;
  NSC in Unterzahl mit Überraschung bei 7+; ohne Überraschung entkommen bei 9+ mit DM nach
  Reichweite. Bisher nur „über 20 Bands“.
- [ ] **Moral** (SE 5, SR 23): ab 25 % Verlusten jede Runde 7+, sonst Flucht; DMs für Militär,
  Leader, Tactics, über 50 % Verluste, Anführer ausgefallen.
- [ ] **Deckung und Verbergen** (SE 5, SR 26–27): aus der Deckung angegriffen −4, aus dem Verborgenen
  −1; wer in Deckung bleibt, kann nicht angegriffen werden.
- [ ] **Dunkelheit** (SE 5, SR 26): völlig −9 über Short, teilweise −6 über Medium (entschieden: nach
  SE); Electronic Sights heben es auf.
- [ ] **Ungeübte Waffe, Rest** (SR 22): −5 im Angriff gibt es schon (ohne natürliche Waffenkunde);
  offen ist +3 für den Angreifer.
- [ ] **Zubehör** (SE 4, 6, SR 25): Telescopic Sights (+4 Long/Very Long, verstellt bei 7+),
  Electronic Sights, Silencer (still, also kein Alarm), Shoulder Stock, Folding Stock.
- [ ] **Medizinische Drogen** (SE 7): Medical Slow Drug, Erholung in etwa einem Tag.
- [ ] **Schwerelosigkeit** (SE 5, SR 27): jede Runde 10+, sonst Kontrolle verloren.

### 2. Rund um den Kampf

- [ ] **Tierbegegnungen, Rest** (SE 18–19, SR 19–20, 46–49): Tabellen, Tierarten, Verhalten, Fallen
  und Ereignisse stehen. Offen sind die zwei Tier-DMs bei der Überraschung (10 oder mehr Tiere −1,
  Pouncer +1), Gewicht ±20 %, Führer und Psionik.

### Ideen, noch nicht entschieden

- [ ] **Tier als Begleiter**: ein Tier einer Begegnung in die Gruppe übernehmen (heute gesperrt,
  `adoptNpc`). Etwa als dauerhafter NSC mit neuer Rolle *Begleiter*, kämpft auf Seite der SC mit
  seinen Tierwerten (Hits, Angriffe, Speed), ohne Shop, Gepäck und Proben. Offen: wer es im Kampf
  steuert, ob und wie es mitreist (Passage?), wie es heilt, was aus dem Verweis auf die Tiertabelle
  seiner Welt wird, was der Editor bei einem Tier zeigt. Geht zuerst als Änderung ins Domänenmodell.
