# Konzept: Werft, überarbeitet

> **Stand: freigegeben** (Owner, 28. November 2026), Kennzeichen **2026-11-28**. Freigegeben sind die
> drei Unterreiter, die Sperren nach SR 29 und die Kredit-Kachel („brauche ich unbedingt“). Der
> Entwurf liegt unter [`mock/werft.html`](mock/werft.html) (im Browser öffnen, fünf Handy-Ansichten).
> Die neuen Muster stehen im [GUI-Handbuch](gui-handbuch.md) unter *Werft*, die neue Regel zum
> Kauf in [`modell/schiffe.md`](modell/schiffe.md) unter *Erwerb*, *Wo gekauft wird*.
>
> **Noch nicht gebaut.** Dieses Dokument ist die Bauanleitung. Wer sie umsetzt, liest vorher
> `AGENTS.md`, `ARCHITECTURE.md` und das GUI-Handbuch; die Regeln dort gelten auch hier (Commits
> unter dem Namen des Owners, `npm run check`, GUI-Tests vor dem Push, Vorschau schicken, To-Do
> nachziehen, nie nach `main`).

## Worum es geht

Die Werft ist eine Detailseite im Bereich Schiff (`YardSheet` in `src/view/ship/ShipScreen.tsx`).
Heute ist sie eine lange Rolle: oben Reparatur und Bewaffnung mit Auswahlfeldern des Browsers
(`select`), darunter 19 Entwürfe mit durchgestrichenen Preisen, dazwischen lange Erklärtexte. Die
Kasse sieht man nicht. Gesperrtes sah auf Android bedienbar aus, der Grund stand klein und grau
darüber; der Owner hielt die Knöpfe für „tot“. Außerdem verkauft die Werft heute Schiffe an jedem
Raumhafen, obwohl SR 29 das nur an A (und Small Craft auch an B) erlaubt.

Nach dem Umbau hat die Werft:

1. oben einen **Kapazitätskopf** mit den Kacheln **Kasse** und **Kredit**,
2. darunter drei **Unterreiter**: **Mein Schiff** · **Schiffe** · **Small Craft**,
3. im Reiter Mein Schiff je Hardpoint eine **Hardpoint-Karte** mit Chips statt Auswahlfeldern;
   gewählt und eingebaut wird im **Kurzdialog**,
4. bei einer Sperre einen deutlichen **Sperrhinweis** oben im Reiter, darunter alles sichtbar
   ausgegraut,
5. die Erklärtexte als **Hinweis mit ✕** (das Gerät merkt sich das Ausblenden).

## Kritik am ersten Entwurf und was daraus wurde

Der erste Entwurf (dem Owner am 28. November 2026 gezeigt) wurde vor dem Ablegen geprüft. Geändert:

| Erster Entwurf | Problem | Jetzt |
|---|---|---|
| Drei Kacheln: Kasse, Laderaum, Hardpoints | Handbuch: Kacheln stehen zu zweit. Hardpoints stehen doppelt (Kachel und Karten), der Laderaum zählt nur bei Small Craft | Zwei Kacheln **Kasse** und **Kredit** in allen Reitern; der freie Laderaum steht als Zeile über der Liste im Reiter Small Craft, die Zahl der Hardpoints in der Überschrift der Bewaffnung |
| Kredit-Kachel „möglich“ | sagt nichts | Restschuld, Monatsrate bzw. „neu bis …“ (siehe unten) |
| Goldene Karte mit dem Schiffsnamen | Gold heißt „ausgewählt“; die Karte nimmt Platz, ohne etwas zu können | Der Name steht in der Überschrift „Bewaffnung von Kestrel · 1 Hardpoint“ |
| Platzpunkte am Hardpoint | doppelt zu den Chips | „1/2“ als Zahl wie heute |
| Roter Balken „Hier gibt es keine Werft“ | Rot heißt Gefahr bzw. die andere Seite; eine Sperre ist keins von beiden | **Sperrhinweis**: neutrale Fläche, roter Strich nur am linken Rand (wie „knapp“ im Kapazitätskopf), Text in voller Größe und `--text` |
| Ein Tipp im Waffen-Dialog baut sofort ein | Ein Fehltipp kostet bis MCr 1; Handbuch: Kurzdialog = Abbrechen + Hauptaktion | Erst wählen (Radio), dann **„Einbauen · Cr 500.000“** rechts unten |
| ⓘ für Erklärtexte | neues Zeichen ohne Handbuch | **Hinweis mit ✕** nach Handbuch (*Meldung und Hinweis*) |
| Gruppe „Mit Jump Drive“ in der Schiffsliste | alle Standardentwürfe haben Jump Drive | keine Gruppe, sortiert nach Preis |
| Grund nur am Preisknopf (title) | auf dem Handy unsichtbar | Grund als dritte Zeile in der Zeile (`why`) |

