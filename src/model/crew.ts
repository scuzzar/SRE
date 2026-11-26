import { z } from 'zod';
import { activeSkills, type Campaign, type Character, type CharacterId } from './campaign';
import { DomainError } from './errors';
import { shipDesignOf } from './reference';
import type { Ship } from './ship';

// Crew und Programme, Stufe 2b des Raumkampfs (Domänenmodell 2026-11-22d; SR 33 und SE 11,
// zusammengefasst in docs/regeln-schiffe.md unter „Crew“).

/** Eine Schiffsposition (Domänenmodell: `CrewRole`, SR 33). */
export type CrewRole = 'pilot' | 'navigator' | 'engineer' | 'steward' | 'medic' | 'gunner';
export const crewRoles = ['pilot', 'navigator', 'engineer', 'steward', 'medic', 'gunner'] as const;
export const CrewRoleSchema = z.enum(crewRoles);

/** Der Name des Posten, wie die Oberfläche ihn zeigt (SR 33, unverändert englisch). */
export const crewRoleNames: Record<CrewRole, string> = {
  pilot: 'Pilot',
  navigator: 'Navigator',
  engineer: 'Engineer',
  steward: 'Steward',
  medic: 'Medic',
  gunner: 'Gunner',
};

/**
 * Die Mindeststufen aus SR 33 als Hinweis (⚑ die App verbietet nichts). Steward braucht nur
 * Stufe 0, Navigator hat keine Mindeststufe; die stehen hier also nicht.
 */
export const minimumSkill: Partial<Record<CrewRole, number>> = { pilot: 1, engineer: 1, medic: 1, gunner: 1 };

/**
 * Ein Posten auf einem eigenen Schiff (Domänenmodell: `CrewPost`). `turret` ist die Stelle des
 * Turrets in `Ship.turrets`, nur beim Gunner. `who` ist die Id des Charakters, der den Posten hat;
 * fehlt sie, ist der Posten frei.
 */
export interface CrewPost {
  readonly post: CrewRole;
  readonly turret?: number;
  readonly who?: CharacterId;
}

/** Die Stelle eines Posten in `crewOf`; dasselbe Feld, das auch die Detailseite der Oberfläche öffnet. */
export type PostIndex = number;

/** Ein Posten mit dem Schiff, an dem er liegt, und seiner Stelle dort. */
export interface PostAt {
  readonly ship: Ship;
  readonly at: PostIndex;
  readonly post: CrewPost;
}

/**
 * Die Posten, die ein Schiff hat (SR 33, Owner: alle): Pilot, dann je Turret ein Gunner, dann
 * Navigator, Engineer, Steward und Medic. Ein Small Craft hat nur den Piloten.
 */
export function postsOf(ship: Ship): readonly CrewPost[] {
  if (shipDesignOf(ship.design).kind === 'smallCraft') return [{ post: 'pilot' }];
  return [
    { post: 'pilot' },
    ...ship.turrets.map((_, at): CrewPost => ({ post: 'gunner', turret: at })),
    { post: 'navigator' },
    { post: 'engineer' },
    { post: 'steward' },
    { post: 'medic' },
  ];
}

/**
 * Die Posten des Schiffs mit ihren Besetzungen (Domänenmodell: `Ship.crew`). Ein Schiff aus einem
 * Stand von vor 2026-11-22d hat keine: dann ist jeder Posten frei. Die Reihenfolge folgt immer
 * `postsOf`; gebaut wird sie neu, wenn sich die Turrets ändern (`withPostsOf`).
 */
export function crewOf(ship: Ship): readonly CrewPost[] {
  return withPostsOf(ship, ship.crew);
}

/**
 * Die Posten des Schiffs, mit den Besetzungen eines alten Standes, soweit die Posten bleiben.
 * `oldOf` sagt, welcher alte Turret auf jeder neuen Stelle sitzt (nach einem Umbau der
 * Bewaffnung); der ausgebaute Turret lässt seinen Gunner frei.
 */
