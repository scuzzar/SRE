import { activeSkills, anyCharacterOf, livingCharacters, possessionKey, type Campaign, type Character, type CharacterId, type Possession } from './campaign';
import { animalRowOf, animalTypeOf, rollLootValues, terrainOf, type AnimalRef, type AnimalRow } from './animals';
import { DomainError } from './errors';
import type { Butchering, LogEntry } from './log';
import type { Clock, Random } from './ports';
import { itemOf, ref, type AnimalCategory, type Item } from './reference';
import { hexById, type Hex } from './sector';
import { canFight, isDead, woundStateOf } from './wounds';

export const MEAT = 'meat';
export const FUR = 'fur';

/** Fleisch: Wert × 0,5 Cr je kg; Fell: Wert × 0,1 Cr je kg (Hausregel). */
export const MEAT_RATE = 0.5;
export const FUR_RATE = 0.1;

/** Gefahr-DM auf den Fellwert: Fleischfresser sind gefährlicher zu jagen (Hausregel). */
export const DANGER_DM: Record<AnimalCategory, number> = { herbivore: 0, omnivore: 1, scavenger: 1, carnivore: 3 };

/** Die Fertigkeiten fürs Ausweiden (Hausregel): Fleisch Steward oder Medical, Fell eine Klinge. */
export const MEAT_SKILLS = ['steward', 'medical'] as const;
export const FUR_SKILLS = ['dagger', 'blade', 'foil', 'sword', 'cutlass', 'broadsword', 'bayonet'] as const;

/** Seltenheit nach der Zeile der Tiertabelle: 2 oder 12 +3, 3 oder 11 +2, 4 oder 10 +1. */
export function rarityDm(roll: number): number {
  const away = Math.abs(roll - 7);
  return away >= 5 ? 3 : away === 4 ? 2 : away === 3 ? 1 : 0;
}

/** Ein DM mit seinem Grund, für die Anzeige. */
export interface ValuePart {
  readonly label: string;
  readonly dm: number;
}

/** Woraus Fell- und Fleischwert einer Tierart bestehen: Marktwurf und die DMs einzeln. */
export interface LootValue {
  readonly market: number;
  readonly fur: readonly ValuePart[];
  readonly meat: readonly ValuePart[];
  readonly furValue: number;
  readonly meatValue: number;
}

/** `/furValue` und `/meatValue` einer Zeile mit Marktwurf: Marktwurf + Jagd-DM + (Fell: Gefahr) + Seltenheit. */
export function lootValueOf(row: AnimalRow, at: AnimalRef): LootValue | undefined {
  if (row.market === undefined || row.type === undefined) return undefined;
  const terrain = terrainOf(at.terrain);
  const type = animalTypeOf(row.type);
  const hunt: ValuePart = { label: terrain.name.split(',')[0]!, dm: terrain.huntDm ?? 0 };
  const danger: ValuePart = { label: categoryName[type.category], dm: DANGER_DM[type.category] };
  const rarity: ValuePart = { label: `Zeile ${row.roll}`, dm: rarityDm(row.roll) };
  const fur = [hunt, danger, rarity];
  const meat = [hunt, rarity];
  const sum = (parts: readonly ValuePart[]) => parts.reduce((total, p) => total + p.dm, row.market!);
  return { market: row.market, fur, meat, furValue: sum(fur), meatValue: sum(meat) };
}

const categoryName: Record<AnimalCategory, string> = { herbivore: 'Herbivore', omnivore: 'Omnivore', scavenger: 'Scavenger', carnivore: 'Carnivore' };

/** Der Listenpreis je kg einer Jagdbeute aus ihrer Herkunft. */
export function gamePricePerKg(hexes: readonly Hex[], item: string, from: AnimalRef): number {
  const value = lootValueOf(animalRowOf(hexes, from), from);
  if (!value) throw new DomainError('Diese Tierart hat noch keinen Marktwert.');
  return item === FUR ? value.furValue * FUR_RATE : value.meatValue * MEAT_RATE;
}

