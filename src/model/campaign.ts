import type { AnimalRef } from './animals';
import type { Career } from './career';
import { DomainError } from './errors';
import type { Generation } from './generation';
import { damageRollsOf, interpretationsOf, volleyOf, type LogEntry } from './log';
import { worldOf, type Hex } from './sector';
import type { Booking } from './shop';
import type { Encounter, QuantityDie } from './encounter';
import { defaultOdds, HANDS, itemOf, itemOfWeapon, oddsOf, ref, skillOf, weaponOf, type ExampleCharacter } from './reference';

/** Die sechs Attributwerte, je 0 bis 15. */
export interface Upp {
  readonly str: number;
  readonly dex: number;
  readonly end: number;
  readonly int: number;
  readonly edu: number;
  readonly soc: number;
}

export type CharacterId = string;

/** Die Stufe, die ein Charakter in einer Fertigkeit hat. Eine Fertigkeit kommt je Charakter höchstens einmal vor. */
export interface SkillLevel {
  /** Verweis auf die Fertigkeit. */
  readonly of: string;
  readonly level: number;
  readonly retired: boolean;
}

/** Ein Gegenstand, den ein Charakter besitzt, mit Anzahl. Je Gegenstand höchstens ein Eintrag. */
export interface Possession {
  /** Verweis auf den Gegenstand. */
  readonly of: string;
  readonly count: number;
  /** Bei Schusswaffen: so viele Schuss sind geladen; fehlt das Feld, ist sie voll. */
  readonly rounds?: number;
}

export interface Character {
  readonly id: CharacterId;
  readonly name: string;
  readonly background: string;
  readonly equipment: string;
  readonly credits: number;
  readonly note: string;
  /** In der Geschichte gestorben: bleibt in der Kampagne, ist aber für Proben nicht wählbar. */
  readonly dead: boolean;
  readonly retired: boolean;
  readonly upp: Upp;
  readonly skills: readonly SkillLevel[];
  readonly possessions: readonly Possession[];
  /** Der Lebenslauf, wenn der Charakter über die Charaktererschaffung entstanden ist. */
  readonly career?: Career;
  /** Die Heimatwelt: ein Hexfeld mit fertiger Welt, als Spalte und Zeile (0304). */
  readonly homeworld?: string;
  /** Primär- und Sekundärwaffe: Waffen von Gegenständen aus seinem Besitz, verschieden, nicht die Hände. */
  readonly primary?: string;
  readonly secondary?: string;
  /** Die Waffe in der Hand: Primär- oder Sekundärwaffe; fehlt sie, sind es die Hände. */
  readonly wields?: string;
  /** Die getragene Rüstung: ein Gegenstand mit Rüstungsklasse aus seinem Besitz; fehlt sie, Nothing. */
  readonly wears?: string;
  /** Ein dauerhafter NSC, kein SC: nicht in der Leiste oben, nicht im Shop. */
  readonly npc: boolean;
  /** Ein Tier einer Begegnung: Verweis auf seine Zeile der Tiertabelle. Es kämpft mit deren Werten statt mit UPP und Besitz. */
  readonly animal?: AnimalRef;
}

export type CampaignId = string;

