import { DomainError } from './errors';
import type { Random } from './ports';
import { ref } from './reference';
import { checkSurfaceMap } from './surface-map';
import { baseKinds, cityNamesTaken, enterSurface, facilities, hexById, hexId, hexIdOfWorld, isWorld, mainOf, mainWorld, mapPossible, nextWorldAction, putHex, rollSurface, withSurfaceMapOf, worldById, spaceports, tradeCodesOf, validateSurface, withWorld, type BaseKind, type Facility, type Hex, type Spaceport, type Star, type StarSystem, type TemperatureId, type World } from './sector';

// Das Sternsystem nach Book 6 *Scouts* (Domänenmodell 2026-11-18d, 2026-11-20, 2026-11-20b): Sterne,
// Bahnen und Zonen um den Hauptstern, Gasriesen, Planetoidengürtel, leere und eingefangene Bahnen,
// die Hauptwelt, die weiteren Welten und ihre Monde. Die Regeln stehen in docs/regeln-sternsystem.md.

/** Wie warm es auf einer Bahn ist: innen, bewohnbar oder außen. */
export type Zone = 'inner' | 'habitable' | 'outer';

/** Die Zonen eines Sterns: erste verfügbare Bahn und (wenn es sie gibt) die bewohnbare. */
export interface Zones {
  readonly firstOrbit: number;
  readonly habitableOrbit?: number | undefined;
}

const tables = () => ref.stars;
const d6 = (random: Random) => random.int(1, 6);
const d2 = (random: Random) => d6(random) + d6(random);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Ein Element der Liste, jedes gleich wahrscheinlich (B6: bei mehr als sechs in Gruppen würfeln). */
const pick = <T>(random: Random, list: readonly T[]): T => list[random.int(0, list.length - 1)]!;

/** Größe IV gibt es nicht für K5 bis M9, Größe VI nicht für B0 bis F4: dann Größe V (B6 26). */
function fixedSize(type: Star['type'], decimal: number | undefined, size: Star['size']): Star['size'] {
  const late = type === 'M' || (type === 'K' && (decimal ?? 0) >= 5);
  const early = type === 'O' || type === 'B' || type === 'A' || (type === 'F' && (decimal ?? 0) < 5);
  if (size === 'IV' && late) return 'V';
  if (size === 'VI' && early) return 'V';
  return size;
}

/** Ein Stern aus Typ und Größe; das Zehntel 0 oder 5 (1W6: bis 3 → 0), weiße Zwerge ohne. */
function rollStar(random: Random, type: Star['type'], size: Star['size']): Pick<Star, 'type' | 'decimal' | 'size'> {
  if (size === 'D') return { type, size };
  const decimal = d6(random) <= 3 ? 0 : 5;
  return { type, decimal, size: fixedSize(type, decimal, size) };
}

/** Die Zonen eines Sterns aus der Table of Zones; Ia und Ib wie II, O wie B. */
export function zonesOf(star: Pick<Star, 'type' | 'decimal' | 'size'>): Zones {
  const type = star.type === 'O' ? 'B' : star.type;
  const all = tables().zones;
  if (star.size === 'D') return all.find((z) => z.size === 'D' && z.type === type)!;
  const size = star.size === 'Ia' || star.size === 'Ib' ? 'II' : star.size;
  const decimal = (star.decimal ?? 0) >= 5 ? 5 : 0;
  const find = (s: Star['size']) => all.find((z) => z.size === s && z.type === type && z.decimal === decimal);
  return find(size) ?? find('V')!;
}

/** Die Zone einer Bahn um den Stern; eingefangene Welten zählen zur nächsten Bahn. Vor der ersten verfügbaren Bahn keine. */
export function zoneOfOrbit(zones: Zones, orbit: number): Zone | undefined {
  const o = Math.round(orbit);
  if (o < zones.firstOrbit) return undefined;
  if (zones.habitableOrbit === undefined || o > zones.habitableOrbit) return 'outer';
  return o === zones.habitableOrbit ? 'habitable' : 'inner';
}

/** Ob ein Begleiter in einer Bahn die Bahn `orbit` sperrt (B6 27): innen höchstens die Hälfte, außen ab zwei darüber. */
function blockedBy(star: Star, orbit: number): boolean {
  if (star.orbit === undefined) return false;
  return orbit === star.orbit || (orbit > Math.floor(star.orbit / 2) && orbit < star.orbit + 2);
}

/** Die verfügbaren Bahnen um den Hauptstern: ab der ersten verfügbaren bis zur höchsten, ohne die von Begleitern gesperrten. */
export function availableOrbits(system: Pick<StarSystem, 'stars' | 'maxOrbits'>): readonly number[] {
  const zones = zonesOf(system.stars[0]!);
  const orbits: number[] = [];
  for (let o = zones.firstOrbit; o <= system.maxOrbits; o++) if (!system.stars.slice(1).some((s) => blockedBy(s, o))) orbits.push(o);
  return orbits;
}

/** Der Abstand einer Bahn vom Stern in Millionen km (B6 28); Zwischenbahnen dazwischen geometrisch. */
export function orbitMillionKm(orbit: number): number {
  const rows = tables().orbits;
  const at = (o: number) => rows[o]?.millionKm ?? rows.at(-1)!.millionKm * 2 ** (o - rows.length + 1);
  const low = Math.floor(orbit);
  const share = orbit - low;
  return share === 0 ? at(low) : at(low) * (at(low + 1) / at(low)) ** share;
}

