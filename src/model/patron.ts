import { activeSkills, addCharacter, livingCharacters, type Campaign, type Character, type CharacterId } from './campaign';
import { replay } from './career';
import { DomainError } from './errors';
import type { PatronRoll, RumorRoll } from './log';
import type { Clock, Random } from './ports';
import { itemOf, patronOf, rumorOf, type Patron, type Rumor } from './reference';
import { npcName } from './encounter';
import { careerInput, runCareerIn, stateOf } from './generation';

/** Die beiden Patron-Listen der Patron Encounters Matrix (SE, Charts S. 20). */
export const patronLists = [1, 2] as const;
export type PatronList = (typeof patronLists)[number];

/** Ein DM auf einen der beiden Würfel, mit seinem Grund, für die Anzeige. */
export interface PatronDmPart {
  /** 0: erster Würfel (Zehner), 1: zweiter Würfel (Einer). */
  readonly die: 0 | 1;
  readonly label: string;
  readonly dm: number;
}

/**
 * Die DMs auf die Patron Encounters Matrix nach den lebenden SC (SE, Charts S. 20). Ein DM gilt,
 * sobald ein SC ihn erfüllt; mehrere zählen zusammen. Die Laufbahn kommt aus dem Lebenslauf.
 * Liste eins: 1. Würfel Merchant −1, Noble (SOC 11+) +1; 2. Würfel Other −1, Army oder Marines +1.
 * Liste zwei: 1. Würfel Navy −1, Merchant +1; 2. Würfel Streetwise-1+ −1, Admin-1+ +1.
 */
export function patronDmParts(campaign: Campaign, list: PatronList): readonly PatronDmPart[] {
  const pcs = livingCharacters(campaign);
  const services = servicesOf(campaign.characters, pcs);
  const served = (...ids: string[]) => ids.some((id) => services.has(id));
  const skill = (id: string) => pcs.some((c) => activeSkills(c).some((s) => s.of === id && s.level >= 1));
  const parts: (readonly [boolean, 0 | 1, string, number])[] =
    list === 1
      ? [
          [served('merchants'), 0, 'Merchant', -1],
          [pcs.some((c) => c.upp.soc >= 11), 0, 'Noble (SOC 11+)', 1],
          [served('other'), 1, 'Other', -1],
          [served('army', 'marines'), 1, 'Army/Marines', 1],
        ]
      : [
          [served('navy'), 0, 'Navy', -1],
          [served('merchants'), 0, 'Merchant', 1],
          [skill('streetwise'), 1, 'Streetwise', -1],
          [skill('admin'), 1, 'Admin', 1],
        ];
  return parts.filter(([applies]) => applies).map(([, die, label, dm]) => ({ die, label, dm }));
}

// Die Laufbahnen der lebenden SC, je Stand der Charaktere einmal nachgespielt: Der Snapshot fragt bei jeder Änderung.
const servicesCache = new WeakMap<readonly Character[], ReadonlySet<string>>();

function servicesOf(characters: readonly Character[], pcs: readonly Character[]): ReadonlySet<string> {
  const cached = servicesCache.get(characters);
  if (cached) return cached;
  const services = new Set(pcs.flatMap((c) => (c.career === undefined ? [] : [replay(c.career).service?.id ?? ''])));
  servicesCache.set(characters, services);
  return services;
}

/** Die beiden DMs, je Würfel zusammengezählt. */
export function patronDms(campaign: Campaign, list: PatronList): readonly [number, number] {
  const parts = patronDmParts(campaign, list);
  const total = (die: 0 | 1) => parts.filter((p) => p.die === die).reduce((sum, p) => sum + p.dm, 0);
  return [total(0), total(1)];
}

const clamp = (value: number) => Math.min(6, Math.max(1, value));

/** Der Wurf 11–66: jeder Würfel mit seinem DM, auf 1 bis 6 begrenzt; der erste ist die Zehnerstelle. */
export function patronRollOf(entry: PatronRoll): number {
  return clamp(entry.dice[0] + entry.dms[0]) * 10 + clamp(entry.dice[1] + entry.dms[1]);
}

/** `of`: die Zeile der Liste, auf die der Wurf fällt. */
export function patronOfRoll(entry: PatronRoll): Patron {
  return patronOf(entry.list, patronRollOf(entry));
}

/** Würfelt einen Patron auf der gewählten Liste, mit den DMs der lebenden SC; das Ergebnis kommt in den Log. */
export function rollPatron(campaign: Campaign, list: number, random: Random, clock: Clock): PatronRoll {
  if (!patronLists.includes(list as PatronList)) throw new DomainError(`Eine Patron-Liste ${list} gibt es nicht; 1 oder 2.`);
  return { kind: 'patron', at: clock.now(), list: list as PatronList, dice: [random.int(1, 6), random.int(1, 6)], dms: patronDms(campaign, list as PatronList) };
}

/** Der Wurf 11–66 eines Gerüchts: der erste Würfel die Zehner-, der zweite die Einerstelle. */
export function rumorRollOf(entry: RumorRoll): number {
  return entry.dice[0] * 10 + entry.dice[1];
}

/** `/of`: das Gerücht, auf das die Rumors Matrix führt. */
export function rumorOfRoll(entry: RumorRoll): Rumor {
  return rumorOf(rumorRollOf(entry));
}

/** Würfelt ein Gerücht auf der Rumors Matrix (SE, Charts S. 21); das Ergebnis kommt in den Log. */
export function rollRumor(random: Random, clock: Clock): RumorRoll {
  return { kind: 'rumor', at: clock.now(), dice: [random.int(1, 6), random.int(1, 6)] };
}

/** Warum sich zu diesem Patron-Wurf kein NSC erzeugen lässt; `undefined`, wenn es geht. */
export function patronNpcBlocker(campaign: Campaign, entry: PatronRoll): string | undefined {
  if (patronOfRoll(entry).rumor) return 'Ein Gerücht, kein Patron.';
  if (campaign.location === undefined) return 'Erst den Aufenthaltsort wählen.';
  return undefined;
}

/**
 * Erzeugt zum Patron-Wurf an dieser Stelle des Logs einen dauerhaften NSC (siehe domain-model.md,
 * *Patron als NSC*): Die Charaktererschaffung läuft zufällig in der Laufbahn des Patrons durch, der
 * Name kommt von der Tafel NSC. Er hat die Rolle Patron, lebt auf dem Aufenthaltsort und verweist
 * auf seinen Patron; eine Waffe aus der Abmusterung ist seine Primärwaffe und in der Hand.
 */
export function createPatronNpc(campaign: Campaign, index: number, random: Random): { campaign: Campaign; id: CharacterId } {
  const entry = campaign.log[index];
  if (entry?.kind !== 'patron') throw new DomainError('An dieser Stelle des Logs steht kein Patron-Wurf.');
  const blocker = patronNpcBlocker(campaign, entry);
  if (blocker) throw new DomainError(blocker);
  const patron = patronOfRoll(entry);
  const generation = runCareerIn(campaign.hexes, patron.career!, random);
  const input = careerInput(stateOf(generation), npcName(random));
  const weapon = input.possessions?.map((p) => itemOf(p.of).weapon).find((w) => w !== undefined);
  return addCharacter(
    campaign,
    {
      ...input,
      background: `${patron.name} · ${input.background}`,
      npc: true,
      role: 'patron',
      place: campaign.location!,
      patron: { list: entry.list, roll: patronRollOf(entry) },
      ...(weapon === undefined ? {} : { primary: weapon, wields: weapon }),
    },
    generation.career,
  );
}