/** Alles, was zu einem Spiel gehört; die oberste Ebene. Kampagnen wissen nichts voneinander. */
export interface Campaign {
  readonly id: CampaignId;
  readonly name: string;
  readonly characters: readonly Character[];
  /** Die eine gewählte Stufe für Orakel und Proben. */
  readonly odds: string;
  /** In der Reihenfolge der Ereignisse. */
  readonly log: readonly LogEntry[];
  /** Die Charaktererschaffung, die gerade läuft; höchstens eine. */
  readonly generation?: Generation;
  /** Die erzeugten Hexfelder des Subsektors; ein Feld, das fehlt, ist nicht erzeugt. */
  readonly hexes: readonly Hex[];
  /**
   * Der Charakter oben im Orakel-Screen; für ihn würfelt man Proben. Lebt und ist nicht ausgeblendet;
   * fehlt nur, wenn es keinen solchen Charakter gibt.
   */
  readonly focus?: CharacterId;
  /** Der Aufenthaltsort der Gruppe: eine fertige Welt des Subsektors, als Spalte und Zeile (0304). */
  readonly location?: string;
  /** Die Buchungen der Gruppenkasse, in der Reihenfolge, in der sie entstanden sind. */
  readonly bookings: readonly Booking[];
  /** Die Begegnungen, die laufende zuletzt; beendete bleiben, wenn der Log auf ihre NSC verweist. Ihre NSC sind Charaktere, die an der Begegnung hängen, nicht hier. */
  readonly encounters: readonly Encounter[];
  /** Der Würfel der Anzahl für kommende Begegnungen: 3, 4 oder 6; fehlt er, W6 nach den Regeln. */
  readonly quantityDie?: QuantityDie;
  /** Das Gelände für alle Begegnungsarten; fehlt es, ±0 und keine Tiere. */
  readonly terrain?: string;
}

/** Was man beim Anlegen und Bearbeiten eines Charakters eingibt. */
export interface CharacterInput {
  readonly name: string;
  readonly background: string;
  readonly equipment: string;
  readonly credits: number;
  readonly note: string;
  /** Fehlt bei den Beispielcharakteren: Sie leben. */
  readonly dead?: boolean;
  readonly upp: Upp;
  readonly skills: readonly { readonly of: string; readonly level: number }[];
  /** Fehlt bei den Beispielcharakteren: Sie besitzen nichts aus der Liste. */
  readonly possessions?: readonly Possession[];
  /** Die Heimatwelt; fehlt, wenn der Charakter keine hat. */
  readonly homeworld?: string;
  /** Primär- und Sekundärwaffe; fehlt der Gegenstand im Besitz, fallen sie weg. */
  readonly primary?: string;
  readonly secondary?: string;
  /** Die Waffe in der Hand; fehlt sie, sind es die Hände. Ist sie weder Primär- noch Sekundärwaffe, gilt die Primärwaffe. */
  readonly wields?: string;
  /** Die getragene Rüstung; fehlt sie, Nothing. Fehlt der Gegenstand im Besitz, fällt sie weg. */
  readonly wears?: string;
  /** Fehlt: ein SC. */
  readonly npc?: boolean;
}

/** Eine neue Kampagne, ohne Log, mit der Standardstufe und den angegebenen Charakteren. */
export function createCampaign(examples: readonly ExampleCharacter[] = ref.examples, name = 'Kampagne', id: CampaignId = 'k1'): Campaign {
  let campaign: Campaign = { id, name: validName(name), characters: [], odds: defaultOdds.id, log: [], hexes: [], bookings: [], encounters: [] };
  for (const { primary, wears, ...example } of examples) campaign = addCharacter(campaign, { ...example, ...(primary === undefined ? {} : { primary }), ...(wears === undefined ? {} : { wears }) }).campaign;
  // Bei mehreren Beispielen steht der erste oben, nicht der zuletzt angelegte.
  return withFocus(campaign, livingCharacters(campaign)[0]?.id);
}

/** Eine Id für eine weitere Kampagne. Ids gelten nur auf dem Gerät; eine Kampagnendatei hat keine. */
export function nextCampaignId(campaigns: readonly Campaign[]): CampaignId {
  const numbers = campaigns.map((c) => Number(c.id.replace(/^k/, ''))).filter(Number.isFinite);
  return `k${Math.max(0, ...numbers) + 1}`;
}