/** Würfelt die Sterne (B6 26–28): Art des Systems, Hauptstern, Begleiter mit Bahn. */
function rollStars(random: Random, dm: number): { stars: Star[]; typeRoll: number; sizeRoll: number } {
  const features = tables().features;
  const row = (total: number) => features[clamp(total, 0, 12)]!;
  const nature = row(d2(random)).nature;
  const typeRoll = clamp(d2(random) + dm, 0, 12);
  const sizeRoll = clamp(d2(random) + dm, 0, 12);
  const primary: Star = { ...rollStar(random, row(typeRoll).primaryType, row(sizeRoll).primarySize), close: false };
  const zones = zonesOf(primary);
  const stars: Star[] = [primary];
  const companions = nature === 'single' ? 0 : nature === 'double' ? 1 : 2;
  for (let i = 0; i < companions; i++) {
    const type = row(d2(random) + typeRoll).companionType ?? 'M';
    const size = row(d2(random) + sizeRoll).companionSize;
    const orbitRow = row(d2(random) + (i === 1 ? 4 : 0)).companionOrbit;
    const star = rollStar(random, type, size);
    if (orbitRow.kind === 'close') stars.push({ ...star, close: true });
    else if (orbitRow.kind === 'far') stars.push({ ...star, close: false, farAu: d6(random) * 1000 });
    else {
      const orbit = orbitRow.orbit + (orbitRow.plusDie ? d6(random) : 0);
      // Eine Bahn im Hauptstern macht den Begleiter nah.
      stars.push(orbit < zones.firstOrbit ? { ...star, close: true } : { ...star, close: false, orbit });
    }
  }
  return { stars, typeRoll, sizeRoll };
}

/** Die höchste Bahn (B6 27): 2W6 mit DM nach Größe und Typ des Hauptsterns, nach oben offen. */
function rollMaxOrbits(random: Random, primary: Star): number {
  const sizeDm = primary.size === 'III' ? 4 : primary.size === 'Ia' || primary.size === 'Ib' || primary.size === 'II' ? 8 : 0;
  const typeDm = primary.type === 'M' ? -4 : primary.type === 'K' ? -2 : 0;
  return Math.max(0, d2(random) + sizeDm + typeDm);
}

/** Die Bahn eines Mondes in Radien (B6 28, 36–37): nah, fern, beim Gasriesen extrem fern; Ringe 1W6. */
function rollMoonOrbit(random: Random, ring: boolean, giant: boolean, index: number): number {
  const rows = tables().moonOrbits;
  if (ring) return rows[d6(random) - 1]!.ring!;
  const kind = d2(random) - index;
  const distance = rows[d2(random) - 1]!;
  if (giant && kind >= 12) return distance.extreme!;
  return kind <= 7 ? distance.close! : distance.far!;
}

/** Die Population einer Nebenwelt oder eines Mondes: höchstens die der Hauptwelt − 1. */
function capPopulation(value: number, main: number): number {
  const p = Math.max(0, value);
  return p >= main ? Math.max(0, main - 1) : p;
}

/** Größe, Atmosphäre, Hydrographie, Bevölkerung einer weiteren Welt (B6 35–36). */
function rollPlanet(random: Random, orbit: number, zone: Zone, primary: Star, habitable: number | undefined, mainPopulation: number): Pick<World, 'kind' | 'uwp' | 'diameter'> {
  const n = Math.round(orbit);
  const orbitDm = n === 0 ? -5 : n === 1 ? -4 : n === 2 ? -3 : 0;
  const size = d2(random) - 2 + orbitDm + (primary.type === 'M' ? -2 : 0);
  const small = size <= 0;
  const atmosphereRoll = d2(random);
  let atmosphere = small ? 0 : Math.max(0, atmosphereRoll - 7 + size + (zone === 'inner' ? -2 : zone === 'outer' ? -4 : 0));
  if (!small && atmosphereRoll === 12 && (habitable === undefined || n >= habitable + 2)) atmosphere = 10;
  const hydroRoll = d2(random);
  const hydrographics = small || size <= 1 || zone === 'inner' ? 0 : clamp(hydroRoll - 7 + size + (zone === 'outer' ? -2 : 0) + (atmosphere <= 1 || atmosphere >= 10 ? -4 : 0), 0, 10);
  const popRoll = d2(random);
  const population = capPopulation(popRoll - 2 + (zone === 'inner' ? -5 : zone === 'outer' ? -3 : 0) + ([0, 5, 6, 8].includes(atmosphere) ? 0 : -2), mainPopulation);
  if (small) return { kind: 'small', uwp: { atmosphere: 0, hydrographics: 0, population }, diameter: (d2(random) + 3) * 100 };
  return { kind: 'world', uwp: { size, atmosphere, hydrographics, population } };
}

