import { describe, expect, it } from 'vitest';
import {
  addShip,
  book,
  checksDone,
  checksLabel,
  checksMet,
  createCampaign,
  editLogNote,
  dateLabel,
  dateOf,
  daysToSunday,
  fromCampaignFile,
  fundsOf,
  journeyBlocker,
  jumpFuelOf,
  legalReaction,
  livingCharacters,
  lotteryPaid,
  misjumpOf,
  missingChecks,
  parsecs,
  passTime,
  potOf,
  removeLogEntry,
  rollCheck,
  setHexes,
  setLocation,
  setStartDate,
  shipJourneyBlocker,
  stampDays,
  stampPlaces,
  START_DAY,
  survived,
  toCampaignFile,
  travel,
  travelShip,
  weekdayOf,
  weekStart,
  winnerOf,
  writeNote,
  type Campaign,
  hexFromFlat,
  type Hex,
  type Journey,
} from '.';
import { fixedClock, fixedRandom } from './testing';

function world(column: number, row: number, name: string, starport = 12, law = 5, population = 5): Hex {
  return hexFromFlat({
    column,
    row,
    empty: false,
    name,
    navalBase: false,
    scoutBase: false,
    gasGiant: false,
    uwp: { starport, size: 7, atmosphere: 8, hydrographics: 8, population, government: 4, law, tech: 7 },
  });
}

const regina = world(1, 1, 'Regina');
const near = world(2, 1, 'Nahe');
const far = world(5, 5, 'Fern');
const outpost = world(1, 3, 'Außenposten', 31);
const there: Campaign = setLocation(setHexes(createCampaign(), [regina, near, far, outpost]), '0101');
const clock = fixedClock();
const [kira, jonas] = livingCharacters(there).map((c) => c.id) as [string, string];

describe('Spielzeit im Imperialen Kalender', () => {
  it('beginnt am 001-1105, dem Feiertag ohne Wochentag; Tag 002 ist ein Montag, Tag 008 der erste Sonntag', () => {
    expect(there.day).toBe(START_DAY);
    expect(dateLabel(START_DAY)).toBe('Feiertag, 001-1105');
    expect(weekdayOf(START_DAY + 1)).toBe(1);
    expect(dateLabel(START_DAY + 7)).toBe('Sonntag, 008-1105');
    expect(dateOf(START_DAY + 364)).toBe('365-1105');
    expect(weekdayOf(START_DAY + 364)).toBe(7);
    expect(dateOf(START_DAY + 365)).toBe('001-1106');
  });

  it('Woche beenden springt zum nächsten Sonntag, am Sonntag sieben Tage weiter; der Sonntag beginnt eine neue Woche', () => {
    expect(daysToSunday(START_DAY)).toBe(7);
    expect(daysToSunday(START_DAY + 3)).toBe(4);
    expect(daysToSunday(START_DAY + 7)).toBe(7);
    expect(weekStart(START_DAY + 6)).toBe(START_DAY);
    expect(weekStart(START_DAY + 7)).toBe(START_DAY + 7);
    expect(weekStart(START_DAY + 10)).toBe(START_DAY + 7);
    const week = passTime(there, 'week', clock);
    expect(week.day).toBe(START_DAY + 7);
    expect(week.log.at(-1)).toMatchObject({ kind: 'time', day: START_DAY, days: 7, week: true });
    const days = passTime(week, { days: 3 }, clock);
    expect(days.day).toBe(START_DAY + 10);
    expect(() => passTime(days, { days: 7 }, clock)).toThrow('1 bis 6');
  });

  it('das Startdatum lässt sich nur ändern, solange kein Logeintrag einen Tag hat; vergangene Zeit lässt sich nicht löschen', () => {
    const set = setStartDate(there, 123, 1107);
    expect(dateOf(set.day)).toBe('123-1107');
    const passed = passTime(set, { days: 1 }, clock);
    expect(() => setStartDate(passed, 1, 1105)).toThrow('solange der Log keinen Tag hat');
    expect(() => removeLogEntry(passed, 0)).toThrow('nicht löschen');
  });

  it('neue Logeinträge bekommen den heutigen Tag, alte behalten ihren', () => {
    const before = passTime(there, { days: 2 }, clock);
    const after = stampDays(before.log, { ...before, log: [...before.log, { kind: 'dice', at: clock.now(), dice: [3, 4] }] });
    expect(after.log.map((e) => e.day)).toEqual([START_DAY, START_DAY + 2]);
  });

  it('Ändern und Löschen geben alten Einträgen weder Tag noch Ort: nur neue Einträge bekommen sie', () => {
    // Ein alter Log ohne Tag und Ort: eine Notiz, ein Wurf und eine Deutung dazu.
    const note = writeNote([], 'Notiz', clock);
    const dice = { kind: 'dice' as const, at: clock.now(), dice: [3, 4] as [number, number] };
    const interpretation = writeNote([note, dice], 'Deutung', clock, 1);
    const old: Campaign = { ...there, day: START_DAY + 9, log: [note, dice, interpretation] };
    const stamp = (before: Campaign, after: Campaign) => stampPlaces(before.log, stampDays(before.log, after));
    const stamps = (c: Campaign) => c.log.map((e) => [e.day, e.place]);
    // Die Notiz ändern: Sie bleibt ohne Tag und Ort.
    expect(stamps(stamp(old, editLogNote(old, 0, 'Notiz, geändert', clock)))).toEqual([[undefined, undefined], [undefined, undefined], [undefined, undefined]]);
    // Die Notiz löschen: Die Deutung rückt nach und wird dabei kopiert; auch sie bleibt ohne Tag und Ort.
    expect(stamps(stamp(old, removeLogEntry(old, 0)))).toEqual([[undefined, undefined], [undefined, undefined]]);
    // Ein neuer Eintrag bekommt beides.
    const added = stamp(old, { ...old, log: [...old.log, writeNote(old.log, 'Neu', clock)] });
    expect(added.log.at(-1)).toMatchObject({ day: START_DAY + 9, place: { world: '0101' } });
    expect(added.log.slice(0, 3)).toEqual(old.log);
  });
});