/** Löscht eine Kampagne mit allem, was an ihr hängt. Die letzte lässt sich nicht löschen. */
export function removeCampaign(campaigns: readonly Campaign[], id: CampaignId): readonly Campaign[] {
  if (!campaigns.some((c) => c.id === id)) throw new DomainError(`Die Kampagne ${id} gibt es nicht`);
  if (campaigns.length === 1) throw new DomainError('Die letzte Kampagne lässt sich nicht löschen. Lege erst eine neue an.');
  return campaigns.filter((c) => c.id !== id);
}

/** Die Kampagnen nach Namen, für die Auswahl. */
export function byName(campaigns: readonly Campaign[]): readonly Campaign[] {
  return [...campaigns].sort((a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id));
}

/** Der Name einer Kampagne ist nicht leer. */
export function validName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('Die Kampagne braucht einen Namen.');
  return trimmed;
}

export function renameCampaign(campaign: Campaign, name: string): Campaign {
  return { ...campaign, name: validName(name) };
}

export function setOdds(campaign: Campaign, oddsId: string): Campaign {
  return { ...campaign, odds: oddsOf(oddsId).id };
}

export function appendLog(campaign: Campaign, ...entries: readonly LogEntry[]): Campaign {
  return { ...campaign, log: [...campaign.log, ...entries] };
}

/**
 * Löscht einen Logeintrag endgültig, ein Ergebnis mit seinen Deutungen, ein Angriff auch mit seinem
 * Schadenswurf und mit der ganzen Garbe, zu der er gehört; die übrigen behalten ihre Reihenfolge, und Deutungen und Schadenswürfe verweisen
 * weiter auf ihr Ergebnis.
 */
export function removeLogEntry(campaign: Campaign, index: number): Campaign {
  if (!Number.isInteger(index) || index < 0 || index >= campaign.log.length) throw new DomainError('Diesen Logeintrag gibt es nicht.');
  // Ein Wurf einer Garbe geht nur mit der ganzen Garbe.
  const roots = campaign.log[index]!.kind === 'attack' ? volleyOf(campaign.log, index) : [index];
  const damage = roots.flatMap((r) => damageRollsOf(campaign.log, r));
  const removed = new Set([...roots, ...roots.flatMap((r) => interpretationsOf(campaign.log, r)), ...damage, ...damage.flatMap((d) => interpretationsOf(campaign.log, d))]);
  const shift = (i: number) => i - [...removed].filter((r) => r < i).length;
  const log = campaign.log.flatMap((entry, i): LogEntry[] => {
    if (removed.has(i)) return [];
    if (entry.kind === 'note' && entry.interprets !== undefined) return [{ ...entry, interprets: shift(entry.interprets) }];
    if (entry.kind === 'attack' && entry.volley !== undefined) return [{ ...entry, volley: shift(entry.volley) }];
    return entry.kind === 'damage' ? [{ ...entry, of: shift(entry.of) }] : [entry];
  });
  return { ...campaign, log };
}

export function characterOf(campaign: Campaign, id: CharacterId): Character {
  const character = campaign.characters.find((c) => c.id === id);
  if (!character) throw new DomainError(`Den Charakter ${id} gibt es nicht`);
  return character;
}

/**
 * Ein Charakter der Kampagne oder ein NSC einer ihrer Begegnungen: Jeder Charakter gehört genau
 * einer Kampagne oder genau einer Begegnung.
 */
export function anyCharacterOf(campaign: Campaign, id: CharacterId): Character {
  const character = campaign.characters.find((c) => c.id === id) ?? campaign.encounters.flatMap((e) => e.npcs).find((n) => n.id === id);
  if (!character) throw new DomainError(`Den Charakter ${id} gibt es nicht`);
  return character;
}

/** Gehört der Charakter zur Kampagne (SC oder dauerhafter NSC), nicht zu einer Begegnung? */
export function isCampaignCharacter(campaign: Campaign, id: CharacterId): boolean {
  return campaign.characters.some((c) => c.id === id);
}

