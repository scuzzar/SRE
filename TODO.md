# To-do

Was als Nächstes ansteht, der Reihe nach. Erledigtes fliegt raus (der Verlauf steht in Git). Wie
immer gilt: Was das Modell berührt, geht zuerst ins Domänenmodell und wird freigegeben, dann in den
Code ([CLAUDE.md](CLAUDE.md)). Die Regeln stehen in [`docs/regeln-kampf.md`](docs/regeln-kampf.md).

## Arbeitsweise

- [ ] **Commits ohne Rückfrage** (Owner, weil es Claudes eigene Regeln und Rechte betrifft): Mit Name
  und E-Mail im Befehl (`git -c user.email=…`) fragt das System bei jedem Commit nach; mit
  `git config` einmal je Sitzung nicht.
  - `CLAUDE.md`: Punkt „Commits laufen unter dem Namen des Owners“ ändern: zu Beginn jeder Sitzung
    einmal `git config user.name Scuzzar` und `git config user.email scuzzarGalaxy@googlemail.com`,
    dann einfach `git commit …` (ebenso Merges nach `main`); kein `git -c …` mehr.
  - `.claude/settings.json`, in `allow` ergänzen: `"Bash(git commit:*)"`, `"Bash(git merge:*)"`,
    `"Bash(git config user.name Scuzzar)"`, `"Bash(git config user.email scuzzarGalaxy@googlemail.com)"`.

## Kampf

### 1. Umbau: NSC der Begegnung als vollständige Charaktere

Entschieden am 8. November 2026: Es gibt nur noch eine Klasse für Kämpfer. Die NSC einer Begegnung
werden vollständig als `Character` erzeugt und hängen an der Begegnung, nicht an der Kampagne.

- [ ] Modelländerung freigeben (gezeichnet als 2026-11-08c,
  [`docs/changes/2026-11-08-nsc-als-charaktere.png`](docs/changes/2026-11-08-nsc-als-charaktere.png)):
  - `Npc` entfällt; `Encounter "1" *-- "*" Character : npcs {ordered}`.
  - Anführer als Verweis der Begegnung: `Encounter --> "0..1" Character : leader`.
  - Angriff und Angriffsergebnis: Angreifer `for` → `Character [1]`, Ziel `against` →
    `Character [0..1]`; `by` und `victim` entfallen.
  - Heilung: `for` → `Character [1]`; `npc` entfällt.
  - `acted` → `Character [*]` und `/turn` → `Character [0..1]` statt Ids.
  - Übernehmen heißt Umhängen von der Begegnung in die Kampagne (als SC oder dauerhafter NSC);
    `became` entfällt.
- [ ] NSC beim Würfeln vollständig erzeugen: UPP, Fertigkeit in ihrer Waffe als echte Stufe, Besitz
  mit Waffe, Rüstung und Magazinen, Primärwaffe, getragene Rüstung.
- [ ] Code umstellen: Begegnung, Kampfsimulation, Angriff, Wunden, Heilung, Ausdauer, Parade,
  Alarm, Übernehmen, Snapshot, Ansicht. Die Unterscheidung „SC oder NSC“ (`Combatant`) soll dabei
  verschwinden, wo sie nur wegen der zwei Klassen da war.
- [ ] Kampagnendatei: alte Spielstände beim Laden umschreiben (NSC zu Charakteren, die vier Verweise
  des Angriffs zu zwei, der Patient der Heilung). Die Ids bleiben, damit der Log weiter stimmt.
- [ ] NSC zählen Munition wie SC (entschieden am 8. November 2026): Schusswaffe geladen, 1W4
  Magazine im Besitz; leer lädt der NSC nach, ohne Magazin greift er mit den Händen an.

### 2. Ausweichen (Evade), nach dem Umbau

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

### 3. Weitere Regeln aus der Starter Edition

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

### 4. Rund um den Kampf

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