/** Ein Mond: Größe nach dem Körper, 0 ergibt einen Ring, weniger eine kleine Welt; dazu das UWP nach B6 37. */
function rollMoonValues(random: Random, host: World, zone: Zone, mainPopulation: number): Pick<World, 'kind' | 'uwp' | 'diameter'> {
  const size = host.kind === 'giant' ? d2(random) - (host.large ? 4 : 6) : (host.uwp.size ?? 0) - d6(random);
  if (size === 0) return { kind: 'ring', uwp: { population: 0 } };
  const small = size < 0;
  const zoneDm = zone === 'inner' || zone === 'outer' ? -4 : 0;
  const atmosphere = small || size <= 1 ? 0 : Math.max(0, d2(random) - 7 + size + zoneDm);
  const hydrographics = small || size <= 1 ? 0 : clamp(d2(random) - 7 + size + (zone === 'inner' ? -4 : zone === 'outer' ? -2 : 0) + (atmosphere <= 1 || atmosphere >= 10 ? -4 : 0), 0, 10);
  const popDm = (zone === 'inner' ? -6 : zone === 'outer' ? -5 : 0) + (small || size <= 4 ? -2 : 0) + ([5, 6, 8].includes(atmosphere) ? 0 : -2);
  const population = capPopulation(d2(random) - 2 + popDm, mainPopulation);
  if (small) return { kind: 'small', uwp: { atmosphere: 0, hydrographics: 0, population }, diameter: (d2(random) + 3) * 100 };
  return { kind: 'world', uwp: { size, atmosphere, hydrographics, population } };
}

/** Wie viele Monde ein Körper hat (B6 36): Planet 1W6 − 3, kleiner Gasriese 2W6 − 4, großer 2W6; sonst keine. */
function rollMoonCount(random: Random, world: World): number {
  if (world.kind === 'giant') return Math.max(0, world.large ? d2(random) : d2(random) - 4);
  if (world.kind === 'world' && (world.uwp.size ?? 0) >= 1 && world.moonOf === undefined) return Math.max(0, d6(random) - 3);
  return 0;
}

/**
 * Würfelt das ganze Sternsystem einer Welt auf einmal (Weltenerschaffung, Schritt `system`, und
 * fertige Welten ohne System beim Öffnen der Kampagne). Nur um den Hauptstern; die Hauptwelt
 * bekommt ihre Bahn (oder wird Mond eines Gasriesen), alle übrigen Welten kommen dazu.
 */
