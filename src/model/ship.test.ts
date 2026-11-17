import { describe, expect, it } from 'vitest';
import {
  activeShip,
  addShip,
  book,
  buyFuel,
  buyShip,
  chooseShipGain,
  createCampaign,
  freeDeckSlot,
  nextDeckSlot,
  fundsOf,
  gainShip,
  monthlyPaymentOf,
  payLoans,
  pendingShipGain,
  renameShip,
  resolveShipGains,
  shipOf,
  standardSoftware,
  updateShip,
  type Campaign,
  type CareerRoll,
  type DeckPlan,
} from '.';
import { fixedClock } from './testing';

const clock = fixedClock();
const base = createCampaign();

/** Aus der Gruppenkasse, was der Test braucht. */
const withFunds = (cr: number): Campaign => (cr === 0 ? base : book(base, 'income', cr, clock, 'Testgeld'));

/** Ein Vorteile-Wurf, der ein Schiff anbietet: Scout (schuldenfrei) oder Merchant (mit Kredit). */
const shipRoll = (gained: string, choice?: CareerRoll['shipChoice']): CareerRoll => ({ kind: 'benefit', dice: [6], dm: 0, gained, ...(choice === undefined ? {} : { shipChoice: choice }) });

const withRolls = (campaign: Campaign, rolls: readonly CareerRoll[]): Campaign => ({ ...campaign, generation: { career: { rolls, worlds: [] } } });

describe('Schiffe der Kampagne', () => {
  it('ein neues Schiff kommt vom Standardentwurf: voller Tank, Standardsoftware, Preis des Entwurfs', () => {
    const added = addShip(base, 'A', undefined);
    expect(added.ship).toMatchObject({ id: 's1', design: 'A', name: 'Free Trader', fuel: 30, cargo: 0, price: 37_080_000, retired: false });
    expect(added.ship.initialLoan).toBeUndefined();
    expect(added.ship.software.map((s) => s.program)).toEqual(['maneuver', 'jump-1', 'navigation', 'generate', 'anti-hijack', 'library']);
    expect(shipOf(added.campaign)).toEqual(added.ship);
  });

  it('das Standardprogramm folgt der Sprungzahl des Entwurfs', () => {
    expect(standardSoftware('S').map((s) => s.program)).toContain('jump-2');
  });

  it('kommt eines hinzu, wird das bisher aktive ausgeblendet; /ship ist nur das neue', () => {
    const first = addShip(base, 'S', undefined).campaign;
    const second = addShip(first, 'A', undefined);
    expect(second.campaign.ships).toHaveLength(2);
    expect(second.campaign.ships[0]!.retired).toBe(true);
    expect(activeShip(second.campaign).id).toBe('s2');
  });
});

describe('Werft', () => {
  it('bar kostet den vollen Preis als Schiffs-Buchung, ohne Schuld', () => {
    const bought = buyShip(withFunds(40_000_000), 'S', 'cash', clock);
    expect(fundsOf(bought)).toBe(40_000_000 - 29_430_000);
    const ship = activeShip(bought);
    expect(ship.initialLoan).toBeUndefined();
    expect(ship.fuel).toBe(40);
    expect(bought.bookings.at(-1)).toMatchObject({ kind: 'ship', forShip: ship.id, amount: -29_430_000 });
  });

  it('bei der Bank: 20 % Anzahlung, doppelte Kreditsumme, die erste Rate in einem Monat', () => {
    const bought = buyShip(withFunds(10_000_000), 'A', 'bank', clock);
    expect(fundsOf(bought)).toBe(10_000_000 - 7_416_000);
    expect(activeShip(bought)).toMatchObject({ initialLoan: 74_160_000, loanBalance: 74_160_000, nextPaymentDay: base.day + 30 });
    expect(monthlyPaymentOf(activeShip(bought))).toBe(154_500);
  });

  it('ohne Geld in der Kasse stoppt die Werft bei der Buchung', () => {
    expect(() => buyShip(base, 'A', 'cash', clock)).toThrow(/Gruppenkasse/);
    expect(() => buyShip(base, 'A', 'bank', clock)).toThrow(/Gruppenkasse/);
  });
});