/** Der vorgeschlagene Erlös für so viele kg: der halbe Listenpreis, abgerundet, mindestens 1 Cr. */
export function gameSaleTotal(hexes: readonly Hex[], item: string, from: AnimalRef, kg: number): number {
  return Math.max(1, Math.floor((kg * gamePricePerKg(hexes, item, from)) / 2));
}

/** Ist das Jagdbeute (Fleisch oder Fell)? */
export function isGame(item: Item): boolean {
  return item.kind === 'game';
}

/** Wer am besten kann, unter den lebenden SC, die nicht bewusstlos sind: Name, Fertigkeit, Stufe. */
export interface Worker {
  readonly who: CharacterId | undefined;
  readonly name: string | undefined;
  readonly skill: string | undefined;
  readonly level: number;
}

function bestAt(campaign: Campaign, skills: readonly string[]): Worker {
  let best: Worker = { who: undefined, name: undefined, skill: undefined, level: 0 };
  for (const c of livingCharacters(campaign).filter((c) => canFight(woundStateOf(campaign, c.id)))) {
    if (best.who === undefined) best = { who: c.id, name: c.name, skill: undefined, level: 0 };
    for (const s of activeSkills(c)) {
      if (skills.includes(s.of) && (best.skill === undefined || s.level > best.level)) best = { who: c.id, name: c.name, skill: s.of, level: s.level };
    }
  }
  return best;
}

/** Wer das Fleisch macht (Steward oder Medical) und wer das Fell abzieht (Klinge). */
export function butchers(campaign: Campaign): { readonly meat: Worker; readonly fur: Worker } {
  return { meat: bestAt(campaign, MEAT_SKILLS), fur: bestAt(campaign, FUR_SKILLS) };
}

/** Das Ausweiden dieses Tiers, wenn es schon im Log steht. */
export function butcheringOf(log: readonly LogEntry[], animal: CharacterId): Butchering | undefined {
  return log.find((e): e is Butchering => e.kind === 'butchering' && e.of === animal);
}

/** Warum man dieses Tier nicht ausweiden kann; sonst `undefined`. */
export function cannotButcher(campaign: Campaign, animal: CharacterId): string | undefined {
  const character = anyCharacterOf(campaign, animal);
  if (!character.animal) return `${character.name} ist kein Tier.`;
  const state = woundStateOf(campaign, animal);
  if (state === 'destroyed') return `${character.name} ist zerstört: kein Fleisch, kein Fell.`;
  if (state !== 'dead' && state !== 'unconscious') return `${character.name} lebt noch.`;
  if (butcheringOf(campaign.log, animal)) return `${character.name} ist schon ausgeweidet.`;
  if (butchers(campaign).meat.who === undefined) return 'Keiner ist wach, der ausweiden könnte.';
  return undefined;
}

/** Was das Ausweiden ergibt: essbar, Fleisch und Fell in kg, ob nur halbes Fell, warum ungenießbar. */
export interface ButcheringResult {
  readonly edible: boolean;
  readonly reason: string | undefined;
  readonly meat: number;
  readonly fur: number;
  readonly furHalf: boolean;
  readonly hasFur: boolean;
}

/** `/edible`, `/meat`, `/fur`: allein aus dem Eintrag und der Zeile des Tiers. */
export function butcheringResult(campaign: Campaign, entry: Butchering): ButcheringResult {
  const at = anyCharacterOf(campaign, entry.of).animal!;
  const row = animalRowOf(campaign.hexes, at);
  const weight = row.weight ?? 0;
  const edible = row.edible === true;
  const hasFur = row.armor === undefined || row.armor === 'jack';
  const meat = edible && entry.meatDie !== undefined ? Math.max(1, Math.floor((Math.min(6, entry.meatDie + entry.meatSkill) * 5 * weight) / 100)) : 0;
  const furHalf = entry.furSkill < 1;
  const fur = hasFur ? (furHalf ? Math.floor(weight / 2) : weight) : 0;
  const hex = hexById(campaign.hexes, at.in)!;
  const reason = edible ? undefined : (inedible(hex, row) ?? 'Wurf: ungenießbar');
  return { edible, reason, meat, fur, furHalf, hasFur };
}