## Fachliche Änderung: Kauf nur an einer Werft

Regeltext in [`modell/schiffe.md`](modell/schiffe.md), *Erwerb*, *Wo gekauft wird*. Kurz:

- Ort des Kaufs ist der **Aufenthaltsort der Gruppe** (`Campaign.location`); sein Raumhafen
  entscheidet (Stadt auf dem Globus, sonst der Raumhafen des UWP, wie `shipPortOf` in
  `src/model/armament.ts` es für das Schiff schon tut).
- **Raumhafen A**: jeder Standardentwurf und jedes Small Craft. **Raumhafen B**: nur Small Craft (sie
  haben keinen Jump Drive). **C, D, E, X oder kein Ort**: nichts.
- Gilt für **bar und Bank** gleichermaßen. **Nicht** für den Ship-Vorteil der Abmusterung
  (`addShip` aus der Charaktererschaffung bleibt ungesperrt).
- Gründe als ein Satz (siehe *Texte*).

So bauen:

- Im Model eine Funktion `purchaseBlocker(campaign, design): string | undefined` neben
  `shipyardBlocker` (dort liegt `SHIPYARD_PORTS`; eine Hilfsfunktion für den Hafen des
  Aufenthaltsorts daneben). `buyShip` in `src/model/ship.ts` wirft `DomainError` mit diesem Grund,
  **nicht** `addShip`. `craftPurchaseBlocker` (Laderaum) bleibt und kommt danach.
- Im Controller (`src/controller/ship-view.ts`, `yard`-Zeilen) fließt der Grund in `blocker` und
  sperrt `affordable`. Zusätzlich je Reiter ein Grund für den Sperrhinweis (siehe *Daten für die
  View*).
- Unit-Tests in `src/model/ship.test.ts`: A kauft alles, B nur Small Craft, C und ohne Ort nichts,
  Abmusterung überall. **Achtung:** Bestehende Tests, die `buyShip` ohne Aufenthaltsort an einem
  Raumhafen A aufrufen (`ship.test.ts`, `small-craft.test.ts`, `small-craft-armament.test.ts`,
  `upkeep.test.ts`, `campaign-file.test.ts`), brauchen eine Kampagne mit Ort an Raumhafen A. Die
  Demo-Kampagne steht in Kessra (Raumhafen A); die GUI-Tests kaufen dort und bleiben gültig.
- `docs/regeln-schiffe.md`, Zeile *Schiffskauf und Finanzierung*: den Stand nachziehen („nur an
  Werft A, Small Craft auch B, 2026-11-28“).
- `docs/domain-model.md`, *Wo der Code noch nicht folgt*: den Eintrag „Kauf nur an einer Werft“
  wieder streichen, sobald gebaut.

## Aufbau der Seite

Vorbild in allen Einzelheiten: [`mock/werft.html`](mock/werft.html). Maße und Farben aus `:root` in
`styles.css`; keine festen Farben, kein `style={{…}}` für Gestaltung (Handbuch).

### Kopf

`DetailPage` mit Titel **Werft** und als `aside` **„<Ort> · Raumhafen <X>“** (Ort = Name der Stadt
bzw. Welt des Aufenthaltsorts; ohne Ort „kein Ort“). Das bisherige `aside` „Standardentwürfe ·
SR 33–37“ fällt weg. Keine eigene Aktionsleiste: Gehandelt wird an den Zeilen und in den
Kurzdialogen (wie heute).

### Kapazitätskopf: Kasse und Kredit

