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
- [ ] **Weltfarben nach dem Model benennen:** Weltsymbol und Globus malen nach Tafeln, die das Model
  wählt – 16 Atmosphären mit ihren Wolkenfarben, 19 Gelände- und 5 Klima-Töne in
  `src/view/sector/world-icon.ts`. Am 25. November 2026 ist die doppelt geführte Glühtafel zusammen-
  gelegt (`ATMOSPHERE_GLOW` in `globe-render.ts`, das Weltsymbol importiert sie jetzt). Ob diese
  Tafeln in `src/view/farbtafel.ts` umziehen und Namen nach den Begriffen des Modells bekommen,
  entscheidet der Owner.
- [ ] **Drei wackelnde GUI-Tests fest gegen den Zufall:** `e2e/shop.spec.ts:131` („Gruppe platzieren")
  scheiterte am 25. November 2026 an `Keine Welt entstanden`, `e2e/encounter.spec.ts:206` (Tiertabelle)
  wartete auf einen Wurf, den der Zufall gerade nicht brachte, und `e2e/space.spec.ts:127` (Beam
  Laser) meldete in der großen Suite `Kein Ziel` statt `schon gefeuert`. Alle drei bestehen einzeln
  direkt danach wieder. In allen drei Tests Welt und Würfelwerkzeug so setzen, dass das Ergebnis
  nicht vom Zufall hängt.

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