describe('Tests im Log', () => {
  it('zählen je Zeitraum: Zufallsbegegnung heute, Patron diese Woche; nach dem Sonntag beginnt die Zählung neu', () => {
    const tested = { ...there, log: [rollCheck(there, 'random', fixedRandom(3), clock), rollCheck(there, 'patron', fixedRandom(6), clock)] };
    expect(checksLabel(tested, 'random')).toBe('heute 1×');
    expect(checksMet(tested, 'random')).toBe(true);
    expect(checksMet(tested, 'animal')).toBe(false);
    const tomorrow = passTime(tested, { days: 1 }, clock);
    expect(checksDone(tomorrow, 'random')).toBe(0);
    expect(checksDone(tomorrow, 'patron')).toBe(1);
    expect(checksDone(passTime(tomorrow, 'week', clock), 'patron')).toBe(0);
  });

  it('nur Woche beenden erinnert: an die Polizei, an Zufallsbegegnung und Tiere nur, wenn sie diese Woche gar nicht getestet sind; an Patron und Gerücht nie', () => {
    expect(missingChecks(there, false, true)).toEqual([]);
    expect(missingChecks({ ...there, terrain: 'clear' }, true, true)).toEqual(['random', 'animal', 'legal']);
    expect(missingChecks(there, true, false)).toEqual(['random', 'legal']);
    // Am Montag getestet, am Freitag Woche beenden: die Zufallsbegegnung zählt für die ganze Woche.
    const monday = passTime(there, { days: 1 }, clock);
    const tested = passTime({ ...monday, log: [...monday.log, rollCheck(monday, 'random', fixedRandom(2), clock)] }, { days: 4 }, clock);
    expect(missingChecks(tested, true, false)).toEqual(['legal']);
    expect(missingChecks(setLocation(there, undefined), true, true)).toEqual([]);
  });

  it('Polizei: 2W6 gleich oder über der Gesetzesstufe heißt Ruhe, darunter eine Reaktion; bei Gesetz 0 keine', () => {
    const calm = rollCheck(there, 'legal', fixedRandom(2, 3), clock);
    expect(calm).toMatchObject({ check: 'legal', target: 5, dice: [2, 3] });
    expect(calm.reactionDice).toBeUndefined();
    const stopped = rollCheck(there, 'legal', fixedRandom(1, 3, 4, 4), clock);
    expect(stopped).toMatchObject({ reactionDice: [4, 4], reactionDm: 0 });
    expect(legalReaction(stopped)).toBe(8);
    const lawless = setLocation(setHexes(there, [regina, world(3, 1, 'Frei', 12, 0)]), '0301');
    expect(() => rollCheck(lawless, 'legal', fixedRandom(), clock)).toThrow('Gesetz 0');
  });
});