export function withPostsOf(ship: Ship, crew: readonly CrewPost[] | undefined, oldOf: (at: number) => number = (i) => i): readonly CrewPost[] {
  const posts = postsOf(ship);
  if (crew === undefined) return posts;
  return posts.map((p) => {
    const turret = p.post === 'gunner' ? oldOf(p.turret!) : undefined;
    const held = crew.find((c) => c.post === p.post && c.turret === turret);
    return held === undefined ? p : withWho(p, held.who);
  });
}

/** Jeder Posten mit seiner Stelle, in der Reihenfolge von `crewOf`. */
export function postsAt(ship: Ship): readonly PostAt[] {
  return crewOf(ship).map((post, at) => ({ ship, at, post }));
}

/** Ein Posten mit neuer Besetzung; `who` fehlt, wenn der Posten frei ist (gespeichert wird nur, was es gibt). */
function withWho(p: CrewPost, who?: CharacterId): CrewPost {
  const next: { post: CrewRole; turret?: number; who?: CharacterId } = { post: p.post };
  if (p.turret !== undefined) next.turret = p.turret;
  if (who !== undefined) next.who = who;
  return next;
}

/** Der Charakter auf einem Posten; undefined, wenn der Posten frei ist. Ein Toter und ein
 * ausgeblendeter Charakter verlieren ihre Posten. */
export function holderOf(campaign: Campaign, ship: Ship, at: PostIndex): Character | undefined {
  const who = crewOf(ship)[at]?.who;
  const person = who === undefined ? undefined : campaign.characters.find((c) => c.id === who);
  return person === undefined || person.dead || person.retired ? undefined : person;
}

/** Die Fertigkeit, die auf einem Posten zählt, ohne den Abschlag für zwei Posten (SR 33). */
export function roleSkill(character: Character, role: CrewRole, ship: Ship): number {
  const level = (id: string): number => activeSkills(character).find((s) => s.of === id)?.level ?? 0;
  if (role === 'pilot') {
    // Auf einem Small Craft zählt das bessere von Ship's Boat und Pilot − 1 (SR 33).
    return shipDesignOf(ship.design).kind === 'smallCraft' ? Math.max(level('ships-boat'), level('pilot') - 1) : level('pilot');
  }
  return level({ navigator: 'navigation', engineer: 'engineering', steward: 'steward', medic: 'medical', gunner: 'gunnery' }[role]);
}

/**
 * `/skill`: die Fertigkeit des Charakters auf diesem Posten. Ohne Charakter 0, ohne die
 * Fertigkeit ebenfalls 0 (⚑). Hat der Charakter zwei Posten, zählt sie auf beiden um 1
 * niedriger (SE 11), nie unter 0.
 */
export function postSkill(campaign: Campaign, ship: Ship, at: PostIndex): number {
  const person = holderOf(campaign, ship, at);
  if (person === undefined) return 0;
  const penalty = postsHeldBy(campaign, person.id).length >= 2 ? 1 : 0;
  return Math.max(0, roleSkill(person, crewOf(ship)[at]!.post, ship) - penalty);
}

/** Die Posten, die ein Charakter hat, über alle eigenen Schiffe hinweg. */
export function postsHeldBy(campaign: Campaign, id: CharacterId): readonly PostAt[] {
  return campaign.ships
    .filter((s) => !s.retired)
    .flatMap((ship) => postsAt(ship))
    .filter((p) => holderOf(campaign, p.ship, p.at)?.id === id);
}

/** Wer für einen Posten in Frage kommt: jeder lebende, nicht ausgeblendete Charakter, SC wie NSC. */
export function candidatesFor(campaign: Campaign): readonly Character[] {
  return campaign.characters.filter((c) => !c.dead && !c.retired);
}

function personOf(campaign: Campaign, who: CharacterId): Character {
  const person = campaign.characters.find((c) => c.id === who);
  if (person === undefined || person.dead || person.retired) throw new DomainError('Nur ein lebender, sichtbarer Charakter kann einen Posten haben.');
  return person;
}

function shipOf(campaign: Campaign, id: string): Ship {
  const ship = campaign.ships.find((s) => s.id === id);
  if (ship === undefined) throw new DomainError(`Das Schiff ${id} gibt es nicht.`);
  return ship;
}