/** Ersetzt einen Charakter dort, wo er hängt: in der Kampagne oder in seiner Begegnung. */
export function replaceCharacter(campaign: Campaign, character: Character): Campaign {
  if (isCampaignCharacter(campaign, character.id)) return { ...campaign, characters: campaign.characters.map((c) => (c.id === character.id ? character : c)) };
  anyCharacterOf(campaign, character.id);
  return {
    ...campaign,
    encounters: campaign.encounters.map((e) => (e.npcs.some((n) => n.id === character.id) ? { ...e, npcs: e.npcs.map((n) => (n.id === character.id ? character : n)) } : e)),
  };
}

/** Hängt einen Charakter in die Kampagne; lebt er und ist ein SC, steht er oben. */
export function adoptCharacter(campaign: Campaign, character: Character): Campaign {
  if (isCampaignCharacter(campaign, character.id)) throw new DomainError(`${character.name} gehört schon zur Kampagne.`);
  const added = { ...campaign, characters: [...campaign.characters, character] };
  return canFocus(character) ? withFocus(added, character.id) : keepFocus(campaign, added);
}

/** Die nicht ausgeblendeten SC, lebend oder tot; dauerhafte NSC zählen nicht dazu. */
export function activeCharacters(campaign: Campaign): readonly Character[] {
  return campaign.characters.filter((c) => !c.retired && !c.npc);
}

/** Die dauerhaften NSC, die nicht ausgeblendet sind; sie stehen im Charakter-Screen unter „NSC“. */
export function npcCharacters(campaign: Campaign): readonly Character[] {
  return campaign.characters.filter((c) => !c.retired && c.npc);
}

/** Die Lebenden: Nur sie lassen sich für Proben wählen. */
export function livingCharacters(campaign: Campaign): readonly Character[] {
  return activeCharacters(campaign).filter((c) => !c.dead);
}

/** Die Toten, die nicht ausgeblendet sind; sie stehen unter „Verstorben“. */
export function deadCharacters(campaign: Campaign): readonly Character[] {
  return activeCharacters(campaign).filter((c) => c.dead);
}

export function retiredCharacters(campaign: Campaign): readonly Character[] {
  return campaign.characters.filter((c) => c.retired);
}

/** Kann der Charakter oben stehen? Nur wer lebt und nicht ausgeblendet ist. */
function canFocus(character: Character | undefined): character is Character {
  return character !== undefined && !character.dead && !character.retired && !character.npc;
}

/** Setzt den Charakter oben, oder keinen. */
function withFocus(campaign: Campaign, focus: CharacterId | undefined): Campaign {
  const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'focus')) as Omit<Campaign, 'focus'>;
  return focus === undefined ? rest : { ...rest, focus };
}

/** Der Charakter oben, oder keiner, wenn es keinen Lebenden gibt, der nicht ausgeblendet ist. */
export function focusOf(campaign: Campaign): Character | undefined {
  const focus = campaign.characters.find((c) => c.id === campaign.focus);
  return canFocus(focus) ? focus : livingCharacters(campaign)[0];
}

/** Wischen: Ein anderer Charakter steht oben. Nur wer lebt und nicht ausgeblendet ist. */
export function setFocus(campaign: Campaign, id: CharacterId): Campaign {
  const character = characterOf(campaign, id);
  if (character.retired) throw new DomainError(`${character.name} ist ausgeblendet.`);
  if (character.dead) throw new DomainError(`${character.name} ist tot.`);
  return withFocus(campaign, id);
}

/**
 * Hält die Regel für den Charakter oben, nachdem sich die Charaktere geändert haben: Ist er noch da
 * und lebt, bleibt er. Sonst rückt der nächste Lebende nach, hinter dem letzten der vorige. Gab es
 * keinen, wird es der erste Lebende (auch für Kampagnen von vor dieser Regel).
 */
