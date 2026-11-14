import { npcCharacters, npcRoles, roleOf, type Campaign, type Character, type NpcRole } from './campaign';
import { hexById } from './sector';

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
 * Die lebenden dauerhaften NSC für den Reiter NSC (siehe domain-model.md, *Reiter NSC*). Vorgegeben
 * die des Aufenthaltsorts und die ohne Ort, als eine Gruppe nach Rolle. Mit `all`, oder ohne
 * Aufenthaltsort, alle: nach Welt (nach Namen der Welt, ohne Ort am Ende), darin nach Rolle.
 */
export function npcGroups(campaign: Campaign, all: boolean): readonly NpcWorldGroup[] {
  const living = npcCharacters(campaign).filter((n) => !n.dead);
  const here = campaign.location;
  if (!all && here !== undefined) {
    const roles = byRole(living.filter((n) => n.place === undefined || n.place === here));
    return roles.length === 0 ? [] : [{ place: here, name: hexById(campaign.hexes, here)?.name, roles }];
  }
  const places = [...new Set(living.flatMap((n) => (n.place === undefined ? [] : [n.place])))];
  const worlds = places
    .map((place) => ({ place, name: hexById(campaign.hexes, place)?.name ?? place }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map(({ place, name }) => ({ place, name, roles: byRole(living.filter((n) => n.place === place)) }));
  const nowhere = byRole(living.filter((n) => n.place === undefined));
  return [...worlds, ...(nowhere.length === 0 ? [] : [{ place: undefined, name: undefined, roles: nowhere }])];
}

/** Die toten dauerhaften NSC, nach Namen; sie stehen eingeklappt unter den Lebenden. */
export function deadNpcs(campaign: Campaign): readonly Character[] {
  return npcCharacters(campaign).filter((n) => n.dead).sort(byName);
}