Zwei Kacheln nebeneinander, in allen drei Reitern gleich an derselben Stelle. Die bestehende
`Capacity`-Kachel aus `src/view/trade/TradeScreen.tsx` lässt sich nicht einfach übernehmen, weil
die Kredit-Kachel eine zweite Zeile braucht: Entweder `Capacity` in eine eigene Datei
(`src/view/Capacity.tsx`) ziehen und um eine optionale Unterzeile (`tile-sub`, gibt es schon in der
Kachel *Restschuld* im Bereich Schiff) erweitern, oder dieselben Klassen (`card-grid cols-2`,
`tile`, `tile-label`, `tile-text mono`, `tile-sub`) direkt nutzen. Die erste Lösung ist besser.

- **Kasse**: der Kassenstand. Unter Cr 200.000 in Cr, sonst in MCr mit zwei Stellen (dieselbe Regel
  wie `softwarePrice` in `src/view/format.ts`; diese Funktion dafür umbenennen oder verallgemeinern,
  etwa `price(cr)`). Rot (`negative`), wenn im offenen Reiter nichts bezahlbar ist.
- **Kredit**: die **Restschuld** aller Schiffe, deren Rate am Monatsende gebucht wird (in
  `src/model/upkeep.ts`: nicht ausgeblendet, `loanBalance > 0`), summiert; Gold wie die Kachel
  *Restschuld* im Bereich Schiff. Ohne Restschuld **„schuldenfrei“**. Die Unterzeile:
  - im Reiter **Mein Schiff**: die Monatsrate aller dieser Schiffe zusammen, **„Cr 212.750 im
    Monat“**; schuldenfrei leer;
  - in **Schiffe** und **Small Craft**: **„neu bis Cr 25.000“** bzw. **„neu bis MCr 5,25“**, der
    höchste Preis, dessen Anzahlung (20 %, `DOWN_PAYMENT` in `src/model/ship.ts`, heute nicht
    exportiert) die Kasse trägt, also Kasse ÷ 0,2;
  - ist der Kauf hier gesperrt (Sperrhinweis im Reiter): **„hier keine Werft“**.

### Unterreiter

Die bestehenden Unterreiter `segmented` (wie im Crew- und Computer-Reiter: `role="tablist"`, je
Knopf `role="tab"`, `aria-selected`; `--seg-cols` als Variable, nicht als Stil) mit **Mein Schiff**,
**Schiffe**, **Small Craft**. Welcher offen ist, ist Zustand der View (`useState` in `YardSheet`,
wie das offene Blatt in `ShipScreen`), kein gespeicherter Stand.

- Beim Öffnen: **Mein Schiff**, wenn es ein aktives Schiff gibt, sonst **Schiffe**.
- „← Werft“ aus der Bestellung und aus der Detailseite Schaden führt in den Reiter zurück, aus dem
  man kam (den Reiter im Blattzustand von `ShipScreen` mitführen, z. B. `{ kind: 'yard', tab }`).

### Reiter Mein Schiff

Von oben nach unten:

1. **Sperrhinweis**, wenn umrüsten hier nicht geht (`armamentBlocker`, siehe *Sperrhinweis*).
2. **Schaden**, nur wenn das Schiff Treffer hat: eine Zeile mit Rand in `--accent`: „Schaden · 2
   Treffer“, darunter die Zonen und der Werftpreis wie heute in `RepairSection`, rechts „›“. Ein
   Tipp öffnet die Detailseite Schaden (wie heute `onDamage`). `RepairSection` geht darin auf.
3. **Überschrift** `section-title`: „Bewaffnung von <Name> · <n> Hardpoint(s)“.
4. **Hardpoint-Karten**, eine je Turret in Reihenfolge, dann eine gestrichelte je freiem Hardpoint:
   - Kopf: „Hardpoint 1“ fett, „1/2“ gedämpft (Waffen/Plätze), rechts ein kompakter Chip mit der
     Turmart und „▾“ („Double Turret ▾“). Ein Tipp öffnet den Kurzdialog *Turmart*.
   - Darunter je Waffe ein goldener Chip „Beam Laser ✕“; ein Tipp öffnet den Kurzdialog
     *Waffe ausbauen*. Je freiem Platz ein gestrichelter goldener Chip „+ Waffe“; ein Tipp öffnet den
     Kurzdialog *Waffe einbauen* für diesen Turret. Ohne Waffe steht nichts außer den „+ Waffe“-Chips
     (das bisherige „unbestückt“ entfällt).
   - Freier Hardpoint: Kopf „Hardpoint 2 · frei“, darunter ein Chip „+ Turret“ (Kurzdialog
     *Turret einbauen*). Wie heute nur am ersten freien Hardpoint.
   - Chips 36 px hoch (`ghost compact`-Größe nach Handbuch), mindestens 30 px.