export function keepFocus(before: Campaign, after: Campaign): Campaign {
  const current = after.characters.find((c) => c.id === after.focus);
  if (canFocus(current)) return after;
  const living = livingCharacters(after);
  const at = before.characters.findIndex((c) => c.id === before.focus);
  if (at < 0) return withFocus(after, living[0]?.id);
  const ids = new Set(living.map((c) => c.id));
  const next = before.characters.slice(at + 1).find((c) => ids.has(c.id)) ?? [...before.characters.slice(0, at)].reverse().find((c) => ids.has(c.id));
  return withFocus(after, next?.id ?? living[0]?.id);
}

export function activeSkills(character: Character): readonly SkillLevel[] {
  return character.skills.filter((s) => !s.retired);
}

/**
 * Verweist der Verlauf auf den Charakter: ein Logeintrag oder eine Buchung der Gruppenkasse? Dann
 * wird er nie gelöscht, nur ausgeblendet.
 */
export function isInLog(campaign: Campaign, id: CharacterId): boolean {
  if (campaign.bookings.some((b) => b.for === id)) return true;
  return campaign.log.some(
    (e) => (e.kind === 'task' && e.for === id) || (e.kind === 'attack' && (e.for === id || e.against === id)) || (e.kind === 'recovery' && (e.for === id || e.by === id)),
  );
}

/** Verweist ein Logeintrag auf die Fertigkeitsstufe? Dann wird sie nie gelöscht. */
export function isSkillLevelInLog(campaign: Campaign, id: CharacterId, skill: string): boolean {
  return campaign.log.some((e) => (e.kind === 'task' || e.kind === 'attack') && e.for === id && e.uses === skill);
}

/** Die Waffen, die ein Charakter führen kann: die Hände und die Waffen aus seinem Besitz, in dessen Reihenfolge. */
export function weaponsOf(character: { readonly possessions?: readonly Possession[] }): readonly string[] {
  return [HANDS, ...(character.possessions ?? []).flatMap((p) => itemOf(p.of).weapon ?? [])];
}

/** Die Waffenfelder eines Charakters. */
interface Arms {
  readonly possessions?: readonly Possession[];
  readonly primary?: string;
  readonly secondary?: string;
  readonly wields?: string;
}

/**
 * Primär-, Sekundärwaffe und Waffe in der Hand, bereinigt: Primär- und Sekundärwaffe nur, wenn der
 * Gegenstand im Besitz ist, und verschieden. Die Waffe in der Hand ist eine der beiden oder die
 * Hände (kein Feld); war sie eine andere Waffe, nimmt er die Primärwaffe, ohne sie die Hände.
 */
function armsOf(input: Arms): { primary?: string; secondary?: string; wields?: string } {
  const owned = weaponsOf(input).filter((w) => w !== HANDS);
  const primary = input.primary !== undefined && owned.includes(input.primary) ? input.primary : undefined;
  const secondary = input.secondary !== undefined && input.secondary !== primary && owned.includes(input.secondary) ? input.secondary : undefined;
  const wanted = input.wields === HANDS ? undefined : input.wields;
  const wields = wanted === undefined ? undefined : wanted === primary || wanted === secondary ? wanted : primary;
  return { ...(primary === undefined ? {} : { primary }), ...(secondary === undefined ? {} : { secondary }), ...(wields === undefined ? {} : { wields }) };
}

/** Der Charakter mit bereinigten Waffenfeldern (siehe `armsOf`), etwa nachdem sich sein Besitz geändert hat. */
export function withArms<T extends Arms>(character: T): T {
  const rest = Object.fromEntries(Object.entries(character).filter(([key]) => key !== 'primary' && key !== 'secondary' && key !== 'wields')) as T;
  return { ...rest, ...armsOf(character) };
}

/** Die Waffen, zwischen denen ein Charakter im Kampf wechselt: Primärwaffe, Sekundärwaffe und die Hände. */
export function armedWeaponsOf(character: Character): readonly string[] {
  return [...(character.primary === undefined ? [] : [character.primary]), ...(character.secondary === undefined ? [] : [character.secondary]), HANDS];
}

