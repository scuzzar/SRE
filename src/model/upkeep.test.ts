import { describe, expect, it } from 'vitest';
import {
  activeShip,
  addShip,
  book,
  buyFuel,
  buyShip,
  costsOf,
  createCampaign,
  fromCampaignFile,
  fundsOf,
  isMonthStart,
  monthOf,
  monthStartsIn,
  nextMonthStart,
  passTime,
  placeGroup,
  removeLogEntry,
  setHexes,
  setLocation,
  shipJourneyBlocker,
  START_DAY,
  toCampaignFile,
  travel,
  travelShip,
  type Campaign,
  type Hex,
  type MonthEnd,
} from '.';
import { fixedClock, fixedRandom } from './testing';

function world(column: number, row: number, name: string, starport = 12): Hex {
  return {
    column,
    row,
    empty: false,
    name,
    navalBase: false,
    scoutBase: false,
    gasGiant: false,
    uwp: { starport, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
  };
}

const clock = fixedClock();
const regina = world(1, 1, 'Regina');
const near = world(2, 1, 'Nahe');
const outpost = world(1, 3, 'Außenposten', 31);
const hexes = setHexes(createCampaign(), [regina, near, outpost]);
/** Ohne Aufenthaltsort: keine Liegegebühr, nur Raten. */
const nowhere = (cr: number): Campaign => book(hexes, 'income', cr, clock, 'Testgeld');
/** Auf Regina, Raumhafen C. */
const onRegina = (cr: number): Campaign => setLocation(nowhere(cr), '0101');

const weeks = (campaign: Campaign, n: number): Campaign => Array.from({ length: n }).reduce<Campaign>((c) => passTime(c, 'week', clock), campaign);
const monthEnds = (campaign: Campaign): MonthEnd[] => campaign.log.filter((e): e is MonthEnd => e.kind === 'monthEnd');

describe('Monat im Imperialen Kalender (2026-11-17b)', () => {
  it('vier Wochen sind ein Monat; der erste beginnt mit dem Feiertag, der dreizehnte hat dazu Tag 365', () => {
    expect(monthOf(START_DAY)).toEqual({ month: 1, year: 1105 });
    expect(isMonthStart(START_DAY)).toBe(true);
    expect(isMonthStart(START_DAY + 27)).toBe(false);
    expect(isMonthStart(START_DAY + 28)).toBe(true); // Tag 029, ein Sonntag
    expect(monthOf(START_DAY + 28).month).toBe(2);
    expect(isMonthStart(START_DAY + 336)).toBe(true); // Tag 337: der dreizehnte Monat
    expect(isMonthStart(START_DAY + 364)).toBe(false); // Tag 365 gehört noch dazu
    expect(monthOf(START_DAY + 364)).toEqual({ month: 13, year: 1105 });
    expect(nextMonthStart(START_DAY + 336)).toBe(START_DAY + 365); // der Feiertag des nächsten Jahres
    expect(monthStartsIn(START_DAY, START_DAY + 28)).toEqual([START_DAY + 28]);
    expect(monthStartsIn(START_DAY + 1, START_DAY + 27)).toEqual([]);
  });
});

describe('Raten am Monatsende', () => {
  it('die erste Rate ist am ersten Monatsende fällig, das mindestens vier Wochen nach dem Kauf liegt', () => {
    expect(activeShip(buyShip(nowhere(10_000_000), 'A', 'bank', clock)).nextPaymentDay).toBe(START_DAY + 28);
    const midMonth = { ...nowhere(10_000_000), day: START_DAY + 9 };
    expect(activeShip(buyShip(midMonth, 'A', 'bank', clock)).nextPaymentDay).toBe(START_DAY + 56);
  });

  it('am Monatsende bucht die Bank die Rate, dann steht die Monatsabrechnung im Log', () => {
    const bought = buyShip(nowhere(10_000_000), 'A', 'bank', clock);
    expect(monthEnds(weeks(bought, 3))).toEqual([]);
    const after = weeks(bought, 4);
    expect(after.day).toBe(START_DAY + 28);
    expect(activeShip(after)).toMatchObject({ loanBalance: 74_160_000 - 154_500, nextPaymentDay: START_DAY + 56 });
    expect(after.bookings.at(-1)).toMatchObject({ kind: 'ship', amount: -154_500, shipCost: 'rate' });
    const entry = after.log.at(-1) as MonthEnd;
    expect(entry).toMatchObject({ kind: 'monthEnd', day: START_DAY + 28 });
    expect(after.log.at(-2)!.kind).toBe('time');
    // Kauf und Anzahlung gehören nicht dazu, nur die Rate.
    expect(costsOf(after, entry).map((c) => c.booking.shipCost)).toEqual(['rate']);
  });

  it('ohne Deckung bleibt die Rate offen: Hinweis, gleiche Restschuld, der Termin rückt trotzdem weiter', () => {
    const after = weeks(buyShip(nowhere(7_416_000), 'A', 'bank', clock), 4);
    expect(after.bookings.at(-1)).toMatchObject({ kind: 'ship', amount: 0, text: 'Rate nicht bezahlt', shipCost: 'rate' });
    expect(activeShip(after)).toMatchObject({ loanBalance: 74_160_000, nextPaymentDay: START_DAY + 56 });
    expect(fundsOf(after)).toBe(0);
  });

  it('die letzte Rate: Restschuld und Termin entfallen', () => {
    const bought = buyShip(nowhere(10_000_000), 'A', 'bank', clock);
    const almost = { ...bought, ships: bought.ships.map((s) => ({ ...s, loanBalance: 154_500 })) };
    const ship = activeShip(weeks(almost, 4));
    expect(Object.keys(ship)).not.toContain('loanBalance');
    expect(Object.keys(ship)).not.toContain('nextPaymentDay');
  });
});

describe('Monatsabrechnung', () => {
  it('ohne Schiff und ohne laufende Kosten entsteht keine', () => {
    expect(monthEnds(weeks(nowhere(100), 4))).toEqual([]);
  });

  it('mit Schiff auch ohne Kosten, und jede verweist nur auf die Buchungen seit der letzten', () => {
    const scout = addShip(nowhere(100_000), 'S', undefined).campaign;
    const first = weeks(scout, 4);
    expect(monthEnds(first)).toHaveLength(1);
    expect(costsOf(first, monthEnds(first)[0]!)).toEqual([]);
    const tanked = buyFuel({ ...first, ships: first.ships.map((s) => ({ ...s, fuel: 30 })) }, 10, clock);
    const second = weeks(tanked, 4);
    const [, entry] = monthEnds(second);
    expect(costsOf(second, entry!).map((c) => [c.booking.shipCost, c.booking.amount])).toEqual([['fuel', -5_000]]);
  });

  it('lässt sich nicht löschen, und die Kampagnendatei prüft ihre Verweise', () => {
    const after = weeks(buyShip(nowhere(10_000_000), 'A', 'bank', clock), 4);
    expect(() => removeLogEntry(after, after.log.length - 1)).toThrow('Monatsabrechnung');
    const back = fromCampaignFile(toCampaignFile(after), 'k2');
    expect(back.log.at(-1)).toEqual(after.log.at(-1));
    expect(back.bookings).toEqual(after.bookings);
    expect(back.ships).toEqual(after.ships);
    const parsed = JSON.parse(toCampaignFile(after));
    parsed.campaign.log.at(-1).costsTo = 99;
    expect(() => fromCampaignFile(JSON.stringify(parsed), 'k2')).toThrow('Buchungen');
  });
});

describe('Liegegebühren', () => {
  it('die ersten sechs Tage im Hafen sind bezahlt, danach Cr100 je Tag', () => {
    const scout = addShip(onRegina(10_000), 'S', undefined).campaign;
    expect(activeShip(scout).berthedSince).toBe(START_DAY);
    const free = passTime(scout, { days: 5 }, clock); // Tag 001 bis 006
    expect(free.bookings).toHaveLength(scout.bookings.length);
    const seventh = passTime(free, { days: 1 }, clock);
    expect(seventh.bookings.at(-1)).toMatchObject({ kind: 'ship', amount: -100, shipCost: 'berthing', text: 'Liegegebühr, 1 Tag' });
    expect(passTime(seventh, { days: 6 }, clock).bookings.at(-1)).toMatchObject({ amount: -600, text: 'Liegegebühr, 6 Tage' });
  });

  it('ohne Raumhafen und ohne Aufenthaltsort kostet das Liegen nichts', () => {
    const atOutpost = addShip(setLocation(nowhere(10_000), '0103'), 'S', undefined).campaign;
    expect(weeks(atOutpost, 2).bookings).toHaveLength(atOutpost.bookings.length);
    const lost = addShip(nowhere(10_000), 'S', undefined).campaign;
    expect(weeks(lost, 2).bookings).toHaveLength(lost.bookings.length);
  });

  it('Gruppe platzieren: das Schiff kommt mit und zahlt am neuen Hafen Cr100 für die ersten sechs Tage', () => {
    const scout = addShip(onRegina(10_000), 'S', undefined).campaign;
    const moved = placeGroup({ ...scout, day: START_DAY + 3 }, '0201', clock);
    expect(activeShip(moved).berthedSince).toBe(START_DAY + 3);
    expect(moved.bookings.at(-1)).toMatchObject({ amount: -100, shipCost: 'berthing', text: 'Liegegebühr bei der Ankunft' });
    expect(placeGroup(scout, '0101', clock)).toEqual(scout); // dieselbe Welt: keine neue Ankunft
  });

  it('ohne Deckung bleibt die Gebühr offen', () => {
    const scout = addShip(setLocation(hexes, '0101'), 'S', undefined).campaign;
    expect(passTime(scout, 'week', clock).bookings.at(-1)).toMatchObject({ amount: 0, text: 'Liegegebühr nicht bezahlt' });
  });

  it('ein Schiff von vor den Liegegebühren liegt ab dem nächsten Zeitschritt im Hafen', () => {
    const scout = addShip(onRegina(10_000), 'S', undefined).campaign;
    const old = { ...scout, ships: scout.ships.map((s) => Object.fromEntries(Object.entries(s).filter(([key]) => key !== 'berthedSince')) as typeof s) };
    const after = passTime(old, 'week', clock);
    expect(activeShip(after).berthedSince).toBe(START_DAY);
  });
});

describe('Reise mit eigenem Schiff: Kabinen und Lebenserhaltung', () => {
  const scout = addShip(onRegina(10_000), 'S', undefined).campaign; // 4 Kabinen
  const crowd = (n: number): Campaign => ({ ...scout, characters: Array.from({ length: n }, (_, i) => ({ ...scout.characters[0]!, id: `c${i + 1}` })) });

  it('zur Not zu zweit in einer Kabine, mehr nicht', () => {
    expect(shipJourneyBlocker(book(crowd(8), 'income', 10_000, clock), '0201')).toBeUndefined();
    expect(shipJourneyBlocker(book(crowd(9), 'income', 10_000, clock), '0201')).toBe('Scout/Courier hat 4 Kabinen; 9 Reisende passen auch zu zweit nicht hinein.');
  });

  it('Cr2.000 je Reisendem am Abflugtag; reicht die Kasse nicht, geht die Reise nicht', () => {
    expect(shipJourneyBlocker(crowd(6), '0201')).toBe('Die Lebenserhaltung kostet Cr 12.000, in der Kasse ist Cr 10.000.');
  });

  it('im Sprung liegt das Schiff nirgends; am Ziel kostet die Ankunft Cr100', () => {
    const after = travelShip(scout, '0201', fixedRandom(2, 5), clock);
    expect(after.bookings.slice(1).map((b) => [b.shipCost, b.amount])).toEqual([
      ['lifeSupport', -4_000],
      ['berthing', -100],
    ]);
    expect(activeShip(after).berthedSince).toBe(START_DAY + 7);
  });

  it('springt die Reise über ein Monatsende, steht die Abrechnung hinter ihr, mit dem Monatsende als Tag', () => {
    const late = { ...scout, day: START_DAY + 21, ships: scout.ships.map((s) => ({ ...s, berthedSince: START_DAY + 21 })) };
    const after = travelShip(late, '0201', fixedRandom(2, 5), clock);
    expect(after.log.slice(-2).map((e) => [e.kind, e.day])).toEqual([
      ['journey', START_DAY + 21],
      ['monthEnd', START_DAY + 28],
    ]);
    expect(costsOf(after, after.log.at(-1) as MonthEnd).map((c) => c.booking.shipCost)).toEqual(['lifeSupport']);
  });

  it('mit Passagen kommt das Schiff mit (Hausregel) und liegt erst am Ziel wieder im Hafen', () => {
    const [kira, jonas] = scout.characters.map((c) => c.id) as [string, string];
    const rich = book(scout, 'income', 100_000, clock);
    const after = travel(rich, '0201', { [kira]: 'middle-passage', [jonas]: 'middle-passage' }, {}, undefined, fixedRandom(), clock);
    expect(activeShip(after).berthedSince).toBe(START_DAY + 7);
    expect(after.bookings.filter((b) => b.shipCost === 'berthing').map((b) => b.text)).toEqual(['Liegegebühr bei der Ankunft']);
  });
});