function inedible(hex: Hex, row: AnimalRow): string | undefined {
  const atmosphere = hex.uwp.atmosphere ?? 0;
  if (atmosphere < 2 || atmosphere > 9) return `Atmosphäre ${atmosphere}: ungenießbar`;
  if ((row.attacks ?? []).some((a) => a.with === 'stinger')) return 'Giftwaffe: ungenießbar';
  return undefined;
}

/** Legt Jagdbeute in den Besitz: derselbe Gegenstand derselben Herkunft zählt zusammen. */
function addGame(possessions: readonly Possession[], item: string, kg: number, from: AnimalRef): readonly Possession[] {
  if (kg <= 0) return possessions;
  const key = possessionKey({ of: item, from });
  const had = possessions.find((p) => possessionKey(p) === key);
  return had ? possessions.map((p) => (p === had ? { ...p, count: p.count + kg } : p)) : [...possessions, { of: item, count: kg, from }];
}

/** Die Zeile mit Marktwurf und essbar; ältere Tabellen würfeln beides beim ersten Ausweiden nach. */
function withLootValues(campaign: Campaign, at: AnimalRef, random: Random): Campaign {
  const row = animalRowOf(campaign.hexes, at);
  if (row.market !== undefined && row.edible !== undefined) return campaign;
  const hex = hexById(campaign.hexes, at.in)!;
  const values = rollLootValues(hex, row.attacks ?? [], random);
  const hexes = campaign.hexes.map((h) =>
    h !== hex ? h : { ...h, animals: (h.animals ?? []).map((t) => (t.terrain !== at.terrain ? t : { ...t, rows: t.rows.map((r) => (r.roll === at.roll ? { ...r, ...values } : r)) })) },
  );
  return { ...campaign, hexes };
}

/**
 * Weidet ein Tier aus (Hausregel nach SR 48): Fleisch macht der wache SC, der Steward oder Medical
 * am besten kann, das Fell der mit der besten Klinge. Ist die Art essbar, rollt der Fleischwürfel.
 * Fleisch und Fell kommen als Jagdbeute in den Besitz von `receiver`; der Eintrag kommt in den Log.
 */
export function butcher(campaign: Campaign, animal: CharacterId, receiver: CharacterId, random: Random, clock: Clock): Campaign {
  const reason = cannotButcher(campaign, animal);
  if (reason) throw new DomainError(reason);
  if (!livingCharacters(campaign).some((c) => c.id === receiver)) throw new DomainError('Die Beute bekommt ein lebender SC.');
  const at = anyCharacterOf(campaign, animal).animal!;
  const valued = withLootValues(campaign, at, random);
  const row = animalRowOf(valued.hexes, at);
  const workers = butchers(valued);
  const entry: Butchering = {
    kind: 'butchering',
    at: clock.now(),
    for: receiver,
    of: animal,
    ...(row.edible ? { meatDie: random.int(1, 6) } : {}),
    meatSkill: workers.meat.level,
    furSkill: workers.fur.level,
  };
  const logged: Campaign = { ...valued, log: [...valued.log, entry] };
  const result = butcheringResult(logged, entry);
  return {
    ...logged,
    characters: logged.characters.map((c) => (c.id !== receiver ? c : { ...c, possessions: addGame(addGame(c.possessions, MEAT, result.meat, at), FUR, result.fur, at) })),
  };
}

/** Prüft ein Ausweiden: ein Tier, das es gibt, einmal; ein SC bekommt die Beute; Würfel und Stufen passen. */
export function checkButchering(campaign: Campaign, entry: Butchering, at: number): void {
  const animal = anyCharacterOf(campaign, entry.of);
  if (!animal.animal) throw new DomainError(`${animal.name} ist kein Tier und lässt sich nicht ausweiden.`);
  if (!campaign.characters.some((c) => c.id === entry.for)) throw new DomainError('Die Beute eines Ausweidens bekommt ein SC.');
  if (campaign.log.some((e, i) => i !== at && e.kind === 'butchering' && e.of === entry.of)) throw new DomainError(`${animal.name} ist zweimal ausgeweidet.`);
  if (entry.meatDie !== undefined && (!Number.isInteger(entry.meatDie) || entry.meatDie < 1 || entry.meatDie > 6)) throw new DomainError('Der Fleischwürfel zeigt 1 bis 6.');
  if (!Number.isInteger(entry.meatSkill) || entry.meatSkill < 0 || !Number.isInteger(entry.furSkill) || entry.furSkill < 0) throw new DomainError('Die Stufen beim Ausweiden sind 0 oder mehr.');
}

