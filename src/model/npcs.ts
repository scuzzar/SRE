import { addCharacter, npcCharacters, npcRoles, roleOf, type Campaign, type Character, type CharacterId, type CharacterInput, type NpcRole, type PatronRef, type Possession } from './campaign';
import { npcName } from './encounter';
import { DomainError } from './errors';
import { careerInput, runCareerIn, stateOf, type Generation } from './generation';
import { checkPlace, moveNpc, type Place } from './place';
import type { Random } from './ports';
import { itemOf, itemOfWeapon, ref, serviceOf, type Weapon } from './reference';
import { worldOf, worldById, type World } from './sector';

/** Die NSC einer Rolle, nach Namen. */
export interface NpcRoleGroup {
  readonly role: NpcRole;
  readonly npcs: readonly Character[];
}

/** Die NSC einer Welt (`place` fehlt: ohne Ort), nach Rolle gruppiert. */
export interface NpcWorldGroup {
  readonly place: string | undefined;
  readonly name: string | undefined;
  readonly roles: readonly NpcRoleGroup[];
}

const byName = (a: Character, b: Character) => a.name.localeCompare(b.name, 'de');

/** Nach Rolle gruppiert, in der Reihenfolge der Rollen, leere weggelassen; in jeder Gruppe nach Namen. */
export function byRole(npcs: readonly Character[]): readonly NpcRoleGroup[] {
  return npcRoles.flatMap((role) => {
    const of = npcs.filter((n) => roleOf(n) === role).sort(byName);
    return of.length === 0 ? [] : [{ role, npcs: of }];
  });
}

/**
 * Die lebenden dauerhaften NSC für die NSC-Liste (siehe domain-model.md, *NSC-Liste*). Vorgegeben
 * die des Aufenthaltsorts und die ohne Ort, als eine Gruppe nach Rolle. Mit `all`, oder ohne
 * Aufenthaltsort, alle: nach Welt (nach Namen der Welt, ohne Ort am Ende), darin nach Rolle.
 */