export function rollStarSystem(hex: Hex, random: Random): Hex {
  if (hex.system) throw new DomainError('Dieses Feld hat sein Sternsystem schon.');
  const main = mainWorld(hex);
  const id = hexId(hex.column, hex.row);
  const atmosphere = main.uwp.atmosphere ?? 0;
  const mainPopulation = main.uwp.population ?? 0;
  const dm = (atmosphere >= 4 && atmosphere <= 9) || mainPopulation >= 8 ? 4 : 0;
  const { stars } = rollStars(random, dm);
  const primary = stars[0]!;
  const zones = zonesOf(primary);
  let maxOrbits = rollMaxOrbits(random, primary);
  const available = () => availableOrbits({ stars, maxOrbits });
  const zoneOf = (orbit: number) => zoneOfOrbit(zones, orbit) ?? 'inner';
  /** Was auf einer Bahn liegt: ein Gasriese, ein Gürtel, die Hauptwelt oder nichts (leer). */
  const taken = new Map<number, string>();
  const isMainBelt = main.uwp.size === 0;
  const free = () => available().filter((o) => !taken.has(o));
  /** Eine neue Bahn außerhalb der höchsten, nicht innen und von keinem Begleiter gesperrt. */
  const extend = () => {
    let o = Math.max(maxOrbits + 1, zones.habitableOrbit ?? zones.firstOrbit);
    while (stars.slice(1).some((s) => blockedBy(s, o))) o++;
    maxOrbits = o;
    return o;
  };
  const worlds: World[] = [];
  let next = 1;
  const newId = () => `${id}-${next++}`;

  // Gasriesen (B6 28, 34–35): in die bewohnbare oder äußere Zone, sonst eine neue Bahn außen.
  if (hex.gasGiant) {
    const wanted = tables().features[d2(random)]!.gasGiants ?? 1;
    const outer = free().filter((o) => zoneOf(o) !== 'inner');
    const count = outer.length === 0 ? 1 : Math.min(wanted, outer.length);
    for (let i = 0; i < count; i++) {
      const candidates = free().filter((o) => zoneOf(o) !== 'inner');
      const orbit = candidates.length > 0 ? pick(random, candidates) : extend();
      taken.set(orbit, 'giant');
      const large = d6(random) <= 3;
      worlds.push({ id: newId(), kind: 'giant', uwp: {}, orbit, large, radius: large ? 50_000 + d6(random) * 10_000 : 13_000 + d6(random) * 7_000 });
    }
  }
  const giants = worlds.length;
  // Erst nach den Gasriesen steht fest, wie weit die Bahnen reichen (ein Gasriese kann eine neue brauchen).
  const habitable = zones.habitableOrbit !== undefined && available().includes(zones.habitableOrbit) ? zones.habitableOrbit : undefined;
  /** Die bewohnbare Bahn bleibt der Hauptwelt (und darf einen Gasriesen haben), außer sie ist ein Gürtel. */
  const reserved = (o: number) => !isMainBelt && o === habitable;

  // Planetoidengürtel (B6 28, 34): DM − Zahl der Gasriesen, bevorzugt direkt innerhalb eines Gasriesen.
  const beltRows = tables().belts;
  if (beltRows[clamp(d2(random) - giants, 0, 12)]!.present) {
    const count = Math.min(beltRows[clamp(d2(random) - giants, 0, 12)]!.count, free().filter((o) => !reserved(o)).length);
    for (let i = 0; i < count; i++) {
      const open = free().filter((o) => !reserved(o));
      const inside = open.filter((o) => taken.get(o + 1) === 'giant');
      const orbit = pick(random, inside.length > 0 ? inside : open);
      taken.set(orbit, 'belt');
      worlds.push({ id: newId(), kind: 'belt', uwp: { size: 0, atmosphere: 0, hydrographics: 0, population: capPopulation(d2(random) - 2 + (zoneOf(orbit) === 'inner' ? -5 : zoneOf(orbit) === 'outer' ? -3 : 0), mainPopulation) }, orbit });
    }
  }

  // Leere Bahnen und eingefangene Welten (B6 29): DM +1 bei Typ B oder A.
  const ecDm = primary.type === 'B' || primary.type === 'A' ? 1 : 0;
  const ecRow = () => tables().emptyCaptured[clamp(d6(random) + ecDm, 1, 6) - 1]!;
  const captured: number[] = [];
  if (ecRow().captured) {
    const count = ecRow().capturedCount;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const near = d2(random);
        const deviation = d2(random) - 7;
        const orbit = Math.round((near + deviation / 10) * 10) / 10;
        if (deviation === 0 || near < zones.firstOrbit || captured.includes(orbit)) continue;
        captured.push(orbit);
        break;
      }
    }
  }
  const emptyOrbits: number[] = [];
  if (ecRow().empty) {
    const count = ecRow().emptyCount;
    for (let i = 0; i < count; i++) {
      const open = free().filter((o) => !reserved(o) && o >= 2 && o <= 12);
      if (open.length === 0) break;
      for (let attempt = 0; attempt < 30; attempt++) {
        const orbit = d2(random);
        if (!open.includes(orbit)) continue;
        taken.set(orbit, 'empty');
        emptyOrbits.push(orbit);
        break;
      }
    }
  }

  // Die Hauptwelt (B6 35): in die bewohnbare Bahn; liegt dort ein Gasriese, wird sie sein Mond.
  let mainPlace: Pick<World, 'orbit' | 'moonOf' | 'angle'>;
  const host = habitable === undefined ? undefined : worlds.find((w) => w.kind === 'giant' && w.orbit === habitable);
  if (host) {
    mainPlace = { moonOf: host.id, orbit: rollMoonOrbit(random, false, true, 0), angle: random.int(0, 359) };
  } else {
    const open = free();
    const orbit = isMainBelt ? (open.length > 0 ? pick(random, open) : extend()) : habitable !== undefined && !taken.has(habitable) ? habitable : (open[0] ?? extend());
    taken.set(orbit, 'main');
    mainPlace = { orbit };
  }
  const placedMain: World = { ...without(main), ...mainPlace };

  // Weitere Welten (B6 35–36): jede übrige verfügbare Bahn und jede eingefangene Welt, von innen nach außen.
  const planetOrbits = [...free().map((o) => ({ orbit: o, captured: false })), ...captured.map((o) => ({ orbit: o, captured: true }))].sort((a, b) => a.orbit - b.orbit);
  for (const { orbit, captured: isCaptured } of planetOrbits) {
    worlds.push({ id: newId(), ...rollPlanet(random, orbit, zoneOf(orbit), primary, zones.habitableOrbit, mainPopulation), orbit, ...(isCaptured ? { captured: true } : {}) });
  }

  // Monde (B6 36–37) für die Hauptwelt, jede weitere Welt und jeden Gasriesen.
  const moons: World[] = [];
  for (const body of [placedMain, ...worlds]) {
    const count = rollMoonCount(random, body);
    const used = host && body.id === host.id ? [placedMain.orbit!] : [];
    const offset = used.length;
    const bodyZone = zoneOf(body.orbit!);
    for (let i = 0; i < count; i++) {
      const values = rollMoonValues(random, body, bodyZone, mainPopulation);
      let orbit: number | undefined;
      for (let attempt = 0; attempt < 30 && orbit === undefined; attempt++) {
        const o = rollMoonOrbit(random, values.kind === 'ring', body.kind === 'giant', i + offset);
        if (!used.includes(o)) orbit = o;
      }
      if (orbit === undefined) continue;
      used.push(orbit);
      moons.push({ id: newId(), ...values, moonOf: body.id, orbit, ...(values.kind === 'ring' ? {} : { angle: random.int(0, 359) }) });
    }
  }

  const system: StarSystem = { stars, maxOrbits, emptyOrbits: emptyOrbits.sort((a, b) => a - b) };
  return withSurfaces(rollSubordinates({ ...hex, system, worlds: [placedMain, ...worlds, ...moons, ...hex.worlds.filter((w) => w.id !== main.id)] }, random), random);
}

/** Braucht diese Nebenwelt noch ihre Oberfläche? Eine Welt ab Größe 1 ohne Oberfläche. */
function lacksSurface(hex: Hex, world: World): boolean {
  return isSubordinate(hex, world) && world.kind === 'world' && (world.uwp.size ?? 0) >= 1 && world.surface === undefined;
}

/**
 * Die Oberfläche jeder Nebenwelt ab Größe 1 entsteht gleich mit der Welt (Owner, 21. November 2026),
 * nach dem World Builder's Handbook; die Temperatur aus ihrer Zone wird dabei gespeichert.
 */
