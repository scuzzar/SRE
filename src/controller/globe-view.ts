import {
  cellTemperature,
  hexAt,
  hexId,
  landformAt,
  surfaceGrid,
  type City,
  type Hex,
  type Landform,
  type SurfaceGrid,
  type SurfaceMap,
} from '../model';
import { lookOf, type WorldLook } from './world-view';

/** Die Geländearten in Worten. */
export const LANDFORM_NAMES: Readonly<Record<Landform, string>> = {
  water: 'Wasser',
  waterIce: 'Eis auf Wasser',
  landIce: 'Eis auf Land',
  tundra: 'Tundra',
  mountain: 'Gebirge',
  rugged: 'Zerklüftet',
  desert: 'Wüste',
  jungle: 'Dschungel',
  swamp: 'Sumpf',
  open: 'Offen/Wald',
  settled: 'Besiedelt',
};

/** Eine Stadt in der Liste neben dem Globus. */
export interface GlobeCity {
  /** Die Nummer der Stadt in der Liste der Karte. */
  readonly index: number;
  /** Das Feld; fehlt bei einer Orbitalstadt. */
  readonly cell: number | undefined;
  readonly rank: 'primary' | 'secondary';
  readonly label: string;
  /** z. B. „3 Mrd. Einwohner · Raumhafen A“ */
  readonly detail: string;
}

export interface GlobeVolcano {
  readonly cell: number;
  readonly label: string;
}

/** Was im angetippten Feld ist. */
export interface PickedCell {
  readonly cell: number;
  readonly landform: string;
  readonly temperature: string;
  readonly position: string;
  readonly cities: readonly string[];
  readonly towns: number;
  readonly volcano: string | undefined;
  readonly river: boolean;
  readonly road: boolean;
}

/** Der Globus einer Welt: Raster und gepackte Karte zum Zeichnen, dazu die Listen in Worten. */
export interface GlobeView {
  readonly id: string;
  readonly name: string;
  readonly look: WorldLook;
  readonly grid: SurfaceGrid;
  readonly map: SurfaceMap;
  /** Breite eines Feldes in km. */
  readonly cellKm: number;
  readonly cities: readonly GlobeCity[];
  readonly volcanoes: readonly GlobeVolcano[];
  readonly picked: PickedCell | undefined;
}

/** Einwohner in Worten: 3 × 10^9 → „3 Mrd.“ */
export function peopleText(multiplier: number, digit: number): string {
  const n = multiplier * 10 ** digit;
  const units: [number, string][] = [
    [1e12, 'Bio.'],
    [1e9, 'Mrd.'],
    [1e6, 'Mio.'],
    [1e3, 'Tsd.'],
  ];
  for (const [value, unit] of units) if (n >= value) return `${trim(n / value)} ${unit}`;
  return String(n);
}

function trim(value: number): string {
  return value >= 100 ? String(Math.round(value)) : String(Math.round(value * 10) / 10).replace('.', ',');
}

function portText(port: City['port']): string {
  if (port === undefined) return 'kein Hafen';
  return port <= 'E' ? `Raumhafen ${port}` : `Landeplatz ${port}`;
}

function cityLabel(city: City, index: number): string {
  const kind = city.cell === undefined ? 'Orbitalstadt' : city.rank === 'primary' ? (index === 0 ? 'Hauptstadt' : 'Großstadt') : 'Stadt';
  return `${kind} ${index + 1}`;
}

function position(grid: SurfaceGrid, cell: number): string {
  const lat = grid.lat[cell]!;
  const lon = grid.lon[cell]!;
  return `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(Math.round(lon))}° ${lon >= 0 ? 'O' : 'W'}`;
}

/** Der Globus der Welt in diesem Feld; `undefined`, solange sie keine Oberflächenkarte hat. */
export function globeView(hexes: readonly Hex[], column: number, row: number, picked: number | undefined): GlobeView | undefined {
  const hex = hexAt(hexes, column, row);
  if (!hex?.map || !hex.name || hex.uwp.size === undefined || hex.temperature === undefined) return undefined;
  const map = hex.map;
  const size = hex.uwp.size;
  const grid = surfaceGrid(size);
  const cities = (map.cities ?? []).map(
    (city, index): GlobeCity => ({
      index,
      cell: city.cell,
      rank: city.rank,
      label: cityLabel(city, index),
      detail: `${peopleText(city.multiplier, city.population)} Einwohner · ${portText(city.port)}`,
    }),
  );
  const volcanoes = (map.volcanoes ?? []).map(([cell, kind]): GlobeVolcano => ({ cell, label: kind === 'major' ? 'Großer Vulkan' : 'Vulkanfeld' }));
  let pickedCell: PickedCell | undefined;
  if (picked !== undefined && picked >= 0 && picked < grid.cells) {
    const volcano = volcanoes.find((v) => v.cell === picked);
    pickedCell = {
      cell: picked,
      landform: LANDFORM_NAMES[landformAt(map, picked)],
      temperature: `${Math.round(cellTemperature(size, hex.temperature, grid.lat[picked]!))} °C im Jahresmittel`,
      position: position(grid, picked),
      cities: cities.filter((c) => c.cell === picked).map((c) => `${c.label}: ${c.detail}`),
      towns: map.towns?.find(([c]) => c === picked)?.[1] ?? 0,
      volcano: volcano?.label,
      river: (map.rivers ?? []).some((r) => r.includes(picked)),
      road: (map.roads ?? []).some((r) => r.includes(picked)),
    };
  }
  return {
    id: hexId(column, row),
    name: hex.name,
    look: lookOf(hex)!,
    grid,
    map,
    cellKm: Math.round((Math.PI * 1600 * size) / (5 * grid.n)),
    cities,
    volcanoes,
    picked: pickedCell,
  };
}
