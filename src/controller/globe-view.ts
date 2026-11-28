import {
  cellTemperature,
  happenedAt,
  missionCells,
  missionsAt,
  openMissions,
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
  hexById,
  hexIdOfWorld,
  worldById,
  worldOf,
  gridSize,
  diameterKm,
  shipOf,
} from '../model';
import { systemLook, type WorldLook } from './world-view';

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
  /** Der Highport der Welt (2026-11-28b). */
  readonly highport: boolean;
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
  /** Das Feld; fehlt bei einer angetippten Orbitalstadt (Highport, 2026-11-28b). */
  readonly cell: number | undefined;
  /** Eine Orbitalstadt statt eines Felds. */
  readonly orbit: boolean;
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
  /** Die offenen Missionen mit einem Ort hier (Missionen hier, 2026-11-18), mit den Etiketten ihrer Orte hier. */
  readonly missions: readonly { readonly id: string; readonly title: string; readonly labels: readonly string[] }[];
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
  /** Die Orbitalstadt, in der die Gruppe steht (etwa am Highport, 2026-11-28b); fehlt sonst. */
  readonly partyOrbit: number | undefined;
  /** Die Orbitalstadt, an der das Schiff der Gruppe angedockt ist; fehlt sonst. */
  readonly shipOrbit: number | undefined;
  /**
   * Der Highport auf dem Globus (2026-11-28b): seine Stadt und das Feld am Äquator, über dem er
   * geostationär steht – auf der Länge des Downports, ohne Stadt am Boden auf einer festen Länge aus
   * dem Schlüssel der Welt. Fehlt ohne Highport.
   */
  readonly highport: { readonly city: number; readonly cell: number } | undefined;
  /** Das Feld, auf dem das Schiff der Gruppe auf dieser Welt steht (2026-11-21); fehlt sonst. */
  readonly shipCell: number | undefined;
  /** Der Name des Schiffs der Gruppe, für die Liste der Orte. */
  readonly shipName: string | undefined;
  /** Der Landeplatz wird gerade gewählt: ein Feld antippen und „Hier landen“. */
  readonly landing: boolean;
  /** Zählt die Landungen; ein neuer Wert heißt: Die Gruppe ist gerade auf `partyCell` gelandet (Landeanimation). */
  readonly touchdown: number;
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
  /** Felder, auf denen eine offene Mission einen Ort hat (Fahnen, 2026-11-18). */
  readonly missionCells: readonly number[];
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

function cityKind(city: City, index: number, highport = false): string {
  return city.cell === undefined ? (highport ? 'Highport' : 'Orbitalstadt') : city.rank === 'primary' ? (index === 0 ? 'Hauptstadt' : 'Großstadt') : 'Stadt';
}