export function withSurfaces(hex: Hex, random: Random): Hex {
  if (!hex.worlds.some((w) => lacksSurface(hex, w))) return hex;
  return {
    ...hex,
    worlds: hex.worlds.map((w) => {
      if (!lacksSurface(hex, w)) return w;
      const temperature = temperatureOfWorld(hex, w);
      return { ...w, temperature, surface: rollSurface({ uwp: w.uwp, temperature }, random) };
    }),
  };
}

/** Bekommt diese Welt Raumhafen, Regierung, Gesetz, TL und Einrichtungen (B6 38)? Jede außer Hauptwelt, Gasriesen und Ringen. */
export function isSubordinate(hex: Hex, world: World): boolean {
  return world.id !== hex.main && world.kind !== 'giant' && world.kind !== 'ring';
}

/** Die Regierung nach der Tabelle Subordinate Government (B6 29): 1 → 0, 2 → 1, 3 → 2, 4 → 3, 5+ → 6. */
const SUBORDINATE_GOVERNMENT = [0, 1, 2, 3, 6] as const;
/** Der Raumhafen nach der Spaceport Table (B6 29), 1 bis 6. */
const SPACEPORT_TABLE: readonly Spaceport[] = ['Y', 'Y', 'H', 'G', 'G', 'F'];

/**
 * Die Nebenwelten (2026-11-20c, B6 37–39 mit den Tabellen S. 29): erst die Basen im ganzen System,
 * dann je Welt außer Hauptwelt, Gasriesen und Ringen Regierung, Gesetz, Einrichtungen, Tech-Level und
 * Raumhafen. Bei Widersprüchen gilt das Kapitel, die Zusätze der Tabelle gelten mit (Owner).
 */
export function rollSubordinates(hex: Hex, random: Random): Hex {
  const main = mainWorld(hex);
  const subs = hex.worlds.filter((w) => isSubordinate(hex, w));
  const pop = (w: World) => w.uwp.population ?? 0;
  // Basen im System (B6 37): Marine 1W6 − 3 auf Welten mit Bevölkerung 3+, Scouts 1W6 − 4 mit 2+; je Welt und Art höchstens eine.
  const bases = new Map<string, BaseKind[]>();
  const place = (kind: BaseKind, count: number, minPopulation: number) => {
    const open = subs.filter((w) => pop(w) >= minPopulation);
    for (let i = 0; i < count && open.length > 0; i++) {
      const [world] = open.splice(random.int(0, open.length - 1), 1);
      bases.set(world!.id, [...(bases.get(world!.id) ?? []), kind]);
    }
  };
  place('naval', Math.max(0, d6(random) - 3), 3);
  place('scout', Math.max(0, d6(random) - 4), 2);
  const anyBase = hex.navalBase === true || hex.scoutBase === true || bases.size > 0;
  const mainGovernment = main.uwp.government ?? 0;
  const mainLaw = main.uwp.law ?? 0;
  const mainTech = main.uwp.tech ?? 0;
  const mainPopulation = pop(main);
  const mainAtmosphere = main.uwp.atmosphere;
  const codes = tradeCodesOf(main).map((t) => t.id);
  const industrial = codes.includes('In');
  const poor = codes.includes('Po');
  const values = new Map<string, Pick<World, 'uwp' | 'spaceport' | 'facilities' | 'bases'>>();
  for (const world of subs) {
    const p = pop(world);
    const atmosphere = world.uwp.atmosphere ?? 0;
    const hydrographics = world.uwp.hydrographics ?? 0;
    // Regierung: ohne Bevölkerung 0; unter einer Captive Government (6) ebenfalls 6; bei 7+ DM +2 (Kapitel).
    const government = p === 0 ? 0 : mainGovernment === 6 ? 6 : SUBORDINATE_GOVERNMENT[Math.min(5, d6(random) + (mainGovernment >= 7 ? 2 : 0)) - 1]!;
    // Gesetz: 1W6 − 3 + Gesetz der Hauptwelt; ohne Regierung 0 (Kapitel).
    const law = government === 0 ? 0 : Math.max(0, d6(random) - 3 + mainLaw);
    const found: Facility[] = [];
    if (zoneOf(hex, world) === 'habitable' && atmosphere >= 4 && atmosphere <= 9 && hydrographics >= 4 && hydrographics <= 8 && p >= 2) found.push('farming');
    if (industrial && p >= 2) found.push('mining');
    if (government === 6 && p >= 5) found.push('colony');
    if (p > 0 && mainTech > 8 && d2(random) + (mainTech >= 10 ? 2 : 0) >= 11) found.push('research');
    if (p > 0 && !poor && d2(random) + (mainPopulation >= 8 ? 1 : 0) + (atmosphere === mainAtmosphere ? 2 : 0) + (anyBase ? 1 : 0) >= 12) found.push('military');
    // Tech-Level: Hauptwelt − 1, gleich bei Labor oder Militärbasis; unter 7 bei lebensfeindlicher Luft 7 (Tabelle S. 29).
    let tech = found.includes('research') || found.includes('military') ? mainTech : Math.max(0, mainTech - 1);
    if (tech < 7 && ![5, 6, 8].includes(atmosphere)) tech = 7;
    const portDm = p >= 6 ? 2 : p === 1 ? -2 : p === 0 ? -3 : 0;
    const spaceport = SPACEPORT_TABLE[clamp(d6(random) + portDm, 1, 6) - 1]!;
    const own = bases.get(world.id);
    values.set(world.id, { uwp: { ...world.uwp, government, law, tech }, spaceport, ...(found.length > 0 ? { facilities: found } : {}), ...(own ? { bases: own } : {}) });
  }
  return { ...hex, worlds: hex.worlds.map((w) => (values.has(w.id) ? { ...w, ...values.get(w.id)! } : w)) };
}