5. **Hinweis mit ✕**: „Einbauen bucht den Preis aus der Kasse, ohne Kredit. Ausbauen bringt nichts
   zurück. Preise nach SE 10.“
6. **Ohne Hardpoints** (`hardpoints === 0`): statt 3–5 der Satz „<Entwurf> hat keine Hardpoints.“
7. **Small Craft als aktives Schiff**: Bewaffnung nur ansehen (Chips ohne ✕, keine „+“), darüber der
   heutige Grund aus `armamentBlocker` als Sperrhinweis.
8. **Kein Schiff**: „Noch kein Schiff. Im Reiter Schiffe kaufen.“ und ein Chip „Zu den Schiffen“.

### Reiter Schiffe und Small Craft

Die heutige `YardTable` umbauen, nicht neu erfinden (`shop-row`, Preis als Knopf `shop-price`,
Bestellung über `BuySheet` wie heute):

- **Sperrhinweis** oben, wenn hier für diesen Reiter nichts kaufbar ist (siehe *Daten für die View*).
- **Small Craft**: darüber, wenn es ein aktives Schiff gibt, die Zeile „Laderaum von <Name>: 52 t
  frei“ (`group`-Stil, gedämpft). Ohne Schiff entfällt sie.
- Zeilen **nach Preis** aufsteigend. Je Zeile: Name (Standardentwurf mit Code klein dahinter),
  darunter in Mono „100 t · J-2 · 2G · Crew 1“ (Small Craft „40 t · 5G · Pilot + Rider“; Beiboote des
  Entwurfs angehängt wie heute), darunter **nur wenn gesperrt** der Grund gedämpft
  (`why`): „Anzahlung MCr 5,89 · Kasse zu klein“, „braucht 95 t im Laderaum, frei sind 52 t“. Ist der
  ganze Reiter gesperrt, steht der Grund nur oben, nicht in jeder Zeile.
- Preisknopf rechts wie heute: Betrag, darunter „bar“ oder „Anzahlung MCr …“, ✓ für vorhandene
  Entwürfe. **Gesperrt: grau, nicht durchgestrichen.** `.shop-price:disabled` streicht heute durch und gilt
  auch im Shop (`src/view/shop/ShopScreen.tsx`); die Durchstreichung nur in der Werft aufheben
  (eigene Klasse), den Shop nicht nebenbei ändern.
- **Hinweis mit ✕** unter Schiffe: „Bar oder über die Bank: 20 % Anzahlung, 480 Monatsraten,
  zusammen 220 % (SR 29).“ Unter Small Craft: „Ein Small Craft wird mit Schiff dessen Beiboot und
  liegt im Laderaum; ohne Schiff gehört es euch allein.“ Der Satz zum Ship-Vorteil der Abmusterung
  entfällt hier.

### Sperrhinweis

Neues Muster (im Handbuch unter *Werft*). Klasse z. B. `lock-hint`: volle Breite, Fläche `--panel`,
Rand `--line-strong`, links 3 px `--accent`, Text 14 px in `--text`, der erste Satz fett. Einmal je
Reiter, oben. Alles, was er sperrt, bleibt stehen, ist auf **35 % Deckkraft** gedimmt
(`opacity: .35`, wie schon `.armament select:disabled`) und ist `disabled`, damit es nicht
antippbar ist und Screenreader es als gesperrt lesen. Der bisherige kleine graue `combat-hint` für
`armamentBlocker` entfällt in der Werft.

### Kurzdialoge

Alle nach dem Muster `NoteSheet` (`src/view/oracle/NoteSheet.tsx`): `overlay`, `section.sheet` mit
`role="dialog"`, Kopf mit Titel, unten `sheet-foot` mit **Abbrechen** (`ghost`, `data-escape`)
links und der Hauptaktion (`primary`) rechts. Tipp auf den Hintergrund und Esc schließen.

