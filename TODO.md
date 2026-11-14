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

Durchsicht vom 2026-11-14: die App headless bedient (390×844, 360×640, 844×390 quer, 1024×768,
1440×900) und `src/view/oracle/` gelesen. Die Zahlen sind gemessen. Oben steht, was kaputt ist,
darunter, was besser ginge.

### 1. Fehler

- [ ] **Niedrige Bildschirme schneiden die Knöpfe ab.** Leiste und Knöpfe unten geben beide nicht
  nach (`flex: 0 0 auto`), die App scrollt nicht (`.app { overflow: hidden }`). Bei 360×640 mit
  vorbereiteter Probe und Text im Feld liegt die Zeile mit Stufe und „Ja/Nein“ hinter der Leiste
  mit den Bereichen, dem Log bleiben rund 35 px. Im Querformat (844×390) ist nur die halbe Schreibzeile zu
  sehen; Karte, 2W6, Stufe und Ja/Nein sind nicht erreichbar. Mögliche Lösung: Die Leiste mit dem
  Charakter oben klappt von selbst ein, wenn die Höhe nicht reicht; quer zwei Spalten.
- [ ] **Karteneintrag im Log läuft aus dem Kasten**, wenn die Orakel-Spalte schmal ist (1024 px
  Breite, Spalte 269 px): „Reichtümer“, „elektrisch“ stehen rechts über dem Rand. Ursache:
  `.picks` gibt der Beschriftung die volle Breite (`auto`), der Wert bekommt den Rest und bricht
  lange Wörter nicht um.
- [ ] **Neues Ergebnis bleibt unsichtbar, wenn man hochgescrollt hat.** Nach einem Wurf bleibt der
  Log oben stehen (gemessen: Scrollstand −1225 → −1332), ohne Hinweis. Entweder zum Neuesten
  springen oder unten einen Knopf „Neuestes“ zeigen.
- [ ] **Einträge im Log sind mit der Tastatur nicht erreichbar** (kein fokussierbares Element im
  Log): Ziel der Deutung wählen und Löschen gehen nur mit Maus oder Finger, auch im Desktop-Modus.

### 2. Platz

- [ ] **Der Log ist das Kleinste auf dem Screen.** Bei 390×844 mit offener Leiste bleiben ihm rund
  295 px, also ein bis zwei Einträge; mit vorbereiteter Probe und Zielzeile rund 195 px. Mit
  eingeklappter Leiste sind es 446 px. Ideen: Attribute in der Leiste als schmale Zeile wie im
  Kampf; Leiste klappt ein, sobald man im Log scrollt oder tippt.
- [ ] **Das Textfeld ist zu schmal.** 183 px bei 390 px Breite, 153 px bei 360 px (der Platzhalter
  ist abgeschnitten), 137 px im Desktop-Modus bei 1440 px. Man sieht rund 18 Zeichen einer Frage.
  Ideen: „Deuten“ und „Notiz“ überall nur als Symbol (wie heute zwischen 1024 und 1279 px), oder
  ein Feld, das mit dem Text in die Höhe wächst; die Orakel-Spalte (345 px) auf breiten
  Bildschirmen breiter.
- [ ] **Umbrüche in den Knöpfen:** „Gering 25 % · 10+“ bricht bei 360 px um, „Probe würfeln“ bei
  360 px und im Desktop-Modus bei 1440 px auf zwei Zeilen.

### 3. Bedienung

- [ ] **Die Zielzeile irritiert beim Fragen.** Sie zeigt „Deutung zu NEIN“, sobald Text im Feld
  steht, also auch, während man die nächste Frage tippt. Idee: kleiner und am Knopf „Deuten“
  statt als eigene Zeile über dem Feld.
- [ ] **Notiz und Deutung lassen sich nicht ändern**, nur löschen und neu schreiben. Ändern wäre
  eine neue Eingabe an den Controller; vorher prüfen, ob es das Domänenmodell berührt.
- [ ] **Mehrzeilige Notizen gehen nicht** (einzeiliges Feld), obwohl der Log Zeilenumbrüche zeigt.
- [ ] **Ja/Nein hat weder Vibration noch Inszenierung**, anders als 2W6 und Karte: Die Antwort
  steht einfach im Log. Mindestens `haptic` wie bei den anderen beiden.
- [ ] **Der Hinweis „Ergebnis antippen zum Deuten · lange drücken zum Löschen“** steht am Anfang
  des Logs und ist weg, sobald der Log länger als der Bildschirm ist. Mit der Maus stimmt „lange
  drücken“ nur halb (Rechtsklick geht auch).
- [ ] **Beschriftung „1–10“** im Karteneintrag des Logs sagt allein nichts; etwa „Zahl 1–10“.
- [ ] **Am Gerät prüfen** (headless nicht zu sehen): Bleibt die Schreibzeile mit „Deuten“ und
  „Notiz“ über der Bildschirmtastatur sichtbar? „Karte ziehen“ mit Frage geht vermutlich erst,
  wenn die Tastatur zu ist.

### 4. Tippziele

- [ ] Unter 44 px: die Punkte unter der Leiste (28×22), Stift und Pfeil nebeneinander (32×36), die
  Fertigkeiten (36 hoch). Die Kontraste sind in Ordnung (alle ≥ 4,7 : 1).

### 5. Tempo