/** Die Hauptwelt ohne eine frühere Lage (für den Fall, dass ein System neu entsteht). */
function without(world: World): World {
  const copy: { -readonly [K in keyof World]?: World[K] } = { ...world };
  delete copy.orbit;
  delete copy.moonOf;
  delete copy.angle;
  return copy as World;
}

/** Die Welt eines Systems, um die eine Welt kreist; ohne `moonOf` keine. */
export function hostOf(hex: Hex, world: World): World | undefined {
  return world.moonOf === undefined ? undefined : hex.worlds.find((w) => w.id === world.moonOf);
}

/** Die Monde einer Welt, nach Bahn. */
export function moonsOf(hex: Hex, world: World): readonly World[] {
  return hex.worlds.filter((w) => w.moonOf === world.id).sort((a, b) => (a.orbit ?? 0) - (b.orbit ?? 0));
}

/** Die Zone einer Welt: die ihrer Bahn um den Stern, bei Monden die der Welt, die sie umkreisen. Ohne System keine. */
export function zoneOf(hex: Hex, world: World): Zone | undefined {
  if (!hex.system) return undefined;
  const around = hostOf(hex, world) ?? world;
  if (around.orbit === undefined) return undefined;
  return zoneOfOrbit(zonesOf(hex.system.stars[0]!), around.orbit) ?? 'inner';
}

/**
 * Die Temperatur einer Welt fürs Weltsymbol: gespeichert bei der Hauptwelt; sonst aus der Zone
 * (innen heiß, bewohnbar wie die Hauptwelt, außen gefroren).
 */
export function temperatureOfWorld(hex: Hex, world: World): TemperatureId {
  if (world.temperature !== undefined) return world.temperature;
  const zone = zoneOf(hex, world);
  if (zone === 'inner') return 'hot';
  if (zone === 'outer') return 'frozen';
  return mainOf(hex)?.temperature ?? 'temperate';
}

/** Der Radius einer Welt in km: Größe × 800, kleine Welt halber Durchmesser, Gasriese sein Radius; Gürtel und Ring keinen. */
export function radiusOf(world: World): number | undefined {
  if (world.kind === 'giant') return world.radius;
  if (world.kind === 'small') return world.diameter === undefined ? undefined : world.diameter / 2;
  if (world.kind === 'world') return (world.uwp.size ?? 0) > 0 ? world.uwp.size! * 800 : undefined;
  return undefined;
}

/**
 * Die Schwerkraft an der Oberfläche in G (B6 43, SR 22): Welt Größe ÷ 8, kleine Welt Durchmesser ÷
 * 12.800 km, Gasriese 0,2 × Durchmesser ÷ 12.800 km; Gürtel und Ring keine.
 */
export function gravityOf(world: World): number {
  const radius = radiusOf(world);
  if (radius === undefined) return 0;
  return (world.kind === 'giant' ? 0.2 : 1) * ((2 * radius) / 12_800);
}

/** Die UWP-Größe als Text: die Ziffer, S für kleine Welten, R für Ringe, GG für Gasriesen. */
export function sizeCode(world: World): string {
  if (world.kind === 'small') return 'S';
  if (world.kind === 'ring') return 'R';
  if (world.kind === 'giant') return world.large ? 'LGG' : 'SGG';
  return String(world.uwp.size ?? 0);
}

/** Der Name eines Sterns, z. B. G2 V, M0 D; weiße Zwerge „DG“. */
export function starName(star: Pick<Star, 'type' | 'decimal' | 'size'>): string {
  return star.size === 'D' ? `D${star.type}` : `${star.type}${star.decimal ?? 0} ${star.size}`;
}

