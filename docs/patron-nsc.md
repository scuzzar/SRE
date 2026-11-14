# Patron-NSC: Fertigkeiten und Ausrüstung je Beruf

**Hausregel, am 14. November 2026 als Startpunkt freigegeben** (feste Werte; später soll ein richtiger NSC-Generator sie ablösen, ggf. nach Tabellen aus den Regeln) (Kennzeichen 2026-11-14 im
[Domänenmodell](domain-model.md), siehe dort *Patron als NSC*). Die Regeln geben den Patrons der
Patron Encounters Matrix (SE, Charts S. 20) keine Werte. Diese Tabelle legt fest, was ein zufällig
erzeugter Patron-NSC nach seinem Beruf bekommt (`Patron.skills`, `Patron.gear`). Ein Beruf, der auf
beiden Listen oder mehrfach steht (z. B. Naval Officer), bekommt überall dasselbe.

- **Fertigkeiten** stehen mit Stufe; nur Fertigkeiten, die die App kennt (`src/data/skills.json`).
- **Ausrüstung** sind Gegenstände aus der Ausrüstungsliste (`src/data/items.json`). Gibt es einen
  Gegenstand in mehreren TL-Stufen (Vacc Suit, Communicator), bekommt der NSC den besten bis zum TL
  seines Orts. Was über dem TL seines Orts liegt, fehlt ihm.
- Die **erste Waffe** ist seine Primärwaffe und in der Hand, die **Rüstung** trägt er. Jede
  Schusswaffe ist geladen und hat 1W4 Magazine dazu, wie bei den NSC der Begegnung.

| Beruf | Fertigkeiten | Ausrüstung |
|---|---|---|
| Administrator | Admin-2 | Hand Calculator |
| Arms Merchant | Admin-1, Auto Pistol-1, Bribery-1 | Automatic Pistol, Mesh |
| Army Officer | Rifle-1, Leader-1, Tactics-1 | Automatic Pistol, Mesh |
| Arsonist | Mechanical-1, Streetwise-1 | Dagger, Electric Torch |
| Assassin | Rifle-2, Streetwise-1 | Rifle, Telescopic Sights, Body Pistol |
| Avenger | Auto Pistol-1, Brawling-1 | Automatic Pistol, Dagger |
| Barbarian | Broadsword-1, Brawling-1 | Broadsword, Jack |
| Belter | Vacc Suit-2, Mechanical-1 | Vacc Suit, Radiation Detector |
| Broker | Admin-1, Bribery-1, Streetwise-1 | Hand Calculator |
| Bureaucrat | Admin-2 | Hand Calculator |
| Clerk | Admin-1, Computer-1 | Hand Calculator |
| Courier | Pilot-1, Vacc Suit-1, Auto Pistol-1 | Automatic Pistol, Communicator (Short Range) |
| Crewmember | Vacc Suit-1, Engineering-1 | Vacc Suit, Mechanical Tool Set |
| Cutthroat | Blade-2, Streetwise-1 | Blade, Jack |
| Diplomat | Admin-1, Carousing-1, Leader-1 | Body Pistol |
| Doctor | Medical-2 | Medical Kit |
| Embezzler | Admin-1, Computer-1, Forgery-1 | Hand Calculator |
| Emigre | Jack-of-all-Trades-1 | Tarpaulin |
| Financier | Admin-1, Gambling-1 | Hand Calculator |
| Government Official | Admin-1, Bribery-1 | Hand Calculator |
| Governor | Admin-2, Leader-1 | Body Pistol |
| Hijacker | Auto Pistol-1, Vacc Suit-1, Pilot-1 | Automatic Pistol, Vacc Suit |
| Hunter | Rifle-2, Vehicle-1 | Rifle, Telescopic Sights, Binoculars, Tent |
| Marine Officer | Cutlass-1, Leader-1, Tactics-1 | Cutlass, Automatic Pistol, Mesh |
| Mercenary | Rifle-1, Tactics-1 | Rifle, Cloth |
| Merchant | Admin-1, Bribery-1, Steward-1 | Automatic Pistol, Hand Calculator |
| Naval Architect | Engineering-2, Computer-1 | Hand Calculator |
| Naval Officer | Navigation-1, Leader-1, Vacc Suit-1 | Cutlass, Automatic Pistol |
| Navigator | Navigation-2, Computer-1 | Inertial Locator |
| Noble | Carousing-1, Leader-1, Foil-1 | Foil |
| Peasant | Brawling-1 | Club |
| Pilot | Pilot-2, Vacc Suit-1 | Vacc Suit, Automatic Pistol |
| Pirate | Cutlass-1, Vacc Suit-1, Gunnery-1 | Cutlass, Automatic Pistol, Vacc Suit |
| Playboy | Carousing-2, Gambling-1 | Body Pistol |
| Police | Auto Pistol-1, Streetwise-1 | Automatic Pistol, Handcuffs, Communicator (Short Range) |
| Professor | Computer-1, Admin-1 | Hand Calculator |
| Reporter | Carousing-1, Streetwise-1 | Video Recorder, Voice Recorder |
| Researcher | Computer-1, Electronics-1 | Hand Calculator |
| Rogue | Streetwise-1, Blade-1, Gambling-1 | Blade |
| Scholar | Computer-1, Admin-1 | Hand Calculator |
| Scientist | Computer-1, Electronics-1 | Electronic Tool Set |
| Scout | Pilot-1, Navigation-1, Vacc Suit-1 | Vacc Suit, Carbine |
| Scout Administrator | Admin-1, Pilot-1 | Revolver |
| Scout Pilot | Pilot-2, Navigation-1 | Vacc Suit, Revolver |
| Shipowner | Admin-1, Pilot-1, Leader-1 | Automatic Pistol, Communicator (Medium Range) |
| Shopkeeper | Admin-1, Carousing-1 | Hand Calculator |
| Smuggler | Streetwise-1, Bribery-1, Pilot-1 | Automatic Pistol |
| Soldier | Rifle-1, Tactics-1 | Rifle, Mesh |
| Speculator | Gambling-1, Admin-1 | Hand Calculator |
| Spy | Forgery-1, Electronics-1, Body Pistol-1 | Body Pistol, Voice Recorder |
| Starport Warden | Admin-1, Auto Pistol-1 | Automatic Pistol, Communicator (Short Range) |
| Steward | Steward-2 | — |
| Swindler | Forgery-1, Streetwise-1, Gambling-1 | Body Pistol |
| Technician | Electronics-1, Mechanical-1 | Electronic Tool Set |
| Terrorist | Submachinegun-1, Mechanical-1 | Submachinegun, Jack |
| Tourist | Carousing-1 | Video Recorder, Binoculars |
| Underworld Leader | Streetwise-2, Leader-1, Bribery-1 | Body Pistol |
| Writer | Carousing-1, Admin-1 | Text Recorder |
