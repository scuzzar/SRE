import { describe, expect, it } from 'vitest';
import {
  ammoOf,
  book,
  buy,
  characterOf,
  createCampaign,
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
  inputOf,
  updateCharacter,
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

  it('kauft aus der Kasse; die Schusswaffe kommt leer, Magazine kommen dazu', () => {
    let campaign = book(there, 'income', 1000, clock, 'Fund');
    campaign = buy(campaign, 'rifle', 1, 'c2', clock);
    campaign = buy(campaign, 'rifle-ammo', 2, 'c2', clock);
    expect(fundsOf(campaign)).toBe(1000 - 200 - 40);
    expect(campaign.bookings[1]).toMatchObject({ kind: 'purchase', amount: -200, for: 'c2', bought: 'rifle', count: 1, in: '0207' });
    expect(characterOf(campaign, 'c2').possessions).toEqual(expect.arrayContaining([{ of: 'rifle', count: 1, rounds: 0 }, { of: 'rifle-ammo', count: 2 }]));
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
    // Auch ein verbotener Gegenstand oder einer über dem TL der Welt lässt sich verkaufen.
    expect(fundsOf(sell(there, 'vacc-suit-tl12', 1, 5000, 'c1', clock))).toBe(5000);
  });

  it('eine gekaufte Waffe wird Primärwaffe (in der Hand), sonst Sekundärwaffe, wenn noch keine da ist', () => {
    const rich = book(there, 'income', 5000, clock);
    // Jonas hat Blade als Primärwaffe: Die Rifle wird Sekundärwaffe, der Revolver danach nichts.
    const rifle = buy(rich, 'rifle', 1, 'c2', clock);
    expect(characterOf(rifle, 'c2')).toMatchObject({ primary: 'blade', secondary: 'rifle' });
    expect(characterOf(rifle, 'c2')).not.toHaveProperty('wields');
    const revolver = buy(rifle, 'revolver', 1, 'c2', clock);
    expect(characterOf(revolver, 'c2')).toMatchObject({ primary: 'blade', secondary: 'rifle' });
    // Ohne Primärwaffe wird die gekaufte Waffe Primärwaffe und kommt in die Hand.
    const bare = updateCharacter(rich, 'c1', { ...inputOf(characterOf(rich, 'c1')), possessions: [] });
    expect(characterOf(buy(bare, 'rifle', 1, 'c1', clock), 'c1')).toMatchObject({ primary: 'rifle', wields: 'rifle' });
  });

  it('verkauft er die Sekundärwaffe in der Hand, nimmt er die Primärwaffe; ohne Primärwaffe die Hände', () => {
    const rich = book(there, 'income', 5000, clock);
    const holding = setWields(buy(rich, 'rifle', 1, 'c2', clock), 'c2', 'rifle');
    expect(characterOf(sell(holding, 'rifle', 1, 100, 'c2', clock), 'c2')).toMatchObject({ primary: 'blade', wields: 'blade' });
    expect(characterOf(sell(holding, 'blade', 1, 20, 'c2', clock), 'c2')).toMatchObject({ secondary: 'rifle', wields: 'rifle' });
    const onlyBlade = setWields(rich, 'c2', 'blade');
    const sold = characterOf(sell(onlyBlade, 'blade', 1, 20, 'c2', clock), 'c2');
    expect(sold).not.toHaveProperty('primary');
    expect(sold).not.toHaveProperty('wields');
  });

  it('verkauft nicht mehr, als der Charakter hat, nicht für 0 Cr und nicht ohne Aufenthaltsort', () => {
    const two = buy(book(there, 'income', 100, clock), 'rifle-ammo', 2, 'c2', clock);
    expect(characterOf(sell(two, 'rifle-ammo', 1, 10, 'c2', clock), 'c2').possessions).toContainEqual({ of: 'rifle-ammo', count: 1 });
    expect(() => sell(two, 'rifle-ammo', 3, 10, 'c2', clock)).toThrow(/hat 2 × Rifle Ammo/);
    expect(() => sell(two, 'rifle-ammo', 1, 0, 'c2', clock)).toThrow(/über 0/);
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

  it('eine leere Waffe schießt nicht; Nachladen nimmt ein Magazin und füllt sie', () => {
    expect(ammoOf(characterOf(bought, 'c2'))).toEqual({ rounds: 0, capacity: 20, ammo: 'rifle-ammo', magazines: 1 });
    expect(() => spendRound(bought, 'c2')).toThrow(/leer/);
    const loaded = reload(bought, 'c2');
    expect(ammoOf(characterOf(loaded, 'c2'))).toMatchObject({ rounds: 20, magazines: 0 });
    expect(characterOf(loaded, 'c2').possessions.some((p) => p.of === 'rifle-ammo')).toBe(false);
    expect(ammoOf(characterOf(spendRound(loaded, 'c2'), 'c2'))?.rounds).toBe(19);
    expect(() => reload(loaded, 'c2')).toThrow(/kein Rifle Ammo \(20 rds\) mehr/);
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
