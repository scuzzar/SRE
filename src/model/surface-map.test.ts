import { describe, expect, it } from 'vitest';
import type { Random } from './ports';
import { adjacent, cellCount, nearestCell, surfaceGrid } from './surface-grid';
import { bookRow, cellTemperature, checkSurfaceMap, cityName, generateSurfaceMap, highportOf, isWaterLandform, landformAt, rollDigit19, withHighport, type MapWorld, type SurfaceMap } from './surface-map';

/** Ein kleiner Zufallsgenerator mit festem Startwert, damit die Tests gleich ausgehen. */
function seeded(seed: number): Random {
  let a = seed >>> 0 || 1;
  return {
    int(min, max) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return min + Math.floor(u * (max - min + 1));
    },
  };
}

const terra: MapWorld = {
  size: 8,
  atmosphere: 6,
  hydrographics: 7,
  population: 9,
  tech: 12,
  starport: 10,
  temperature: 'temperate',
  surface: { water: 70, plates: 7, majorContinents: 3, minorContinents: 3, majorIslands: 4, archipelagos: 6, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
};

describe('Raster der Oberflächenkarte', () => {
  it('hat 10 × n² + 2 Felder mit n = 4 × Größe', () => {
    for (const size of [1, 2, 5, 8, 10]) {
      const grid = surfaceGrid(size);
      expect(grid.n).toBe(4 * size);
      expect(grid.cells).toBe(10 * (4 * size) ** 2 + 2);
      expect(cellCount(size)).toBe(grid.cells);
    }
  });

  it('hat genau 12 Fünfecke, sonst Sechsecke, und Nachbarschaft in beide Richtungen', () => {
    const grid = surfaceGrid(3);
    const degrees = grid.neighbors.map((n) => n.length);
    expect(degrees.filter((d) => d === 5)).toHaveLength(12);
    expect(degrees.every((d) => d === 5 || d === 6)).toBe(true);
    grid.neighbors.forEach((list, a) => list.forEach((b) => expect(adjacent(grid, b, a)).toBe(true)));
  });

  it('hat die Pole als Felder 0 und den Südpol unten', () => {
    const grid = surfaceGrid(2);
    expect(grid.lat[0]).toBeCloseTo(90);
    expect(Math.min(...grid.lat)).toBeCloseTo(-90);
  });

  it('findet zu einer Richtung das nächste Feld', () => {
    const grid = surfaceGrid(4);
    for (const cell of [0, 17, 500, grid.cells - 1]) {
      const x = grid.xyz[cell * 3]!;
      const y = grid.xyz[cell * 3 + 1]!;
      const z = grid.xyz[cell * 3 + 2]!;
      expect(nearestCell(grid, x, y, z, 0)).toBe(cell);
    }
  });
});

describe('Temperatur je Feld (Hausregel)', () => {
  it('folgt den Breitengrad-Zuschlägen des Buchs', () => {
    expect(bookRow(0)).toBe(1);
    expect(bookRow(90)).toBe(11);
    // Größe 8: Reihe 1 +21, Reihe 11 −49.
    expect(cellTemperature(8, 'temperate', 0)).toBe(15 + 21);
    expect(cellTemperature(8, 'temperate', 90)).toBe(15 - 49);
  });
});

describe('Erzeugen der Oberflächenkarte', () => {
  it('trifft den Wasseranteil und erzeugt eine gültige Karte', () => {
    const { map, populationMultiplier } = generateSurfaceMap(terra, seeded(7));
    const grid = surfaceGrid(8);
    expect(map.landforms).toHaveLength(grid.cells);
    let water = 0;
    for (let c = 0; c < grid.cells; c++) if (isWaterLandform(landformAt(map, c))) water++;
    expect(water).toBe(Math.round(0.7 * grid.cells));
    expect(populationMultiplier).toBeGreaterThanOrEqual(1);
    expect(populationMultiplier).toBeLessThanOrEqual(9);
    expect(checkSurfaceMap(map, 8, 9)).toBeUndefined();
    expect(map.cities?.length).toBeGreaterThan(0);
    expect(map.cities?.[0]?.port).toBe('A');
  });

  it('ist mit gleichem Zufall gleich und mit anderem anders', () => {
    const a = generateSurfaceMap(terra, seeded(1)).map;
    const b = generateSurfaceMap(terra, seeded(1)).map;
    const c = generateSurfaceMap(terra, seeded(2)).map;
    expect(a).toEqual(b);
    expect(a.landforms).not.toBe(c.landforms);
  });

  it('erzeugt Karten für viele verschiedene Welten ohne Fehler', () => {
    const random = seeded(99);
    for (let k = 0; k < 40; k++) {
      const size = random.int(1, 10);
      const hydrographics = random.int(0, 10);
      const water = Math.min(100, Math.max(0, hydrographics * 10 + random.int(-5, 4)));
      const continents = water >= 50 && water <= 99;
      const oceans = water >= 1 && water <= 49;
      const world: MapWorld = {
        size,
        atmosphere: random.int(0, 15),
        hydrographics,
        population: random.int(0, 10),
        tech: random.int(0, 15),
        starport: [10, 11, 12, 13, 14, 31][random.int(0, 5)]!,
        temperature: (['frozen', 'cold', 'temperate', 'hot', 'boiling'] as const)[random.int(0, 4)]!,
        surface: {
          water,
          plates: random.int(1, size + 4),
          majorContinents: continents ? random.int(0, 6) : 0,
          minorContinents: continents ? random.int(0, 8) : 0,
          majorIslands: continents ? random.int(0, 10) : 0,
          archipelagos: continents ? random.int(0, 12) : 0,
          majorOceans: oceans ? random.int(0, 3) : 0,
          minorOceans: oceans ? random.int(0, 6) : 0,
          smallSeas: oceans ? random.int(0, 8) : 0,
          scatteredLakes: oceans ? random.int(0, 12) : 0,
          life: random.int(0, 1) === 1,
        },
      };
      const { map } = generateSurfaceMap(world, random);
      expect(checkSurfaceMap(map, size, world.population)).toBeUndefined();
      let waterCells = 0;
      for (let c = 0; c < cellCount(size); c++) if (isWaterLandform(landformAt(map, c))) waterCells++;
      // Bei 100 % Wasser gibt es höchstens ein paar zufällige Inseln.
      if (water < 100) expect(waterCells).toBe(Math.round((water / 100) * cellCount(size)));
    }
  });

  it('braucht für die größte Welt nicht zu lange', () => {
    const world: MapWorld = { ...terra, size: 10, surface: { ...terra.surface, plates: 12 } };
    const start = performance.now();
    generateSurfaceMap(world, seeded(11));
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it('würfelt den Bevölkerungsmultiplikator von 1 bis 9', () => {
    const random = seeded(3);
    const seen = new Set<number>();
    for (let k = 0; k < 400; k++) seen.add(rollDigit19(random));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('erkennt beschädigte Karten', () => {
    const { map } = generateSurfaceMap(terra, seeded(5));
    expect(checkSurfaceMap({ ...map, landforms: map.landforms.slice(1) }, 8, 9)).toMatch(/Felder/);
    expect(checkSurfaceMap({ ...map, rivers: [[0, 5000]] }, 8, 9)).toMatch(/springt/);
    expect(checkSurfaceMap({ ...map, cities: [{ name: 'X', population: 3, multiplier: 0, rank: 'primary' }] }, 8, 9)).toMatch(/ungültige/);
  });
});

describe('Städtenamen (2026-11-14k)', () => {
  it('nimmt keinen Namen doppelt und setzt zusammen, wenn die Liste ausgeht', () => {
    const random = seeded(8);
    const used = new Set<string>();
    for (let k = 0; k < 2000; k++) {
      const name = cityName(k % 2 ? 'alien' : 'earthly', random, used);
      expect(used.has(name)).toBe(false);
      used.add(name);
    }
    expect(used.size).toBe(2000);
  });
});

describe('Höchstens eine Siedlung je Feld', () => {
  it('kein Feld hat zwei Städte, keine Kleinstadt liegt auf einer Stadt, jede Kleinstadt zählt 1', () => {
    const big: MapWorld = { ...terra, population: 10, tech: 15 };
    for (const seed of [1, 2, 3]) {
      const { map } = generateSurfaceMap(big, seeded(seed));
      const cityCells = (map.cities ?? []).filter((c) => c.cell !== undefined).map((c) => c.cell!);
      expect(new Set(cityCells).size).toBe(cityCells.length);
      for (const [cell, count] of map.towns ?? []) {
        expect(count).toBe(1);
        expect(cityCells.includes(cell)).toBe(false);
      }
    }
  });
});

describe('Highport (2026-11-28b)', () => {
  const echo: MapWorld = { ...terra, size: 5, population: 1, tech: 8, starport: 11, populationMultiplier: 4, name: 'Echo' };

  it('Raumhafen A: die größte Orbitalstadt ist der Highport und trägt den Raumhafen', () => {
    const { map } = generateSurfaceMap({ ...terra, name: 'Terra' }, seeded(3));
    const hp = highportOf(map)!;
    expect(hp.cell).toBeUndefined();
    expect(hp.port).toBe('A');
    expect(hp.name).toBe('Terra Highport');
    expect(map.cities?.[0]?.port).toBe('A');
  });

  it('ohne jede Siedlung (wie Echo) wohnt die ganze Bevölkerung im Highport', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { map } = generateSurfaceMap(echo, seeded(seed));
      const hp = highportOf(map)!;
      expect(hp.port).toBe('B');
      expect(hp.cell).toBeUndefined();
      if ((map.cities?.length ?? 0) === 1 && !map.towns) expect(hp).toMatchObject({ population: 1, multiplier: 4, rank: 'primary', name: 'Echo Highport' });
      expect(checkSurfaceMap(map, 5, 1)).toBeUndefined();
    }
  });

  it('Raumhafen C und Nebenwelten haben keinen', () => {
    expect(generateSurfaceMap({ ...terra, starport: 12 }, seeded(3)).map.highport).toBeUndefined();
    expect(generateSurfaceMap({ ...terra, starport: 31, spaceport: 'F' }, seeded(3)).map.highport).toBeUndefined();
  });

  it('Bevölkerung 0: Station ohne Einwohner, die Prüfung lässt sie zu', () => {
    const { map } = generateSurfaceMap({ ...echo, population: 0 }, seeded(2));
    expect(highportOf(map)).toMatchObject({ population: 0, multiplier: 1 });
    expect(checkSurfaceMap(map, 5, 0)).toBeUndefined();
  });

  it('bestehende Karten: Orbitalstadt wird Highport, sonst eine neue am Ende; niemand zieht um', () => {
    const base: SurfaceMap = { landforms: 'o' };
    const world = { starport: 11, population: 1, populationMultiplier: 4, name: 'Echo' };
    expect(withHighport(base, world)).toMatchObject({ highport: 0, cities: [{ name: 'Echo Highport', population: 1, multiplier: 4, port: 'B' }] });
    const withCity: SurfaceMap = { landforms: 'o', cities: [{ cell: 0, name: 'Unten', population: 6, multiplier: 2, rank: 'primary', port: 'B' }] };
    const added = withHighport(withCity, { ...world, population: 6 });
    expect(added.cities).toHaveLength(2);
    expect(added.cities?.[0]).toEqual(withCity.cities![0]);
    expect(highportOf(added)).toMatchObject({ population: 0, multiplier: 1, port: 'B' });
    const orbit: SurfaceMap = { landforms: 'o', cities: [...withCity.cities!, { name: 'Oben', population: 4, multiplier: 3, rank: 'secondary' }] };
    expect(withHighport(orbit, { ...world, population: 6 })).toMatchObject({ highport: 1, cities: [{}, { name: 'Oben', port: 'B' }] });
    expect(withHighport(base, { ...world, starport: 12 })).toBe(base);
  });
});
