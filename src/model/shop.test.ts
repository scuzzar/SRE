import { describe, expect, it } from 'vitest';
import {
  ammoOf,
  book,
  buy,
  characterOf,
  createCampaign,
  equip,
  fromCampaignFile,
  fundsOf,
  itemOf,
  offerOf,
  reload,
  salePrice,
  sell,
  setHexes,
  setLocation,
  setWields,
  setWears,
  spendRound,
  toCampaignFile,
  type Campaign,
  type Hex,
} from '.';
import { fixedClock } from './testing';

// Regina: TL 7, Gesetz 5 (keine Pistolen und Revolver, S. 14).
const regina: Hex = {
  column: 2,
  row: 7,
  empty: false,
  name: 'Regina',
  navalBase: false,
  scoutBase: true,
  gasGiant: true,
  uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
  temperature: 'temperate',
  surface: { water: 80, plates: 8, majorContinents: 1, minorContinents: 4, majorIslands: 5, archipelagos: 7, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
};
const there: Campaign = setLocation(setHexes(createCampaign(), [regina]), '0207');
const clock = fixedClock();

describe('Aufenthaltsort', () => {
  it('ist eine fertige Welt des Subsektors oder keiner', () => {
    expect(there.location).toBe('0207');
    expect(setLocation(there, undefined)).not.toHaveProperty('location');
    expect(() => setLocation(there, '0101')).toThrow(/keine fertige Welt/);
  });
});

describe('Gruppenkasse', () => {
  it('beginnt mit Cr 0; Einnahme und Ausgabe ändern den Stand, nie unter 0', () => {
    expect(fundsOf(there)).toBe(0);
    const paid = book(there, 'income', 5000, clock, '  Belohnung von Dr. Halvek ');
    expect(fundsOf(paid)).toBe(5000);
    expect(paid.bookings[0]).toMatchObject({ kind: 'income', amount: 5000, text: 'Belohnung von Dr. Halvek' });
    expect(fundsOf(book(paid, 'expense', 1200, clock, 'Liegegebühr'))).toBe(3800);
    expect(() => book(paid, 'expense', 6000, clock)).toThrow(/nicht in der Gruppenkasse/);
    expect(() => book(paid, 'income', 0, clock)).toThrow(/über 0/);
  });

  it('Einzahlung und Auszahlung bewegen Credits zwischen Charakter und Kasse', () => {
    const deposited = book(there, 'deposit', 2400, clock, undefined, 'c1');
    expect(fundsOf(deposited)).toBe(2400);
    expect(characterOf(deposited, 'c1').credits).toBe(12400 - 2400);
    const paidOut = book(deposited, 'payout', 400, clock, undefined, 'c2');
    expect(characterOf(paidOut, 'c2').credits).toBe(3150 + 400);
    expect(fundsOf(paidOut)).toBe(2000);
    expect(() => book(there, 'deposit', 5000, clock, undefined, 'c2')).toThrow(/Jonas Reyl hat nur Cr 3.150/);
  });
});

describe('Shop', () => {
  it('bietet an, was es bis zum TL der Welt gibt, ohne Schiffe; verbotene Waffen mit Warnung', () => {
    const offer = offerOf(regina);
    const of = (id: string) => offer.find((o) => o.item.id === id);
    expect(of('rifle')).toMatchObject({ price: 200, banned: undefined });
    expect(of('revolver')).toMatchObject({ price: 150, banned: 5 });
    expect(of('revolver-ammo')).toMatchObject({ price: 5, banned: 5 });
    expect(of('body-pistol')).toMatchObject({ banned: 1 });
    expect(of('laser-rifle')).toBeUndefined(); // TL 9
    expect(of('free-trader')).toBeUndefined();
    expect(of('travellers-aid-society')).toBeUndefined();
    expect(of('club')).toBeUndefined(); // ohne Preis
  });

  it('kauft aus der Kasse; die Schusswaffe kommt leer in die Hand, Magazine kommen ins Gepäck', () => {
    let campaign = book(there, 'income', 1000, clock, 'Fund');
    campaign = buy(campaign, 'rifle', 1, 'c2', clock);
    campaign = buy(campaign, 'rifle-ammo', 2, 'c2', clock);
    expect(fundsOf(campaign)).toBe(1000 - 200 - 40);
    expect(campaign.bookings[1]).toMatchObject({ kind: 'purchase', amount: -200, for: 'c2', bought: 'rifle', count: 1, in: '0207' });
    // Was niemand ausrüstet, kommt ins Gepäck: die Buchung hat keinen Charakter.
    expect(campaign.bookings[2]).toMatchObject({ kind: 'purchase', bought: 'rifle-ammo', count: 2 });
    expect(campaign.bookings[2]).not.toHaveProperty('for');
    const jonas = characterOf(campaign, 'c2');
    expect(jonas).toMatchObject({ primary: 'rifle', wields: 'rifle' });
    expect(jonas.possessions).toContainEqual({ of: 'rifle', count: 1, rounds: 0 });
    // Seine bisherige Primärwaffe liegt jetzt im Gepäck, neben den Magazinen.
    expect(campaign.stash).toEqual(expect.arrayContaining([{ of: 'blade', count: 1 }, { of: 'rifle-ammo', count: 2 }]));
    expect(() => buy(campaign, 'cutlass', 10, 'c2', clock)).toThrow(/nicht in der Gruppenkasse/);
    expect(() => buy(campaign, 'laser-rifle', 1, 'c2', clock)).toThrow(/gibt es auf Regina nicht/);
    expect(() => buy(createCampaign(), 'rifle', 1, 'c2', clock)).toThrow(/auf keiner Welt/);
  });
});

describe('Verkaufen', () => {
  it('schlägt den halben Preis vor; Schiffe, Mitgliedschaften und Dinge ohne Preis verkauft man nicht', () => {
    expect(salePrice(itemOf('rifle'))).toBe(100);
    expect(salePrice(itemOf('revolver-ammo'))).toBe(2);
    expect(salePrice(itemOf('club'))).toBeUndefined();
    expect(salePrice(itemOf('free-trader'))).toBeUndefined();
    expect(salePrice(itemOf('travellers-aid-society'))).toBeUndefined();
  });

  it('der Erlös geht in die Kasse, der Gegenstand aus dem Besitz; mit der Waffe in der Hand bleiben die Hände', () => {
    const armed = setWields(there, 'c1', 'automatic-pistol');
    const sold = sell(armed, 'automatic-pistol', 1, 120, 'c1', clock);
    expect(fundsOf(sold)).toBe(120);
    expect(sold.bookings[0]).toMatchObject({ kind: 'sale', amount: 120, for: 'c1', sold: 'automatic-pistol', count: 1, in: '0207' });
    const kira = characterOf(sold, 'c1');
    expect(kira.possessions.some((p) => p.of === 'automatic-pistol')).toBe(false);
    expect(kira).not.toHaveProperty('wields');
    // Wer seine getragene Rüstung verkauft, trägt danach keine mehr.
    const worn = sell(setWears(there, 'c1', 'jack'), 'jack', 1, 25, 'c1', clock);
    expect(characterOf(worn, 'c1')).not.toHaveProperty('wears');
    // Aus dem Gepäck verkauft man ohne Charakter; auch was über dem TL der Welt liegt.
    const fromStash = sell(there, 'vacc-suit-tl12', 1, 5000, undefined, clock);
    expect(fundsOf(fromStash)).toBe(5000);
    expect(fromStash.bookings[0]).not.toHaveProperty('for');
    expect(fromStash.stash.some((p) => p.of === 'vacc-suit-tl12')).toBe(false);
  });

  it('eine gekaufte Waffe wird Primärwaffe in der Hand, die alte kommt ins Gepäck; eine Rüstung trägt er gleich', () => {
    const rich = book(there, 'income', 5000, clock);
    // Jonas hat Blade als Primärwaffe: Die Rifle wird Primärwaffe, Blade kommt ins Gepäck.
    const rifle = buy(rich, 'rifle', 1, 'c2', clock);
    expect(characterOf(rifle, 'c2')).toMatchObject({ primary: 'rifle', wields: 'rifle' });
    expect(rifle.stash).toContainEqual({ of: 'blade', count: 1 });
    // Zwei Revolver, beide leer (die Gruppe hatte keinen): einer wird Primärwaffe, der zweite und die leere Rifle kommen ins Gepäck.
    const revolver = buy(rifle, 'revolver', 2, 'c2', clock);
    expect(characterOf(revolver, 'c2')).toMatchObject({ primary: 'revolver', wields: 'revolver' });
    expect(revolver.stash).toEqual(expect.arrayContaining([{ of: 'rifle', count: 1, rounds: 0 }, { of: 'revolver', count: 1, rounds: 0 }]));
    // Hat er dieselbe Waffe schon in der Hand, geht die gekaufte ins Gepäck; eine Waffe, die die
    // Gruppe schon hat, kommt nicht leer.
    const again = buy(revolver, 'revolver', 1, 'c2', clock);
    expect(again.stash).toContainEqual({ of: 'revolver', count: 2 });
    // Eine Rüstung trägt er gleich; die alte kommt ins Gepäck. Die Frage „anlegen?“ gibt es nicht mehr.
    const cloth = buy(rich, 'cloth', 1, 'c1', clock);
    expect(characterOf(cloth, 'c1')).toMatchObject({ wears: 'cloth' });
    expect(cloth.stash).toContainEqual({ of: 'jack', count: 1 });
    // Eine Waffe ohne SC, der sie ausrüstet, gibt es nicht.
    expect(() => buy(rich, 'rifle', 1, undefined, clock)).toThrow(/fehlt der SC/);
  });

  it('verkauft er die Sekundärwaffe in der Hand, nimmt er die Primärwaffe; ohne Primärwaffe die Hände', () => {
    const rich = book(there, 'income', 5000, clock);
    // Jonas kauft eine Rifle (Primärwaffe), nimmt Blade aus dem Gepäck als Sekundärwaffe in die Hand.
    const holding = setWields(equip(buy(rich, 'rifle', 1, 'c2', clock), 'c2', 'secondary', { key: 'blade' }), 'c2', 'blade');
    expect(characterOf(sell(holding, 'blade', 1, 20, 'c2', clock), 'c2')).toMatchObject({ primary: 'rifle', wields: 'rifle' });
    expect(characterOf(sell(holding, 'rifle', 1, 100, 'c2', clock), 'c2')).toMatchObject({ secondary: 'blade', wields: 'blade' });
    const onlyBlade = setWields(rich, 'c2', 'blade');
    const sold = characterOf(sell(onlyBlade, 'blade', 1, 20, 'c2', clock), 'c2');
    expect(sold).not.toHaveProperty('primary');
    expect(sold).not.toHaveProperty('wields');
  });

  it('verkauft nicht mehr, als Gepäck oder SC haben, nicht für 0 Cr und nicht ohne Aufenthaltsort', () => {
    const two = buy(book(there, 'income', 100, clock), 'rifle-ammo', 2, 'c2', clock);
    expect(sell(two, 'rifle-ammo', 1, 10, undefined, clock).stash).toContainEqual({ of: 'rifle-ammo', count: 1 });
    expect(() => sell(two, 'rifle-ammo', 3, 10, undefined, clock)).toThrow(/Im Gepäck sind 2 × Rifle Ammo/);
    expect(() => sell(two, 'rifle-ammo', 1, 0, undefined, clock)).toThrow(/über 0/);
    expect(() => sell(two, 'rifle', 1, 10, 'c2', clock)).toThrow(/hat kein Rifle/);
    expect(() => sell(createCampaign(), 'blade', 1, 10, 'c2', clock)).toThrow(/auf keiner Welt/);
  });

  it('übersteht die Kampagnendatei', () => {
    const sold = sell(there, 'blade', 1, 25, 'c2', clock);
    expect(fromCampaignFile(toCampaignFile(sold), 'k2').bookings).toEqual(sold.bookings);
  });
});

describe('Munition', () => {
  const bought = (() => {
    let campaign = book(there, 'income', 1000, clock);
    campaign = buy(campaign, 'rifle', 1, 'c2', clock);
    campaign = buy(campaign, 'rifle-ammo', 1, 'c2', clock);
    return setWields(campaign, 'c2', 'rifle');
  })();

  it('eine leere Waffe schießt nicht; Nachladen nimmt ein Magazin aus dem Gepäck und füllt sie', () => {
    expect(ammoOf(characterOf(bought, 'c2'), bought.stash)).toEqual({ rounds: 0, capacity: 20, ammo: 'rifle-ammo', magazines: 1 });
    expect(() => spendRound(bought, 'c2')).toThrow(/leer/);
    const loaded = reload(bought, 'c2');
    expect(ammoOf(characterOf(loaded, 'c2'), loaded.stash)).toMatchObject({ rounds: 20, magazines: 0 });
    expect(loaded.stash.some((p) => p.of === 'rifle-ammo')).toBe(false);
    expect(ammoOf(characterOf(spendRound(loaded, 'c2'), 'c2'))?.rounds).toBe(19);
    expect(() => reload(loaded, 'c2')).toThrow(/Im Gepäck ist kein Rifle Ammo \(20 rds\) mehr/);
  });

  it('eine Waffe ohne Zählung ist voll; Hände und Klingen verbrauchen nichts', () => {
    const kira = setWields(createCampaign(), 'c1', 'automatic-pistol');
    expect(ammoOf(characterOf(kira, 'c1'))).toMatchObject({ rounds: 15, capacity: 15, magazines: 0 });
    expect(spendRound(createCampaign(), 'c1')).toEqual(createCampaign());
    expect(itemOf('lc-power-pack').kind).toBe('ammunition');
  });
});

describe('Kampagnendatei mit Kasse', () => {
  it('übernimmt Aufenthaltsort, Buchungen und geladene Schuss', () => {
    const campaign = spendRound(reload(setWields(buy(buy(book(there, 'income', 1000, clock, 'Fund'), 'rifle', 1, 'c2', clock), 'rifle-ammo', 1, 'c2', clock), 'c2', 'rifle'), 'c2'), 'c2');
    const back = fromCampaignFile(toCampaignFile(campaign), 'k2');
    expect(back.location).toBe('0207');
    expect(back.bookings).toEqual(campaign.bookings);
    expect(characterOf(back, 'c2').possessions).toEqual(characterOf(campaign, 'c2').possessions);
    expect(back.stash).toEqual(campaign.stash);
  });

  it('weist eine Kasse zurück, die negativ würde, und Buchungen, die nicht zu ihrer Art passen', () => {
    const json = JSON.parse(toCampaignFile(there));
    json.campaign.bookings = [{ at: '2026-11-03T10:00:00.000Z', kind: 'expense', amount: -100 }];
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/negativ/);
    json.campaign.bookings = [{ at: '2026-11-03T10:00:00.000Z', kind: 'income', amount: -100 }];
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/falsche Richtung/);
    json.campaign.bookings = [];
    json.campaign.characters[0].possessions[0].rounds = 99;
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/0 bis 15 Schuss/);
  });
});