- [ ] **Ein langer Log macht das Tippen zäh.** Mit 1500 Einträgen (10 600 Elemente) kostet jeder
  Tastendruck im Fragefeld 80 ms (Median, Chromium am Rechner; ein Smartphone ist langsamer), ein
  Wurf 173 ms. Ursachen: Der Text des Felds liegt in `App`, also zeichnet jeder Tastendruck den
  ganzen Log neu (`LogList` ist nicht mit `memo` geschützt, `onPick` entsteht jedes Mal neu); die
  Gruppen suchen je Eintrag den ganzen Log ab (`interpretationsAt`, `damageAt`, Garbe: O(n²)).
  Lösung: `LogList` memoisieren, Deutungen und Schaden einmal je Log indizieren, nur die letzten
  Einträge zeichnen und „Ältere zeigen“ anbieten.

### 6. Aufräumen

- [ ] Schriftgrößen stehen in `EntryBody` als `style` im Code (12, 14, 20, 22, 26); das Urteil ist
  je Art des Eintrags verschieden groß. In Klassen in `styles.css` überführen und vereinheitlichen.
- [ ] `WeaponChips` in `CharacterStrip.tsx` hat zwei Kommentarblöcke hintereinander; der erste ist
  überholt.

### 7. Neuer Aufbau (2026-11-14d, wartet auf Freigabe)

Wunsch des Owners vom 2026-11-14. Entwurf zum Anfassen:
[`docs/ui-entwurf/orakel-neu/Entwurf.html`](docs/ui-entwurf/orakel-neu/Entwurf.html); die Änderung am
Modell steht in `docs/domain-model.md` unter *Orakel auf der Karte*, der Ausschnitt in
[`docs/changes/2026-11-14-orakel-auf-der-karte.png`](docs/changes/2026-11-14-orakel-auf-der-karte.png).
Erst nach der Freigabe in den Code.

- [ ] **Orakel auf der Karte:** Orakelfeld mit der Antwort je Stufe, sechs Antworten (Ja!, Ja,
  Ja?, Nein?, Nein, Nein!); die Antwort steht in der Kartenauswahl, `OracleAnswer` entfällt, alte
  Antworten werden beim Laden und beim Import umgestellt. Der Knopf „Ja/Nein“ entfällt, auch in
  der Leiste der Charaktererschaffung; die Frage schreibt man oben auf die Karte.
- [ ] **Eine Reihe Knöpfe mit Symbolen:** Notiz, Würfeln, Karte. Die Schreibzeile entfällt.
- [ ] **Deuten und Notiz als Blatt:** „Deuten“ ist ein Knopf am Ergebnis (am neuesten immer, bei
  älteren nach dem Antippen), „Notiz“ der Knopf unten.
- [ ] **Stufe nur mit der Probe:** Die Auswahl 6+ / 8+ / 10+ erscheint erst, wenn am Charakter oben
  eine Fertigkeit gewählt ist.
- [ ] **Charakter oben kompakt:** Attribute und Fertigkeiten je eine Zeile (138 statt 248 px); mit
  gewählter Fertigkeit steht der DM hinter dem Wert.
- [ ] README, `ARCHITECTURE.md`, Tests und die Tastenkürzel nachziehen (J entfällt).
- Mit dem neuen Aufbau erledigt sich aus der Durchsicht: das schmale Textfeld, die Zielzeile, die
  Umbrüche in der Stufenzeile, mehrzeilige Notizen; der Log bekommt bei 390×844 rund 516 statt
  295 px.

### 8. Ideen zur Bedienung, noch nicht entschieden

Entwurf zum Anfassen: [`docs/ui-entwurf/log-kompakt/Entwurf.html`](docs/ui-entwurf/log-kompakt/Entwurf.html)
(Heute und Vorschlag mit demselben Log). Alles hier ist reine Darstellung, das Domänenmodell bleibt,
wie es ist; die README beschreibt Log und Schreibzeile und müsste mitziehen.

- [ ] **Log kompakt:** Das neueste Ergebnis bleibt der große Kasten, alles Ältere wird eine Zeile:
  links die Frage (oder die Probe, der Wurf), rechts das Ergebnis (JA, NEIN, ERFOLG, 7). Deutungen
  stehen eingerückt darunter, Kartenauswahl als kleine Felder, Notizen als Text mit gestricheltem
  Rand. Im Entwurf sind bei 390×844 mit offener Leiste vier Einträge ganz zu sehen statt zwei; eine
  Zeile ist rund 39 px hoch, ein Kasten heute 95 bis 130 px.
- [ ] **Antippen klappt auf** statt still das Ziel der Deutung zu wählen: Die Zeile zeigt dann
  Einzelheiten (Stufe, W100, Uhrzeit) und die Knöpfe „Deuten“ und „Löschen“. Das ersetzt das lange
  Drücken und den Hinweis oben im Log, und die Zeile ist ein Knopf, also mit der Tastatur
  erreichbar (löst zwei Punkte aus 1 und 3). Die Uhrzeit steht nur noch aufgeklappt.
- [ ] **„Deuten“ und „Notiz“ erst zeigen, wenn Text im Feld steht.** Leer gehört die ganze Breite
  dem Feld (358 statt 183 px); heute stehen dort zwei ausgegraute Knöpfe.
- [ ] **Leiste als eine Zeile:** eingeklappt Name und UPP als Traveller-Zeile (`Kira Vant 7A8975`),
  aufgeklappt wie heute für die Probe. Dann sieht man die Attribute, ohne dass die Leiste 250 px
  kostet.
- [ ] **Filter „Nur Geschichte“:** Fragen mit Antwort, Deutungen und Notizen; einfache Würfe,
  Angriffe und Schaden ausgeblendet. Zum Nachlesen, was passiert ist.
- [ ] **Gleiche Würfe in Folge zusammenfassen:** drei 2W6 hintereinander als eine Zeile
  (`2W6 · 7 · 4 · 10`), ebenso die Angriffe einer Kampfrunde.
