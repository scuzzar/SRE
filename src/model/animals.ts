import { DomainError } from './errors';
import type { Random } from './ports';
import { ref, weaponOf, type AnimalCategory, type AnimalEvent, type AnimalTrait, type AnimalType, type ArmorClass, type Terrain } from './reference';
import type { Hex } from './sector';

/** Ein Tierangriff einer Zeile: Tierwaffe (oder „as blade“), DM auf den Angriff und fester Schaden je Treffer. */
export interface AnimalAttack {
  readonly with: string;
  readonly dm: number;
  readonly damage: number;
}

/**
 * Eine Zeile der Tiertabelle (SE 18–19): ein Tier mit allen Werten oder ein Ereignis. Gespeichert
 * werden die Werte, nicht die Würfe. `quantity`: die Würfel der Anzahl; fehlt sie, ist es ein Tier.
 */
export interface AnimalRow {
  readonly roll: number;
  /** Verweis auf das Ereignis; dann fehlen alle Werte eines Tiers. */
  readonly event?: string;
  /** Verweis auf die Tierart. */
  readonly type?: string;
  readonly quantity?: number;
  readonly trait?: AnimalTrait;
  readonly traitSizeDm?: number;
  readonly weight?: number;
  readonly hits?: readonly [number, number];
  readonly armor?: ArmorClass;
  readonly armorDm?: number;
  readonly attacks?: readonly AnimalAttack[];
  readonly attack?: number;
  readonly flee?: number;
  readonly speed?: number;
  /** Der Marktwurf (3W6) der Tierart für Fell- und Fleischwert (Hausregel); fehlt in älteren Tabellen. */
  readonly market?: number;
  /** Ist das Fleisch der Art genießbar (SR 48)? Fehlt in älteren Tabellen. */
  readonly edible?: boolean;
}

/** Die Tiertabelle eines Geländes einer Welt: elf Zeilen, 2 bis 12. */
export interface AnimalTable {
  /** Verweis auf das Gelände. */
  readonly terrain: string;
  readonly rows: readonly AnimalRow[];
}

/** Wo eine Zeile steht: Welt (0304), Gelände und Wurf 2–12. Im Code der Verweis auf `AnimalRow`. */
export interface AnimalRef {
  readonly in: string;
  readonly terrain: string;
  readonly roll: number;
}

const animals = () => ref.encounters.animals;

export function terrainOf(id: string): Terrain {
  const terrain = ref.encounters.terrains.find((t) => t.id === id);
  if (!terrain) throw new DomainError(`Das Gelände ${id} gibt es nicht.`);
  return terrain;
}

/** `/animals`: Gibt es in diesem Gelände Tiere? */
export function hasAnimals(terrain: Terrain): boolean {
  return terrain.typeDm !== undefined;
}

export function animalTypeOf(id: string): AnimalType {
  const type = animals().types.find((t) => t.id === id);
  if (!type) throw new DomainError(`Die Tierart ${id} gibt es nicht.`);
  return type;
}

export function animalEventOf(id: string): AnimalEvent {
  const event = animals().events.find((e) => e.id === id);
  if (!event) throw new DomainError(`Das Ereignis ${id} gibt es nicht.`);
  return event;
}

const traitWord: Record<AnimalTrait, string> = { flyer: 'Flying', swimmer: 'Swimming', amphibian: 'Amphibious', triphibian: 'Triphibian' };

/** Der Name eines Tiers aus Besonderheit und Tierart: „Flying Grazer“. */
export function animalName(row: AnimalRow): string {
  if (row.type === undefined) return row.event === undefined ? '?' : animalEventOf(row.event).name;
  const type = animalTypeOf(row.type).name;
  return row.trait === undefined ? type : `${traitWord[row.trait]} ${type}`;
}

/** Die Tiertabelle der Welt in diesem Gelände, wenn es sie schon gibt. */
export function animalTableOf(hex: Hex, terrain: string): AnimalTable | undefined {
  return hex.animals?.find((t) => t.terrain === terrain);
}