/** Was ein Charakter tragen kann: die Gegenstände mit Rüstungsklasse aus seinem Besitz, in dessen Reihenfolge. */
export function armorsOf(character: { readonly possessions?: readonly Possession[] }): readonly string[] {
  return (character.possessions ?? []).flatMap((p) => (itemOf(p.of).armor === undefined ? [] : [p.of]));
}

/** Die getragene Rüstung, nur wenn sie im Besitz ist; sonst Nothing (kein Feld). */
function wearsOf(input: CharacterInput): { wears?: string } {
  return input.wears !== undefined && armorsOf(input).includes(input.wears) ? { wears: input.wears } : {};
}

/** Zieht eine Rüstung aus dem Besitz an; `undefined` heißt: keine (Nothing). */
export function setWears(campaign: Campaign, id: CharacterId, item: string | undefined): Campaign {
  const character = anyCharacterOf(campaign, id);
  if (item !== undefined && !armorsOf(character).includes(item)) throw new DomainError(`${character.name} hat kein ${itemOf(item).name} zum Anziehen.`);
  const rest = Object.fromEntries(Object.entries(character).filter(([key]) => key !== 'wears')) as Omit<Character, 'wears'>;
  const after: Character = item === undefined ? rest : { ...rest, wears: item };
  return replaceCharacter(campaign, after);
}

/** Wechselt die Waffe in der Hand: Primärwaffe, Sekundärwaffe oder die Hände. */
export function setWields(campaign: Campaign, id: CharacterId, weapon: string): Campaign {
  const character = anyCharacterOf(campaign, id);
  const name = weaponOf(weapon).name;
  if (!weaponsOf(character).includes(weapon)) throw new DomainError(`${character.name} hat kein${itemOfWeapon(weapon) ? 'e' : ''} ${name}.`);
  if (!armedWeaponsOf(character).includes(weapon)) throw new DomainError(`${name} ist weder Primär- noch Sekundärwaffe von ${character.name}; das legt man im Editor fest.`);
  const rest = Object.fromEntries(Object.entries(character).filter(([key]) => key !== 'wields')) as Omit<Character, 'wields'>;
  const after: Character = weapon === HANDS ? rest : { ...rest, wields: weapon };
  return replaceCharacter(campaign, after);
}

export function validateCharacter(input: CharacterInput): void {
  if (!input.name.trim()) throw new DomainError('Der Charakter braucht einen Namen.');
  for (const [key, value] of Object.entries(input.upp)) {
    if (!Number.isInteger(value) || value < 0 || value > 15) {
      throw new DomainError(`Attributwerte liegen zwischen 0 und 15 (${key.toUpperCase()}: ${value}).`);
    }
  }
  if (!Number.isInteger(input.credits)) throw new DomainError('Credits sind eine ganze Zahl.');
  const seen = new Set<string>();
  for (const skill of input.skills) {
    const name = skillOf(skill.of).name;
    if (seen.has(skill.of)) throw new DomainError(`${name} kommt doppelt vor.`);
    seen.add(skill.of);
    if (!Number.isInteger(skill.level) || skill.level < 0) throw new DomainError(`Die Stufe von ${name} ist 0 oder mehr.`);
  }
  for (const weapon of [input.primary, input.secondary, input.wields]) if (weapon !== undefined) weaponOf(weapon);
  if (input.wears !== undefined && itemOf(input.wears).armor === undefined) throw new DomainError(`${itemOf(input.wears).name} ist keine Rüstung.`);
  const owned = new Set<string>();
  for (const possession of input.possessions ?? []) {
    const item = itemOf(possession.of);
    if (owned.has(possession.of)) throw new DomainError(`${item.name} kommt doppelt vor.`);
    owned.add(possession.of);
    if (!Number.isInteger(possession.count) || possession.count < 1) throw new DomainError(`Die Anzahl von ${item.name} ist 1 oder mehr.`);
    if (item.once && possession.count > 1) throw new DomainError(`${item.name} kann man nur einmal haben.`);
    const capacity = item.weapon === undefined ? undefined : weaponOf(item.weapon).rounds;
    if (possession.rounds !== undefined && (capacity === undefined || !Number.isInteger(possession.rounds) || possession.rounds < 0 || possession.rounds > capacity)) {
      throw new DomainError(`${item.name} hat ${capacity === undefined ? 'kein Magazin' : `0 bis ${capacity} Schuss`}.`);
    }
  }
}