/** Prüft die Sternsysteme der Hexfelder: Sterne, Bahnen, die Welten des Systems nach ihrer Art. */
export function checkStarSystems(hexes: readonly Hex[]): void {
  for (const hex of hexes) {
    const id = hexId(hex.column, hex.row);
    const fail = (why: string): never => {
      throw new DomainError(`Das Feld ${id}: ${why}`);
    };
    const others = hex.worlds.filter((w) => w.id !== hex.main);
    if (!hex.system) {
      if (others.length > 0) fail('Weitere Welten gibt es erst mit dem Sternsystem.');
      continue;
    }
    const subs = hex.worlds.filter((w) => isSubordinate(hex, w));
    if (subs.some((w) => w.spaceport === undefined) && subs.some((w) => w.spaceport !== undefined)) fail('Entweder alle Nebenwelten haben ihren Raumhafen oder keine (Systeme von vor 2026-11-20c).');
    if (hex.empty) fail('Ein leeres Feld hat kein Sternsystem.');
    const main = mainWorld(hex);
    if (main.uwp.tech === undefined) fail('Das Sternsystem kommt erst nach dem UWP.');
    const { stars, maxOrbits, emptyOrbits } = hex.system;
    if (stars.length < 1 || stars.length > 3) fail('Ein System hat einen bis drei Sterne.');
    if (!Number.isInteger(maxOrbits) || maxOrbits < 0) fail('Die höchste Bahn ist eine ganze Zahl ab 0.');
    stars.forEach((s, i) => {
      if (s.size === 'D' ? s.decimal !== undefined : s.decimal !== 0 && s.decimal !== 5) fail('Ein Stern hat das Zehntel 0 oder 5, ein weißer Zwerg keins.');
      if (i === 0 && (s.close || s.orbit !== undefined || s.farAu !== undefined)) fail('Der Hauptstern hat keine Bahn.');
      if (i > 0 && [s.close, s.orbit !== undefined, s.farAu !== undefined].filter(Boolean).length !== 1) fail('Ein Begleiter ist nah, in einer Bahn oder fern.');
    });
    if (emptyOrbits.some((o) => !Number.isInteger(o) || o < 0) || new Set(emptyOrbits).size !== emptyOrbits.length) fail('Leere Bahnen sind ganze Zahlen, jede einmal.');
    for (const w of hex.worlds) {
      const isMain = w.id === hex.main;
      if (w.orbit === undefined || !(w.orbit >= 0)) fail(`Die Welt ${w.id} hat keine Bahn.`);
      if (w.moonOf !== undefined && w.angle === undefined && w.kind !== 'ring') fail(`Der Mond ${w.id} hat keinen Startwinkel.`);
      if (w.moonOf === undefined && w.angle !== undefined) fail(`Nur Monde haben einen Startwinkel (${w.id}).`);
      if (w.moonOf === undefined && emptyOrbits.includes(w.orbit!)) fail(`Die Welt ${w.id} liegt auf einer leeren Bahn.`);
      if (w.kind === 'giant' && (w.large === undefined || !(w.radius! > 0) || w.moonOf !== undefined)) fail(`Der Gasriese ${w.id} braucht groß/klein und Radius und kreist um den Stern.`);
      if (w.kind !== 'giant' && (w.large !== undefined || w.radius !== undefined)) fail(`Nur Gasriesen sind groß oder klein (${w.id}).`);
      if (w.kind === 'small' && !(w.diameter! > 0)) fail(`Die kleine Welt ${w.id} braucht einen Durchmesser.`);
      if (w.kind !== 'small' && w.diameter !== undefined) fail(`Nur kleine Welten haben einen Durchmesser (${w.id}).`);
      if (w.kind === 'ring' && w.moonOf === undefined) fail(`Der Ring ${w.id} kreist um eine Welt.`);
      if (w.kind === 'belt' && w.moonOf !== undefined) fail(`Der Gürtel ${w.id} kreist um den Stern.`);
      if (w.captured && (w.moonOf !== undefined || Number.isInteger(w.orbit))) fail(`Eine eingefangene Welt liegt auf einer Zwischenbahn um den Stern (${w.id}).`);
      if (w.moonOf !== undefined) {
        const around = hostOf(hex, w);
        if (!around || around.moonOf !== undefined || (around.kind !== 'giant' && around.kind !== 'world')) fail(`Der Mond ${w.id} kreist um keine Welt oder keinen Gasriesen.`);
        if (isMain && around!.kind !== 'giant') fail('Die Hauptwelt ist höchstens Mond eines Gasriesen.');
        if (moonsOf(hex, w).length > 0) fail(`Ein Mond hat keine Monde (${w.id}).`);
      }
      if (!isMain) {
        // Nebenwelten mit Namen, Notiz, Oberfläche und Globus (2026-11-20d).
        if (w.name !== undefined && !w.name.trim()) fail(`Die Welt ${w.id} hat einen leeren Namen.`);
        if (w.note !== undefined && !w.note.trim()) fail(`Eine leere Notiz gibt es nicht (${w.id}).`);
        if ((w.surface !== undefined || w.temperature !== undefined) && (w.kind !== 'world' || (w.uwp.size ?? 0) < 1)) fail(`Oberfläche und Temperatur hat nur eine Welt ab Größe 1 (${w.id}).`);
        if (w.surface !== undefined) validateSurface(w, fail);
        if (w.map !== undefined) {
          if (!mapPossible(hex, w)) fail(`Eine Oberflächenkarte braucht Oberfläche und Temperatur (${w.id}).`);
          const why = checkSurfaceMap(w.map, w.uwp.size!, w.uwp.population ?? 0);
          if (why) fail(why);
        }
        if (w.populationMultiplier !== undefined && (!Number.isInteger(w.populationMultiplier) || w.populationMultiplier < 1 || w.populationMultiplier > 9 || (w.uwp.population ?? 0) < 1)) fail(`Einen Bevölkerungsmultiplikator 1–9 hat nur eine Welt mit Bevölkerung (${w.id}).`);
      }
      const subordinate = isSubordinate(hex, w);
      if (!subordinate && (w.spaceport !== undefined || w.facilities !== undefined || w.bases !== undefined)) fail(`Raumhafen, Einrichtungen und Basen haben nur Nebenwelten (${w.id}).`);
      if (subordinate && w.spaceport === undefined && (w.uwp.government !== undefined || w.uwp.law !== undefined || w.uwp.tech !== undefined || w.facilities !== undefined || w.bases !== undefined)) fail(`Die Nebenwelt ${w.id} hat Werte von 2026-11-20c, aber keinen Raumhafen.`);
      if (subordinate && w.spaceport !== undefined) {
        if (!spaceports.includes(w.spaceport)) fail(`Den Raumhafen ${w.spaceport} gibt es nicht.`);
        if (!(SUBORDINATE_GOVERNMENT as readonly number[]).includes(w.uwp.government ?? -1)) fail(`Die Nebenwelt ${w.id} hat keine Regierung nach der Tabelle.`);
        for (const v of [w.uwp.law, w.uwp.tech]) if (v === undefined || !Number.isInteger(v) || v < 0) fail(`Die Nebenwelt ${w.id} braucht Gesetz und TL.`);
        const list = (xs: readonly string[] | undefined, allowed: readonly string[]) => xs !== undefined && (xs.length === 0 || new Set(xs).size !== xs.length || xs.some((x) => !allowed.includes(x)));
        if (list(w.facilities, facilities) || list(w.bases, baseKinds)) fail(`Einrichtungen und Basen der Nebenwelt ${w.id}: jede bekannte einmal, keine leere Liste.`);
      }
    }
  }
}

