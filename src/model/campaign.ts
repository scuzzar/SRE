import type { Career } from './career';
import { DomainError } from './errors';
import type { Generation } from './generation';
import type { LogEntry } from './log';
import { defaultOdds, itemOf, oddsOf, ref, skillOf, type ExampleCharacter } from './reference';

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
}

/** Eine neue Kampagne, ohne Log, mit der Standardstufe und den angegebenen Charakteren. */
export function createCampaign(examples: readonly ExampleCharacter[] = ref.examples, name = 'Kampagne', id: CampaignId = 'k1'): Campaign {
  let campaign: Campaign = { id, name: validName(name), characters: [], odds: defaultOdds.id, log: [] };
  for (const example of examples) campaign = addCharacter(campaign, example).campaign;
  return campaign;
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

export function appendLog(campaign: Campaign, entry: LogEntry): Campaign {
  return { ...campaign, log: [...campaign.log, entry] };
}

/** Löscht einen Logeintrag endgültig; die übrigen behalten ihre Reihenfolge. */
export function removeLogEntry(campaign: Campaign, index: number): Campaign {
  if (!Number.isInteger(index) || index < 0 || index >= campaign.log.length) throw new DomainError('Diesen Logeintrag gibt es nicht.');
  return { ...campaign, log: campaign.log.filter((_, i) => i !== index) };
}

export function characterOf(campaign: Campaign, id: CharacterId): Character {
  const character = campaign.characters.find((c) => c.id === id);
  if (!character) throw new DomainError(`Den Charakter ${id} gibt es nicht`);
  return character;
}

/** Die nicht ausgeblendeten Charaktere, lebend oder tot. */
export function activeCharacters(campaign: Campaign): readonly Character[] {
  return campaign.characters.filter((c) => !c.retired);
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

export function activeSkills(character: Character): readonly SkillLevel[] {
  return character.skills.filter((s) => !s.retired);
}

/** Verweist ein Logeintrag auf den Charakter? Dann wird er nie gelöscht. */
export function isInLog(campaign: Campaign, id: CharacterId): boolean {
  return campaign.log.some((e) => e.kind === 'task' && e.for === id);
}

/** Verweist ein Logeintrag auf die Fertigkeitsstufe? Dann wird sie nie gelöscht. */
export function isSkillLevelInLog(campaign: Campaign, id: CharacterId, skill: string): boolean {
  return campaign.log.some((e) => e.kind === 'task' && e.for === id && e.uses === skill);
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
  const owned = new Set<string>();
  for (const possession of input.possessions ?? []) {
    const item = itemOf(possession.of);
    if (owned.has(possession.of)) throw new DomainError(`${item.name} kommt doppelt vor.`);
    owned.add(possession.of);
    if (!Number.isInteger(possession.count) || possession.count < 1) throw new DomainError(`Die Anzahl von ${item.name} ist 1 oder mehr.`);
    if (item.once && possession.count > 1) throw new DomainError(`${item.name} kann man nur einmal haben.`);
  }
}

function nextId(campaign: Campaign): CharacterId {
  const numbers = campaign.characters.map((c) => Number(c.id.replace(/^c/, ''))).filter(Number.isFinite);
  return `c${Math.max(0, ...numbers) + 1}`;
}

function fields(input: CharacterInput) {
  return {
    name: input.name.trim(),
    background: input.background.trim(),
    equipment: input.equipment.trim(),
    credits: input.credits,
    note: input.note.trim(),
    upp: { ...input.upp },
    possessions: (input.possessions ?? []).map(({ of, count }) => ({ of, count })),
  };
}

/** Legt einen Charakter an; mit `career` hat er einen Lebenslauf aus der Charaktererschaffung. */
export function addCharacter(campaign: Campaign, input: CharacterInput, career?: Career): { campaign: Campaign; id: CharacterId } {
  validateCharacter(input);
  const id = nextId(campaign);
  const character: Character = {
    id,
    ...fields(input),
    dead: input.dead ?? false,
    retired: false,
    skills: input.skills.map((s) => ({ of: s.of, level: s.level, retired: false })),
    ...(career ? { career } : {}),
  };
  return { campaign: { ...campaign, characters: [...campaign.characters, character] }, id };
}

/**
 * Übernimmt die Eingabe. Eine Fertigkeitsstufe, die in der Eingabe fehlt, wird gelöscht, wenn der Log
 * nicht auf sie verweist, sonst ausgeblendet. Kommt eine ausgeblendete Fertigkeit wieder, wird sie
 * wieder eingeblendet.
 */
export function updateCharacter(campaign: Campaign, id: CharacterId, input: CharacterInput): Campaign {
  validateCharacter(input);
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
  const after: Character = {
    ...before,
    ...fields(input),
    possessions: input.possessions === undefined ? before.possessions : fields(input).possessions,
    dead: input.dead ?? before.dead,
    skills: [...kept, ...added],
  };
  return { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? after : c)) };
}

/** Löscht den Charakter, wenn der Log nicht auf ihn verweist; sonst wird er ausgeblendet. */
export function removeCharacter(campaign: Campaign, id: CharacterId): Campaign {
  characterOf(campaign, id);
  if (!isInLog(campaign, id)) return { ...campaign, characters: campaign.characters.filter((c) => c.id !== id) };
  return { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, retired: true } : c)) };
}

/** Blendet einen ausgeblendeten Charakter wieder ein. */
export function restoreCharacter(campaign: Campaign, id: CharacterId): Campaign {
  characterOf(campaign, id);
  return { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, retired: false } : c)) };
}

/** Was eine Eingabe für einen bestehenden Charakter wäre, mit seinen eingeblendeten Fertigkeiten. */
export function inputOf(character: Character): CharacterInput {
  const { name, background, equipment, credits, note, dead, upp, possessions } = character;
  return { name, background, equipment, credits, note, dead, upp, possessions, skills: activeSkills(character).map(({ of, level }) => ({ of, level })) };
}

/** Beginnt oder ersetzt die Charaktererschaffung der Kampagne; `undefined` verwirft sie. */
export function setGeneration(campaign: Campaign, generation: Generation | undefined): Campaign {
  const { id, name, characters, odds, log } = campaign;
  return generation ? { id, name, characters, odds, log, generation } : { id, name, characters, odds, log };
}