- **Waffe einbauen**: Titel „Waffe in Hardpoint 1“, Unterzeile „Double Turret · Platz 2 von 2“. Die
  Waffen als Radio-Zeilen (`role="radiogroup"`, je Zeile `role="radio"`), nach Preis aufsteigend, Preis
  rechts in Mono. Nicht bezahlbare Zeilen ausgegraut mit „Kasse zu klein“ darunter. Hauptaktion
  **„Einbauen · <Preis>“**, gesperrt, solange nichts gewählt ist („Einbauen“ ohne Preis). Ruft
  `game.installWeapon(turret, id)`.
- **Turmart**: Titel „Turmart von Hardpoint 1“. Die anderen Turmarten als Radio-Zeilen mit Preis und
  Plätzen („Triple Turret · 3 Plätze“), bei weniger Plätzen als Waffen „nur 1 Waffe bleibt“. Hauptaktion
  **„Tauschen · <Preis>“** (`game.replaceTurret`). Darunter, abgesetzt, ein Knopf **„Turret
  ausbauen“** in Rot (`ghost danger`); er tauscht den Dialog gegen den Kurzdialog *Turret ausbauen*.
- **Turret einbauen** (freier Hardpoint): wie *Turmart*, alle Turmarten, Hauptaktion **„Einbauen ·
  <Preis>“** (`game.installTurret`).
- **Waffe ausbauen** / **Turret ausbauen**: Titel „Beam Laser ausbauen?“ bzw. „Turret 1 ausbauen?“,
  Satz „Dafür gibt es kein Geld zurück.“ (beim Turret „… samt seinen Waffen …“), Hauptaktion
  **„Ausbauen“** in Rot. Das ersetzt das heutige „Nochmal tippen“ an den Knöpfen (`asking`).

Nach jeder Hauptaktion schließt der Dialog; die Kasse im Kopf zählt mit. Schlägt etwas fehl, zeigt
der Controller wie heute eine Meldung (`ship.error`).

## Texte

Genau so (Begriffe aus dem Domänenmodell; Gründe als ein Satz):

| Wo | Text |
|---|---|
| Sperrhinweis, kein Werft-Hafen | **Hier gibt es keine Werft.** Umrüsten, Reparieren und Kaufen nur an Raumhafen A (Schiffe und Small Craft) oder B (nur Small Craft). |
| Sperrhinweis Schiffe an Raumhafen B | **Raumhafen B baut keine Schiffe mit Jump Drive.** Standardentwürfe gibt es an Raumhafen A; Small Craft auch hier. |
| Sperrhinweis, kein Ort | **Die Gruppe ist an keinem Ort.** Erst einen Ort setzen; gekauft wird an Raumhafen A oder B. |
| Sperrhinweis Mein Schiff, Schiff woanders | der heutige Grund aus `shipDepartureBlocker` |
| Sperrhinweis Mein Schiff, Systemflug | „Während eines Systemflugs wird nicht umgerüstet.“ (heute) |
| Zeile, zu teuer (bar und Anzahlung) | Anzahlung MCr 5,89 · Kasse zu klein |
| Dialog, zu teuer | Kasse zu klein |
| Kredit-Kachel | schuldenfrei · Cr 212.750 im Monat · neu bis Cr 25.000 · hier keine Werft |

Die Gründe für den Kauf kommen aus dem Model (`purchaseBlocker`), damit Model, Controller und View
denselben Satz sagen; die View setzt nur die Sätze der Kacheln und Hinweise.

## Daten für die View

`ShipView` (`src/controller/ship-view.ts`) liefert heute `funds`, `yard`, `turretTypes`,
`shipWeapons` und am Schiff `armamentBlocker`, `damage`, `repairCost`. Dazu kommen (Namen
Vorschlag):

- `yardPlace: { name: string; port: string | undefined }` für das `aside`;
- `loans: { balance: number; monthly: number }` (Summe der Schiffe mit Rate; 0/0 = schuldenfrei);
- `shipsBlocker: string | undefined` und `craftBlocker: string | undefined` – der Grund für den
  Sperrhinweis der Reiter Schiffe und Small Craft, wenn **alle** Zeilen dort aus diesem Grund
  gesperrt sind (aus `purchaseBlocker`);