/** Kann man diesem NSC Beute abnehmen? Er ist tot, bewusstlos oder schwer verwundet, kein Tier und hat etwas. */
export function cannotLoot(campaign: Campaign, npc: CharacterId): string | undefined {
  const character = anyCharacterOf(campaign, npc);
  if (campaign.characters.some((c) => c.id === npc)) return `${character.name} ist kein NSC einer Begegnung.`;
  if (character.animal) return `${character.name} ist ein Tier; Tiere weidet man aus.`;
  const state = woundStateOf(campaign, npc);
  if (!isDead(state) && state !== 'unconscious' && state !== 'serious') return `${character.name} wehrt sich noch.`;
  if (character.possessions.length === 0 && character.credits === 0) return `${character.name} hat nichts mehr bei sich.`;
  return undefined;
}

/**
 * Nimmt einem NSC alles ab, was er hat (Hausregel): Gegenstände und Kredite gehen an einen lebenden
 * SC. Der NSC hat danach keine Waffe und keine Rüstung mehr. Gegenstände, die man nur einmal haben
 * kann und die der SC schon hat, bleiben beim NSC.
 */
export function takeLoot(campaign: Campaign, npc: CharacterId, receiver: CharacterId): Campaign {
  const reason = cannotLoot(campaign, npc);
  if (reason) throw new DomainError(reason);
  const pc = campaign.characters.find((c) => c.id === receiver);
  if (!pc || !livingCharacters(campaign).some((c) => c.id === receiver)) throw new DomainError('Die Beute bekommt ein lebender SC.');
  const from = anyCharacterOf(campaign, npc);
  const keep: Possession[] = [];
  let possessions = pc.possessions;
  for (const p of from.possessions) {
    const item = itemOf(p.of);
    const had = possessions.find((q) => possessionKey(q) === possessionKey(p));
    if (had && item.once) {
      keep.push(p);
      continue;
    }
    possessions = had ? possessions.map((q) => (q === had ? { ...q, count: q.count + p.count } : q)) : [...possessions, p];
  }
  const stripped: Character = Object.fromEntries(Object.entries({ ...from, possessions: keep, credits: 0 }).filter(([key]) => !['primary', 'secondary', 'wields', 'wears'].includes(key))) as unknown as Character;
  const encounters = campaign.encounters.map((e) => ({ ...e, npcs: e.npcs.map((n) => (n.id === npc ? stripped : n)) }));
  return { ...campaign, encounters, characters: campaign.characters.map((c) => (c.id === receiver ? { ...c, possessions, credits: c.credits + from.credits } : c)) };
}

/** Die Überlebensausrüstung, die die Welt verlangt (Charts S. 21), als Gegenstände; der beste Vacc Suit bis zum TL. */
export function survivalGear(atmosphere: number, tl: number): readonly string[] {
  const suits = ref.items.filter((i) => i.id.startsWith('vacc-suit-')).sort((a, b) => (a.tl ?? 0) - (b.tl ?? 0));
  const suit = (suits.filter((i) => (i.tl ?? 0) <= tl).at(-1) ?? suits[0]!).id;
  if (atmosphere <= 1 || atmosphere >= 11) return [suit];
  if (atmosphere === 2) return ['respirator', 'filter-mask'];
  if (atmosphere === 3) return ['respirator'];
  if (TAINTED_GEAR.includes(atmosphere)) return ['filter-mask'];
  if (atmosphere === 10) return ['oxygen-tanks'];
  return [];
}

const TAINTED_GEAR = [4, 7, 9];