describe('Reise mit Passagen', () => {
  it('reicht bis Sprung 2 zwischen Raumhäfen A bis E', () => {
    expect(parsecs(regina, near)).toBe(1);
    expect(parsecs(regina, far)).toBe(6);
    expect(journeyBlocker(there, '0201')).toBeUndefined();
    expect(journeyBlocker(there, '0505')).toContain('zu weit');
    expect(journeyBlocker(there, '0103')).toContain('keinen Raumhafen');
    expect(journeyBlocker(there, '0101')).toContain('schon hier');
  });

  it('kauft fehlende Passagen, dauert eine Woche und setzt den Aufenthaltsort', () => {
    const rich = book(there, 'income', 30000, clock);
    const after = travel(rich, '0201', { [kira]: 'high-passage', [jonas]: 'middle-passage' }, {}, undefined, fixedRandom(), clock);
    expect(fundsOf(after)).toBe(30000 - 10000 - 8000);
    expect(after.location).toEqual({ world: '0201' });
    expect(after.day).toBe(START_DAY + 7);
    expect(after.log.at(-1)).toMatchObject({ kind: 'journey', from: '0101', to: '0201', days: 7, day: START_DAY, berths: [] });
  });

  it('nimmt Passagen aus dem Gepäck; ohne Geld und ohne Passage geht es nicht', () => {
    const packed = { ...there, stash: [{ of: 'middle-passage', count: 2 }] };
    const after = travel(packed, '0201', { [kira]: 'middle-passage', [jonas]: 'middle-passage' }, {}, undefined, fixedRandom(), clock);
    expect(after.stash).toEqual([]);
    expect(after.bookings).toEqual([]);
    expect(() => travel(there, '0201', { [kira]: 'high-passage', [jonas]: 'high-passage' }, {}, undefined, fixedRandom(), clock)).toThrow('kosten');
  });

  it('Low Passage: aufwachen mit 5+ auf 2W6, sonst tot; die Lotterie gewinnt der nächste Tipp, der überlebt', () => {
    const packed = { ...there, stash: [{ of: 'low-passage', count: 2 }] };
    // Kira wacht auf (3 + 4), Jonas nicht (1 + 2); zwei NSC: der erste wacht auf (6 + 6, Tipp 0), der zweite nicht (2 + 1, Tipp 4).
    const random = fixedRandom(3, 4, 1, 2, 6, 6, 0, 2, 1, 4);
    const after = travel(packed, '0201', { [kira]: 'low-passage', [jonas]: 'low-passage' }, { [kira]: 2, [jonas]: 3 }, 2, random, clock);
    const journey = after.log.at(-1) as Journey;
    expect(journey.berths.map(survived)).toEqual([true, false, true, false]);
    expect(potOf(journey)).toBe(40);
    // Zwei überleben: Kiras Tipp 2 ist genau richtig.
    expect(winnerOf(journey)).toBe(0);
    expect(lotteryPaid(journey)).toBe(true);
    expect(fundsOf(after)).toBe(40);
    expect(after.bookings.at(-1)).toMatchObject({ kind: 'lottery', amount: 40, for: kira, won: after.log.length - 1 });
    expect(after.characters.find((c) => c.id === jonas)?.dead).toBe(true);
    expect(after.focus).toBe(kira);
    // Die Datei hält das alles und prüft es beim Import.
    const back = fromCampaignFile(toCampaignFile(after), 'k2');
    expect(back.log.at(-1)).toEqual(journey);
    expect(back.day).toBe(after.day);
    expect(() => removeLogEntry(after, after.log.length - 1)).toThrow('Reise');
  });

  it('bei Gleichstand entscheidet das Los; überlebt der Gewinner nicht, behält der Kapitän den Topf', () => {
    const packed = book({ ...there, stash: [{ of: 'low-passage', count: 1 }] }, 'income', 10000, clock);
    // Kira wacht nicht auf (1 + 1); ein NSC wacht auf (5 + 5) und tippt 0. Überlebende 1: beide liegen 1 daneben, das Los fällt auf Kira.
    const after = travel(packed, '0201', { [kira]: 'low-passage', [jonas]: 'high-passage' }, { [kira]: 2 }, 1, fixedRandom(1, 1, 5, 5, 0, 0), clock);
    const journey = after.log.at(-1) as Journey;
    expect(journey.lot).toBe(0);
    expect(winnerOf(journey)).toBe(0);
    expect(lotteryPaid(journey)).toBe(false);
  });
});

