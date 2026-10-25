# Solo RPG Engine

Eine App für **Solo-Rollenspiel mit Classic Traveller**. Sie soll zwei Dinge in einem Werkzeug vereinen:

1. **Die Regeln von Classic Traveller** – vollständig implementiert, damit Würfe, Tabellen und Abläufe nicht mehr von Hand nachgeschlagen werden müssen.
2. **Ein Orakel**, das die Spielleitung ersetzt – angelehnt teils an **Mythic** (Mythic Game Master Emulator) und teils an den **Game Master's Apprentice (GMA)**.

> Status: **Version 1 in Arbeit.** Wir fangen klein an, mit einer **mobilen Version 1** (siehe [Version 1](#version-1-mobil)). Gebaut wird domänengetrieben: Das [Domänenmodell](docs/domain-model.md) für Version 1 ist freigegeben, Orakel-Screen und Charakter-Screen sind umgesetzt. Technik, MVC-Aufbau und Befehle stehen in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Version 1 (mobil)

Die erste Version ist bewusst klein und **für das Smartphone** gebaut. Eine Desktop-Version ist später denkbar, hat aber keine Priorität.

**Hauptscreen (Orakel)**, klar und ohne Ablenkung. Aufbau wie ein Chat: oben der **Log**, der nach oben wächst (das Neueste steht unten, direkt über den Knöpfen). Unten, im Daumenbereich, sitzen fest **Orakel, „Karte ziehen“ und „2W6“**.
- **Optionale Frage**: Ein Fragefeld über den Knöpfen gilt für das Orakel **und** für die Karte. Die Frage wird mit der Antwort bzw. der Kartenauswahl im Log gespeichert.
- **Ja/Nein-Orakel** mit drei Stufen wie beim GMA: Hoch (75 %), Mittel (50 %), Gering (25 %). Die Stufe wird ganz unten eingestellt und bleibt stehen; sie gilt auch als Schwierigkeit für Proben (6+ / 8+ / 10+).
- **Knopf „Karte ziehen“**: zieht eine Inspirationskarte im Aufbau des GMA2e (Zufallsereignis, Sinne, Szenentyp, Besitz, Situation, Namen, Merkmale, Flavortext). Die Karte landet **nicht direkt im Log**, sondern erscheint im Vordergrund:
  - Eine gestellte Frage steht oben auf der Karte.
  - Man tippt die Felder an, die man nutzen will (**Mehrfachauswahl**, auch über mehrere Themen hinweg). Ein Feld aus Mythic zieht immer ein **Paar** von Begriffen (verraten · Technologie); man nimmt das Paar immer ganz.
  - Unten bestätigt ein **Haken** die Auswahl: Nur die ausgewählten Einträge kommen in den Log.
  - Außerdem: Karte verwerfen oder neu ziehen.
  - Die Karte kommt mit ihrem Rücken nach oben aus dem Daumenbereich und wird umgedreht; „Neu ziehen“ dreht eine neue Karte um. Verwerfen und Übernehmen lassen sie hinausgleiten.
- **Knopf „2W6“**: ein einfacher Würfelwurf durch die App. Zwei Würfel werden im Vordergrund geworfen, angelehnt an Baldur's Gate 3: dunkle Würfel mit goldenen Augen, die aufschlagen, liegen bleiben und aufleuchten; dann die Summe. Ein Tippen überspringt.
- **Animation und Vibration**: Würfeln und Karte sind kurz animiert (unter zwei Sekunden) und vibrieren dazu (Android über die Vibrations-API, iPhone ab iOS 18 über einen kurzen Ruck). Wer im System „Bewegung reduzieren“ eingestellt hat, sieht gleich das Ergebnis.
- **Log**: Orakelantworten, Würfe und die ausgewählten Karteneinträge landen untereinander im Log, das neueste unten.

**Zweiter Screen: Charaktere**
- Karten für die **Spielercharaktere** mit UPP, Fertigkeiten, Ausrüstung, Credits und Notiz. Charaktere legt man in der App an und bearbeitet sie; Fertigkeiten kommen aus einer festen Liste. Wer schon im Log vorkommt, wird nicht gelöscht, sondern ausgeblendet.
- **Proben direkt im Charakter-Screen** (kein eigenes Fenster):
  - Auf der Charakterkarte die **Fertigkeit** antippen (oder „Ohne“ für −3); die Fertigkeiten stehen immer sichtbar unter dem UPP, mit einem Kürzel aus drei Zeichen (Pil-2), damit sie in eine Zeile passen; ein Tippen startet die Probe direkt, ohne die Karte aufzuklappen. Erst ein Tippen auf den Namen klappt die Details auf: volle Namen, Ausrüstung, Credits und Notiz. Herkunft, Terms und Alter stehen in der Zeile des Namens.
  - **Attribute** sind standardmäßig nicht dabei und lassen sich **erst nach der Fertigkeit** dazuwählen; ein Tippen auf ein Attribut im UPP schaltet es an oder aus; der DM ergibt sich aus dem Wert (9+ → +1, 6–8 → ±0, 5− → −1). Sobald die Fertigkeit gewählt ist, zeigt jedes Attribut an, ob es überhaupt +1 oder −1 brächte; neutrale Werte sind nicht wählbar.
  - **Unten** stehen fest die drei Schwierigkeiten **6+ / 8+ / 10+** (dieselbe Auswahl wie Hoch/Mittel/Gering beim Orakel), in derselben Zeile der Knopf „Probe würfeln“. Darüber steht knapp die Probe: die Fertigkeit ausgeschrieben mit Zielwert (Pilot-2 · 10+), darunter DM, gewählte Attribute und der nötige Wurf (2W6 +3 (DEX +1) · Braucht 7+). Ohne Prozente und ohne den Namen des Charakters, der ist auf seiner Karte markiert.
  - Das **Ergebnis erscheint als Popup**, wie in Baldur's Gate 3: oben der Zielwert, darunter rollen die Würfel, dann kommt der DM dazu, zuletzt fällt das Urteil (Erfolg golden, Fehlschlag rot). Ein Tippen springt zum Urteil. Danach geht es zurück zum Orakel-Screen; **geloggt wird nur dort**. Der Charakter-Screen hat keinen Log.

**UI-Entwurf:** Der klickbare Entwurf liegt in [docs/ui-entwurf](docs/ui-entwurf/).

**Bewusst noch nicht in Version 1:** physisches Würfeln, Kampf, Welten- und Charaktererschaffung, Sektorkarte, Schiffe, NSC-Karten, Chaosfaktor, Szenen, mehrere Kampagnen, Feinjustierung ±1, eigene Fertigkeiten, Hausregeln in der App einstellen.

---

## Ziele

- Eine komplette Solo-Kampagne in Classic Traveller spielen können, ohne einen Stapel Papiere neben dem Journal zu brauchen.
- Regeln und Orakel greifen ineinander: Das Orakel kennt den aktuellen Spielstand (Charaktere, Welt, Schiff, offene Handlungsfäden) und die Regel-Engine liefert die Würfe, wenn das Orakel eine Situation auslöst.
- **Echte Würfel bleiben erlaubt** (ab einer späteren Version): Wo man selbst würfeln will, gibt man das Ergebnis ein (siehe [Physische Würfel](#physische-würfel-später)).

### Was die App ersetzt und was nicht

Heute läuft eine Solo-Session auf Papier: ein Journal und daneben viele Karten. Die App ersetzt **die Karten**, nicht das Journal.

| Heute auf Papier | In der App |
|---|---|
| Indexkarten für SC und NSCs | Charakterkarten mit UPP, Fertigkeiten, Ausrüstung und Notizen. NSCs lassen sich aus Namen, Merkmalen und Besitz der Inspirationskarte anlegen. |
| Indexkarten für Schiffe | Schiffskarten mit Werten, Treibstoff, Fracht und Schäden |
| Karte für die Waffen-×-Rüstungs-Matrix | Fällt als Karte weg: Im Kampf rechnet die App den DM selbst aus Waffe und Rüstung |
| Sektorkarte | Interaktive Hex-Karte; ein Klick auf ein System öffnet die Planetenkarte |
| Planetenkarten | Weltkarten mit UWP im Klartext, Handelscodes, Raumhafen und Notizen |

**Journal:** Das erzählerische Journal bleibt vorerst **auf Papier**. Die App führt nur einen schlanken **Verlauf** aller Würfe, Orakelantworten und Ziehungen, damit man nachschlagen kann, was passiert ist. Der Verlauf kann als Markdown exportiert werden. Ein voller Journal-Editor kann später auf diesem Verlauf aufbauen.

### Physische Würfel (später)

Nicht in Version 1. Später gilt: Für **Weltenerschaffung**, **Charaktererschaffung** und **Kampf** muss man auf jeden Fall mit echten Würfeln spielen können:

- Jeder Wurf hat zwei Modi: **„App würfelt“** oder **„Ich würfle selbst“**. Die Voreinstellung lässt sich je Bereich festlegen.
- Beim eigenen Würfeln sagt die App genau an, was zu würfeln ist (z. B. „2W6, Ziel 8+, DM +2“). Man gibt die Augen ein, und die App rechnet DMs, Ergebnis und Folgen aus.
- Welten- und Charaktererschaffung laufen **Schritt für Schritt** ab, ein Wurf nach dem anderen, damit man jeden Wurf selbst machen kann.
- Im Verlauf ist vermerkt, ob ein Wurf von der App oder von Hand kam.

---

## Teil 1: Classic-Traveller-Regeln

Geplanter Umfang (Classic Traveller, Books 1–3 als Basis, Erweiterungen später):

| Bereich | Inhalt |
|---|---|
| **Charaktererschaffung** | Attribute (UPP), Dienstzweige, Musterung, Dienstzeiten, Überleben, Beförderung, Fertigkeiten, Altern, Ausmusterung und Abfindung |
| **Fertigkeiten & Würfe** | 2W6-Würfe mit DMs, Fertigkeitswürfe, Schwierigkeit nach Rule 68A (siehe [Proben und Schwierigkeit](#proben-und-schwierigkeit)) |
| **Persönlicher Kampf** | Reichweiten, Waffen- und Rüstungsmatrix, Schaden an Attributen, Bewusstlosigkeit, Tod |
| **Raumschiffe** | Schiffsdesign, Sprungantrieb, Treibstoff, Wartung, Raumkampf |
| **Handel & Spekulation** | Fracht, Passagiere, Post, spekulativer Handel |
| **Welten & Subsektoren** | Erzeugung von Welten (UWP), Raumhäfen, Basen, Handelscodes, Subsektorkarten |
| **Begegnungen** | Tierbegegnungen, Patrons, zufällige Begegnungen, Reaktionen von NSCs |
| **Ausrüstung** | Ausrüstungslisten, Preise, Tech Level |

### Proben und Schwierigkeit

**Grundlage in Classic Traveller:** Classic Traveller kennt keine feste Skala mit benannten Schwierigkeitsstufen. Die Standardprobe ist **2W6 + DMs, Erfolg bei 8+**. Die Schwierigkeit legt die Spielleitung über DMs fest (oder über einen anderen Zielwert). Benannte Stufen wie *Simple, Routine, Difficult, Formidable* kamen erst mit späteren Task-Systemen, vor allem MegaTraveller.

**Hausregel: Rule 68A.** Für Proben nutzt die App vorerst nur Rule 68A, einen verbreiteten Leitfaden aus der Classic-Traveller-Community. Das ist kein eigenes Task-System; die Regel hilft nur dabei, Zielwerte für normale CT-Würfe festzulegen. Der Name ist die hexadezimale Schreibweise von 6-8-10.

1. Grundstufe wählen: **Einfach 6+**, **Durchschnittlich 8+**, **Schwierig 10+**.
2. Bei Bedarf um **einen Punkt feinjustieren** (z. B. eine besonders harte schwierige Aufgabe: 11+).

Die Skala liegt als Daten vor und kann angepasst werden.

#### Fertigkeiten und Attribute (Hausregel, einheitlich nach 68A)

**Was Classic Traveller selbst sagt** (Starter Edition, S. 11–16): Es gibt keine allgemeine Formel. Fertigkeiten und Attribute wirken als DMs, die beim jeweiligen Wurf stehen:
- **Ohne Fertigkeit** nennen manche Fertigkeiten einen eigenen DM, zum Beispiel Administration −3, Forward Observer −4, Vacc Suit −4 und Streetwise −5.
- **Stufe 0 für alle:** Bei Default Skills kann die Spielleitung allen Figuren Stufe 0 geben. In allen Waffen hat jede Figur ohnehin Stufe 0. Jack of All Trades zählt als Stufe 0 in jeder anderen Fertigkeit.
- **Attribute** wirken über Schwellen beim einzelnen Wurf, zum Beispiel „+1 bei INT 8+“ oder „Chirurg nur mit DEX 8+“.

**Vereinheitlichung für die App:** Statt vieler Einzelregeln gilt eine Formel, die Flexibilität kommt über die Auswahl im konkreten Fall:

> **2W6 + Fertigkeit + gewählte Attribute + sonstige DMs ≥ Zielwert (6+ / 8+ / 10+, ±1)**

**Fertigkeit**

| Fall | DM |
|---|---|
| Fertigkeit vorhanden | + Stufe (Pilot-2 → +2) |
| Stufe 0 (Default Skills, Waffen, Jack of All Trades) | ±0 |
| Ohne Fertigkeit | −3 (wie Administration im Buch; als Option abschaltbar, falls wir es weglassen) |

**Attribute:** Bei jeder Probe wählt man, welche Attribute zählen. Ein gewähltes Attribut ist je nach Wert automatisch Bonus oder Malus. Die Schwellen orientieren sich an den Beispielen der Starter Edition (Boni meist ab 9) und liegen symmetrisch um den 2W6-Schnitt von 7, sodass Bonus und Malus gleich häufig sind (je etwa 28 % der Attributwerte):

| Attributwert (wenn gewählt) | DM |
|---|---|
| 9 oder mehr | +1 |
| 6–8 | ±0 |
| 5 oder weniger | −1 |

Mehr als ±1 pro Attribut gibt es nicht: In den Beispielen der Starter Edition liefern Attribute bei Fertigkeitswürfen ebenfalls nur +1.

Beispiele aus der Starter Edition, an denen sich die Schwellen orientieren:

| Beispiel | Schwelle | DM | Seite |
|---|---|---|---|
| Navy-Musterung | INT 8+ / EDU 9+ | +1 / +2 | 9 |
| Fortgeschrittene Ausbildung | EDU 8+ | Voraussetzung | 10 |
| Electronics (Vorschlag für die Spielleitung) | INT über ~10, EDU über ~9 | je +1 | 14 |
| Chirurg | DEX 8+ | Voraussetzung | 15 |
| Low Passage | END 6 oder weniger | −1 | 17 |
| Cutlass | STR unter 7 / STR 11+ | −2 / +2 | 21 |
| Schwerelosigkeit | DEX 9+ / 11+ | +2 / weitere +2 | 27 |

**Beispiele** (Kira, UPP 7A8975; Jonas, UPP 687A88):

| Situation | Zielwert | DMs | Braucht auf 2W6 |
|---|---|---|---|
| Kira fliegt ein Stunt-Manöver | Schwierig 10+ | Pilot +2, DEX A +1 | 7+ (58 %) |
| Kira weicht stundenlang Asteroiden aus | Schwierig 10+ | Pilot +2, DEX A +1, END 8 ±0 | 7+ (58 %) |
| Jonas (ohne Pilot) im selben Asteroidenfeld | Schwierig 10+ | ohne Fertigkeit −3, DEX 8 ±0, END 7 ±0 | 13+ (unmöglich) |

Vor dem Wurf zeigt die App an, was auf 2W6 nötig ist und wie wahrscheinlich das ist.

#### Eine Auswahl für Orakel und Proben

Die drei Stufen des Orakels sind gleichzeitig die drei Schwierigkeiten nach Rule 68A:

| Orakel (Chance auf Ja) | Probe (Zielwert) |
|---|---|
| Hoch (75 %) | 6+ (Einfach) |
| Mittel (50 %) | 8+ (Durchschnittlich) |
| Gering (25 %) | 10+ (Schwierig) |

In der Leiste steht **leicht bzw. wahrscheinlich links**, **schwer bzw. unwahrscheinlich rechts**.

In der App sitzt diese Auswahl **ganz unten** auf dem Hauptscreen und **bleibt stehen**, bis man sie ändert. Der Knopf „Ja/Nein“ steht in derselben Zeile und fragt das Orakel mit der eingestellten Stufe. Im Charakter-Screen steht dieselbe Auswahl ebenfalls ganz unten, dort mit **6+ / 8+ / 10+** beschriftet und neben dem Knopf „Probe würfeln“.

---

## Teil 2: Das Orakel

Das Orakel übernimmt die Rolle der Spielleitung. Es besteht aus zwei getrennten Werkzeugen:

1. **Ja/Nein-Orakel** (nach Mythic) für konkrete Fragen an die Geschichte.
2. **Inspirationskarte** (nach dem GM's Apprentice) für Prompts und Ideen, etwa für Aufträge, NSCs und Begegnungen.

### Ja/Nein-Orakel

- Der Spieler stellt eine Frage und wählt eine von **drei Wahrscheinlichkeitsstufen**, wie beim GMA: **Gering**, **Mittel**, **Hoch**.
- Die Antwort kommt aus Mythics **Fate Chart**. Sie hängt vom **Chaosfaktor** ab und kann „Außergewöhnlich Ja/Nein“ sowie **Zufallsereignisse** auslösen.

### Inspirationskarte

**Vorlage für Inhalt und Layout der Karte:** GameMaster's Apprentice, Second Edition (Base Deck). Die Kategorien auf Englisch und Deutsch stehen im Glossar [docs/gma2e-begriffe.md](docs/gma2e-begriffe.md).

Das Vorbild für Bedienung und Aufbau ist die Web-Umsetzung des Game Master's Apprentice von James Turner:
<https://jamesturneronline.net/game-masters-apprentice/>

Das Prinzip: **Ein Klick auf „Neu ziehen“ erzeugt alles auf einmal.** Danach liegt eine komplette „Karte“ vor dir. Du liest nur die Felder, die zu deiner aktuellen Situation passen, und ignorierst den Rest.

Die Karte ist vorerst **nur für Prompts** da. Ja/Nein-Antworten, Schwierigkeiten und Würfe gehören nicht auf die Karte.

**Aufbau nach GMA2e:** Inhalt und Layout folgen der Karte des GameMaster's Apprentice, Second Edition. Von oben nach unten (Begriffe siehe [Glossar](docs/gma2e-begriffe.md)):

| Bereich auf der Karte | Felder (einzeln antippbar) |
|---|---|
| Zufallsereignis | Aktion (Verb · Substantiv) und Beschreibung (Adverb · Adjektiv), je ein Paar aus Mythics Bedeutungstabellen, siehe unten |
| Sinneseindrücke | Hören, Sehen, Fühlen, Riechen (Hören und Riechen als Paar aus Mythics Tabellen, siehe unten) |
| Szenentyp | Eine Szenenidee |
| Besitz | Eine Kategorie mit drei Beispielen |
| Situation | Auslöser, Ort, Einsatz |
| Namen | Drei Vornamen |
| Merkmale | Tugend, Laster, Merkmal |
| Flavortext | Ein aufgeschnapptes Zitat |

Besitz und Situation stehen wie auf der GMA-Karte links, Namen und Merkmale rechts daneben.

**Zurzeit** zeigt die Karte nur die Felder, für die es Einträge aus Mythic gibt: Aktion und Beschreibung des Zufallsereignisses, Hören und Riechen sowie die Themen-Tafeln mit Mythics Elements-Tabellen (siehe unten). Die übrigen Felder und Bereiche sind ausgeblendet, bis es Einträge für sie gibt; ältere Logeinträge daraus bleiben lesbar.

**Themen-Tafeln (vorläufig):** Unter der Karte stehen Tafeln mit Überschrift, alle auf einmal und ohne Reiter, in Kästen wie die Karte selbst (NSC mit NSC-Aktionen, Welt mit Wesen, Handlung allein), sodass die ganze Karte auf einen Handybildschirm passt. Ihre Felder sind ebenfalls antippbar und gehen mit in den Log. Zurzeit sind es die Elements-Tabellen von Mythic GME 2e, die zu Traveller passen, nach Themen sortiert. Aus jeder Tabelle zieht die Karte wie bei Mythic **ein Paar** von Begriffen in einem Feld; bis zu drei Felder stehen nebeneinander:

| Tafel | Tabellen |
|---|---|
| NSC | Aussehen, Persönlichkeit, Motivation, Hintergrund, Identität, Eigenschaft & Schwäche |
| NSC-Aktionen | Gespräch, Kampfaktion, Aktion |
| Welt | Ort, Stadt, Schiff, Zivilisation, Gelände, Behausung |
| Wesen | Spezies, Kreatur, Tierverhalten |
| Handlung | Wendung, Stimmung, Botschaft, Gegenstand, Fund |

Die früheren eigenen Reiter (Auftrag, Begegnung, Handel und die eigenen Reiter und Felder von NSC, Welt, Schiff) sind ausgeblendet, ebenso die einzelnen Felder Verb, Adjektiv und Substantiv aus der Zeit vor den Paaren die NSC-Tabelle Fertigkeit und die Wesen-Tabelle Fähigkeit. Die Tafeln sollen später an einen anderen Ort in der App wandern; wohin, ist noch offen. Die Inhalte der App sind eigene Listen mit Traveller-Bezug, nicht die Texte des GMA-Decks. Ausnahmen kommen aus den Bedeutungstabellen von Mythic GME 2e, ins Deutsche übersetzt, je 100 Einträge: Aktion und Beschreibung des Zufallsereignisses (Actions, Descriptions, je mit ihren zwei Spalten), Hören und Riechen bei den Sinneseindrücken (Sounds, Smells) und die Elements-Tabellen der Themen-Tafeln; aus einer Elements-Tabelle zieht die Karte wie Mythic zweimal.

**Noch nicht auf der Karte:** Chancen (dafür gibt es das eigene Ja/Nein-Orakel), Schwierigkeitsgenerator, Würfelrad, Impuls-Symbole, Kartensymbol, Kartennummer.

**Was sich gegenüber dem Vorbild ändert**

- **Kontext statt Leerlauf**: Ereignisse greifen auf die Listen der Kampagne zu (Threads, Charaktere, aktuelle Welt).
- **Verlauf**: Jeder Zug landet im Verlauf der App und kann von dort ins Papier-Journal übertragen werden. Im Original gibt es keinen Verlauf.
- **Direkter Regelbezug**: Felder wie „Situation“ oder „Merkmale“ können später direkt die passenden Traveller-Regeln aufrufen (z. B. einen NSC anlegen).

### Ideen aus den beiden Systemen im Detail

#### Von Mythic übernommen
- **Ja/Nein-Fragen über die Fate Chart**, beschränkt auf drei Stufen (Gering, Mittel, Hoch), inklusive „Außergewöhnlich Ja/Nein“.
- **Chaosfaktor**, der steuert, wie unvorhersehbar die Geschichte verläuft.
- **Zufallsereignisse** mit Ereignisfokus, Aktion und Thema.
- **Szenenstruktur**: Erwartete Szene, veränderte Szene, unterbrochene Szene.
- **Listen** für Handlungsfäden (Threads) und Charaktere, aus denen Ereignisse gezogen werden.

#### Vom Game Master's Apprentice übernommen
- **Ein Zug – viele Antworten**: Eine einzige Ziehung liefert gleichzeitig mehrere Prompts (Inspirationswörter, Ereignis, Namen, Details), statt für jede Idee eine eigene Tabelle zu bemühen.
- **Inspirationsorientiert**: Kurze Stichworte, die zur Interpretation einladen, statt fester Ergebnisse.
- **Science-Fiction-Bezug**: Begriffe und Namen passend zum Traveller-Setting.

#### Verzahnung mit den Regeln
- Orakelergebnisse können direkt Regelmechaniken auslösen (z. B. „Begegnung“ → Begegnungstabelle der aktuellen Welt, „Gefahr“ → Kampf).
- Der Kontext des Spiels (aktuelle Welt, Schiff, NSCs, Threads) fließt in die Ereignisse ein.

---

## Offene Fragen

Diese Punkte werden als Nächstes gemeinsam geklärt:

### UI
- **Entschieden: mobil zuerst, als Web-App (PWA).** Eine native App ist später über Capacitor möglich, ohne Neuschreiben.
- Später: Wie gibt man physische Würfe am schnellsten ein (z. B. Würfelaugen antippen, Summe eintippen)?
- Später: Wie wächst die App über Version 1 hinaus, ohne den Hauptscreen zu überladen?
- Wohin wandern die Themen-Tafeln (NSC, NSC-Aktionen, Welt, Wesen, Handlung), die vorläufig unter der Karte stehen?
- Der UI-Entwurf zeigt unter 6+ / 8+ / 10+ die Namen *Einfach / Durchschnittlich / Schwierig*. Die Stufe (`Odds`) hat im Domänenmodell dafür kein Feld; die App zeigt deshalb vorerst nur die Zielwerte. Soll `Odds` ein zweites Namensfeld für Proben bekommen?

### Architektur
- **Entschieden: domänengetrieben.** Das [Domänenmodell](docs/domain-model.md) führt, der Code folgt ihm. Das Modell für Version 1 ist freigegeben.
- **Entschieden: klassisches MVC**, streng getrennt, mit Regel-Engine und Orakel im Model, siehe [ARCHITECTURE.md](ARCHITECTURE.md).
- **Entschieden: Regeln und Tabellen als Daten** (JSON, beim Start geprüft).
- **Entschieden: Speicherung lokal** (IndexedDB) mit Export und Import; Synchronisation später.
- **Entschieden: TypeScript** mit Vite, React und Dexie.

---

## Rechtlicher Hinweis

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Larcenous Designs, LLC; die Web-Version stammt von James Turner. Dieses Projekt ist ein inoffizielles Fan-Projekt und wird kostenlos angeboten.

Was das für die Inhalte der App heißt (Stand der Prüfung: Oktober 2026; keine Rechtsberatung):

| Quelle | Was wir übernehmen dürfen | Bedingungen |
|---|---|---|
| **Mythic** (Word Mill Games, Tana Pigeon) | Den **Text** von Mythic GME 2e und weiteren Mythic-Produkten, auch die Tabellen (Fate Chart, Zufallsereignisse, Bedeutungstabellen); Übersetzen und Anpassen ist erlaubt. | Lizenz [CC BY-NC](https://wordmillgames.com/license.html): nicht kommerziell, Quellenangabe (Produkt, Autorin, Link zu Word Mill Games), Hinweis auf Änderungen, nicht als „offiziell“ ausgeben. Grafik und Gestaltung der Bücher sind nicht abgedeckt. Die Mythic-Daten behalten diese Lizenz, auch wenn der Code eine andere hat. In der App sind das die Einträge `*.mythic.*` in `src/data/sections.json` und alles in `src/data/mythic-tables.json`. |
| **Game Master's Apprentice** (Larcenous Designs) | Nur den **Aufbau** der Karte (Bereiche und Felder). | Die Karteninhalte sind geschützt und nur mit Erlaubnis von Larcenous Designs nutzbar. Bis dahin füllen wir die Felder mit eigenen Einträgen. |
| **Classic Traveller** (Far Future Enterprises) | Die **Mechanik**: Würfe, DMs, Abläufe als Programm. | Nach der Fan-Policy von FFE: kostenlos, Copyright- und Markenhinweis in der App, Regeltexte nicht über etwa eine Seite hinaus abschreiben. Vor einer Veröffentlichung die aktuelle Policy prüfen. |

Die Quellenangaben stehen schon in Version 1 in der App, auf einem „Über“-Bildschirm.
