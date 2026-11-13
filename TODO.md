# To-do

Was als Nächstes ansteht, der Reihe nach. Erledigtes fliegt raus (der Verlauf steht in Git). Wie
immer gilt: Was das Modell berührt, geht zuerst ins Domänenmodell und wird freigegeben, dann in den
Code ([AGENTS.md](AGENTS.md)). Die Regeln stehen in [`docs/regeln-kampf.md`](docs/regeln-kampf.md).

## Arbeitsweise

- [ ] **Freigaberegeln für Commits aufräumen** (Owner, weil es Claudes eigene Rechte betrifft): Die
  E-Mail steht nicht mehr im Befehl (`.gitconfig-owner`, siehe `AGENTS.md`). In
  `.claude/settings.json` stehen unter `allow` noch die alten Regeln mit `git -c user.name=… -c
  user.email=…`; sie durch `"Bash(git commit:*)"`, `"Bash(git merge:*)"`, `"Bash(git revert:*)"`
  und `"Bash(cp .gitconfig-owner .git/owner.gitconfig)"`, `"Bash(git config include.path owner.gitconfig)"` ersetzen.

## Kampf

### 1. Ausweichen (Evade)

SR 20 (*Evade*), SR 26 (*Reloading*). Ein erster Ausschnitt (2026-11-08b) ist zurückgenommen; er
kommt neu mit `Encounter "*" --> "*" Character : evading`.

- [ ] Statt anzugreifen weicht der Kämpfer am Zug aus; das ist sein Zug. Auch Nachladen zählt als
  Ausweichen (SR 26), ebenso eine Tür öffnen (SR 23).
- [ ] Hausregel, wie lange: ab seinem Zug bis zu seinem nächsten Zug (die App kennt keine Ansage vor
  der Runde). Wer angreift oder aussetzt, weicht nicht aus.
- [ ] Wirkung: DM für den Angreifer nach Reichweite: Close/Short −1, Medium −2, Long/Very Long −4.
  Wer ausweicht, pariert nicht. Beim Feuerstoß trifft es nur Nachbarn, die nicht ausweichen.
- [ ] Anzeige: Knopf „Ausweichen“ neben Aussetzen, ein Zeichen hinter dem Namen, im Angriff der
  Posten „weicht aus −2“.

### 2. Weitere Regeln aus der Starter Edition

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
- [ ] **Ungeübte Waffe** (SR 22): −5 im Angriff, +3 für den Angreifer; betrifft vor allem NSC.
- [ ] **Besondere Fälle** (SR 26): Waffe ziehen −3, Ziehen gegeneinander (2W6 + DEX), Klinge werfen
  (18+, 2D), Stangenwaffe werfen, Coup de Grâce (ohne Wurf).
- [ ] **Zubehör** (SE 4, 6, SR 25): Telescopic Sights (+4 Long/Very Long, verstellt bei 7+),
  Electronic Sights, Silencer (still, also kein Alarm), Shoulder Stock, Folding Stock.
- [ ] **Schneller laufen** (SE 7): 3 und 4 Bands je Runde, für Tiere und Fahrzeuge.
- [ ] **Medizinische Drogen** (SE 7): Medical Slow Drug, Erholung in etwa einem Tag.
- [ ] **Schwerelosigkeit** (SE 5, SR 27): jede Runde 10+, sonst Kontrolle verloren.
- [ ] **Traglast und Schwerkraft** (SE 5, SR 22): doppelte und dreifache Last, je nach Größe der Welt.

### 3. Rund um den Kampf

- [ ] **Häufigkeit von Begegnungen** (SE 20, SR 47, 50): täglich 5+ auf 1W6 für Personen, zweimal
  täglich für Tiere.
- [ ] **Tierbegegnungen** (SE 18–19, SR 46–49): Tabellen je Gelände, Tierarten, Treffer und Schaden,
  Verhalten, Fallen, Ereignisse; dazu die zwei Tier-DMs bei der Überraschung.
- [ ] **Book 4** (später): Moral für Militär, weitere Waffen, Kampffertigkeiten, abstraktes
  Schlachtsystem, Feldartillerie.

### Ideen, noch nicht entschieden

- [ ] Wunden wirken laut Regel erst am Ende der Runde (SE 6); die App lässt sie sofort wirken
  (Hausregel). Bleibt das so?
- [ ] Pfeil zu einem Ziel außerhalb des Bildschirms (bei vielen NSC scrollt die Spalte): ein Hinweis
  am Rand?
- [ ] Das Fadenkreuz ⌖ in der roten Marke unten im Zug größer, wie auf den Karten?