/** Kann diese Nebenwelt ihre Oberfläche würfeln (2026-11-20d)? Eine Welt ab Größe 1 ohne Oberfläche, mit TL. */
export function surfaceDue(hex: Hex, world: World): boolean {
  return world.id !== hex.main && world.kind === 'world' && (world.uwp.size ?? 0) >= 1 && world.surface === undefined && world.uwp.tech !== undefined;
}

/**
 * Würfelt die Oberfläche einer Nebenwelt nach dem World Builder's Handbook (wie bei Welten von vor
 * der Oberfläche); die Temperatur aus ihrer Zone wird dabei gespeichert, damit das Leben dazu passt.
 */
export function rollWorldSurface(hexes: readonly Hex[], id: string, random: Random): readonly Hex[] {
  return withWorld(hexes, id, (world, hex) => {
    if (!surfaceDue(hex, world)) throw new DomainError('Diese Welt kann keine Oberfläche würfeln.');
    const temperature = temperatureOfWorld(hex, world);
    return { ...world, temperature, surface: rollSurface({ uwp: world.uwp, temperature }, random) };
  });
}

/**
 * Die Welt, auf der die Gruppe ankommt, bekommt Oberfläche und Globus, falls sie fehlen (Owner,
 * 21. November 2026): bei jeder Ankunft, mit Reise oder ohne. Welten ohne mögliche Oberfläche (Größe
 * 0, kleine Welten, Ringe, Gasriesen) bleiben, wie sie sind; eine Hauptwelt ohne Temperatur auch.
 */
export function readyForParty(hexes: readonly Hex[], id: string, random: Random): readonly Hex[] {
  const hex = hexById(hexes, hexIdOfWorld(id));
  const world = worldById(hexes, id);
  if (!hex || !world) return hexes;
  let next = hexes;
  if (world.id === hex.main) {
    if (nextWorldAction(hex) === 'surface') next = putHex(next, enterSurface(hex, random));
  } else if (surfaceDue(hex, world)) next = rollWorldSurface(next, id, random);
  const after = hexById(next, hexIdOfWorld(id))!;
  const ready = worldById(next, id)!;
  if (ready.map === undefined && mapPossible(after, ready)) next = withSurfaceMapOf(next, id, random, cityNamesTaken(next));
  return next;
}

/** Eine Zufallsquelle aus einem Text (FNV-1a, dann mulberry32): derselbe Text gibt dieselben Würfe. */
export function textRandom(text: string): Random {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  let a = h >>> 0 || 1;
  return {
    int(min, max) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return min + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min + 1));
    },
  };
}

/**
 * Fertige Welten ohne Sternsystem bekommen es nachgewürfelt (Welten ohne Sternsystem, 2026-11-20), einmal;
 * Systeme von vor 2026-11-20c die Werte ihrer Nebenwelten.
 * Die Würfe kommen aus dem Schlüssel der Kampagne und dem Feld: So entsteht auf jedem Gerät dasselbe
 * System, und der Abgleich hat nichts zu entscheiden. Ohne solche Welt bleibt die Kampagne dieselbe.
 */
export function withStarSystems<C extends { readonly key: string; readonly hexes: readonly Hex[] }>(campaign: C, seed = campaign.key): C {
  let changed = false;
  const hexes = campaign.hexes.map((original) => {
    let hex = original;
    const id = hexId(hex.column, hex.row);
    if (!hex.empty && !hex.system && mainOf(hex)?.name !== undefined && mainOf(hex)?.uwp.tech !== undefined) hex = rollStarSystem(hex, textRandom(`${seed}/${id}`));
    // Systeme von vor 2026-11-20c bekommen Raumhafen, Regierung, Gesetz, TL, Einrichtungen und Basen nach.
    if (hex.system && hex.worlds.some((w) => isSubordinate(hex, w) && w.spaceport === undefined)) hex = rollSubordinates(hex, textRandom(`${seed}/${id}/2026-11-20c`));
    // Die Oberfläche entsteht mit der Welt (21. November 2026): Nebenwelten und ältere Hauptwelten mit Temperatur bekommen sie nach.
    if (hex.system) hex = withSurfaces(hex, textRandom(`${seed}/${id}/oberflaeche`));
    if (isWorld(hex) && nextWorldAction(hex) === 'surface') hex = enterSurface(hex, textRandom(`${seed}/${id}/hauptwelt`));
    if (hex !== original) changed = true;
    return hex;
  });
  return changed ? { ...campaign, hexes } : campaign;
}
