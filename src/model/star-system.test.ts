import { describe, expect, it } from 'vitest';
import { createCampaign, fromCampaignFile, setHexes, toCampaignFile } from '.';
import { hexFromFlat, mainWorld, type Hex, type World } from './sector';
import {
  availableOrbits,
  checkStarSystems,
  gravityOf,
  hostOf,
  isSubordinate,
  moonsOf,
  orbitMillionKm,
  rollStarSystem,
  rollSubordinates,
  starName,
  temperatureOfWorld,
  zoneOf,
  zoneOfOrbit,
  zonesOf,
} from './star-system';
import { fixedRandom, seededRandom } from './testing';

/** Eine fertig gewürfelte Welt mit Oberfläche, aber ohne Namen und Sternsystem (Schritt `system`). */
const regina: Hex = hexFromFlat({
  column: 2,
  row: 7,
  empty: false,
  navalBase: false,
  scoutBase: true,
  gasGiant: true,
  uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
  temperature: 'temperate',
  surface: { water: 80, plates: 8, majorContinents: 1, minorContinents: 4, majorIslands: 5, archipelagos: 7, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
});

describe('Zonen und Bahnen (B6 27–31)', () => {
  it('liest die Table of Zones: erste verfügbare und bewohnbare Bahn; IV bei späten und VI bei frühen Typen wie V', () => {
    expect(zonesOf({ type: 'G', decimal: 0, size: 'V' })).toMatchObject({ firstOrbit: 0, habitableOrbit: 3 });
    expect(zonesOf({ type: 'M', decimal: 5, size: 'V' }).habitableOrbit).toBeUndefined();
    expect(zonesOf({ type: 'K', decimal: 5, size: 'IV' })).toMatchObject({ firstOrbit: 0, habitableOrbit: 0 });
    expect(zonesOf({ type: 'A', decimal: 0, size: 'VI' })).toMatchObject({ firstOrbit: 0, habitableOrbit: 7 });
    expect(zonesOf({ type: 'B', size: 'D' })).toMatchObject({ habitableOrbit: 0 });
    expect(zonesOf({ type: 'G', decimal: 5, size: 'Ib' })).toMatchObject({ firstOrbit: 2, habitableOrbit: 8 });
  });

  it('gibt die Zone einer Bahn; eingefangene Welten zählen zur nächsten Bahn', () => {
    const g0 = zonesOf({ type: 'G', decimal: 0, size: 'V' });
    expect([0, 2, 3, 4, 2.6].map((o) => zoneOfOrbit(g0, o))).toEqual(['inner', 'inner', 'habitable', 'outer', 'habitable']);
    expect(zoneOfOrbit(zonesOf({ type: 'G', decimal: 0, size: 'III' }), 0)).toBeUndefined();
  });

  it('sperrt Bahnen um einen Begleiter: innen bis zur Hälfte, außen ab zwei darüber', () => {
    const stars = [
      { type: 'G' as const, decimal: 0, size: 'V' as const, close: false },
      { type: 'M' as const, decimal: 0, size: 'V' as const, close: false, orbit: 2 },
    ];
    expect(availableOrbits({ stars, maxOrbits: 6 })).toEqual([0, 1, 4, 5, 6]);
  });

  it('kennt den Abstand der Bahnen, dazwischen geometrisch', () => {
    expect(orbitMillionKm(3)).toBeCloseTo(149.6, 6);
    expect(orbitMillionKm(5.5)).toBeGreaterThan(418.9);
    expect(orbitMillionKm(5.5)).toBeLessThan(777.9);
    expect(starName({ type: 'G', decimal: 5, size: 'V' })).toBe('G5 V');
    expect(starName({ type: 'K', size: 'D' })).toBe('DK');
  });
});

describe('Sternsystem würfeln', () => {
  it('ergibt für viele Startwerte gültige Systeme nach den Regeln', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const hex = rollStarSystem(regina, seededRandom(seed));
      expect(() => checkStarSystems([hex])).not.toThrow();
      const system = hex.system!;
      const main = mainWorld(hex);
      expect(hex.worlds[0]).toBe(main);
      expect(main.name).toBeUndefined();
      // Gasriesen gibt es, weil das UWP einen hat; keiner liegt in der inneren Zone.
      const giants = hex.worlds.filter((w) => w.kind === 'giant');
      expect(giants.length).toBeGreaterThanOrEqual(1);
      for (const g of giants) expect(zoneOf(hex, g)).not.toBe('inner');
      // Jede Bahn um den Stern hat höchstens eine Welt; leere Bahnen haben keine.
      const around = hex.worlds.filter((w) => w.moonOf === undefined).map((w) => w.orbit!);
      expect(new Set(around).size).toBe(around.length);
      for (const o of system.emptyOrbits) expect(around).not.toContain(o);
      // Die Hauptwelt liegt in der bewohnbaren Bahn oder ist Mond des Gasriesen dort.
      const zones = zonesOf(system.stars[0]!);
      if (zones.habitableOrbit !== undefined && availableOrbits(system).includes(zones.habitableOrbit)) {
        const host = hostOf(hex, main);
        expect(host ? host.orbit : main.orbit).toBe(zones.habitableOrbit);
        if (host) expect(host.kind).toBe('giant');
      }
      // Monde: keine an Gürteln, kleinen Welten, Ringen oder Monden; Bevölkerung unter der der Hauptwelt.
      for (const w of hex.worlds) {
        if (w.kind !== 'world' && w.kind !== 'giant') expect(moonsOf(hex, w)).toEqual([]);
        if (w.id !== main.id) expect(w.uwp.population ?? 0).toBeLessThan(5);
      }
    }
  });

  it('macht die Hauptwelt zum Mond eines Gasriesen in der bewohnbaren Bahn', () => {
    const moons = Array.from({ length: 300 }, (_, i) => rollStarSystem(regina, seededRandom(i + 1))).filter((h) => mainWorld(h).moonOf !== undefined);
    expect(moons.length).toBeGreaterThan(0);
    const hex = moons[0]!;
    const main = mainWorld(hex);
    expect(hostOf(hex, main)?.kind).toBe('giant');
    expect(main.angle).toBeGreaterThanOrEqual(0);
    expect(moonsOf(hex, main)).toEqual([]);
    expect(zoneOf(hex, main)).toBe('habitable');
  });

  it('gibt Schwerkraft nach der Formel und eine Temperatur aus der Zone', () => {
    expect(gravityOf({ id: 'a', kind: 'world', uwp: { size: 8 } })).toBe(1);
    expect(gravityOf({ id: 'a', kind: 'small', uwp: {}, diameter: 800 })).toBeCloseTo(0.0625, 10);
    expect(gravityOf({ id: 'a', kind: 'giant', uwp: {}, large: true, radius: 70_000 })).toBeCloseTo(2.1875, 10);
    expect(gravityOf({ id: 'a', kind: 'ring', uwp: {} })).toBe(0);
    const hex = rollStarSystem(regina, seededRandom(7));
    for (const w of hex.worlds) {
      const zone = zoneOf(hex, w);
      const t = temperatureOfWorld(hex, w);
      if (w.id === hex.main) expect(t).toBe('temperate');
      else if (zone === 'inner') expect(t).toBe('hot');
      else if (zone === 'outer') expect(t).toBe('frozen');
    }
  });

  it('übersteht Export und Import; die Prüfung weist kaputte Systeme zurück', () => {
    const hex = rollStarSystem(regina, seededRandom(11));
    const named = { ...hex, worlds: hex.worlds.map((w) => (w.id === hex.main ? { ...w, name: 'Regina' } : w)) };
    const campaign = setHexes(createCampaign(), [named]);
    const read = fromCampaignFile(toCampaignFile(campaign), campaign.id);
    expect(read.hexes).toEqual([named]);
    const broken = (change: (h: Hex) => Hex) => () => checkStarSystems([change(named)]);
    expect(broken((h) => ({ ...h, system: { ...h.system!, stars: [] } }))).toThrow(/einen bis drei/);
    expect(broken((h) => ({ ...h, worlds: h.worlds.map((w) => (w.kind === 'giant' ? { ...w, radius: undefined } as never : w)) }))).toThrow(/Gasriese/);
    expect(broken((h) => ({ ...h, system: undefined }) as unknown as Hex)).toThrow(/erst mit dem Sternsystem/);
    // Nebenwelten dürfen Namen haben (2026-11-20d), aber keine leeren und keine Oberfläche ohne Größe.
    expect(broken((h) => ({ ...h, worlds: h.worlds.map((w) => (w.id !== h.main ? { ...w, name: 'X' } : w)) }))).not.toThrow();
    expect(broken((h) => ({ ...h, worlds: h.worlds.map((w) => (w.id !== h.main ? { ...w, name: ' ' } : w)) }))).toThrow(/leeren Namen/);
    expect(broken((h) => ({ ...h, worlds: h.worlds.map((w) => (w.kind === 'giant' ? { ...w, temperature: 'cold' as const } : w)) }))).toThrow(/Oberfläche und Temperatur/);
  });

  it('würfelt mit festen Würfen ein bekanntes System', () => {
    // Alle Würfel 1, DM +4 wegen Atmosphäre 8: Art 2 einzeln, Typ 2 + 4 = 6 → M, Größe 6 → V, Zehntel 1 → 0: M0 V.
    const hex = rollStarSystem(regina, fixedRandom());
    expect(starName(hex.system!.stars[0]!)).toBe('M0 V');
    expect(hex.system!.stars).toHaveLength(1);
    // Höchste Bahn 2 − 4 → 0; M0 V: bewohnbar ist Bahn 0, also die Hauptwelt dort oder als Mond des Gasriesen.
    expect(hex.system!.maxOrbits).toBe(0);
    expect(() => checkStarSystems([hex])).not.toThrow();
  });
});