/** Das Feld am Äquator unter dem Highport (siehe `GlobeView.highport`). */
function highportMark(map: SurfaceMap, grid: SurfaceGrid, worldId: string): GlobeView['highport'] {
  if (map.highport === undefined) return undefined;
  const down = map.cities?.find((c) => c.cell !== undefined);
  let lon: number;
  if (down) lon = grid.lon[down.cell!]!;
  else {
    let hash = 0;
    for (const ch of worldId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    lon = (hash % 360) - 180;
  }
  let best = 0;
  let score = Infinity;
  for (let c = 0; c < grid.cells; c++) {
    const d = Math.abs(((grid.lon[c]! - lon + 540) % 360) - 180);
    const s = Math.abs(grid.lat[c]!) * 4 + d;
    if (s < score) {
      score = s;
      best = c;
    }
  }
  return { city: map.highport, cell: best };
}

/** Die Lage eines Felds in Worten, z. B. „12° N, 40° O“. */
export function position(grid: SurfaceGrid, cell: number): string {
  const lat = grid.lat[cell]!;
  const lon = grid.lon[cell]!;
  return `${Math.abs(Math.round(lat))}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(Math.round(lon))}° ${lon >= 0 ? 'O' : 'W'}`;
}

/** Der Globus der Welt `worldId` (Hauptwelt oder Nebenwelt, 2026-11-20d); `undefined`, solange sie keine Oberflächenkarte hat. */
export function globeView(campaign: Campaign, worldId: string, picked: number | undefined, plan?: Trip, trace = false, landing = false, touchdown = 0, orbit?: number): GlobeView | undefined {
  const hexes = campaign.hexes;
  const hex = hexById(hexes, hexIdOfWorld(worldId));
  const found = worldById(hexes, worldId);
  if (!hex || !found?.map || gridSize(found) === undefined || found.temperature === undefined) return undefined;
  const world = worldOf(hexes, worldId);
  const map = found.map;
  const size = gridSize(found)!;
  const grid = surfaceGrid(size);
  const cities = (map.cities ?? []).map(
    (city, index): GlobeCity => ({
      index,
      cell: city.cell,
      rank: city.rank,
      highport: index === map.highport,
      label: city.name,
      detail: `${cityKind(city, index, index === map.highport)} · ${city.population === 0 ? 'nur Personal' : `${peopleText(city.multiplier, city.population)} Einwohner`} · ${portText(city.port)}`,
    }),
  );
  const volcanoes = (map.volcanoes ?? []).map(([cell, kind]): GlobeVolcano => ({ cell, label: kind === 'major' ? 'Großer Vulkan' : 'Vulkanfeld' }));
  const id = worldId;
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
      orbit: false,
      landform: LANDFORM_NAMES[landformAt(map, picked)],
      temperature: `${Math.round(cellTemperature(size, found.temperature, grid.lat[picked]!))} °C im Jahresmittel`,
      position: position(grid, picked),
      cities: cities.filter((c) => c.cell === picked).map((c) => ({ index: c.index, name: c.label, detail: c.detail })),
      towns: map.towns?.find(([c]) => c === picked)?.[1] ?? 0,
      volcano: volcano?.label,
      river: (map.rivers ?? []).some((r) => r.includes(picked)),
      road: (map.roads ?? []).some((r) => r.includes(picked)),
      city: cities.find((c) => c.cell === picked)?.index,
      npcs: npcs.filter((n) => n.cell === picked),
      happened: happenedAt(campaign, id, picked).filter(shown),
      missions: missionsAt(campaign, id, picked).map(({ mission, places }) => ({ id: mission.id, title: mission.title, labels: places.flatMap((p) => (p.label === undefined ? [] : [p.label])) })),
    };
  }
  const station = orbit === undefined ? undefined : map.cities?.[orbit];
  if (station !== undefined && station.cell === undefined) {
    const own = cities[orbit!]!;
    const atCity = (p: { readonly world: string; readonly city?: number } | undefined) => p?.world === id && p.city === orbit;
    pickedCell = {
      cell: undefined,
      orbit: true,
      landform: orbit === map.highport ? 'Highport' : 'Orbitalstadt',
      temperature: '',
      position: 'im Orbit',
      cities: [{ index: own.index, name: own.label, detail: own.detail }],
      towns: 0,
      volcano: undefined,
      river: false,
      road: false,
      city: orbit,
      npcs: campaign.characters.filter((c) => c.npc && !c.dead && atCity(c.place)).map((c) => npcs.find((n) => n.id === c.id)!),
      happened: campaign.log.flatMap((e, i) => (atCity(e.place) && shown(i) ? [i] : [])),
      missions: openMissions(campaign).flatMap((m) => {
        const places = m.places.filter((p) => atCity(p.place));
        return places.length ? [{ id: m.id, title: m.title, labels: places.flatMap((p) => (p.label === undefined ? [] : [p.label])) }] : [];
      }),
    };
  }
  return {
    id: worldId,
    name: world.name,
    look: systemLook(hex, found)!,
    grid,
    map,
    cellKm: Math.round((Math.PI * diameterKm(found)) / (5 * grid.n)),
    cities,
    volcanoes,
    picked: pickedCell,
    partyHere,
    partyCell: partyHere ? placeCell(hexes, campaign.location) : undefined,
    highport: highportMark(map, grid, worldId),
    partyOrbit: partyHere && campaign.location?.city !== undefined && map.cities?.[campaign.location.city]?.cell === undefined ? campaign.location.city : undefined,
    shipOrbit: (() => {
      const ship = shipOf(campaign);
      const place = ship?.place ?? (ship ? campaign.location : undefined);
      return place?.world === worldId && place.city !== undefined && map.cities?.[place.city]?.cell === undefined ? place.city : undefined;
    })(),
    shipCell: (() => {
      // Ein Schiff ohne eigenen Ort steht dort, wo die Gruppe ist (2026-11-21, *Schiffe ohne Ort*).
      const ship = shipOf(campaign);
      const place = ship?.place ?? (ship ? campaign.location : undefined);
      return place?.world === worldId ? placeCell(hexes, place) : undefined;
    })(),
    shipName: shipOf(campaign)?.name,
    landing,
    touchdown,
    npcs,
    events: [...counts.entries()].map(([cell, { count, latest }]) => ({ cell, count, latest, label: cellName(cell) })).sort((a, b) => b.latest - a.latest),
    rerollBlocker: mapLocked(campaign, worldId) ? 'Gruppe, NSC, Logeinträge oder Missionen stehen auf dieser Karte; neu würfeln geht nicht mehr.' : undefined,
    route: routeOf(partyHere ? (plan ?? campaign.trip) : undefined),
    vehicles: parkedVehicles(campaign, id),
    missionCells: missionCells(campaign, id),
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