describe('Treibstoff', () => {
  const trader = buyShip(withFunds(45_000_000), 'A', 'cash', clock);
  const id = activeShip(trader).id;
  const partly = updateShip(trader, id, { name: activeShip(trader).name, fuel: 18, cargo: 0 });

  it('Cr 500 je Tonne aus der Kasse', () => {
    const filled = buyFuel(partly, 10, clock);
    expect(activeShip(filled).fuel).toBe(28);
    expect(fundsOf(filled)).toBe(7_920_000 - 5_000);
    expect(filled.bookings.at(-1)).toMatchObject({ kind: 'ship', forShip: id, amount: -5_000 });
  });

  it('der Tank läuft nicht über, ganze Tonnen zählen', () => {
    expect(() => buyFuel(partly, 13, clock)).toThrow(/fasst noch 12/);
    expect(() => buyFuel(partly, 0, clock)).toThrow(/ganzen Tonnen/);
  });

  it('ohne Geld in der Kasse gibt es keinen Treibstoff', () => {
    const poor = buyShip(withFunds(37_081_000), 'A', 'cash', clock);
    const low = updateShip(poor, activeShip(poor).id, { name: activeShip(poor).name, fuel: 10, cargo: 0 });
    expect(() => buyFuel(low, 3, clock)).toThrow(/Gruppenkasse/);
  });
});

describe('Schiffsbogen', () => {
  const scout = buyShip(withFunds(30_000_000), 'S', 'cash', clock);
  const id = activeShip(scout).id;

  it('hält Name, Treibstoff und Fracht in ganzen Tonnen', () => {
    const edited = updateShip(scout, id, { name: 'Keterzelle', fuel: 12, cargo: 0 });
    expect(activeShip(edited)).toMatchObject({ name: 'Keterzelle', fuel: 12 });
    expect(() => updateShip(scout, id, { name: '  ', fuel: 12, cargo: 0 })).toThrow(/Namen/);
    expect(() => updateShip(scout, id, { name: 'x', fuel: 41, cargo: 0 })).toThrow(/fasst 40/);
    expect(() => updateShip(scout, id, { name: 'x', fuel: 12, cargo: 4 })).toThrow(/Laderaum fasst 3/);
  });

  it('der Stift benennt um, ohne Tank und Laderaum anzufassen', () => {
    const named = renameShip(scout, id, 'Eiserne Meridian');
    expect(activeShip(named)).toMatchObject({ name: 'Eiserne Meridian', fuel: 40, cargo: 0 });
  });
});

describe('Raten', () => {
  const loaned = () => buyShip(withFunds(10_000_000), 'A', 'bank', clock);

  it('fällige Zeit: die Bank hebt die Monatsrate aus der Kasse', () => {
    const due = { ...loaned(), day: base.day + 30 };
    const paid = payLoans(due, clock);
    expect(activeShip(paid)).toMatchObject({ loanBalance: 74_160_000 - 154_500, nextPaymentDay: base.day + 60 });
    expect(paid.bookings.at(-1)).toMatchObject({ kind: 'ship', amount: -154_500 });
  });

  it('ohne Deckung bleibt die Rate als Hinweis in der Kasse, der Termin rückt trotzdem weiter', () => {
    const poor = { ...buyShip(withFunds(7_416_000), 'A', 'bank', clock), day: base.day + 30 };
    const after = payLoans(poor, clock);
    expect(after.bookings.at(-1)).toMatchObject({ kind: 'ship', amount: 0, text: 'Rate nicht bezahlt' });
    expect(activeShip(after).nextPaymentDay).toBe(base.day + 60);
    expect(fundsOf(after)).toBe(0);
  });

  it('bezahlt: Restschuld und Termin entfallen, die Kreditsumme bleibt als Erinnerung', () => {
    const almost = loaned();
    const last = { ...almost, day: almost.day + 30, ships: almost.ships.map((s) => ({ ...s, loanBalance: 154_500 })) };
    const ship = activeShip(payLoans(last, clock));
    expect(ship.initialLoan).toBe(74_160_000);
    expect(Object.keys(ship)).not.toContain('loanBalance');
    expect(Object.keys(ship)).not.toContain('nextPaymentDay');
  });
});

