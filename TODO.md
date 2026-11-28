# To-do

Was als Nächstes ansteht, der Reihe nach. Erledigtes fliegt raus (der Verlauf steht in Git). Wie
immer gilt: Was das Modell berührt, geht zuerst ins Domänenmodell und wird freigegeben, dann in den
Code ([AGENTS.md](AGENTS.md)). Die Regeln stehen in den Regeldokus unter [`docs/`](docs/) (`regeln-kampf.md`, `regeln-laufbahnen.md`,
`regeln-schiffe.md`, `regeln-handel.md`, `regeln-sternsystem.md`).

## Handel

### 1. Handel, Schritt 1

- [ ] **Würfelbühne für den Handel**: Waren-, Preis- und Auftragswürfe laufen noch ohne Würfelbühne
  (GUI-Handbuch, *Handel*).

### 2. Handel, was danach kommt

Bewusst nicht im ersten Schritt; jeweils erst ins Modell, dann in den Code.

- [ ] **Charter** ([Handelsbräuche](docs/regeln-handel.md#handelsbräuche), SR 30): Das Schiff wird
  vermietet statt selbst zu handeln – Sprungschiffe in 2-Wochen-Blöcken für Cr900 je Tonne
  Laderaum + Cr9.000 je Kabine + Cr900 je Niedrigbett, Small Craft für Cr1 je Tonne und Stunde
  (mindestens 12 Stunden). Der Eigner trägt die laufenden Kosten und stellt die Crew. Braucht einen
  Charterer (NSC/Patron) und eine Laufzeit am Schiff.
- [ ] **Shuttle-Gebühren** ([Handelsbräuche](docs/regeln-handel.md#handelsbräuche), SR 30): An
  Häfen A–C pendeln Shuttles zwischen Orbit und Oberfläche, Cr10 je Tonne Fracht, Cr20–120 je
  Passagier. Wird erst wichtig, wenn ein Schiff ohne Stromlinienform im Orbit bleibt und Fracht
  oder Passagiere hinunter müssen (Lieferung im Orbit oder am Boden).
- [ ] **Subventionierte Handelsschiffe** ([Rechnung einer Handelsfahrt](docs/regeln-handel.md#rechnung-einer-handelsfahrt),
  SR 29): ab 600-t-Rumpf; die Regierung zahlt die Raten und erhält 50 % der Bruttoeinnahmen, das
  Schiff bedient eine feste Route über 2–12 Welten und kann eingezogen werden. Braucht Route und
  Einnahmenteilung am Schiff.
- [ ] **Bumping der Middle Passage** ([Preise und Bedingungen](docs/regeln-handel.md#preise-und-bedingungen-sr-2829-se-9),
  SR 28): Ein spät kommender Hochpassagier verdrängt einen Mittelpassagier, der sein Geld
  zurückbekommt. Gilt für zahlende Passagiere an Bord und für die Gruppe als Middle-Passagiere auf
  fremden Schiffen.
- [ ] **Blinde Passagiere** ([Preise und Bedingungen](docs/regeln-handel.md#preise-und-bedingungen-sr-2829-se-9),
  SR 28): Entdeckung 4+ je Tag; Reaktionswurf des Kapitäns, bei 6− durch die Schleuse.
- [ ] **Entführung** ([Preise und Bedingungen](docs/regeln-handel.md#preise-und-bedingungen-sr-2829-se-9),
  SR 28–29): 18+ auf 3D je Reise mit fremden Passagieren; mit Anti-Hijack-Programm kommen die
  Entführer nur auf 5− auf die Brücke. Braucht eine Begegnung an Bord.
- [ ] **Steward- und Medic-Pflicht** ([Preise und Bedingungen](docs/regeln-handel.md#preise-und-bedingungen-sr-2829-se-9);
  Crew in [`regeln-schiffe.md`](docs/regeln-schiffe.md#crew)): ein Steward je 8 Hochpassagiere,
  ein Medic je 120 Passagiere; im ersten Schritt prüft die App das nicht.
- [ ] **Working Passage** ([Preise und Bedingungen](docs/regeln-handel.md#preise-und-bedingungen-sr-2829-se-9),
  SR 28): NSC fliegt ohne Geld gegen Arbeit, höchstens drei Sprünge, sonst gilt er als angeheuert.
  Kommt mit den Hirelings.
- [ ] **Ladungsverlust im Raumkampf**: Treffer auf den Laderaum ziehen heute Tonnen ab; mit den
  Ladungen muss festgelegt werden, welche Ladung es trifft.

## App-Update

- [ ] **Neue Version anbieten, wenn eine Cloud-Datei nicht lesbar ist:** Scheitert beim OneDrive-Abgleich
  das Lesen einer Kampagnendatei (etwa weil eine neuere App sie geschrieben hat), fragt die App den
  Service Worker nach einer neuen Version. Gibt es eine, steht oben ein Banner „Neue Version da · Neu
  laden“ (wie „OneDrive hat dich abgemeldet“), statt dass der Abgleich nur einen Fehler meldet.
  Neu geladen wird erst auf Tipp, nicht automatisch, damit keine halb geschriebene Notiz verloren geht.
  Anlass: Seit 2026-11-27 fehlt in Kampagnendateien die Stufe; eine ältere, noch offene App lehnt sie ab.

## Kampf

### 1. Weitere Regeln aus der Starter Edition

Aus [`docs/regeln-kampf.md`](docs/regeln-kampf.md), noch offen:

- [ ] **Entkommen und Ausweichen vor dem Kampf** (SE 5, SR 20): mit Überraschung immer ausweichen;
  NSC in Unterzahl mit Überraschung bei 7+; ohne Überraschung entkommen bei 9+ mit DM nach
  Reichweite. Bisher nur „über 20 Bands“.
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

## Raumkampf

Die offenen Stufen aus dem Stufenplan in [`docs/konzept-raumkampf.md`](docs/konzept-raumkampf.md)
(Reihenfolge vom Owner bestätigt am 22. November 2026); Regeln in
[`docs/regeln-schiffe.md`](docs/regeln-schiffe.md#raumkampf). Jede Stufe ist eine eigene Änderung
im Modell.

- [ ] **Stufe 3: Raketen und Sand** (SR 39–42, SE 12–13; MD, SS3): Standardrakete 5G6 als eigene
  Einheit mit Brennschluss, Abfangen auf 2.500 km, Kontakt, Detonation 1W Treffer, Anti-Missile,
  ECM 9+, Nachladen (Gunner feuert in der Runde nicht), Munition in der Werft kaufen; Sandwolke als
  treibende Einheit, −3 je Raumband. Dazu Raketen und Sand für die Small Craft und das Log der
  laufenden Runde.
- [ ] **Stufe 4b: Small Craft im Kampf und Entern**: Aussetzen während des Kampfs, Brennstufen nach
  Mayday, Rotten (ein Schub für mehrere), alle eigenen Einheiten kämpfen, Gunner der Small Craft,
  fremde Small Craft (das \* der Starship Encounter Table); Entern unter 100 km und 0,1 km/s mit
  Übergang in den Kampf; Absichten *Entern* und *Abfangen* für NSC-Schiffe.
- [ ] **Stufe 5: Ortung** (SR 39–42): Reichweiten 15/60/90 Raumbänder, Schatten der Körper,
  nicht geortete Einheiten am zuletzt bekannten Ort. Mit ihr entscheiden: *Wer schubt, leuchtet*
  als Hausregel?
- [ ] **Dekompression** bei Hull-Treffern (heute ohne Folgen, siehe `modell/schiffe.md`).
- [ ] **Werft umbauen und Schiffskauf nur an einer Werft** (freigegeben 2026-11-28): Kapazitätskopf
  mit der Kasse, Unterreiter *Mein Schiff · Schiffe · Small Craft*, Hardpoint-Karten mit
  Kurzdialogen statt Auswahlfeldern, Sperrhinweis; Kauf nur an Raumhafen A (Small Craft auch B).
  Bauanleitung mit Texten, Tests und Reihenfolge: `docs/konzept-werft.md`, Entwurf
  `docs/mock/werft.html`.
- [ ] **Danach**, ohne eigene Stufe: Raketen aus Bauteilen nach Supplement 3, Minen, Zoll und
  Patrouille mit dem Handel, Bergung von Wracks.

## Psionik

- [ ] **Regeln übertragen**: Psionik ist noch in keinem Regeldoku; SE 24 steht in
  `docs/regeln-kampf.md` nur unter „nicht übernommen“; den Text dazu vermutlich im Regelheft (SR) suchen.
  Erst das PDF lesen und ein eigenes Regeldoku `docs/regeln-psionik.md` anlegen (etwa
  Psi-Stärke, Test und Training, Talente, Kosten und Erholung, Drogen – was die Quellen
  hergeben), in AGENTS.md bei den Regeldokus nachtragen, dann ins Domänenmodell.
- [ ] **Psionik bei Tieren und Begegnungen**: die Tier-Psionik (offen unter *Tierbegegnungen, Rest*)
  und die *Psionic Assaulters* aus den Ereignissen (`regeln-kampf.md`), sobald es Psi-Werte gibt.