- `newLoanUpTo: number` für „neu bis“;
- `freeCargo: number | undefined` für die Laderaum-Zeile (gibt es indirekt schon in
  `craftPurchaseBlocker`; als Wert herausgeben).

Die View rechnet nichts Fachliches: Der Controller liefert dafür `newLoanUpTo` (Kasse ÷ 0,2; die
Regel gehört ins Model neben `DOWN_PAYMENT`).

## Zugänglichkeit und Testnamen

Die GUI-Tests greifen über Rollen und Namen zu. Neu:

- Unterreiter: `tablist` „Werft“, Tabs „Mein Schiff“, „Schiffe“, „Small Craft“.
- Chips: Knöpfe „Waffe in Hardpoint 1 einbauen“ (Text sichtbar „+ Waffe“, Name per `aria-label`),
  „Beam Laser in Hardpoint 1 ausbauen“ (sichtbar „Beam Laser ✕“), „Turmart von Hardpoint 1 ändern“
  (sichtbar „Double Turret ▾“), „Turret auf Hardpoint 2 einbauen“.
- Dialoge: `dialog` mit dem Titel als Namen; Radio-Zeilen mit dem Namen der Waffe bzw. Turmart.
- Kacheln: `region`/Gruppe „Kapazität“ wie im Handel.

## Tests

- **Unit** (`npm run check`): `purchaseBlocker` (siehe oben), Kredit-Summen und Sperrgründe im
  Controller (`src/controller/ship.test.ts`, dort wird `ShipView` schon geprüft).
- **GUI** (`e2e/`), anpassen statt löschen:
  - `space.spec.ts`: „Werft: Bewaffnung sagt, wenn die Kasse nicht reicht …“ (Kasse in der Kachel,
    Waffe über den Kurzdialog einbauen), „Werft und Raumkampf …“ (Ausbauen fragt im Kurzdialog),
    „Detailseite Schaden …“ (Weg über die Zeile Schaden).
  - `ship.spec.ts`: `buyScout` und die Werft-Tests – der Scout liegt jetzt im Reiter **Schiffe**
    (die Demo hat ein Schiff, die Werft öffnet in Mein Schiff).
  - Neu: Sperrhinweis an einem Raumhafen C (Gruppe von Hand auf eine Welt mit C setzen) und an B
    (Schiffe gesperrt, Small Craft kaufbar); Kredit-Kachel nach einem Bankkauf mit Restschuld und
    Rate.
- Vor dem Push vollständig: `npm run test:e2e` (bzw. `CI=1 npx playwright test --trace off`).

## Reihenfolge

1. Model: `purchaseBlocker`, Sperre in `buyShip`, Unit-Tests, alte Tests mit Ort. `npm run check`.
2. Controller: neue Felder in `ShipView`.
3. View: Kopf und Kapazitätskopf, Unterreiter, Reiter Schiffe/Small Craft, dann Mein Schiff mit
   Karten und Kurzdialogen, zuletzt Sperrhinweis und Hinweise. CSS in `styles.css` unter
   „Werft“ (die alten Regeln `.armament …` ersetzen, nichts doppelt stehen lassen).
4. GUI-Tests anpassen und ergänzen, ganz grün.
5. Doku: Stand in `regeln-schiffe.md`; in `domain-model.md` den Eintrag unter *Wo der Code noch
   nicht folgt* streichen; im GUI-Handbuch bei *Werft* „gebaut“ vermerken; den Punkt in `TODO.md`
   streichen.
6. Vorschau bauen (`npm run build:single`) und dem Owner schicken: „Schiff → Werft; die drei
   Reiter; ‚+ Waffe‘ antippen; Kasse unter Charaktere → Kasse aufstocken, um einzubauen“.

## Nicht Teil dieses Schritts

- Ein Small Craft als Beiboot zu kaufen, während das Schiff an einem anderen Ort liegt als die
  Gruppe: heute erlaubt, bleibt so (⚑, später mit dem Owner klären).
- Software kauft man weiter im Computer-Reiter (`Werft · Software`); dort ändert sich nichts.
- Gebrauchte Schiffe, Verkauf, eigene Entwürfe (siehe `modell/schiffe.md`, *Offene Fragen*).