describe('Ship-Vorteil der Abmusterung', () => {
  const scoutsRow = 'scouts.benefits.6';
  const merchantsRow = 'merchants.benefits.7';

  it('ohne Schiff legt der Vorteil es an: Scout schuldenfrei, Merchant mit Kreditsumme', () => {
    expect(activeShip(gainShip(base, 'S', true)).initialLoan).toBeUndefined();
    expect(activeShip(gainShip(base, 'A', false))).toMatchObject({ initialLoan: 37_080_000, loanBalance: 37_080_000 });
  });

  it('derselbe Entwurf zahlt die Restschuld ab; die Kreditsumme bleibt', () => {
    const bought = buyShip(withFunds(10_000_000), 'A', 'bank', clock);
    const ship = activeShip(gainShip(bought, 'A', false));
    expect(ship.id).toBe(activeShip(bought).id);
    expect(ship.initialLoan).toBe(74_160_000);
    expect(Object.keys(ship)).not.toContain('loanBalance');
  });

  it('wirkt sofort, wo es kann, und lässt die Wahl beim andern Entwurf offen', () => {
    const acted = resolveShipGains(withRolls(base, [shipRoll(scoutsRow)]));
    expect(activeShip(acted)).toMatchObject({ design: 'S' });
    expect(pendingShipGain(acted)).toBeUndefined();

    const scout = buyShip(withFunds(30_000_000), 'S', 'cash', clock);
    const rolling = withRolls(scout, [shipRoll(merchantsRow)]);
    expect(pendingShipGain(rolling)).toEqual({ design: 'A', debtFree: false });
    expect(resolveShipGains(rolling).ships).toHaveLength(1);
  });

  it('wechseln blendet das alte Schiff aus und legt das neue an', () => {
    const scout = buyShip(withFunds(30_000_000), 'S', 'cash', clock);
    const switched = chooseShipGain(withRolls(scout, [shipRoll(merchantsRow)]), 'switch');
    expect(switched.ships).toHaveLength(2);
    expect(activeShip(switched)).toMatchObject({ design: 'A', initialLoan: 37_080_000 });
    expect(pendingShipGain(switched)).toBeUndefined();
  });

  it('behalten lässt den Vorteil wirkungslos am Wurf stehen', () => {
    const scout = buyShip(withFunds(30_000_000), 'S', 'cash', clock);
    const kept = chooseShipGain(withRolls(scout, [shipRoll(merchantsRow)]), 'keep');
    expect(kept.ships).toHaveLength(1);
    expect(activeShip(kept).design).toBe('S');
    expect(kept.generation?.career.rolls[0]!.shipChoice).toBe('keep');
    expect(pendingShipGain(kept)).toBeUndefined();
  });

  it('ein entschiedener Schiffswurf fragt nie wieder', () => {
    const scout = buyShip(withFunds(30_000_000), 'S', 'cash', clock);
    expect(pendingShipGain(withRolls(scout, [shipRoll(merchantsRow, 'keep')]))).toBeUndefined();
  });
});

describe('Deckpläne', () => {
  const plan = (name: string): DeckPlan => ({ key: `k-${name}`, design: 'A', name, image: 'data:image/png;base64,x' });

  it('sind die Plätze Deck A, B und C; drei je Entwurf sind das Ende', () => {
    expect(freeDeckSlot([])).toBe('Deck A');
    expect(freeDeckSlot([plan('Deck A')])).toBe('Deck B');
    expect(freeDeckSlot([plan('Deck B')])).toBe('Deck A');
    expect(() => freeDeckSlot([plan('Deck A'), plan('Deck B'), plan('Deck C')])).toThrow(/Mehr als 3/);
  });

  it('nach dem Abgleich zählen auch Pläne auf Deck D: drei sind drei, auch wenn Deck C frei ist', () => {
    expect(() => freeDeckSlot([plan('Deck A'), plan('Deck B'), plan('Deck D')])).toThrow(/Mehr als 3/);
    expect(freeDeckSlot([plan('Deck A'), plan('Deck D')])).toBe('Deck B');
  });

  it('der nächste Platz für „beide behalten“ geht nach Deck C weiter', () => {
    expect(nextDeckSlot([])).toBe('Deck A');
    expect(nextDeckSlot(['Deck A', 'Deck C'])).toBe('Deck B');
    expect(nextDeckSlot(['Deck A', 'Deck B', 'Deck C'])).toBe('Deck D');
  });
});