function nextId(campaign: Campaign): CharacterId {
  const numbers = campaign.characters.map((c) => Number(c.id.replace(/^c/, ''))).filter(Number.isFinite);
  return `c${Math.max(0, ...numbers) + 1}`;
}

/** Die Heimatwelt muss eine fertige Welt des Subsektors sein. */
function checkHomeworld(campaign: Campaign, input: CharacterInput): void {
  if (input.homeworld !== undefined) worldOf(campaign.hexes, input.homeworld);
}

function fields(input: CharacterInput) {
  return {
    name: input.name.trim(),
    background: input.background.trim(),
    equipment: input.equipment.trim(),
    credits: input.credits,
    note: input.note.trim(),
    upp: { ...input.upp },
    possessions: (input.possessions ?? []).map(({ of, count, rounds }) => (rounds === undefined ? { of, count } : { of, count, rounds })),
  };
}

/** Legt einen Charakter an; mit `career` hat er einen Lebenslauf aus der Charaktererschaffung. */
export function addCharacter(campaign: Campaign, input: CharacterInput, career?: Career): { campaign: Campaign; id: CharacterId } {
  validateCharacter(input);
  checkHomeworld(campaign, input);
  const id = nextId(campaign);
  const character: Character = {
    id,
    ...fields(input),
    dead: input.dead ?? false,
    retired: false,
    npc: input.npc ?? false,
    skills: input.skills.map((s) => ({ of: s.of, level: s.level, retired: false })),
    ...(career ? { career } : {}),
    ...(input.homeworld === undefined ? {} : { homeworld: input.homeworld }),
    ...armsOf(input),
    ...wearsOf(input),
  };
  const added = { ...campaign, characters: [...campaign.characters, character] };
  // Ein neuer Charakter steht oben, wenn er lebt.
  return { campaign: canFocus(character) ? withFocus(added, id) : keepFocus(campaign, added), id };
}

/**
 * Übernimmt die Eingabe. Eine Fertigkeitsstufe, die in der Eingabe fehlt, wird gelöscht, wenn der Log
 * nicht auf sie verweist, sonst ausgeblendet. Kommt eine ausgeblendete Fertigkeit wieder, wird sie
 * wieder eingeblendet.
 */
