import {
  cellTemperature,
  happenedAt,
  hexAt,
  hexId,
  landformAt,
  mapLocked,
  placeCell,
  roleOf,
  surfaceGrid,
  type Campaign,
  type City,
  type Landform,
  type NpcRole,
  type SurfaceGrid,
  type SurfaceMap,
  type Trip,
  isTravelEntry,
  travelTrace,
  flies,
  vehicleOf,
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
  /** Die Städte auf dem Feld, mit Nummer (zum Umbenennen), Name und Beschreibung. */
  readonly cities: readonly { readonly index: number; readonly name: string; readonly detail: string }[];
  readonly towns: number;
  readonly volcano: string | undefined;
  readonly river: boolean;
  readonly road: boolean;
  /** Die Stadt, in die „hierher“ versetzt: die erste Stadt auf dem Feld. */
  readonly city: number | undefined;
  /** Die dauerhaften NSC, die hier leben. */
  readonly npcs: readonly GlobeNpc[];
  /** Die Stellen der Logeinträge, die hier geschahen (Was hier geschah). */
  readonly happened: readonly number[];
}

/** Ein dauerhafter NSC dieser Welt, mit seinem Feld, wenn er eins hat. */
export interface GlobeNpc {
  readonly id: string;
  readonly name: string;
  readonly role: NpcRole;
  readonly cell: number | undefined;
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
  /** Die Gruppe ist auf dieser Welt; `partyCell` ist ihr Feld, wenn sie eins hat. */
  readonly partyHere: boolean;
  readonly partyCell: number | undefined;
  /** Die dauerhaften NSC dieser Welt (lebend). */
  readonly npcs: readonly GlobeNpc[];
  /** Felder mit Logeinträgen: wie viele, ein Name für die Liste und der neueste Eintrag; das jüngste Feld zuerst. */
  readonly events: readonly { readonly cell: number; readonly count: number; readonly label: string; readonly latest: number }[];
  /** Warum die Karte nicht neu gewürfelt werden kann; sonst `undefined`. */
  readonly rerollBlocker: string | undefined;
  /** Die Route der geplanten bzw. laufenden Fahrt auf dieser Welt, je Abschnitt die Felder; ein Flug geht gerade. */
  readonly route: readonly { readonly cells: readonly number[]; readonly flight: boolean }[];
  /** Felder mit abgestellten eigenen Fahrzeugen und wie viele. */
  readonly vehicles: readonly { readonly cell: number; readonly count: number }[];
  /** Der Modus „Wo ich war“: Die Reise zählt bei den Einträgen, und ihre Strecken stehen auf dem Globus. */
  readonly trace: boolean;
  /** Im Modus „Wo ich war“: die gereisten Strecken, je von Feld zu Feld. */
  readonly traceSegments: readonly (readonly [number, number])[];
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

function cityKind(city: City, index: number): string {
  return city.cell === undefined ? 'Orbitalstadt' : city.rank === 'primary' ? (index === 0 ? 'Hauptstadt' : 'Großstadt') : 'Stadt';
}

function position(grid: SurfaceGrid, cell: number): string {
  const lat = grid.lat[cell]!;
  const lon = grid.lon[cell]!;
  return `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(Math.round(lon))}° ${lon >= 0 ? 'O' : 'W'}`;
}

/** Der Globus der Welt in diesem Feld; `undefined`, solange sie keine Oberflächenkarte hat. */
export function globeView(campaign: Campaign, column: number, row: number, picked: number | undefined, plan?: Trip, trace = false): GlobeView | undefined {
  const hexes = campaign.hexes;
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
      label: city.name,
      detail: `${cityKind(city, index)} · ${peopleText(city.multiplier, city.population)} Einwohner · ${portText(city.port)}`,
    }),
  );
  const volcanoes = (map.volcanoes ?? []).map(([cell, kind]): GlobeVolcano => ({ cell, label: kind === 'major' ? 'Großer Vulkan' : 'Vulkanfeld' }));
  const id = hexId(column, row);
  const npcs = campaign.characters.filter((c) => c.npc && !c.dead && c.place?.world === id).map((c): GlobeNpc => ({ id: c.id, name: c.name, role: roleOf(c), cell: placeCell(hexes, c.place) }));
  const counts = new Map<number, { count: number; latest: number }>();
  // Die Reise (Reisetage und ihre Tests) zählt auf dem Globus nur im Modus „Wo ich war“.
  const shown = (i: number) => trace || !isTravelEntry(campaign.log, i);
  for (const i of happenedAt(campaign, id).filter(shown)) {
    const cell = placeCell(hexes, campaign.log[i]!.place);
    if (cell !== undefined) counts.set(cell, { count: (counts.get(cell)?.count ?? 0) + 1, latest: i });
  }
  const cellName = (cell: number) => cities.find((c) => c.cell === cell)?.label ?? `${LANDFORM_NAMES[landformAt(map, cell)]} · ${position(grid, cell)}`;
  const partyHere = campaign.location?.world === id;
  let pickedCell: PickedCell | undefined;
  if (picked !== undefined && picked >= 0 && picked < grid.cells) {
    const volcano = volcanoes.find((v) => v.cell === picked);
    pickedCell = {
      cell: picked,
      landform: LANDFORM_NAMES[landformAt(map, picked)],
      temperature: `${Math.round(cellTemperature(size, hex.temperature, grid.lat[picked]!))} °C im Jahresmittel`,
      position: position(grid, picked),
      cities: cities.filter((c) => c.cell === picked).map((c) => ({ index: c.index, name: c.label, detail: c.detail })),
      towns: map.towns?.find(([c]) => c === picked)?.[1] ?? 0,
      volcano: volcano?.label,
      river: (map.rivers ?? []).some((r) => r.includes(picked)),
      road: (map.roads ?? []).some((r) => r.includes(picked)),
      city: cities.find((c) => c.cell === picked)?.index,
      npcs: npcs.filter((n) => n.cell === picked),
      happened: happenedAt(campaign, id, picked).filter(shown),
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
    partyHere,
    partyCell: partyHere ? placeCell(hexes, campaign.location) : undefined,
    npcs,
    events: [...counts.entries()].map(([cell, { count, latest }]) => ({ cell, count, latest, label: cellName(cell) })).sort((a, b) => b.latest - a.latest),
    rerollBlocker: mapLocked(campaign, column, row) ? 'Gruppe, NSC oder Logeinträge stehen auf dieser Karte; neu würfeln geht nicht mehr.' : undefined,
    route: routeOf(partyHere ? (plan ?? campaign.trip) : undefined),
    vehicles: parkedVehicles(campaign, id),
    trace,
    traceSegments: trace ? travelTrace(campaign, id) : [],
  };
}

function routeOf(trip: Trip | undefined): GlobeView['route'] {
  return (trip?.legs ?? []).map((leg) => ({ cells: leg.cells, flight: flies(vehicleOf(leg.by)) }));
}

function parkedVehicles(campaign: Campaign, world: string): GlobeView['vehicles'] {
  const counts = new Map<number, number>();
  for (const p of campaign.stash) {
    if (p.parked?.world !== world) continue;
    const cell = placeCell(campaign.hexes, p.parked);
    if (cell !== undefined) counts.set(cell, (counts.get(cell) ?? 0) + p.count);
  }
  return [...counts].map(([cell, count]) => ({ cell, count }));
}
