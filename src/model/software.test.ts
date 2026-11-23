import { describe, expect, it } from 'vitest';
import {
  onboard,
  book,
  buySoftware,
  slotCapacity,
  computerOf,
  createDemoCampaign,
  discardSoftware,
  fundsOf,
  hasTarget,
  hasThrust,
  missingPrograms,
  packageOf,
  plugIn,
  plugSoftware,
  softwareBlocker,
  standardSoftware,
  stow,
  fromCampaignFile,
  toCampaignFile,
  slotUsed,
  withSlots,
  without,
  type Campaign,
} from '.';
import { fixedClock } from './testing';

const clock = fixedClock();

/** Die Demo auf Kessra (Raumhafen A): eine Yacht mit Modell/1, Double Turret mit Beam Laser. */
function demo(): Campaign {
  return book(createDemoCampaign(clock), 'income', 20_000_000, clock);
}

const yacht = (campaign: Campaign) => campaign.ships.find((s) => s.mother === undefined)!;
const boot = (campaign: Campaign) => campaign.ships.find((s) => s.mother !== undefined)!;

describe('Programme in CPU, Speicher und Archiv (2026-11-22d)', () => {
  it('der Rechner gibt die Größe der Ablagen (SE 10)', () => {
    expect(computerOf(yacht(demo()))?.name).toBe('Modell/1');
    expect(slotCapacity(yacht(demo()), 'cpu')).toBe(2);
    expect(slotCapacity(yacht(demo()), 'storage')).toBe(4);
    expect(slotCapacity(yacht(demo()), 'archive')).toBe(Number.POSITIVE_INFINITY);
    expect(computerOf(boot(demo()))).toBeUndefined();
  });

  it('das Standardpaket füllt erst die CPU, dann den Speicher, den Rest das Archiv', () => {
    expect(standardSoftware('A').map((s) => `${s.program}:${s.slot}`)).toEqual(['maneuver:cpu', 'jump-1:storage', 'navigation:storage', 'generate:storage', 'anti-hijack:storage', 'library:archive']);
    // Ein Schiff mit Turret bekommt Target, und es teilt sich die CPU mit Maneuver.
    expect(packageOf('Y', [{ type: 'double', weapons: [] }]).map((s) => `${s.program}:${s.slot}`)).toEqual(['maneuver:cpu', 'jump-1:storage', 'navigation:storage', 'generate:storage', 'anti-hijack:storage', 'library:archive', 'target:cpu']);
    expect(standardSoftware('boat')).toEqual([]);
  });

  it('die fliegende Demo hat Maneuver und Target in der CPU', () => {
    expect(onboard(yacht(demo()), 'cpu').map((s) => s.program)).toEqual(['maneuver', 'target']);
    expect(hasThrust(yacht(demo()))).toBe(true);
    expect(hasTarget(yacht(demo()))).toBe(true);
    expect(missingPrograms(yacht(demo()))).toEqual([]);
  });

  it('ohne Maneuver in der CPU kein Schub, ohne Target kein Turretfeuer', () => {
    const ohneTarget = { ...demo(), ships: demo().ships.map((s) => ({ ...s, software: withSlots(computerOf(s), ['maneuver', 'jump-1']) })) };
    expect(hasTarget(yacht(ohneTarget))).toBe(false);
    expect(missingPrograms(yacht(ohneTarget))).toEqual(['Target']);
    const ohneBeides = { ...ohneTarget, ships: ohneTarget.ships.map((s) => ({ ...s, software: withSlots(computerOf(s), ['jump-1', 'navigation']) })) };
    expect(hasThrust(yacht(ohneBeides))).toBe(false);
    expect(missingPrograms(yacht(ohneBeides))).toEqual(['Maneuver', 'Target']);
    expect(missingPrograms(boot(ohneBeides))).toEqual([]);
  });

  it('umstecken braucht Platz in der Zielablage', () => {
    // Die volle Yacht: CPU 2/2, Speicher 4/4, dazu Predict-1 im Speicher, Anti-Hijack im Archiv.
    const c = {
      ...demo(),
      ships: demo().ships.map((s) =>
        s.mother === undefined
          ? { ...s, software: [...s.software.filter((p) => p.program !== 'anti-hijack'), { program: 'anti-hijack', slot: 'archive' as const }, { program: 'predict-1', slot: 'storage' as const }] }
          : s,
      ),
    };
    expect(slotUsed(yacht(c), 'cpu')).toBe(2);
    expect(slotUsed(yacht(c), 'storage')).toBe(4);
    expect(() => plugIn(yacht(c), 'predict-1', 'cpu')).toThrow(/zu wenig Platz/);
    const platz = plugIn(yacht(c), 'target', 'archive');
    expect(plugIn(platz, 'predict-1', 'cpu').software.find((p) => p.program === 'predict-1')?.slot).toBe('cpu');
    expect(() => plugIn(boot(c), 'maneuver', 'cpu')).toThrow(/keinen Rechner/);
  });

  it('kaufen in der Werft: bar aus der Kasse, in den Speicher oder ins Archiv', () => {
    const vor = discardSoftware(demo(), 'anti-hijack'); // einer Stelle im Speicher Platz machen
    const c = buySoftware(vor, 'select-1', clock);
    expect(yacht(c).software.find((s) => s.program === 'select-1')?.slot).toBe('storage');
    expect(fundsOf(c)).toBe(fundsOf(vor) - 500_000);
    expect(c.bookings.at(-1)).toMatchObject({ kind: 'ship', shipCost: 'software', forShip: 's1', text: 'Select-1 · Software' });
    expect(() => buySoftware(c, 'select-1', clock)).toThrow(/schon an Bord/);
    // Ist der Speicher voll, kommt das nächste Programm ins Archiv.
    const zwei = buySoftware(buySoftware(c, 'anti-missile', clock), 'auto-evade', clock);
    expect(yacht(zwei).software.find((s) => s.program === 'anti-missile')?.slot).toBe('archive');
    expect(yacht(zwei).software.find((s) => s.program === 'auto-evade')?.slot).toBe('archive');
    expect(() => buySoftware({ ...demo(), bookings: [] }, 'double-fire', clock)).toThrow(/kostet/);
  });

  it('ohne Werft keine Software, ein Small Craft hat keinen Rechner', () => {
    expect(softwareBlocker(demo())).toBeUndefined();
    // Ein eigenständiges Beiboot hat keinen Rechner.
    const ohneRechner = { ...demo(), ships: [without(boot(demo()), 'mother', 'aboard', 'inHold')] };
    expect(softwareBlocker(ohneRechner)).toMatch(/keinen Rechner/);
    expect(() => buySoftware(ohneRechner, 'target', clock)).toThrow(/keinen Rechner/);
    expect(() => stow(boot(demo()), 'target')).toThrow(/keinen Rechner/);
  });

  it('werfen geht überall und ohne Erstattung', () => {
    const c = discardSoftware(demo(), 'library');
    expect(yacht(c).software.some((s) => s.program === 'library')).toBe(false);
    expect(fundsOf(c)).toBe(fundsOf(demo()));
    expect(() => discardSoftware(c, 'library')).toThrow(/nicht an Bord/);
    expect(() => plugSoftware(c, 'library', 'cpu')).toThrow(/nicht an Bord/);
  });

  it('eine Datei von vorher bekommt Ablagen und ihr Target', () => {
    const datei = JSON.parse(toCampaignFile(demo())) as { campaign: { ships: { design: string; turrets?: unknown[]; software: { program: string; slot?: string }[] }[] } };
    for (const s of datei.campaign.ships) for (const p of s.software) delete p.slot;
    expect(fromCampaignFile(JSON.stringify(datei), 'x').ships).toEqual(demo().ships);

    // Ohne Turret bleibt es beim Standardpaket, ein Target wird nicht geschenkt.
    const roh = JSON.parse(toCampaignFile(demo())) as { format: string; version: number; campaign: { ships: unknown[] } };
    roh.campaign.ships = [{ ...roh.campaign.ships[0] as object, turrets: [], software: [{ program: 'maneuver' }, { program: 'library' }] }];
    expect(fromCampaignFile(JSON.stringify(roh), 'x').ships[0]!.software.map((s) => `${s.program}:${s.slot}`)).toEqual(['maneuver:cpu', 'library:storage']);
  });
});
