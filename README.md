# Solo RPG Engine

Eine App für **Solo-Rollenspiel mit Classic Traveller**. Sie soll zwei Dinge in einem Werkzeug vereinen:

1. **Die Regeln von Classic Traveller** – vollständig implementiert, damit Würfe, Tabellen und Abläufe nicht mehr von Hand nachgeschlagen werden müssen.
2. **Ein Orakel**, das die Spielleitung ersetzt – angelehnt teils an **Mythic** (Mythic Game Master Emulator) und teils an den **Game Master's Apprentice (GMA)**.

> Status: **Version 1 in Arbeit.** Wir fangen klein an, mit **Version 1** (siehe [Version 1](#version-1)): für das Smartphone gebaut, und ab 1024 px Bildschirmbreite mit dem **Desktop-Modus**. Gebaut wird domänengetrieben: Das [Domänenmodell](docs/domain-model.md) für Version 1 ist freigegeben, Orakel-Screen (mit dem Charakter oben und den Proben), Charakter-Screen und Sektor-Screen sind umgesetzt. Technik, MVC-Aufbau und Befehle stehen in [ARCHITECTURE.md](ARCHITECTURE.md), was als Nächstes ansteht in [TODO.md](TODO.md), die Kampfregeln in [docs/regeln-kampf.md](docs/regeln-kampf.md).

---

## Version 1

Die erste Version ist bewusst klein und **für das Smartphone** gebaut. Ab einer Bildschirmbreite von 1024 px legt die App automatisch den **Desktop-Modus** an: dieselben Screens, dieselben Komponenten, nur anders angeordnet. Unter der Kopfzeile stehen die **fünf Bereiche** als Reiterzeile (einen Reiter „Orakel“ gibt es dort nicht, beim Start ist „Sektor“ offen), darunter **drei Spalten**: **links das Orakel** mit Log, Fragefeld und den Knöpfen für Orakel, Karte und 2W6, **daneben die Charakterspalte** mit allen Charakteren untereinander, **rechts der gewählte Bereich**. So kann man in jedem Bereich fragen, würfeln, deuten und Proben würfeln, ohne ihn zu wechseln. Die Charakterspalte zeigt immer Attribute und Fertigkeiten und blendet ein, was der Bereich braucht: im Kampf Rüstung, Waffen und „Heilen“, im Shop Credits und was er ausgerüstet hat; Kampf und Shop haben im Desktop-Modus keine eigene Leiste. Ein Klick auf eine Karte macht diesen Charakter zum Charakter oben; eine Fertigkeit auf einer anderen Karte antippen holt ihn nach oben und beginnt die Probe mit einem Klick. Im Bereich Charaktere und in der Kampfsimulation entfällt die Charakterspalte, weil der Bereich die SC dort selbst zeigt. Zwischen 1024 und 1279 px werden Orakel- und Charakterspalte schmaler, „Deuten“ und „Notiz“ zeigen dann nur ihr Symbol. Der Bereich wird höchstens 960 px breit; die **Sektor-Karte** ist ganz zu sehen, mit Legende und Welten daneben (bei schmalem Bereich darunter), und unter der Maus heben sich Knöpfe und Felder hervor. Mit der **Tastatur**: K zieht eine Karte, W würfelt 2W6 (oder die vorbereitete Probe), J fragt das Orakel, Enter im Fragefeld ebenso, die Ziffern wählen die Bereiche in der Reihenfolge der Leiste, und Esc schließt das oberste Popup wie ✕, „Abbrechen“ oder „Weiter“ (läuft dort noch ein Wurf, springt es erst zum Ergebnis). Solange man in ein Feld tippt, gehören die Tasten dem Feld. Unter 1024 px gilt unverändert das mobile Layout mit dem Log im Orakel-Screen und der Leiste mit den Bereichen unten.

**Kopfzeile und Menü**: Links oben steht der Name der offenen Kampagne, rechts Vollbild (nur im Browser; die installierte App braucht es nicht) und das **Menü ☰** (ein Tippen auf den Namen öffnet es ebenfalls). Im Menü stehen unter *Kampagne* die Kampagnenwahl und der Export der offenen Kampagne, unter *App* der Bildschirm „Über“ mit Installieren, Vibration und Quellen.

**Kampagnen**: Die oberste Ebene ist die Kampagne; Charaktere und Log gehören immer zu genau einer. Im Menü öffnet „Kampagnen wechseln und verwalten“ die **Kampagnenwahl**: Kampagne wechseln, umbenennen, neu anlegen (mit Namen) und löschen. Dort lässt sich jede Kampagne auch **exportieren** (kommt als Download, eine JSON-Datei) und eine solche Datei wieder **importieren**; der Import legt immer eine neue Kampagne an. Beim allerersten Start gibt es die **Demo-Kampagne**: mit Kira Vant und Jonas Reyl und der fertigen Welt Kessra, auf der die Gruppe steht, und Cr 5.000 Startkapital in der Gruppenkasse, sodass Shop und Begegnungen sofort gehen. Jede neu angelegte Kampagne beginnt leer.

**Hauptscreen (Orakel)**: Orakel und Proben auf einem Bildschirm. Ganz oben steht der **Charakter oben** (siehe unten), darunter wie in einem Chat der **Log**, der nach oben wächst (das Neueste steht unten, direkt über den Knöpfen; im Desktop-Modus stehen Log und Knöpfe als Spalte links, der Charakter oben in der Charakterspalte daneben). Unten, im Daumenbereich, sitzen fest **Orakel, „Karte ziehen“ und „2W6“**.
- **Charakter oben**: eine Leiste mit der Charakterkarte eines Lebenden: Name, Herkunft, UPP und Fertigkeiten mit Kürzel (Pil-2). **Wischen** zeigt den nächsten bzw. vorigen; die Punkte darunter sagen, welcher es ist, und holen ihn auch per Tippen. Welcher oben steht, merkt sich die Kampagne. Ein neuer Charakter steht oben; stirbt der Charakter oben oder wird er ausgeblendet, rückt der nächste nach. Ein Tippen auf den Namen oder den Pfeil **klappt die Leiste** auf eine Zeile ein und wieder auf; das merkt sich das Gerät. Der Stift öffnet den Editor. Gibt es keinen Lebenden, stehen oben nur „+ Charakter anlegen“ und „+ Nach Regeln erschaffen“.
- **Schreibzeile: Frage, Deutung oder Notiz**: Ein Textfeld über den Knöpfen; was der Text wird, entscheidet der Knopf. **Ja/Nein** und **Karte ziehen** nehmen ihn als (freiwillige) Frage, die mit der Antwort bzw. der Kartenauswahl im Log steht. **Deuten** legt ihn als **Deutung** zu einem Ergebnis ab: vorgeschlagen ist das neueste, ein Tippen auf ein anderes Ergebnis im Log wählt dieses; solange Text im Feld steht, zeigt eine goldene Zeile darüber, welches gemeint ist. **Notiz** legt ihn als freien Eintrag in den Log.
- **Ja/Nein-Orakel** mit drei Stufen wie beim GMA: Hoch (75 %), Mittel (50 %), Gering (25 %). Die Stufe wird ganz unten eingestellt und bleibt stehen; sie gilt auch als Schwierigkeit für Proben (6+ / 8+ / 10+).
- **Knopf „Karte ziehen“**: zieht eine Inspirationskarte im Aufbau des GMA2e (Zufallsereignis, Sinne, Szenentyp, Besitz, Situation, Merkmale, Flavortext), darunter die Themen-Tafeln. Es gibt nur diese eine Karte; sie kann alles:
  - **Wurffelder** unter den Sinneseindrücken: die Zahl **1–10** nach einer Glockenkurve (meist 4–7, für zwischendurch, etwa Reaktion oder Spannung), der **Streuwürfel** als Windrose (8 Richtungen, Volltreffer, Fehlschlag) und das **Kartensymbol** („Wege“): ein Raum von oben mit Wegen nach N, O, S, W und nach oben und unten, je Weg kein Weg, Weg, Sackgasse, verborgen oder Hindernis. Im Log stehen sie mit Bild.
  - **Namen** auf der Tafel NSC: sechs, je weiblich, männlich und neutral, einmal irdisch und einmal spacig, jeweils Vor- und Nachname.

  Die Karte landet **nicht direkt im Log**, sondern erscheint im Vordergrund:
  - Eine gestellte Frage steht oben auf der Karte.
  - Man tippt die Felder an, die man nutzen will (**Mehrfachauswahl**, auch über mehrere Themen hinweg). Ein Feld aus Mythic zieht immer ein **Paar** von Begriffen (verraten · Technologie); man nimmt das Paar immer ganz.
  - Unten bestätigt ein **Haken** die Auswahl: Nur die ausgewählten Einträge kommen in den Log.
  - Außerdem: Karte verwerfen oder neu ziehen.
  - Die Karte wird so inszeniert wie der Würfelwurf: Sie fliegt mit dem Rücken nach oben (Hexraster wie auf einer Sektorkarte, in der Mitte das Emblem der App) aus dem Daumenbereich herein, schwebt kurz mit rotem Glimmen, dreht sich mit Schwung um, ein Lichtreflex läuft über die Vorderseite, und die Felder erscheinen der Reihe nach. „Neu ziehen“ spielt das mit einer neuen Karte. Übernehmen lässt sie nach unten sinken, Verwerfen wirft sie zur Seite weg.
- **Knopf „2W6“**: ein einfacher Würfelwurf durch die App. Zwei Würfel werden im Vordergrund geworfen, angelehnt an Baldur's Gate 3: dunkle Würfel mit goldenen Augen, die aufschlagen, liegen bleiben und aufleuchten; dann die Summe. Ein Tippen überspringt.
- **Animation und Vibration**: Würfeln und Karte sind kurz animiert (unter zwei Sekunden); ein Tippen während einer Animation beendet sie und zeigt sofort das Ergebnis, auch ein zweites Tippen auf den Würfelknopf selbst und vibrieren dazu (Android in Chrome, Samsung Internet oder Edge über die Vibrations-API, iPhone ab iOS 18 über einen kurzen Ruck; Firefox lässt Webseiten nicht vibrieren, das sagt die App unter „Über“). Wer im System „Bewegung reduzieren“ eingestellt hat, sieht gleich das Ergebnis.
- **Log**: Orakelantworten, Würfe, die ausgewählten Karteneinträge und Notizen landen untereinander im Log, das neueste unten. Deutungen stehen im Kasten ihres Ergebnisses, auch wenn sie später geschrieben wurden. **Lange drücken** auf einen Eintrag bietet an, ihn zu löschen; ein Ergebnis nimmt seine Deutungen mit.

- **Proben oben im Orakel-Screen** (kein eigenes Fenster):
  - Am Charakter oben die **Fertigkeit** antippen (oder „Ohne“ für −3; wer Jack-of-all-Trades hat, bekommt kein „Ohne“ und nimmt stattdessen „JoT“, das immer als Stufe 0 zählt, also ±0, und deshalb ohne Stufe dasteht; würfelt man es in der Erschaffung ein zweites Mal, gibt es einen weiteren Fertigkeitswurf). Dieselbe noch einmal antippen nimmt die Wahl zurück.
  - **Attribute** sind standardmäßig nicht dabei und lassen sich **erst nach der Fertigkeit** dazuwählen; ein Tippen auf ein Attribut im UPP schaltet es an oder aus; der DM ergibt sich aus dem Wert (9+ → +1, 6–8 → ±0, 5− → −1). Sobald die Fertigkeit gewählt ist, zeigt jedes Attribut an, ob es überhaupt +1 oder −1 brächte; neutrale Werte sind nicht wählbar.
  - Über den Knöpfen steht dann knapp die Probe: die Fertigkeit ausgeschrieben mit Zielwert (Pilot-2 · 10+), darunter DM, gewählte Attribute und der nötige Wurf (2W6 +3 (DEX +1) · Braucht 7+); das ✕ daneben bricht sie ab. Aus „2W6“ wird **„Probe würfeln“**. Der Zielwert kommt aus der Stufe unten, die für Orakel und Probe gilt (Hoch 75 % · 6+, Mittel 50 % · 8+, Gering 25 % · 10+). Wischt man zu einem anderen Charakter, endet die Probe.
  - Das **Ergebnis erscheint als Popup**, wie in Baldur's Gate 3: zuerst erscheint der Zielwert, dann rollen die Würfel, dann kommen die Fertigkeit und jedes gewählte Attribut einzeln mit Namen dazu (Pilot-2 +2, dann DEX +1), jeweils mit Zwischensumme, zuletzt fällt das Urteil (Erfolg golden, Fehlschlag rot). Ein Tippen springt zum Urteil. **„Weiter“** schließt es; die Probe steht dann schon im Log darunter und bleibt vorbereitet.

**Zweiter Screen: Kampf** (Starter Edition, *Charts and Tables* S. 4–7 und 21): zwei Modi. Ohne laufende Begegnung die **Waffentabelle** für den Charakter oben, mit einer Begegnung die **Kampfsimulation**. Begegnungen würfelt man im eigenen Reiter **Begegnung** (zwischen Orakel und Kampf).
- Oben steht dieselbe Leiste wie im Orakel-Screen, nur **kompakt**; **Wischen** wählt den Charakter. Die Attribute stehen als schmale Zeile wie bei den NSC (`STR 7 DEX A END 8 …`, verwundete Werte rot; ist er verwundet, steht der Zustand neben dem Namen). Statt der Fertigkeiten zeigt sie in einer Zeile seine **Waffen**: **Primärwaffe**, **Sekundärwaffe** und die **Hände**. Die gedrückte ist die **Waffe in der Hand**, mit der Fertigkeit, die sie nutzt (APi-1, ohne die Fertigkeit Stufe 0; Hände und Club nutzen Brawling); antippen wechselt sie, und die Kampagne merkt sie sich. Auch die Nachbarkarten zeigen ihre Waffen schon beim Wischen; dort holt Antippen den Charakter nach oben. Primär- und Sekundärwaffe legt man im **Gepäck-Bereich** (siehe *Gruppengepäck*) oder **im Editor** fest; andere Waffen gibt es im Kampf nicht. Fällt die Waffe in der Hand weg, nimmt der Charakter seine Primärwaffe.
- Darunter die **Tabelle der Waffe in der Hand**: je Rüstung des Ziels eine Zeile (Nothing, Jack, Mesh, Cloth, Reflec, Ablat, Combat), je Reichweite eine Spalte (Close, Short, Medium, Long, Very Long), in den Köpfen die DMs aus der *Weapons and Range Matrix*, in jeder Zelle der nötige Wurf auf 2W6 mit allen DMs des Charakters. Wohin die Waffe nicht reicht („no“), steht ein Strich, und die Spalte ist schmal (M, L, VL).
- Gerechnet wird **2W6 + Fertigkeit + Rüstung + Reichweite + Attribut ≥ 8**. Das Attribut ist STR bei Händen und Klingen, DEX bei Schusswaffen: unter dem nötigen Wert gibt es dessen Malus, ab dem vorteilhaften dessen Bonus (Rifle: DEX unter 6 −2, ab 8 +1). Die Stufe unten zählt beim Angriff nicht.
- Eine **Zelle antippen** wählt Rüstung und Reichweite des Ziels; die gewählte Zelle leuchtet golden. **„Angreifen“** würfelt; das Ergebnis erscheint als Popup: oben die Modifikatoren (Fertigkeit, gegen die Rüstung, auf die Reichweite, Attribut) und der nötige Wurf wie in der Tabelle (Braucht 3+), dann rollen die Würfel, zuletzt TREFFER oder DANEBEN; anders als bei der Probe kommt nichts Schritt für Schritt dazu, weil der nötige Wurf schon feststeht. Es steht im Log. Nach einem Treffer würfelt **„Schaden würfeln“** die W6 der Waffe (Rifle 3W6); der Schaden steht im Log im Kasten seines Treffers. Die letzten drei Angriffe stehen unter der Tabelle.
- **Begegnung**, im eigenen Reiter: Oben steht, wo die Gruppe ist, darunter eine **Liste der Begegnungsarten**, je Art eine Karte mit ihren Einstellungen und ihrem Wurf; weitere Arten kommen als weitere Karten dazu. Zurzeit gibt es die **Zufallsbegegnung**, die **Tiere**, den **Patron** und das **Gerücht**. Im **Kopf** des Reiters stehen die allgemeinen Einstellungen für alle Arten: der Aufenthaltsort, das **Gelände** (DM auf die Entfernung, und ob es dort Tiere gibt) und der **Würfel der Anzahl** (W6, W4, W3); beide bleiben an der Kampagne. Jede Art beginnt mit ihrem **Test** nach der Encounter Checklist (S. 20), ob es überhaupt dazu kommt: Zufallsbegegnung täglich 5+ auf 1W6, Patron wöchentlich 5+ auf 1W6. Besteht er nicht, steht das in der Karte („Test 3 (5+ nötig): heute keine Begegnung.“); wer die Art der Zufallsbegegnung wählt, überspringt ihn. Beim Patron wählt danach ein Würfel die Liste (1–3 Liste eins, 4–6 Liste zwei), dann fällt der Patron mit den DMs der Gruppe; er steht im Log und lässt sich deuten. Das **Gerücht** (S. 21) testet wöchentlich 7+ auf 2W6 und würfelt dann auf der Rumors Matrix die Art des Gerüchts (z. B. „F · Information leading to trap“, bestimmt oder allgemein); was es besagt, legt man per Deutung fest. Fällt der Patron auf eine Rumor-Zeile, folgt das Gerücht gleich ohne Test.
- **Tiere** (S. 18–19, Regelheft S. 46–50): Jede Welt bekommt je Gelände eine **Tiertabelle**, die beim ersten Tierwurf dort automatisch entsteht und dann bleibt (elf Zeilen 2–12: Tierart, Anzahl, Besonderheit, Gewicht, Hits, Rüstung, Tierwaffen mit festem Schaden, Verhalten A/F/S; Zeile 10 ein Ereignis; auf Welten ohne Leben nur Ereignisse). „Tiere würfeln“ testet 5+ auf 1W6 und würfelt 2W6 auf die Tabelle; gibt es sie schon, kann man die Zeile auch wählen. Ein Ereignis steht mit Text im Log (Stampede, Sandstorm, Dust Pool …); hat es einen Rettungswurf mit Schaden (Stampede 8+ sonst 2W6, Poisonous Pests DEX oder weniger sonst 3W6, Flash Flood 9+ sonst 3W6, Seismic Quake STR oder weniger sonst 1W6), würfelt „Rettungswürfe würfeln“ für jeden lebenden SC und verteilt den Schaden. Ein Tier wird eine Begegnung: Die Übersicht zeigt die Werte und die Würfe gegen A und F („Greift an.“, „Flieht.“, „Tut nichts.“ oder die Bedingung der Tierart). Im Kampf haben Tiere **Hits** statt STR/DEX/END (bewusstlos ab der ersten Zahl, tot ab beiden zusammen), greifen mit ihren Tierwaffen an (DM wie „claws +1“), machen **festen Schaden**, der als ein Block auf ein Attribut geht, haben unbegrenzte Ausdauer und gehen je Runde bis zu S Bands. Tiere heilt und übernimmt man nicht. Erreicht der Schaden das Doppelte der Hits, ist ein Tier **zerstört**. **Trapper** und **Siren** fangen mit Überraschung jeden SC auf Close oder Short bei 5+, die Siren lockt mit ihrem Köder (11+) gleich in Berührung; der **Filter** saugt auf Close bei 6+ ein und macht 1W6 je 50 kg, solange er hält. Wer festgehalten ist (Karte: „gefangen“), greift nicht an, weicht nicht aus und bewegt sich nicht; statt anzugreifen tippt er **Losreißen** (9+ bzw. beim Filter 7+, +1 bzw. +2 je Kamerad in Berührung, kostet einen Combat-Schlag).
- **Zufallsbegegnung** (S. 21), die erste Karte: Gelände und Würfel der Anzahl stellt man oben im Kopf des Reiters ein; in der Karte würfelt **„Begegnung würfeln“** auf dem Aufenthaltsort eine Zeile der Random Encounter List (z. B. „3W6 Bandits“), oder man wählt daneben die Art. Bringt der Wurf keine Begegnung, steht das deutlich über den Knöpfen in der Karte („Wurf 65: keine Begegnung.“). Mit **„Anzahl würfeln mit“** stellt man den Würfel der Anzahl ein: W6 nach den Regeln, W4 oder W3 zum Ausgleichen, etwa mit nur ein oder zwei SC (dann z. B. 3W3 statt 3W6 Bandits); die Wahl gilt für die Kampagne, bis man sie ändert. Die NSC entstehen ohne weitere Eingabe: Name von der Tafel NSC, 2W6 je Attribut, eine Waffe bis zum TL der Gruppe (Klingen, mit G Schusswaffen, geladen und mit 1W4 Magazinen), mit A eine Rüstung (Combat Armor und Battle Dress nur bei Soldaten), Fertigkeit 1; jeder NSC ist ein vollständiger Charakter, nur dass er an der Begegnung hängt, nicht an der Kampagne; der Anführer (L) bekommt das Beste bis zum TL, immer mit Schusswaffe und Rüstung, und Fertigkeit 2 (Regelheft S. 50). Dazu die Reaktion (2W6, z. B. „Hostile. Attack on 8+“), mit DM +1, wenn ein SC 5 oder mehr Terms in Army, Navy, Scouts oder Marines gedient hat, und −1 auf einer Welt mit Bevölkerung 9+; eine echte 2 oder 12 gilt ohne DM, sonst geht sie von 3 bis 12. Ohne Aufenthaltsort wählt man die Welt gleich darüber („Wo ist die Gruppe?“); gibt es noch keine, führt „Zum Sektor“ dorthin. Nach dem Würfeln zeigt eine **Übersicht**, wer kommt (jeder NSC mit Attributen, Waffe und Rüstung), die rollenden Würfel der Reaktion mit DM und Ergebnis sowie den Wurf für die Entfernung; „Weiter“ führt zurück in den Reiter Begegnung, denn nicht jede Begegnung wird ein Kampf; erst **„Zum Kampf“** dort wechselt in den Reiter Kampf mit der Kampfsimulation. Antippen der Kopfzeile im Kampf zeigt die Übersicht noch einmal. Läuft eine Begegnung, zeigt ihre Karte sie knapp (Art, Runde, Reaktion, Entfernung, wie viele NSC noch kämpfen) mit **„Zum Kampf“**, **„Übersicht“** und **„Beenden“**.
- **Beute** (Hausregeln nach Absprache, Fleisch nach Regelheft S. 48): NSC haben **Kredite** nach ihrer Art (1W6 × 1 bis 200 Cr, der Anführer das Zehnfache) und die **Überlebensausrüstung**, die die Welt verlangt (Vacc Suit, Atemgerät, Filtermaske, Sauerstoff). Liegt ein NSC am Boden (bewusstlos, schwer verwundet, tot), steht auf seiner Karte **„Beute“**: Der Dialog zeigt, was er bei sich hat, mit Verkaufspreis, und die Gruppe nimmt alles: die Gegenstände ins **Gruppengepäck**, die Kredite ein gewählter SC. Ein Tier, das tot oder bewusstlos und nicht zerstört ist, hat **„Ausweiden“**: Fleisch macht der wache SC mit der besten Stufe in Steward oder Medical, das Fell der mit der besten Klinge; die Beute kommt ins Gruppengepäck. Das Ergebnis rollt dramatisch im Vordergrund: Ist die Art essbar (je Tierart beim Erzeugen der Tabelle gewürfelt), rollt der Fleischwürfel mit dem DM (1W6 + Stufe, höchstens 6, × 5 % des Gewichts), dann das Fell (jedes kg Tier 1 kg Fell, ohne Rüstung oder mit Jack; ohne Klinge-1 nur die Hälfte), dann der Wert mit jedem DM einzeln (Marktwurf 3W6 der Tierart, Jagd-DM des Geländes, Gefahr bei Fleischfressern, Seltenheit der Tabellenzeile) und was die Beute in Cr wert ist. Fleisch und Fell liegen danach als **Jagdbeute** in kg im Gruppengepäck und lassen sich im Shop nach kg verkaufen (vorgeschlagen der halbe Listenpreis).
- **Kampfsimulation** (S. 5–7) in **zwei Spalten**: links die SC, rechts die NSC, dazwischen eine schmale Lücke für die Pfeile; die **Entfernung** steht unten im Zug über den Angriffsknöpfen. Die Leiste der Charaktere oben gibt es im Kampf nicht. Jeder Kämpfer steht in drei Zeilen: der Name mit einem Zeichen dahinter für den Zustand (Blutstropfen verwundet, Gesicht mit X-Augen bewusstlos, rot gefüllt schwer verwundet, Kreuz tot), ★ für den Anführer, ▶ am Zug, ⌖ Ziel; darunter STR/DEX/END und Waffe mit Rüstung (bei Nahkampfwaffen die Combat-Schläge). **Jede Seite hat ihre Farbe**, gleich wer angreift: SC **gold**, NSC **rot** (Streifen an der Außenkante jeder Karte, Spaltenkopf, Marken, Pfeile); die Rolle zeigt die Form: am Zug ein leuchtender Rahmen, Ziel ein getönter Grund, Nachbar gestrichelt. **Pfeile** zeigen, wer wen angreift, rechtwinklig geführt (auf der Seite des Angreifers senkrecht bis zur Höhe des Ziels, dann waagrecht hinüber), in der Farbe des Angreifers: gestrichelt das gewählte Ziel (beim Feuerstoß dünn gestrichelt die Nachbarn), nach dem Wurf fliegt der Pfeil durchgezogen (Treffer) oder grau gepunktet (daneben), steht kurz und blendet aus. Oben steht fest „Runde 1 · 5 × Thugs“ mit dem ersten Wort der Reaktion und wer zuerst zieht. Antippen der Kopfzeile zeigt alle Würfe in der Übersicht.
  - Die **Entfernung** steht in **Range Bands** (Book 1, S. 32–33; Charts S. 7), je etwa 25 m: Close und Short Band 0 (Close heißt Berührung), Medium 1–2, Long 3–10, Very Long 11–20. Die NSC stehen zusammen und immer auf Band 0; **jeder SC hat seine eigene Entfernung** zu ihnen, und bewegt werden nur die SC. Gewürfelt wird 2W6 + Gelände auf die Encounter Ranges, dann das Band innerhalb der Reichweite (Hausregel, gleichverteilt: Medium 1W2, Long 1W8, Very Long 1W10); dort beginnen alle SC. Unten im Zug steht ein **Strahl** mit einem Punkt je Band und Strichen an den Grenzen (VL, L, M, C/S): **rechts fest ▲ die NSC**, links davon die SC, je weiter weg, desto weiter links, ganz links Band 20. **Jeder SC ist auf dem Strahl markiert** (goldener Kreis mit seinem Anfangsbuchstaben; stehen mehrere auf einem Band, übereinander). **Vorgewählt** ist der SC, um den es im Zug geht: der SC am Zug, beim NSC-Zug das Ziel. Er ist gold gefüllt und leuchtet, eine goldene Linie führt von ihm zu den NSC, die anderen SC sind nur umrandet; über dem Strahl stehen seine Reichweite, sein Name und sein Band („Long Kira · Band 4“). Die Pfeile zeigen, wohin sich bewegt, wer am Zug ist: Am SC-Zug geht der SC mit **▶** ein Band näher (bis in die Berührung), mit **◀** ein Band weiter weg; am NSC-Zug gehen die NSC mit **◀** näher und mit **▶** weiter weg, und alle SC rücken mit. Je Runde 1 Band gehen, ein zweites ist Laufen; wer läuft, greift in dieser Runde nicht an: Ein SC setzt von selbst aus, außer er könnte nachladen (dann wählt er „nachladen“ oder „Aussetzen“); die NSC laufen nur, bevor einer von ihnen dran war, und setzen dann aus, ein NSC mit leerer Waffe und Magazin lädt nach. Unter dem Strahl steht, wie weit der SC am Zug bzw. die NSC gegangen sind. Das ist kein Zug. **Langes Drücken auf den Strahl** setzt das Band des vorgewählten SC frei, ohne Grenze (Ermessen der Spielleitung). Wohin die Waffe am Zug nicht reicht, ist der Strahl gestrichelt. Über 20 Bands ist ein SC **entkommen** (ganz links hinter Band 20, „weg“): Er greift nicht an und wird nicht angegriffen, bis er wieder näher rückt. Für jeden Angriff gilt die Entfernung des SC, ob er angreift oder angegriffen wird. **Überraschung** (Regelheft S. 20) ist der **erste Wurf im Kampf**: Bevor jemand dran ist, steht unten nur **„Überraschung würfeln“**. Zwei Würfel rollen, der der SC weiß, der der NSC schwarz (Schwarz und Weiß sind auch für Farbenblinde klar zu unterscheiden), darunter je Partei die DMs einzeln und die Summe, dann wer Überraschung hat; **„Kampf beginnen“** startet Runde 1. Gewürfelt wird 1W6 je Partei mit DMs (Leader, Tactics, Army/Marines, Battle Dress, Fahrzeug, Gruppengröße); wer 3 höher liegt, zieht allein, Runde für Runde, **bis zum Alarm**: Jeder Schuss außer mit einem Laser gibt Alarm, ebenso ein Getroffener, der wach bleibt; fällt er, sieht es ein Kamerad, der noch nicht angegriffen wurde, bei 9+. Wer in der Runde des Alarms noch dran ist, greift noch an. Danach zieht jede Runde die Partei mit dem höheren Wurf zuerst, Kämpfer für Kämpfer; die Kopfzeile zeigt „Alarm in Runde 2 · SC zuerst“.
  - **Ausdauer** (Regelheft S. 22): Schläge und Hiebe darf man mit voller Kraft so oft wie die END zu Beginn der Begegnung; jeder Lauf der Partei kostet auch einen. Danach sind sie **geschwächt** mit dem DM der Waffe (Cutlass −4). Mit Überraschung und gegen Wehrlose kosten sie nichts. Ein SC am Zug kann einen Schlag auch freiwillig schwächen („Voll / Geschwächt −2“), damit er nicht zählt; darunter steht, wie viele Combat-Schläge er noch hat, und in der Liste bei jedem NSC mit Nahkampfwaffe. Battle Dress gibt unbegrenzte Ausdauer.
  - **Parade** (Regelheft S. 22): Wer mit Faust oder Klinge angegriffen wird und selbst eine Nahkampfwaffe führt, zieht seine Stufe darin vom Wurf ab; ein langes Gewehr pariert als Cudgel. Im Angriff steht sie als „Parade −1“.
  - Wer **am Zug** ist, ist golden umrandet mit ▶, das **Ziel** rot mit ⌖; beim Feuerstoß sind die Nachbarn, die er mit träfe, rot gestrichelt. Nach dem Würfeln blitzt jede getroffene Karte auf, der Schaden steigt an den Attributen auf. Man tippt nur das **Ziel** an (bei einem NSC-Zug schlägt die App einen wachen SC vor); Rüstung ist die des Ziels, Reichweite die Entfernung. Unten steht unter der Entfernung kompakt in einer Zeile, wer gegen wen („▶ Kira → ⌖ Rashid“), rechts **Ausweichen** und **Aussetzen**; darunter je Waffe ein Angriffsknopf: beim SC **Primär** (gold gefüllt) und **Sekundär** (gold umrandet, ohne Sekundärwaffe die **Hände**), je mit Waffe, Magazin und nötigem Wurf („Automatic Pistol · 15/15 · 9+“); beim NSC genauso, meist **Primär** und die **Hände**. Ein Tipp nimmt die Waffe in die Hand und greift an; reicht sie nicht, ist ihr Knopf aus („reicht nicht“), ist sie leer, lädt er nach („nachladen (2)“), ohne Magazin bleibt nur der andere Knopf. SC und NSC zählen ihre Munition gleich. Darunter, nur wenn es passt, Feuerstoß oder Einzelschuss und voll oder geschwächt. Daneben beendet den Zug; ein Treffer erst, wenn der Schaden verteilt ist. **Nachladen**, **Ausweichen** und **Aussetzen** sind auch ein Zug. Wer **ausweicht** (Regelheft S. 20), greift nicht an und pariert nicht; bis zu seinem nächsten Zug bekommt jeder Angriff auf ihn DM −1 (Close, Short), −2 (Medium) oder −4 (Long, Very Long), seine Karte zeigt ↯. Ist eine Partei außer Gefecht, ist der Kampf entschieden.
  - **Wunden** (S. 7, Regelheft S. 21): Der Schaden geht auf STR, DEX und END, jeder Würfel ganz auf ein Attribut; bringt er es auf 0, **läuft der Rest über** auf ein anderes Attribut über 0. Der erste Treffer geht auf ein zufälliges Attribut, bis es auf 0 ist, der Rest zufällig auf die anderen; für die DMs im Angriff zählen STR und DEX im laufenden Kampf ohne dessen Wunden (Regelheft S. 21), erst im nächsten Kampf mit ihnen; danach verteilt bei NSC die App, bei SC der Spieler (Würfel für Würfel antippen, beim Überlauf auch den Rest). Ein Attribut auf 0: bewusstlos, zwei: schwer verwundet, drei: tot; Bewusstlose kommen nicht dran, ein toter SC steht unter „Verstorben“. Wunden wirken sofort.
  - **Heilung** (S. 7): **„Heilen“** am Charakter oben (im Kopf seiner Karte in der Leiste, sobald er verwundet ist und sich etwas tun lässt) oder an einem NSC in der Liste. *Aufwachen* nach 10 Minuten (ein Attribut auf 0: die Wunden gehen zur Hälfte zurück) bzw. 3 Stunden (schwere Wunde: die Werte bleiben, mindestens 1). *Behandlung* durch einen SC heilt ganz: leichte Wunden mit Medical-1 und Medical Kit in 30 Minuten, schwere mit Medical-3 in einer medizinischen Einrichtung in 5W6 Tagen. *3 Tage Ruhe* heilt nur leichte Wunden. Wer nicht behandeln kann, steht mit Grund in der Auswahl. Nach voller Heilung und in jeder neuen Begegnung zählt der nächste Treffer wieder als erster (Errata zu *The Traveller Book*). Jede Heilung steht im Log; löscht man sie, sind die Wunden wieder da.
  - **Übernehmen** macht NSC zu SC oder zu dauerhaften NSC: Der NSC wechselt mit allem, was er hat, von der Begegnung in die Kampagne, auch mit seinen Wunden und dem, was von seiner Munition übrig ist; dauerhafte NSC stehen im Charakter-Screen unter „NSC“. Dazu **lange auf einen NSC drücken**: Die Liste bekommt Haken, Antippen hakt weitere an, und unten stehen statt Angreifen, Nachladen und Aussetzen **„Als SC“**, **„Als NSC“** und **„Abbrechen“**. **„Beenden“** schließt die Begegnung; der Reiter zeigt wieder die Waffentabelle.
- **Getragene Rüstung**: Man legt sie wie die Waffen im Gepäck-Bereich oder im Editor an; eine gekaufte Rüstung trägt der SC gleich, die alte kommt ins Gepäck. Die Beispiel-Charaktere tragen ihre von Anfang an (Kira Jack, Jonas Mesh). Sie zählt, wenn er angegriffen wird. Im Kampf steht sie oben in der Leiste neben dem Namen (bei Verwundung nach dem Zustand, etwa „verwundet · Jack“).
- **Feuerstoß und Schrot** (Flächenschaden, Book 1 und Book 4): Automatic Rifle und Submachinegun schießen **Feuerstöße** zu 4 Schuss: zwei Würfe auf das Ziel und je einer auf den NSC (bzw. SC) **darüber und darunter in der Liste**, mit DM −3. Beim Automatic Rifle wählt man unter der Waffe **Einzelschuss** (1 Schuss, DMs des Rifle) oder **Feuerstoß**. Die **Shotgun** trifft mit jedem Schuss bis zu 3 **ausgeloste** Nachbarn des Ziels mit, ohne Abzug. Das Popup zeigt den ersten Wurf groß und darunter die übrigen; im Log steht die ganze **Garbe** in einem Kasten. Schaden würfelt man für jeden Treffer der Reihe nach („Schaden Ada · noch 3“); der Zug endet, wenn alle verteilt sind. Lange drücken auf einen Wurf löscht die ganze Garbe.
- **Munition**: Bei einer Schusswaffe zeigt der Kampf, wie viele Schuss im Magazin sind und wie viele Magazine im Gruppengepäck sind (Rifle 20 Schuss je Rifle Ammo, Laser mit Power Pack). Jeder Angriff verbraucht einen Schuss, ein Feuerstoß vier; leer gibt es keinen Angriff, und ein Feuerstoß braucht 4 geladene Schuss. **„Nachladen“** nimmt ein Magazin aus dem Gruppengepäck; ein angebrochenes geht dabei verloren. Waffen aus der Abmusterung kommen geladen, gekaufte leer.

**Dritter Screen: Shop** (Starter Edition, *Charts and Tables* S. 14 und 23): die **Gruppenkasse** und der Einkauf auf der Welt, auf der die Gruppe gerade ist.
- Den **Aufenthaltsort** wählt man im Sektor: Weltkarte einer fertigen Welt öffnen und **„Gruppe ist hier“** antippen. Die Karte umrandet die Welt golden, die Liste sagt „Die Gruppe ist hier“.
- Aufgebaut wie der Laden eines Rollenspiels: Oben steht die **Leiste mit dem Charakter oben** wie im Orakel und im Kampf, kompakt mit seinen Credits und Attributen; für ihn kauft und verkauft man, Wischen wählt einen anderen. Darunter stehen Aufenthaltsort und Stand der Kasse und fünf Bereiche: **Waffen**, **Rüstung**, **Sonstiges**, **Verkauf** und **Kasse**. Auf einer Welt öffnet der Shop bei den Waffen, ohne Welt bei der Kasse.
- **Kasse**: Hier bucht man **Einnahme** (z. B. eine Belohnung) und **Ausgabe** mit Betrag und Text, **Einzahlung** (Credits des Charakters oben in die Kasse) und **Auszahlung** (aus der Kasse an den Charakter oben). Darunter steht das **Kassenbuch**, die neueste Buchung zuerst. Die Kasse wird nie negativ. Buchungen bleiben stehen; einen Fehler bucht man zurück.
- Das **Angebot** der Welt: alles aus der Liste mit Preis bis zum TL der Welt, ohne Schiffe und Mitgliedschaften, zu den Preisen der Charts (Classic Traveller kennt für Ausrüstung keine Preisänderung je Welt). Was das Gesetz der Welt verbietet (ab 1 Body Pistol, ab 5 Pistolen und Revolver, ab 8 Klingen außer dem Dagger …, S. 14), steht mit „verboten ab Gesetz …“ dabei und lässt sich trotzdem kaufen, mit Warnung.
  - **Waffen** als Tabelle, getrennt nach Nahkampf und Schusswaffen: Waffe, Schaden, Preis und daneben in einer eigenen Spalte die **Munition** (Magazin bzw. Power Pack mit Preis und Schuss). **Fett** steht, was der Charakter oben führen kann, also wofür er die Fertigkeit hat (mit Stufe, z. B. Auto Pistol-1); darunter auch der DM seines Attributs (DEX +1, STR −4). Ein kurzer Hinweis darüber erklärt Fett, Kaufen und Abzeichen; ein ✕ blendet ihn aus, und das merkt sich das Gerät.
  - **Rüstung** und **Sonstiges** (Ausrüstung, Fahrzeuge, Passagen) mit TL und Preis; dabei steht, welche Rüstung der Charakter oben trägt.
- **Kaufen**: Ein Tipp auf den Preis kauft **ein Stück** für den Charakter oben; mehr kauft man mit mehr Tipps, etwa viermal für vier Magazine. Nur was das Gesetz der Welt verbietet, fragt vorher nach („Trotzdem kaufen“). Ein goldenes Abzeichen in der Ecke jedes Preises zeigt, **wie viele die Gruppe schon hat** (im Gepäck und ausgerüstet), bei Waffen, Munition, Rüstungen und allem anderen; es zählt beim Kauf mit. Was die Kasse nicht hergibt, ist durchgestrichen, ebenso, was man nur einmal haben kann und schon hat. Der Preis geht aus der Kasse ab. Eine **Waffe** wird die Primärwaffe des Charakters oben und kommt in die Hand, seine bisherige Primärwaffe kommt ins Gepäck; eine **Rüstung** trägt er gleich, die alte kommt ins Gepäck. Alles andere (Munition, Ausrüstung, Passagen) kommt ins **Gruppengepäck**.
- **Gruppengepäck** im Bereich **Charaktere** (Hausregel nach Absprache): Was die Gruppe besitzt, liegt im gemeinsamen Gepäck; am SC bleibt nur, was er **ausgerüstet** hat: Primärwaffe, Sekundärwaffe und Rüstung. Je SC stehen die drei Stellen da, darunter das Gepäck mit Gewicht. Auf dem Desktop **zieht** man ein Stück aus dem Gepäck auf eine Stelle, von SC zu SC oder zurück ins Gepäck; ohne Ziehen (Smartphone) rüstet „Ausrüsten …“ an einem Stück aus, und ✕ an einer Stelle legt ab. Was dort vorher war, kommt ins Gepäck. Ein Balken zeigt die **Last** gegen die **Traglast** der Gruppe (Summe der STR aller lebenden SC in kg, nach der Schwerkraft des Aufenthaltsorts; Rüstung außer dem Vacc Suit, Dagger und Fahrzeuge zählen nicht). Ist das Gepäck schwerer, sind alle SC **belastet**: STR, DEX und END zählen bei Wunden und Bewusstlosigkeit um 1 niedriger, über der doppelten Traglast um 2 (mindestens 1).
- **Verkaufen** im Bereich **Verkauf**: Dort steht zuerst das **Gruppengepäck**, darunter, was der Charakter oben ausgerüstet hat, je nach Art (Waffen, Munition, Rüstungen …) mit Stückzahl, dabei, was gerade getragen, in der Hand oder Primär- bzw. Sekundärwaffe ist. Den Erlös je Stück antippen, dann Anzahl und Erlös wählen; vorgeschlagen ist der halbe Preis der Charts, nach Verhandlung änderbar. Der Erlös geht in die Kasse. Verkauft er eine Waffe, ist sie nicht mehr Primär- bzw. Sekundärwaffe; war sie in der Hand, nimmt er seine Primärwaffe, ohne sie die Hände.

**Vierter Screen: Charaktere** (zum Verwalten; Proben würfelt man oben im Orakel-Screen)
- Karten für die **Spielercharaktere** mit UPP, Fertigkeiten, Besitz, Ausrüstung, Credits und Notiz. Charaktere legt man in der App an und bearbeitet sie; Fertigkeiten und Gegenstände kommen aus festen Listen (Gegenstände mit TL, Gewicht und Preis aus den Charts der Starter Edition, S. 23), alles andere ist freier Text in der Ausrüstung. Im Kopf jeder Charakterkarte sitzt ein Stift zum **Bearbeiten**; dort lässt sich der Charakter auch löschen oder als **tot** markieren (er steht dann unter „Verstorben“, ist für Proben nicht wählbar, und das lässt sich zurücknehmen). Wer schon im Log vorkommt, wird nicht gelöscht, sondern ausgeblendet.
- Die Fertigkeiten stehen unter dem UPP mit Kürzel (Pil-2). Ein Tippen auf den Namen klappt die **Details** auf: volle Namen, Heimatwelt, Besitz, Ausrüstung, Credits, Notiz und Lebenslauf. Herkunft, Terms und Alter stehen in der Zeile des Namens.

**Charaktererschaffung nach den Regeln** (Starter Edition, *Charts and Tables* S. 2–3): Im Charakter-Screen „Nach Regeln erschaffen“ (oder oben im Orakel-Screen, solange es keinen Lebenden gibt) öffnet eine Charakterkarte im Vordergrund, wie bei den Proben. Jeder Wert wird einzeln mit der Würfelanimation bestimmt; unten führen Knöpfe durch die Schritte:
  1. Die sechs Attribute, jedes mit eigenem 2W6-Wurf.
  2. **Heimatwelt:** eine fertige Welt aus der Liste, oder „Auf der Karte wählen“: Dort wählt man eine Welt oder ein freies Feld, würfelt das Vorkommen und erschafft die Welt; ist sie benannt, ist sie die Heimatwelt.
  3. **Welche Laufbahn?** Navy, Marines, Army, Scouts, Merchants oder Other, jede mit Zielwert und DM; misslingt die Musterung, bestimmt die Einberufung (1W6) die Laufbahn.
  4. Je Term zuerst **auf welcher Welt?** (gleiche Wahl wie bei der Heimatwelt, dazu „Wie zuletzt“), dann Überleben (misslingt es, ist der Charakter tot), Offizierspatent und Beförderung, dann je Fertigkeit **welche Tabelle?** (Personal Development, Service Skills, Advanced Education, mit EDU 8+ auch die vierte). Blade Combat, Gun Combat und Vehicle fragen nach der genauen Fertigkeit; bei Blade und Gun Combat zeigt jede Waffe, ab welcher STR bzw. DEX ihr Malus wegfällt (Cutlass: STR 7+, sonst −2), ab welcher es ihren Bonus gibt (STR 11+ → +2) und welchen DM der Charakter jetzt damit hätte.
  5. Ab dem 4. Term das Altern.
  6. **Weiterverpflichten?** Gewürfelt wird immer; eine 12 heißt bleiben, nach 7 Terms geht es nur mit 12 weiter.
  7. Abmusterung: je Wurf **Geld oder Sachwerte**; Waffen wählt man, eine zweite gleiche wird zur Fertigkeit.
  8. Name eingeben (oder mit **Karte** daneben aus Vor- und Nachnamen von der Tafel NSC wählen) und übernehmen: Der Charakter bekommt UPP, Fertigkeiten, Besitz, Credits, Herkunft („Ex-Navy · Commander · 5 Terms · 38 Jahre“), die Pension in der Notiz und seinen **Lebenslauf**, den die Details der Karte zeigen.

  Würfe mit Zielwert (Musterung, Überleben, Patent, Beförderung, Altern, Krise) laufen groß als Popup wie die Probe: Zielwert, Würfel, dann jedes Attribut einzeln mit Namen (DEX +1, END +2), zuletzt das Urteil. Neue Werte erscheinen auf der Karte erst, wenn der Wurf feststeht.

  Oben in der Erschaffung sitzt eine Leiste mit Fragefeld, **Ja/Nein** (mit der eingestellten Stufe), **Karte ziehen**, **Deuten** und **Notiz**: Orakel und Inspirationskarte lassen sich so mitten in der Erschaffung befragen, und der Text im Feld wird auf Wunsch zur Deutung des neuesten Ergebnisses oder zur Notiz; alles steht wie sonst im Log. Der fertige Charakter zeigt seine Heimatwelt in den Details, der Lebenslauf zu jedem Term seine Welt. Von Hand angelegte Charaktere wählen die Heimatwelt im Editor.

  **Lange drücken** auf einen Würfelknopf lässt die ganze Erschaffung ohne Animation durchlaufen: Der Knopf füllt sich, solange man drückt; ist er voll, würfelt die App alles bis zum Namen (oder zum Tod) und trifft die Entscheidungen zufällig: Heimatwelt eine der fertigen Welten (gibt es keine, hält sie dort an), Welt je Term wie zuletzt, Laufbahn gewichtet nach der Chance der Musterung, alles andere halb und halb bzw. gleich verteilt. Den Namen gibt man selbst ein. Bei einer Welt geht das genauso bis zum Namen, im Sektor-Fenster mit dem Vorkommen.

  Die Erschaffung wird gespeichert: „Später weiter“ schließt sie, „Erschaffung fortsetzen“ holt sie zurück. Verwerfen geht jederzeit. Vorbild für das Verhalten: der interaktive Generator auf <https://www.batintheattic.com/traveller/interactive.html>.

**Fünfter Screen: Sektor** (Starter Edition, *Charts and Tables* S. 14–15 und TAS Form 6): ein Subsektor aus 8 × 10 Hexfeldern wie auf dem Subsector Map Grid, 0101 links oben. Dunkle Felder sind **nicht erzeugt**, helle ohne Zeichen **leer**. Welten stehen in der üblichen Darstellung von Classic Traveller: oben die Nummer, darüber der Raumhafen, in der Mitte die Welt (● mit Wasser, ○ ohne, Punkte für einen Asteroidengürtel), ★ Marinebasis, ▲ Scoutbasis, ein kleiner Kreis rechts oben für den Gasriesen, darunter der Name, ab Bevölkerung 9 in Großbuchstaben. Unter der Karte stehen die Welten als Liste mit UWP, Basen und Handelscodes. Die Karte lässt sich mit zwei Fingern, mit dem Mausrad oder mit **+ / −** zoomen und mit einem Finger oder der gehaltenen Maustaste verschieben. Vergrößert zeigt jede Welt unter ihrem Namen ihr UWP und, noch etwas größer, ihre Handelscodes.
  - Ein **nicht erzeugtes Feld** antippen wählt es aus (rot umrandet); unten erscheint der Knopf **„Vorkommen würfeln“** (1W6, bei 4+ gibt es eine Welt, sonst bleibt das Feld leer). Die Würfel rollen direkt im Sektor-Fenster. Ergibt sich eine Welt, öffnet **„Welt erschaffen“** die Weltkarte, und die **Weltenerschaffung** geht dort Wurf für Wurf mit der Würfelanimation weiter wie bei der Charaktererschaffung: Raumhafen, Marine- und Scoutbasis, Gasriese, Größe, Atmosphäre, Temperatur (nach Mongoose Traveller 2e: Gefroren, Kalt, Gemäßigt, Heiß oder Kochend, mit DM nach der Atmosphäre), Hydrographie (heiße Welten mit Malus), Bevölkerung, Regierung, Gesetz und Tech Level. Danach würfelt die App ohne eigenen Knopf die **Oberfläche** nach dem *World Builder's Handbook* (Wasseranteil in %, tektonische Platten, Kontinente bzw. Ozeane mit Inseln, Archipelen, Meeren und Seen, einheimisches Leben) als Vorarbeit für eine spätere Oberflächenkarte; zum Schluss der Name, getippt oder mit **Karte** daneben aus Vor- und Nachnamen gewählt (auch der Charakter-Editor hat diesen Knopf). Jeder Knopf sagt, was gewürfelt wird und mit welchem DM. „Später weiter“ behält die Welt, Verwerfen macht das Feld wieder frei.
  - Eine **Welt** antippen öffnet ihre Weltkarte: UWP (z. B. C788545-7) und jede Stelle im Klartext aus den Charts, Basen, Gasriese, Handelscodes, Temperatur, darunter die Oberfläche und eine **Notiz** zur Welt (freier Text, wird beim Verlassen des Feldes gespeichert; die Liste der Welten zeigt ihre erste Zeile); einer älteren Welt ohne Temperatur oder Oberfläche lassen sie sich dort nachwürfeln. Gespeichert werden nur diese Werte; eine Liste der Würfe gibt es nicht, den aktuellen Wurf zeigt nur die Würfelbühne.

**UI-Entwurf:** Der klickbare Entwurf liegt in [docs/ui-entwurf](docs/ui-entwurf/).

**Bewusst noch nicht in Version 1:** physisches Würfeln, Kampf über Angriff, Wunden, Überraschung, Ausdauer und Parade hinaus (Medical Drugs, Deckung, Moral), Kaufen und Verkaufen, Reisezonen, Sprungrouten, ganze Sektoren aus mehreren Subsektoren, Schiffe, NSC-Karten, Chaosfaktor, Szenen, Feinjustierung ±1, eigene Fertigkeiten, Hausregeln in der App einstellen.

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

**Journal:** Das erzählerische Journal bleibt vorerst **auf Papier**. Die App führt nur einen schlanken **Verlauf** aller Würfe, Orakelantworten und Ziehungen, dazu kurze Deutungen und Notizen, damit man nachschlagen kann, was passiert ist und wie man es gelesen hat. Der Verlauf kann als Markdown exportiert werden. Ein voller Journal-Editor kann später auf diesem Verlauf aufbauen.

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

In der App sitzt diese Auswahl **ganz unten** auf dem Hauptscreen und **bleibt stehen**, bis man sie ändert. Der Knopf „Ja/Nein“ steht in derselben Zeile und fragt das Orakel mit der eingestellten Stufe. Dieselbe Auswahl gibt den Zielwert der Proben (**6+ / 8+ / 10+**); jede Stufe zeigt beides, z. B. „50 % · 8+“.

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
| Namen | Drei Namen aus Vor- und Nachname (eher weiblich, eher männlich, neutral oder Genre) |
| Merkmale | Tugend, Laster, Merkmal |
| Flavortext | Ein aufgeschnapptes Zitat |

Besitz und Situation stehen wie auf der GMA-Karte links, Namen und Merkmale rechts daneben. Solange Besitz und Situation ausgeblendet sind, stehen die drei Namen in einer knappen Zeile über die volle Breite, unter den Sinneseindrücken.

**Namen:** eigene Listen, grob passend zum Third Imperium: je 100 Vornamen für die drei Felder und 300 gemeinsame Nachnamen, überwiegend irdisch und aus allen Weltgegenden, etwa ein Fünftel erfunden und fremd klingend nach dem Vorbild der Vilani. Jedes Feld zieht ein Paar aus Vor- und Nachname; im Log steht der Name am Stück („Paloma Valdez“).

**Zurzeit** zeigt die Karte nur die Felder, für die es Einträge gibt: Aktion und Beschreibung des Zufallsereignisses, Hören und Riechen (aus Mythic), die drei Namen sowie die Themen-Tafeln mit Mythics Elements-Tabellen (siehe unten). Die übrigen Felder und Bereiche sind ausgeblendet, bis es Einträge für sie gibt; ältere Logeinträge daraus bleiben lesbar.

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
- **Entschieden: mobil zuerst, als Web-App (PWA).** Man installiert sie aus dem Browser (Android: Menü → „App installieren“; iPhone: in Safari Teilen → „Zum Home-Bildschirm“); nach dem ersten Start läuft sie auch ohne Netz. Unter „Über“ steht, wie das auf dem jeweiligen Gerät geht (wo Chrome oder Edge es erlauben, mit Knopf „App installieren“), auf dem iPhone mit dem Hinweis, dass die installierte App eigenen Speicher hat, und ob der Browser zugesagt hat, den Spielstand dauerhaft zu halten. Eine native App ist später über Capacitor möglich, ohne Neuschreiben.
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

Classic Traveller ist ein Markenzeichen von Far Future Enterprises. Mongoose Traveller ist ein Produkt von Mongoose Publishing. Das World Builder's Handbook ist ein Produkt von Digest Group Publications. Mythic Game Master Emulator ist ein Produkt von Word Mill Games. Game Master's Apprentice ist ein Produkt von Larcenous Designs, LLC; die Web-Version stammt von James Turner. Dieses Projekt ist ein inoffizielles Fan-Projekt und wird kostenlos angeboten.

Was das für die Inhalte der App heißt (Stand der Prüfung: Oktober 2026; keine Rechtsberatung):

| Quelle | Was wir übernehmen dürfen | Bedingungen |
|---|---|---|
| **Mythic** (Word Mill Games, Tana Pigeon) | Den **Text** von Mythic GME 2e und weiteren Mythic-Produkten, auch die Tabellen (Fate Chart, Zufallsereignisse, Bedeutungstabellen); Übersetzen und Anpassen ist erlaubt. | Lizenz [CC BY-NC](https://wordmillgames.com/license.html): nicht kommerziell, Quellenangabe (Produkt, Autorin, Link zu Word Mill Games), Hinweis auf Änderungen, nicht als „offiziell“ ausgeben. Grafik und Gestaltung der Bücher sind nicht abgedeckt. Die Mythic-Daten behalten diese Lizenz, auch wenn der Code eine andere hat. In der App sind das die Einträge `*.mythic.*` in `src/data/sections.json` und alles in `src/data/mythic-tables.json`. |
| **Game Master's Apprentice** (Larcenous Designs) | Nur den **Aufbau** der Karte (Bereiche und Felder). | Die Karteninhalte sind geschützt und nur mit Erlaubnis von Larcenous Designs nutzbar. Bis dahin füllen wir die Felder mit eigenen Einträgen. |
| **Classic Traveller** (Far Future Enterprises) | Die **Mechanik**: Würfe, DMs, Abläufe als Programm. | Nach der Fan-Policy von FFE: kostenlos, Copyright- und Markenhinweis in der App, Regeltexte nicht über etwa eine Seite hinaus abschreiben. Vor einer Veröffentlichung die aktuelle Policy prüfen. |
| **Mongoose Traveller 2e** (Mongoose Publishing) | Nur die **Mechanik** einzelner Regeln, zurzeit die Temperatur einer Welt und ihr Malus auf die Hydrographie (Core Rulebook S. 251–252). | Fair-Use-Policy für Traveller: kostenlos, nicht kommerziell; eigene deutsche Texte statt Übersetzung des Regeltexts, keine Bilder aus den Büchern. Quelle auf dem „Über“-Bildschirm nennen. Vor einer Veröffentlichung den aktuellen Wortlaut der Policy prüfen. |
| **World Builder's Handbook** (Digest Group Publications, 1989, für MegaTraveller) | Nur die **Mechanik** der Oberfläche einer Welt (Wasseranteil, Platten, Kontinente und Ozeane, einheimisches Leben; S. 68–70). | Die Rechte an den DGP-Büchern sind ungeklärt; deshalb nur Würfe und Tabellenwerte als Daten, eigene deutsche Texte, keine Bilder, Quelle auf dem „Über“-Bildschirm. Vor einer Veröffentlichung klären, wer die Rechte hält. |

Die Quellenangaben stehen schon in Version 1 in der App, auf einem „Über“-Bildschirm.