function withCrew(campaign: Campaign, ship: Ship, crew: readonly CrewPost[]): Campaign {
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, crew } : s)) };
}

/**
 * Besetzt einen Posten mit einem Charakter, der seinen bisherigen Posten behält (die Detailseite am
 * Posten der Oberfläche): so bekommt ein Charakter über alle eigenen Schiffe hinweg bis zu zwei
 * Posten. `who` fehlt gibt den Posten frei; wer den Posten verliert, wird frei.
 */
export function seat(campaign: Campaign, shipId: string, at: PostIndex, who?: CharacterId): Campaign {
  const target = shipOf(campaign, shipId);
  const posts = crewOf(target);
  if (posts[at] === undefined) throw new DomainError(`Das Schiff hat keinen Posten ${at + 1}.`);
  if (who !== undefined) {
    const person = personOf(campaign, who);
    const held = postsHeldBy(campaign, who);
    if (held.some((p) => p.ship.id === shipId && p.at === at)) return campaign;
    if (held.length >= 2) throw new DomainError(`${person.name} hat schon zwei Posten.`);
  }
  return withCrew(campaign, target, posts.map((p, i): CrewPost => (i === at ? withWho(p, who) : p)));
}

/**
 * Zieht den Charakter von seinem Posten auf einen anderen (ein Zug mit dem Finger in der
 * Oberfläche): auf einem besetzten Posten tauschen beide, sonst wird der alte Posten frei. Über
 * Schiffe hinweg verliert er den Posten am anderen Schiff. Die Zahl seiner Posten ändert sich nie.
 */
export function movePost(campaign: Campaign, from: { ship: string; at: PostIndex }, to: { ship: string; at: PostIndex }): Campaign {
  const source = shipOf(campaign, from.ship);
  const goal = shipOf(campaign, to.ship);
  const posts = crewOf(source);
  const held = posts[from.at];
  if (held === undefined) throw new DomainError(`Das Schiff hat keinen Posten ${from.at + 1}.`);
  if (held.who === undefined) throw new DomainError('Auf diesem Posten steht niemand.');
  const moved = crewOf(goal)[to.at]?.who;
  if (from.ship === to.ship) {
    return withCrew(campaign, source, posts.map((p, i): CrewPost => (i === from.at ? withWho(p, moved) : i === to.at ? withWho(p, held.who) : p)));
  }
  const sourcePosts = posts.map((p, i): CrewPost => (i === from.at ? withWho(p, moved) : p));
  const goalPosts = crewOf(goal).map((p, i): CrewPost => (i === to.at ? withWho(p, held.who) : p));
  return withCrew(withCrew(campaign, source, sourcePosts), goal, goalPosts);
}

/**
 * Prüft die Crew eines geladenen Schiffs: jeder Charakter auf einem Posten existiert, und keiner
 * hat mehr als zwei Posten, über alle Schiffe zusammen. Ein Posten, den das Schiff nicht (mehr)
 * hat – etwa der Gunner eines ausgebauten Turrets – fällt beim Lesen einfach weg.
 */
export function checkCrew(ships: readonly Ship[], characters: readonly Character[], ship: Ship): void {
  if (ship.crew === undefined) return;
  for (const held of ship.crew) {
    if (held.who !== undefined && !characters.some((c) => c.id === held.who)) throw new DomainError(`Der Posten ${held.post} von ${ship.name} verweist auf ${held.who}, den es nicht gibt.`);
  }
  for (const person of characters) {
    const held = ships.filter((s) => !s.retired).reduce((sum, s) => sum + crewOf(s).filter((p) => p.who === person.id).length, 0);
    if (held > 2) throw new DomainError(`${person.name} hat ${held} Posten; es gehen zwei.`);
  }
}

/** Die Stelle des Gunner-Posten eines Turrets, oder −1, wenn es ihn nicht gibt. */
export function gunnerPost(ship: Ship, turret: number): PostIndex {
  return crewOf(ship).findIndex((p) => p.post === 'gunner' && p.turret === turret);
}