describe('Reise mit eigenem Schiff', () => {
  // Der Scout/Courier: Tank 40 t, Sprung 2 – also 20 t je Sprung; 4 Kabinen. Die Kasse zahlt die Lebenserhaltung.
  const scout = addShip(book(there, 'income', 10_000, clock), 'S', undefined).campaign;

  it('braucht keinen Raumhafen, reicht bis zur Sprungzahl und verlangt Treibstoff', () => {
    expect(jumpFuelOf('S')).toBe(20);
    expect(shipJourneyBlocker(there, '0201')).toContain('kein Schiff');
    expect(shipJourneyBlocker(scout, '0103')).toBeUndefined(); // Außenposten ohne Raumhafen – das Schiff landet trotzdem
    expect(shipJourneyBlocker(scout, '0505')).toContain('zu weit');
    const dry = { ...scout, ships: scout.ships.map((s) => ({ ...s, fuel: 10 })) };
    expect(shipJourneyBlocker(dry, '0103')).toContain('Treibstoff');
    expect(shipJourneyBlocker(scout, '0101')).toContain('schon hier');
  });

  it('verbraucht Treibstoff, würfelt den Sprung, dauert eine Woche und kostet nur die Lebenserhaltung', () => {
    const after = travelShip(scout, '0103', fixedRandom(2, 5), clock);
    expect(after.ships[0]!.fuel).toBe(20);
    expect(after.day).toBe(START_DAY + 7);
    expect(after.location).toEqual({ world: '0103' });
    // Zwei SC, je Cr2.000; der Außenposten hat keinen Raumhafen, also keine Liegegebühr.
    expect(after.bookings.slice(1)).toEqual([expect.objectContaining({ kind: 'ship', amount: -4_000, forShip: 's1', shipCost: 'lifeSupport', text: 'Lebenserhaltung, 2 Reisende' })]);
    const journey = after.log.at(-1) as Journey;
    expect(journey).toMatchObject({ kind: 'journey', from: '0101', to: '0103', days: 7, day: START_DAY, ship: 's1', jump: [2, 5], passengers: [], berths: [] });
    expect(misjumpOf(journey)).toBe(false);
    expect(after.characters.every((c) => !c.dead)).toBe(true);
  });

  it('verbraucht unraffinierten Treibstoff zuerst; der Sprung bekommt dann DM +1, und mit einer 12 ist es ein Fehlsprung (2026-11-21b)', () => {
    const skimmed = { ...scout, ships: scout.ships.map((s) => ({ ...s, unrefined: 25 })) };
    const after = travelShip(skimmed, '0103', fixedRandom(6, 6), clock);
    expect(after.ships[0]).toMatchObject({ fuel: 20, unrefined: 5 });
    const journey = after.log.at(-1) as Journey;
    expect(journey.jumpDm).toBe(1);
    expect(misjumpOf(journey)).toBe(true);
    // Mit raffiniertem Treibstoff bleibt 12 ohne Fehlsprung.
    const clean = travelShip(scout, '0103', fixedRandom(6, 6), clock).log.at(-1) as Journey;
    expect(clean.jumpDm).toBe(0);
    expect(misjumpOf(clean)).toBe(false);
  });

  it('der Sprungwurf steht an der Reise im Log; Fehlsprung ist nach SR erst 13+ mit DMs', () => {
    const after = travelShip(scout, '0201', fixedRandom(6, 6), clock);
    const journey = after.log.at(-1) as Journey;
    expect(journey.jump).toEqual([6, 6]);
    expect(misjumpOf(journey)).toBe(false); // ohne DMs ist 13+ auf 2W6 nicht möglich
    expect(after.location).toEqual({ world: '0201' }); // die Folgen entscheidet ohnehin der Owner
  });

  it('die Datei hält Schiff und Sprungwurf und prüft beides beim Import', () => {
    const after = travelShip(scout, '0103', fixedRandom(2, 5), clock);
    const journey = after.log.at(-1) as Journey;
    const back = fromCampaignFile(toCampaignFile(after), 'k2');
    expect(back.log.at(-1)).toEqual(journey);
    expect(back.ships[0]!.fuel).toBe(20);
    const broken = (change: (entry: Record<string, unknown>) => void) => {
      const parsed = JSON.parse(toCampaignFile(after));
      change(parsed.campaign.log.at(-1));
      return JSON.stringify(parsed);
    };
    expect(() => fromCampaignFile(broken((e) => { e.ship = 's9'; }), 'k2')).toThrow('Schiff');
    expect(() => fromCampaignFile(broken((e) => { delete e.jump; }), 'k2')).toThrow('Sprungwurf');
    expect(() => fromCampaignFile(broken((e) => { e.passengers = [{ for: kira, passage: 'high-passage' }]; }), 'k2')).toThrow('Passagier');
  });
});