describe('Nebenwelten (2026-11-20c)', () => {
  it('gibt jeder Welt außer Hauptwelt, Gasriesen und Ringen Raumhafen, Regierung, Gesetz und TL nach den Regeln', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const hex = rollStarSystem(regina, seededRandom(seed));
      expect(() => checkStarSystems([hex])).not.toThrow();
      for (const w of hex.worlds) {
        if (!isSubordinate(hex, w)) {
          expect(w.spaceport).toBeUndefined();
          continue;
        }
        const p = w.uwp.population ?? 0;
        expect(['F', 'G', 'H', 'Y']).toContain(w.spaceport);
        // Regierung der Hauptwelt 4: 1W6 ohne DM auf die Tabelle; ohne Bevölkerung 0.
        expect([0, 1, 2, 3, 6]).toContain(w.uwp.government);
        if (p === 0) expect(w.uwp.government).toBe(0);
        // Gesetz 1W6 − 3 + 5, ohne Regierung 0.
        if (w.uwp.government === 0) expect(w.uwp.law).toBe(0);
        else expect(w.uwp.law).toBeGreaterThanOrEqual(3);
        // TL 7 − 1 = 6, bei lebensfeindlicher Luft mindestens 7.
        const atmosphere = w.uwp.atmosphere ?? 0;
        const full = (w.facilities ?? []).includes('military');
        expect(w.uwp.tech).toBe(full || ![5, 6, 8].includes(atmosphere) ? 7 : 6);
        // Kein Forschungslabor bei TL 7 der Hauptwelt, kein Bergbau ohne Industrie; Kolonie nur mit Regierung 6.
        expect(w.facilities ?? []).not.toContain('research');
        expect(w.facilities ?? []).not.toContain('mining');
        if ((w.facilities ?? []).includes('colony')) expect(w.uwp.government).toBe(6);
        if ((w.bases ?? []).includes('naval')) expect(p).toBeGreaterThanOrEqual(3);
        if ((w.bases ?? []).includes('scout')) expect(p).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('folgt einer Captive Government; unbewohnte Welten haben nie einen guten Raumhafen', () => {
    const captive = { ...regina, worlds: regina.worlds.map((w) => ({ ...w, uwp: { ...w.uwp, government: 6, tech: 12 } })) };
    for (let seed = 1; seed <= 100; seed++) {
      const hex = rollStarSystem(captive, seededRandom(seed));
      for (const w of hex.worlds.filter((x) => isSubordinate(hex, x))) {
        expect(w.uwp.government).toBe((w.uwp.population ?? 0) === 0 ? 0 : 6);
        if ((w.uwp.population ?? 0) === 0) expect(['Y', 'H']).toContain(w.spaceport);
        // Mit Labor oder Militärbasis der TL der Hauptwelt, sonst eins weniger.
        const full = (w.facilities ?? []).some((f) => f === 'research' || f === 'military');
        expect(w.uwp.tech).toBe(full ? 12 : 11);
      }
    }
  });

  it('würfelt die Werte für Systeme von vor 2026-11-20c nach, sonst bleibt alles', () => {
    const hex = rollStarSystem(regina, seededRandom(5));
    const physical = ['size', 'atmosphere', 'hydrographics', 'population'];
    const strip = (h: Hex): Hex => ({
      ...h,
      worlds: h.worlds.map((w) => {
        if (!isSubordinate(h, w)) return w;
        const rest = Object.fromEntries(Object.entries(w).filter(([k]) => !['spaceport', 'facilities', 'bases'].includes(k)));
        return { ...rest, uwp: Object.fromEntries(Object.entries(w.uwp).filter(([k]) => physical.includes(k))) } as World;
      }),
    });
    const old = strip(hex);
    expect(() => checkStarSystems([old])).not.toThrow();
    const again = rollSubordinates(old, seededRandom(9));
    expect(strip(again)).toEqual(old);
    expect(again.worlds.filter((w) => isSubordinate(again, w)).every((w) => w.spaceport !== undefined)).toBe(true);
    // Halb nachgewürfelt gibt es nicht.
    const half = { ...again, worlds: again.worlds.map((w, i) => (i === again.worlds.findIndex((x) => isSubordinate(again, x)) ? old.worlds[i]! : w)) };
    if (again.worlds.filter((w) => isSubordinate(again, w)).length > 1) expect(() => checkStarSystems([half])).toThrow(/alle Nebenwelten/);
  });
});