export function npcGroups(campaign: Campaign, all: boolean): readonly NpcWorldGroup[] {
  const living = npcCharacters(campaign).filter((n) => !n.dead);
  const here = campaign.location?.world;
  if (!all && here !== undefined) {
    const roles = byRole(living.filter((n) => n.place === undefined || n.place.world === here));
    return roles.length === 0 ? [] : [{ place: here, name: worldById(campaign.hexes, here)?.name, roles }];
  }
  const places = [...new Set(living.flatMap((n) => (n.place === undefined ? [] : [n.place.world])))];
  const worlds = places
    .map((place) => ({ place, name: worldById(campaign.hexes, place)?.name ?? place }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map(({ place, name }) => ({ place, name, roles: byRole(living.filter((n) => n.place?.world === place)) }));
  const nowhere = byRole(living.filter((n) => n.place === undefined));
  return [...worlds, ...(nowhere.length === 0 ? [] : [{ place: undefined, name: undefined, roles: nowhere }])];
}

/** Die toten dauerhaften NSC, nach Namen; sie stehen eingeklappt unter den Lebenden. */
export function deadNpcs(campaign: Campaign): readonly Character[] {
  return npcCharacters(campaign).filter((n) => n.dead).sort(byName);
}

/** Was einen erzeugten NSC ausmacht, bevor die Erschaffung läuft. */
export interface NpcTemplate {
  readonly service: string;
  readonly role: NpcRole;
  /** Der Patron, als der er entsteht; fehlt beim NSC aus einer Laufbahn. */
  readonly patron?: PatronRef;
  /** Steht vor der Herkunft, z. B. der Beruf des Patrons. */
  readonly title?: string;
  /** Ein verbrecherischer Patron-Beruf (`Patron.criminal`). */
  readonly criminal?: boolean;
  /** Das **Dienstalter** (2026-11-24f): so viele Terms der Lauf würfeln soll; leer = so lange er kann. */
  readonly termsGoal?: number;
}

/** Warum sich kein NSC erzeugen lässt; `undefined`, wenn es geht. */
export function generateNpcBlocker(campaign: Campaign): string | undefined {
  return campaign.location?.world === undefined ? 'Erst den Aufenthaltsort wählen.' : undefined;
}

/**
 * Ein erzeugter NSC (siehe domain-model.md, *Patron als NSC*, *NSC aus einer Laufbahn*): Die
 * Charaktererschaffung läuft zufällig in der Laufbahn durch, der Name kommt von der Tafel NSC, er
 * lebt auf dem Aufenthaltsort und bekommt eine Waffe nach *Waffen erzeugter NSC*. Mit `at` (langes
 * Drücken auf „NSC platzieren“ am Feld) lebt er stattdessen dort, auf dem Feld bzw. in der Stadt, und
 * bewaffnet sich nach dem Gesetz dieser Welt.
 */
export function generateNpc(campaign: Campaign, template: NpcTemplate, random: Random, at?: Place): { campaign: Campaign; id: CharacterId } {
  checkNpcRun(campaign, template, at);
  return addNpc(campaign, template, runCareerIn(campaign.hexes, template.service, random, template.termsGoal), random, at);
}

/** Prüft Ort und Laufbahn des Erzeugens; wirft die Meldung, die der Oberfläche dann gezeigt wird. */
export function checkNpcRun(campaign: Campaign, template: NpcTemplate, at?: Place): void {
  const blocker = at === undefined ? generateNpcBlocker(campaign) : undefined;
  if (blocker) throw new DomainError(blocker);
  serviceOf(template.service);
  if (at) checkPlace(campaign.hexes, at);
}

/**
 * Nimmt den NSC zu einem Lauf, der schon gewürfelt ist (2026-11-24g): So lässt die Oberfläche den
 * Lauf stückweise laufen und zeigt, was er verworfen hat, bevor sie diesen Charakter anlegt.
 */
export function addNpc(campaign: Campaign, template: NpcTemplate, generation: Generation, random: Random, at?: Place): { campaign: Campaign; id: CharacterId } {
  checkNpcRun(campaign, template, at);
  const place = at?.world ?? campaign.location!.world;
  const input = careerInput(stateOf(generation), npcName(random));
  const criminal = template.criminal === true || template.role === 'enemy';
  const armed = armGenerated(input, worldOf(campaign.hexes, place), criminal, random);
  const added = addCharacter(
    campaign,
    {
      ...armed,
      background: template.title === undefined ? input.background : `${template.title} · ${input.background}`,
      npc: true,
      role: template.role,
      place,
      ...(template.patron ? { patron: template.patron } : {}),
    },
    generation.career,
  );
  return at ? { campaign: moveNpc(added.campaign, added.id, at), id: added.id } : added;
}

/** So viele Magazine bekommt ein erzeugter NSC zu seiner Schusswaffe: 1W4, wie die NSC der Begegnung. */
const MAGAZINE_DIE = 4;

/** Ab diesem Wurf (1W6 + DMs) gilt das Gesetz für einen erzeugten NSC nicht. */
const IGNORE_LAW_TARGET = 6;

/**
 * Die Waffen, die ein erzeugter NSC bekommen kann: mit Mindest-SOC bis zu seinem SOC, mit TL bis
 * zum TL seiner Welt, und vom Gesetz seiner Welt nicht verboten, außer es gilt für ihn nicht.
 */
export function allowedWeapons(soc: number, world: World, ignoreLaw: boolean): readonly Weapon[] {
  const tech = world.uwp.tech ?? 0;
  const law = world.uwp.law ?? 0;
  return ref.weapons.filter((w) => {
    const item = itemOfWeapon(w.id);
    return w.minSoc !== undefined && item !== undefined && soc >= w.minSoc && (item.tl ?? 0) <= tech && (ignoreLaw || w.law === undefined || law < w.law);
  });
}

/**
 * Die Waffe eines erzeugten NSC (siehe domain-model.md, *Waffen erzeugter NSC*): erst der Wurf, ob
 * das Gesetz für ihn gilt (1W6, +2 mit Streetwise, +2 verbrecherisch, 6+), dann die Waffe seiner
 * höchsten Waffenfertigkeit, die erlaubt ist, sonst die teuerste erlaubte der höchsten SOC-Stufe.
 * Sie kommt mit 1W4 Magazinen in seinen Besitz und ist Primärwaffe und in der Hand.
 */
export function armGenerated(input: CharacterInput, world: World, criminal: boolean, random: Random): CharacterInput {
  const streetwise = input.skills.some((s) => s.of === 'streetwise');
  const ignoreLaw = random.int(1, 6) + (streetwise ? 2 : 0) + (criminal ? 2 : 0) >= IGNORE_LAW_TARGET;
  const allowed = allowedWeapons(input.upp.soc, world, ignoreLaw);
  if (allowed.length === 0) return input;
  const bySkill = [...input.skills].sort((a, b) => b.level - a.level).flatMap((s) => allowed.filter((w) => w.uses === s.of));
  const price = (w: Weapon) => itemOfWeapon(w.id)?.price ?? 0;
  const weapon = bySkill[0] ?? [...allowed].sort((a, b) => b.minSoc! - a.minSoc! || price(b) - price(a))[0]!;
  const item = itemOfWeapon(weapon.id)!;
  let possessions: readonly Possession[] = input.possessions ?? [];
  const add = (of: string, count: number) => {
    possessions = possessions.some((p) => p.of === of) ? possessions.map((p) => (p.of === of ? { ...p, count: itemOf(of).once ? 1 : p.count + count } : p)) : [...possessions, { of, count }];
  };
  if (!possessions.some((p) => p.of === item.id)) add(item.id, 1);
  if (weapon.ammo !== undefined) add(weapon.ammo, random.int(1, MAGAZINE_DIE));
  return { ...input, possessions, primary: weapon.id, wields: weapon.id };
}