export function updateCharacter(campaign: Campaign, id: CharacterId, input: CharacterInput): Campaign {
  validateCharacter(input);
  checkHomeworld(campaign, input);
  const before = characterOf(campaign, id);
  const wanted = new Map(input.skills.map((s) => [s.of, s.level]));
  const kept: SkillLevel[] = [];
  for (const skill of before.skills) {
    const level = wanted.get(skill.of);
    if (level !== undefined) kept.push({ of: skill.of, level, retired: false });
    else if (isSkillLevelInLog(campaign, id, skill.of)) kept.push({ ...skill, retired: true });
  }
  const known = new Set(before.skills.map((s) => s.of));
  const added = input.skills.filter((s) => !known.has(s.of)).map((s) => ({ of: s.of, level: s.level, retired: false }));
  // Die Eingabe sagt, welche Heimatwelt gilt; fehlt sie, hat der Charakter keine.
  // Ebenso Primär-, Sekundärwaffe und Waffe in der Hand; fehlt ihr Gegenstand im Besitz, fallen sie weg.
  const rest = Object.fromEntries(Object.entries(before).filter(([key]) => !['homeworld', 'primary', 'secondary', 'wields', 'wears'].includes(key))) as Omit<
    Character,
    'homeworld' | 'primary' | 'secondary' | 'wields' | 'wears'
  >;
  // Was eine Schusswaffe geladen hat, bleibt, wenn die Eingabe nichts dazu sagt.
  const loaded = new Map(before.possessions.flatMap((p) => (p.rounds === undefined ? [] : [[p.of, p.rounds] as const])));
  const possessions =
    input.possessions === undefined ? before.possessions : fields(input).possessions.map((p) => (p.rounds !== undefined || !loaded.has(p.of) ? p : { ...p, rounds: loaded.get(p.of)! }));
  const after: Character = {
    ...rest,
    ...fields(input),
    possessions,
    dead: input.dead ?? before.dead,
    npc: input.npc ?? before.npc,
    skills: [...kept, ...added],
    ...(input.homeworld === undefined ? {} : { homeworld: input.homeworld }),
    ...armsOf({ ...input, possessions }),
    ...wearsOf({ ...input, possessions }),
  };
  return keepFocus(campaign, { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? after : c)) });
}

/** Löscht den Charakter, wenn der Log nicht auf ihn verweist; sonst wird er ausgeblendet. */
export function removeCharacter(campaign: Campaign, id: CharacterId): Campaign {
  characterOf(campaign, id);
  if (!isInLog(campaign, id)) return keepFocus(campaign, { ...campaign, characters: campaign.characters.filter((c) => c.id !== id), encounters: campaign.encounters.map((e) => withoutFighter(e, id)) });
  return keepFocus(campaign, { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, retired: true } : c)) });
}

/** Eine Begegnung ohne die Entfernung und das Ausweichen eines gelöschten Charakters. */
function withoutFighter(encounter: Encounter, id: CharacterId): Encounter {
  if (!encounter.distances?.some((d) => d.of === id) && !encounter.evading?.includes(id)) return encounter;
  const evading = encounter.evading?.filter((e) => e !== id);
  const rest = Object.fromEntries(Object.entries(encounter).filter(([key]) => key !== 'evading')) as unknown as Encounter;
  return { ...rest, ...(encounter.distances ? { distances: encounter.distances.filter((d) => d.of !== id) } : {}), ...(evading && evading.length > 0 ? { evading } : {}) };
}

/** Blendet einen ausgeblendeten Charakter wieder ein. */
export function restoreCharacter(campaign: Campaign, id: CharacterId): Campaign {
  characterOf(campaign, id);
  return keepFocus(campaign, { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, retired: false } : c)) });
}

/** Was eine Eingabe für einen bestehenden Charakter wäre, mit seinen eingeblendeten Fertigkeiten. */
export function inputOf(character: Character): CharacterInput {
  const { name, background, equipment, credits, note, dead, npc, upp, possessions, homeworld, primary, secondary, wields, wears } = character;
  const input = { name, background, equipment, credits, note, dead, npc, upp, possessions, skills: activeSkills(character).map(({ of, level }) => ({ of, level })) };
  return {
    ...input,
    ...(homeworld === undefined ? {} : { homeworld }),
    ...(primary === undefined ? {} : { primary }),
    ...(secondary === undefined ? {} : { secondary }),
    ...(wields === undefined ? {} : { wields }),
    ...(wears === undefined ? {} : { wears }),
  };
}

/** Beginnt oder ersetzt die Charaktererschaffung der Kampagne; `undefined` verwirft sie. */
export function setGeneration(campaign: Campaign, generation: Generation | undefined): Campaign {
  const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'generation')) as Omit<Campaign, 'generation'>;
  return generation ? { ...rest, generation } : rest;
}

/** Ersetzt die Hexfelder des Subsektors. */
export function setHexes(campaign: Campaign, hexes: readonly Hex[]): Campaign {
  return { ...campaign, hexes };
}
