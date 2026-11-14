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

### 4. NSC

- [ ] **Weitere Laufbahnen** für Patron-NSC, die besser zu den Berufen passen als die sechs des
  Regelwerks (heute stehen viele unter Other, siehe `docs/patron-nsc.md`), z. B. aus anderen
  Traveller-Büchern; erst nachsehen, welche Bücher Laufbahnen oder NSC-Tabellen haben.

### Ideen, noch nicht entschieden

- [ ] **Tier als Begleiter**: ein Tier einer Begegnung in die Gruppe übernehmen (heute gesperrt,
  `adoptNpc`). Etwa als dauerhafter NSC mit neuer Rolle *Begleiter*, kämpft auf Seite der SC mit
  seinen Tierwerten (Hits, Angriffe, Speed), ohne Shop, Gepäck und Proben. Offen: wer es im Kampf
  steuert, ob und wie es mitreist (Passage?), wie es heilt, was aus dem Verweis auf die Tiertabelle
  seiner Welt wird, was der Editor bei einem Tier zeigt. Geht zuerst als Änderung ins Domänenmodell.

- [ ] Wunden wirken laut Regel erst am Ende der Runde (SE 6); die App lässt sie sofort wirken
  (Hausregel). Bleibt das so?
- [ ] Pfeil zu einem Ziel außerhalb des Bildschirms (bei vielen NSC scrollt die Spalte): ein Hinweis
  am Rand?
- [ ] Das Fadenkreuz ⌖ in der roten Marke unten im Zug größer, wie auf den Karten?

## Orakel-Screen

Durchsicht vom 2026-11-14 (die App headless bedient, 390×844, 360×640, 844×390 quer, 1024×768,
1440×900). Der neue Aufbau (2026-11-14d: Orakel auf der Karte, eine Reihe Knöpfe, Notiz und Deutung
im Blatt, kompakter Log, Charakter kompakt) ist umgesetzt; offen ist noch:

### 1. Fehler

- [ ] **Querformat und sehr niedrige Bildschirme:** Leiste und Knöpfe geben nicht nach
  (`flex: 0 0 auto`), die App scrollt nicht. Im Querformat (844×390) bleibt für den Log kaum Platz.
  Mögliche Lösung: Die Leiste mit dem Charakter oben klappt von selbst ein, wenn die Höhe nicht
  reicht; quer zwei Spalten.
- [ ] **Karteneintrag im Log läuft aus dem Kasten**, wenn die Orakel-Spalte schmal ist (1024 px):
  `.picks` gibt der Beschriftung die volle Breite (`auto`), der Wert bricht lange Wörter nicht um.
- [ ] **Karte auf 360×640:** Die Tafel NSC allein ist höher als der freie Platz; aufgeklappt muss
  man dort etwas scrollen. Kleiner geht es nur mit kleineren Feldern.

### 2. Bedienung

- [ ] **Notiz und Deutung lassen sich nicht ändern**, nur löschen und neu schreiben. Ändern wäre
  eine neue Eingabe an den Controller; vorher prüfen, ob es das Domänenmodell berührt.
- [ ] **Ja/Nein auf der Karte vibriert nicht eigens** beim Antippen der Stufe (nur wie ein Feld).
- [ ] **Am Gerät prüfen** (headless nicht zu sehen): Bleibt das Blatt für Notiz und Deutung über
  der Bildschirmtastatur sichtbar?

### 3. Tippziele

- [ ] Unter 44 px: die Punkte unter der Leiste (28×22), Stift und Pfeil nebeneinander (32×36), die
  Fertigkeiten (36 hoch), die kleinen Knöpfe Deuten und Löschen an Deutung, Schaden und Garbe
  (30×30).

### 4. Tempo

- [ ] **Ein langer Log ist langsam.** Gemessen vor dem Umbau: mit 1500 Einträgen kostete jeder
  Tastendruck im Fragefeld 80 ms, ein Wurf 173 ms. Das Fragefeld ist weg, ein Wurf zeichnet aber
  weiter den ganzen Log: `LogList` ist nicht mit `memo` geschützt; die Gruppen suchen je Eintrag den
  ganzen Log ab (`interpretationsAt`, `damageAt`, Garbe: O(n²)). Lösung: Deutungen und Schaden einmal
  je Log indizieren, nur die letzten Einträge zeichnen und „Ältere zeigen“ anbieten.

### 5. Aufräumen

- [ ] Schriftgrößen stehen in `EntryBody` als `style` im Code (12, 14, 20, 22, 26); das Urteil ist
  je Art des Eintrags verschieden groß. In Klassen in `styles.css` überführen und vereinheitlichen.
- [ ] `WeaponChips` in `CharacterStrip.tsx` hat zwei Kommentarblöcke hintereinander; der erste ist
  überholt.

### 6. Ideen, noch nicht entschieden

- [ ] **Zufallsereignis nach Mythic:** Ein Pasch im Orakelwurf bis zum Chaosfaktor (11, 22, 33, 44,
  55) könnte das Feld *Zufallsereignis* der Karte hervorheben. Berührt das Modell.
- [ ] **Leiste als eine Zeile:** eingeklappt Name und UPP als Traveller-Zeile (`Kira Vant 7A8975`),
  aufgeklappt wie heute für die Probe. Dann sieht man die Attribute, ohne dass die Leiste 250 px
  kostet.
- [ ] **Filter „Nur Geschichte“:** Fragen mit Antwort, Deutungen und Notizen; einfache Würfe,
  Angriffe und Schaden ausgeblendet. Zum Nachlesen, was passiert ist.
- [ ] **Gleiche Würfe in Folge zusammenfassen:** drei 2W6 hintereinander als eine Zeile
  (`2W6 · 7 · 4 · 10`), ebenso die Angriffe einer Kampfrunde.