/** Die Zeile eines Ereignis-Eintrags. */
export function eventRowOf(hexes: readonly Hex[], entry: { readonly in: string; readonly terrain: string; readonly tableDice: readonly [number, number] }): AnimalRow {
  return animalRowOf(hexes, { in: entry.in, terrain: entry.terrain, roll: entry.tableDice[0] + entry.tableDice[1] });
}

/** Die Zeile, auf die ein Verweis zeigt. */
export function animalRowOf(hexes: readonly Hex[], at: AnimalRef): AnimalRow {
  const hex = hexes.find((h) => `${String(h.column).padStart(2, '0')}${String(h.row).padStart(2, '0')}` === at.in);
  const row = hex && animalTableOf(hex, at.terrain)?.rows.find((r) => r.roll === at.roll);
  if (!row) throw new DomainError(`Eine Tierzeile ${at.roll} im Gelände ${at.terrain} auf ${at.in} gibt es nicht.`);
  return row;
}

function d6(random: Random, count = 1): number {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += random.int(1, 6);
  return sum;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Hat die Welt Leben? Nach der Oberfläche; ohne Oberfläche, wenn sie eine Atmosphäre hat. */
export function hasLife(hex: Hex): boolean {
  return hex.surface ? hex.surface.life : (hex.uwp.atmosphere ?? 0) > 0;
}

/** DMs auf die Besonderheiten (SE 18): Größe 9+ −1, 4 oder 5 +1, 3 oder weniger +2; Atmosphäre 8+ +2, 5 oder weniger −1. */
function traitDm(hex: Hex): number {
  const size = hex.uwp.size ?? 0;
  const atmosphere = hex.uwp.atmosphere ?? 0;
  const bySize = size >= 9 ? -1 : size >= 6 ? 0 : size >= 4 ? 1 : 2;
  const byAtmosphere = atmosphere >= 8 ? 2 : atmosphere <= 5 ? -1 : 0;
  return bySize + byAtmosphere;
}

/** Der Size DM der Welt (SE 18): Größe 8+ −1, 4 oder weniger +1. */
function worldSizeDm(hex: Hex): number {
  const size = hex.uwp.size ?? 0;
  return size >= 8 ? -1 : size <= 4 ? 1 : 0;
}

const weaponDm: Record<AnimalCategory, number> = { carnivore: 8, omnivore: 4, herbivore: -3, scavenger: 0 };
const armorRollDm: Record<AnimalCategory, number> = { carnivore: -1, scavenger: 1, herbivore: 2, omnivore: 0 };

const sizeRow = (roll: number) => animals().sizeRows[roll - 1]!;

/** Die Größe: 2W6 + DM; „(+6)“ (ohne Gewicht) würfelt noch einmal mit +6, eine zweite neu ohne +6. */
function rollSize(random: Random, dm: number): number {
  let roll = clamp(d6(random, 2) + dm, 1, 20);
  if (sizeRow(roll).weight !== undefined) return roll;
  roll = clamp(d6(random, 2) + dm + 6, 1, 20);
  while (sizeRow(roll).weight === undefined) roll = clamp(d6(random, 2) + dm, 1, 20);
  return roll;
}

/** Die Rüstung: 2W6 + DM; „(+6)“ würfelt noch einmal mit +6, eine zweite neu ohne +6. */
function rollArmor(random: Random, dm: number): string {
  let armor = sizeRow(clamp(d6(random, 2) + dm, 1, 20)).armor;
  if (armor !== '(+6)') return armor;
  armor = sizeRow(clamp(d6(random, 2) + dm + 6, 1, 20)).armor;
  while (armor === '(+6)') armor = sizeRow(clamp(d6(random, 2) + dm, 1, 20)).armor;
  return armor;
}

/** „mesh +1“ → Mesh und DM +1 für den Angreifer; „battle“ zählt als Combat; „—“ keine. */
function parseArmor(text: string): { readonly armor?: ArmorClass; readonly armorDm?: number } {
  if (text === '—') return {};
  const [name, dm] = text.split(' ');
  const armor = (name === 'battle' ? 'combat' : name) as ArmorClass;
  return { armor, ...(dm === undefined ? {} : { armorDm: Number(dm) }) };
}

/** Der Schaden eines Treffers, einmal gewürfelt: die W6 der Waffe, geändert um die Wounds der Größe, mindestens 1 (SR 48). */
function rollDamage(random: Random, weapon: string, wounds: string): number {
  const base = d6(random, weaponOf(weapon).wounds);
  const match = /^([+-])(\d)D$/.exec(wounds);
  if (match) return Math.max(1, base + (match[1] === '+' ? 1 : -1) * d6(random, Number(match[2])));
  if (wounds.startsWith('×')) return Math.max(1, base * Number(wounds.slice(1)));
  return Math.max(1, base);
}

/** „claws +1 and teeth +1“ → zwei Tierangriffe mit DM; „as pike“ heißt: wie die Pike. */
function parseWeapons(text: string, random: Random, wounds: string): readonly AnimalAttack[] {
  return text.split(' and ').map((part) => {
    const [first, second] = part.split(' ');
    const weapon = first === 'as' ? part.slice(3).replace(' ', '-') : first!;
    const dm = first !== 'as' && second !== undefined ? Number(second) : 0;
    return { with: weapon, dm, damage: rollDamage(random, weapon, wounds) };
  });
}

/** A und F einer Tierart: „1D+3“ wird gewürfelt, ein Wort heißt 0. */
function rollBehavior(random: Random, text: string): number {
  const match = /^1D([+-]\d)$/.exec(text);
  return match ? Math.max(0, d6(random) + Number(match[1])) : 0;
}

function pick<T>(items: readonly T[], random: Random): T {
  return items[random.int(0, items.length - 1)]!;
}

function eventRow(roll: number, random: Random, lifeless: boolean): AnimalRow {
  return { roll, event: pick(animals().events.filter((e) => e.lifeless === lifeless), random).id };
}

/** Eine Tierzeile (Checklist SE 19): Tierart und Anzahl, Besonderheit, Größe mit Gewicht und Hits, Waffen, Rüstung, Verhalten. */
function animalRow(roll: number, category: AnimalCategory, hex: Hex, terrain: Terrain, random: Random): AnimalRow {
  const typeRoll = clamp(d6(random, 2) + terrain.typeDm!, 0, 13);
  const typeRow = animals().typeRows.find((r) => r.category === category && r.roll === typeRoll)!;
  const type = animalTypeOf(typeRow.type);
  const traitRoll = clamp(d6(random, 2) + traitDm(hex), 2, 12);
  const traitRow = animals().traitRows.find((r) => r.traits === terrain.traits && r.roll === traitRoll)!;
  const trait = traitRow.trait;
  // Bei Fliegern gilt nur der Size DM der Besonderheit, nicht der des Geländes (SE 18).
  const size = sizeRow(rollSize(random, (traitRow.sizeDm ?? 0) + (trait === 'flyer' ? 0 : terrain.sizeDm!) + worldSizeDm(hex)));
  const hits = [d6(random, size.hits[0].dice), d6(random, size.hits[1].dice)] as const;
  const weapons = sizeRow(clamp(d6(random, 2) + weaponDm[category], 1, 20)).weapons;
  const attacks = parseWeapons(weapons, random, size.wounds);
  const armor = trait === 'flyer' || trait === 'triphibian' ? {} : parseArmor(rollArmor(random, armorRollDm[category]));
  const attack = rollBehavior(random, type.attack);
  const flee = rollBehavior(random, type.flee);
  const speed = Math.max(type.speedMin, d6(random) + type.speed.dm);
  const loot = rollLootValues(hex, attacks, random);
  return {
    roll,
    type: type.id,
    ...(typeRow.quantity === undefined ? {} : { quantity: typeRow.quantity }),
    ...(trait === undefined ? {} : { trait, traitSizeDm: traitRow.sizeDm ?? 0 }),
    weight: size.weight!,
    hits,
    ...armor,
    attacks,
    attack,
    flee,
    speed,
    ...loot,
  };
}

/** Atmosphären, deren Luft verdorben ist (tainted): DM −3 auf essbar (SR 48). */
const TAINTED = [2, 4, 7, 9];

/** Giftwaffen machen ein Tier ungenießbar (SR 48); der Stinger zählt als Giftwaffe (Hausregel). */
const POISON_WEAPONS = ['stinger'];

/** Warum eine Tierart nicht essbar sein kann, unabhängig vom Wurf; sonst `undefined`. */
export function inedibleReason(hex: Hex, attacks: readonly AnimalAttack[]): string | undefined {
  const atmosphere = hex.uwp.atmosphere ?? 0;
  if (atmosphere < 2 || atmosphere > 9) return `Atmosphäre ${atmosphere}: ungenießbar`;
  if (attacks.some((a) => POISON_WEAPONS.includes(a.with))) return 'Giftwaffe: ungenießbar';
  return undefined;
}

/** Der DM auf essbar: −3 bei verdorbener Atmosphäre. */
export function edibleDm(hex: Hex): number {
  return TAINTED.includes(hex.uwp.atmosphere ?? 0) ? -3 : 0;
}

/** Marktwurf (3W6) und essbar (2W6 + DM ≥ 5, nur bei Atmosphäre 2–9 ohne Giftwaffe) einer Tierart. */
export function rollLootValues(hex: Hex, attacks: readonly AnimalAttack[], random: Random): { readonly market: number; readonly edible: boolean } {
  const market = d6(random, 3);
  const roll = d6(random, 2) + edibleDm(hex);
  return { market, edible: inedibleReason(hex, attacks) === undefined && roll >= 5 };
}

/**
 * Erzeugt die Tiertabelle einer Welt in einem Gelände (SE 18–19): elf Zeilen nach der 2W6-Aufteilung,
 * Zeile 10 ein Ereignis. Auf einer Welt ohne Leben sind alle Zeilen Ereignisse für Welten ohne Leben.
 */
export function generateAnimalTable(hex: Hex, terrainId: string, random: Random): AnimalTable {
  const terrain = terrainOf(terrainId);
  if (!hasAnimals(terrain)) throw new DomainError(`Im Gelände ${terrain.name} gibt es keine Tiere.`);
  const life = hasLife(hex);
  const rows = animals().columns.map((column, i) => {
    const roll = i + 2;
    if (!life) return eventRow(roll, random, true);
    return column === 'event' ? eventRow(roll, random, false) : animalRow(roll, column, hex, terrain, random);
  });
  return { terrain: terrainId, rows };
}

/** Die Welt mit ihrer Tiertabelle in diesem Gelände; gibt es sie schon, bleibt alles, wie es ist. */
export function withAnimalTable(hex: Hex, terrain: string, random: Random): Hex {
  if (animalTableOf(hex, terrain)) return hex;
  return { ...hex, animals: [...(hex.animals ?? []), generateAnimalTable(hex, terrain, random)] };
}

/** Prüft eine gespeicherte Tiertabelle: Gelände mit Tieren, elf Zeilen 2 bis 12, Verweise und Werte. */
export function checkAnimalTable(table: AnimalTable): void {
  const terrain = terrainOf(table.terrain);
  if (!hasAnimals(terrain)) throw new DomainError(`Im Gelände ${terrain.name} gibt es keine Tiere.`);
  if (table.rows.length !== 11 || table.rows.some((r, i) => r.roll !== i + 2)) throw new DomainError('Eine Tiertabelle hat elf Zeilen, 2 bis 12.');
  for (const row of table.rows) {
    if (row.event !== undefined) {
      animalEventOf(row.event);
      if (row.type !== undefined) throw new DomainError('Eine Zeile ist ein Tier oder ein Ereignis.');
      continue;
    }
    if (row.type === undefined || row.hits === undefined || !row.attacks || row.attacks.length === 0) throw new DomainError('Eine Tierzeile hat Tierart, Hits und Angriffe.');
    animalTypeOf(row.type);
    for (const attack of row.attacks) weaponOf(attack.with);
  }
}
