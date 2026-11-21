import { describe, expect, it } from 'vitest';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { createDemoCampaign, DEMO_FUNDS } from './demo';
import { fundsOf, locationOf } from './shop';
import { fixedClock } from './testing';
import { stepOf, type World } from './sector';
import { isSubordinate, withStarSystems } from './star-system';

describe('Demo-Kampagne', () => {
  it('hat Kira, Jonas und die fertige Startwelt, die Gruppe steht dort', () => {
    const demo = createDemoCampaign(fixedClock());
    expect(demo.name).toBe('Demo-Kampagne');
    expect(demo.characters.map((c) => c.name)).toEqual(['Kira Vant', 'Jonas Reyl']);
    expect(demo.hexes).toHaveLength(1);
    expect(stepOf(demo.hexes[0]!)).toBe('done');
    expect(locationOf(demo)?.name).toBe('Kessra');
  });

  it('Kessra hat ein Sternsystem, immer dasselbe, gleich mit welchem Schlüssel (2026-11-20)', () => {
    const demo = createDemoCampaign(fixedClock());
    expect(demo.hexes[0]!.system).toBeDefined();
    expect(demo.hexes[0]!.worlds.length).toBeGreaterThan(1);
    expect(createDemoCampaign(fixedClock(), 'anders').hexes).toEqual(demo.hexes);
  });

  it('fertige Welten ohne Sternsystem bekommen es nachgewürfelt, je Kampagne und Feld immer gleich', () => {
    const demo = createDemoCampaign(fixedClock());
    const without = { ...demo, hexes: demo.hexes.map((h) => ({ ...h, system: undefined, worlds: h.worlds.filter((w) => w.id === h.main).map((w) => ({ ...w, orbit: undefined, moonOf: undefined, angle: undefined })) })) } as unknown as typeof demo;
    const once = withStarSystems(without);
    expect(once.hexes[0]!.system).toBeDefined();
    expect(withStarSystems(without).hexes).toEqual(once.hexes);
    expect(withStarSystems(once)).toBe(once);
    expect(withStarSystems({ ...without, key: 'anderer' }).hexes).not.toEqual(once.hexes);
  });

  it('Systeme von vor 2026-11-20c bekommen Raumhafen und Werte ihrer Nebenwelten nachgewürfelt, immer gleich', () => {
    const demo = createDemoCampaign(fixedClock());
    const hex = demo.hexes[0]!;
    const old = { ...demo, hexes: [{ ...hex, worlds: hex.worlds.map((w) => (isSubordinate(hex, w) ? ({ ...Object.fromEntries(Object.entries(w).filter(([k]) => !['spaceport', 'facilities', 'bases'].includes(k))), uwp: Object.fromEntries(Object.entries(w.uwp).filter(([k]) => !['government', 'law', 'tech'].includes(k))) } as World) : w)) }] };
    const once = withStarSystems(old);
    const subs = once.hexes[0]!.worlds.filter((w) => isSubordinate(once.hexes[0]!, w));
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((w) => w.spaceport !== undefined && w.uwp.tech !== undefined)).toBe(true);
    expect(withStarSystems(old).hexes).toEqual(once.hexes);
    expect(once.hexes[0]!.system).toEqual(hex.system);
  });

  it('hat ein Startkapital in der Gruppenkasse, als Einnahme im Kassenbuch', () => {
    const demo = createDemoCampaign(fixedClock());
    expect(fundsOf(demo)).toBe(DEMO_FUNDS);
    expect(demo.bookings).toMatchObject([{ kind: 'income', amount: DEMO_FUNDS, text: 'Startkapital' }]);
  });

  it('übersteht Export und Import, also auch die Prüfung der Kampagnendatei', () => {
    const demo = createDemoCampaign(fixedClock());
    const back = fromCampaignFile(toCampaignFile(demo), 'k9');
    expect(back.hexes).toEqual(demo.hexes);
    expect(back.location).toEqual({ world: '0405' });
    expect(back.bookings).toEqual(demo.bookings);
  });
});
