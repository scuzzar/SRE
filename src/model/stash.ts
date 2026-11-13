import { anyCharacterOf, livingCharacters, possessionKey, replaceCharacter, withArms, type Campaign, type Character, type CharacterId, type Possession } from './campaign';
import { DomainError } from './errors';
import { itemOf, itemOfWeapon, weaponOf } from './reference';
import { worldOf } from './sector';

/**
 * Das Gruppengepäck (`Campaign.stash`): was die Gruppe besitzt und nicht ausgerüstet hat. Am SC
 * bleibt nur, was er ausgerüstet hat: Primärwaffe, Sekundärwaffe und getragene Rüstung, je einmal.
 * NSC und Tiere behalten ihren eigenen Besitz.
 */

/** Wo ein SC etwas ausgerüstet hat. */
export type EquipSlot = 'primary' | 'secondary' | 'wears';

/** Ein SC: weder dauerhafter NSC noch Tier. Nur SC legen ihren Besitz ins Gepäck. */
export function isPc(character: Character): boolean {
  return !character.npc && character.animal === undefined;
}

/** Der Gegenstand, den ein SC an dieser Stelle ausgerüstet hat; `undefined`, wenn sie leer ist. */
export function itemAt(character: Character, slot: EquipSlot): string | undefined {
  if (slot === 'wears') return character.wears;
  const weapon = character[slot];
  return weapon === undefined ? undefined : itemOfWeapon(weapon)?.id;
}

/** Die Gegenstände, die ein SC ausgerüstet hat. */
function equippedItems(character: Character): readonly string[] {
  return (['primary', 'secondary', 'wears'] as const).flatMap((slot) => itemAt(character, slot) ?? []);
}

/**
 * Legt Besitz ins Gepäck: derselbe Gegenstand (bei Jagdbeute derselben Herkunft) zählt zusammen.
 * Eine Schusswaffe hat danach die Schuss der zuletzt abgelegten; ohne Angabe ist sie voll.
 */
export function addToStash(stash: readonly Possession[], possession: Possession): readonly Possession[] {
  if (possession.count <= 0) return stash;
  const key = possessionKey(possession);
  const had = stash.find((p) => possessionKey(p) === key);
  if (!had) return [...stash, possession];
  const merged: Possession = { ...withoutRounds(had), count: had.count + possession.count, ...(possession.rounds === undefined ? {} : { rounds: possession.rounds }) };
  return stash.map((p) => (p === had ? merged : p));
}

/** Der Besitz ohne Angabe der Schuss: eine volle Schusswaffe. */
function withoutRounds(p: Possession): Possession {
  return Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'rounds')) as unknown as Possession;
}

/** Nimmt `count` Stück aus dem Gepäck; beim letzten ist der Eintrag weg. */
function takeFromStash(stash: readonly Possession[], key: string, count: number): { readonly stash: readonly Possession[]; readonly taken: Possession } {
  const had = stash.find((p) => possessionKey(p) === key);
  if (!had) throw new DomainError('Das ist nicht im Gepäck.');
  if (!Number.isInteger(count) || count < 1 || count > had.count) throw new DomainError(`Im Gepäck sind ${had.count} × ${itemOf(had.of).name}.`);
  const rest = stash.flatMap((p) => (p !== had ? [p] : p.count > count ? [{ ...p, count: p.count - count }] : []));
  return { stash: rest, taken: { ...had, count } };
}

/** Ordnet einen SC: Was er nicht ausgerüstet hat, und Stück über eins, kommt ins Gepäck. */
function settleCharacter(character: Character, stash: readonly Possession[]): { readonly character: Character; readonly stash: readonly Possession[] } {
  if (!isPc(character)) return { character, stash };
  const armed = withArms(character);
  const keep = new Set(equippedItems(armed));
  const possessions: Possession[] = [];
  let after = stash;
  for (const p of armed.possessions) {
    if (keep.has(p.of)) {
      possessions.push({ ...p, count: 1 });
      // Weitere Stück sind die nicht geladenen: Sie gelten als voll.
      if (p.count > 1) after = addToStash(after, { ...withoutRounds(p), count: p.count - 1 });
    } else {
      after = addToStash(after, p);
    }
  }
  return { character: { ...armed, possessions }, stash: after };
}

/**
 * Ordnet die Kampagne nach der Regel des Gruppengepäcks: Alles, was ein SC besitzt und nicht
 * ausgerüstet hat, kommt ins Gepäck; gleiche Gegenstände zählen zusammen. Für ältere Spielstände
 * und nach jeder Änderung am Besitz eines SC (Editor, Erschaffung).
 */
export function settleStash(campaign: Campaign): Campaign {
  let stash: readonly Possession[] = campaign.stash ?? [];
  const characters = campaign.characters.map((c) => {
    const settled = settleCharacter(c, stash);
    stash = settled.stash;
    return settled.character;
  });
  return { ...campaign, characters, stash };
}

/** Ein lebender SC der Kampagne; nur sie rüsten aus und tragen. */
function livingPc(campaign: Campaign, id: CharacterId): Character {
  const character = livingCharacters(campaign).find((c) => c.id === id);
  if (!character || !isPc(character)) throw new DomainError('Ausrüsten kann nur ein lebender SC.');
  return character;
}

/** Ob der Gegenstand an diese Stelle passt: eine Waffe auf Primär oder Sekundär, eine Rüstung auf Rüstung. */
export function fits(itemId: string, slot: EquipSlot): boolean {
  const item = itemOf(itemId);
  return slot === 'wears' ? item.armor !== undefined : item.weapon !== undefined;
}

/**
 * Nimmt einem SC ab, was an dieser Stelle ausgerüstet ist (ohne es irgendwo hinzulegen). Die Waffe
 * in der Hand bleibt stehen, bis `withArms` am Ende sie bereinigt: So nimmt er eine neue
 * Primärwaffe in die Hand, wenn er die alte führte.
 */
function withoutSlot(character: Character, slot: EquipSlot): { readonly character: Character; readonly removed: Possession | undefined } {
  const item = itemAt(character, slot);
  if (item === undefined) return { character, removed: undefined };
  const removed = character.possessions.find((p) => p.of === item);
  const rest = Object.fromEntries(Object.entries(character).filter(([key]) => key !== slot)) as unknown as Character;
  return { character: { ...rest, possessions: character.possessions.filter((p) => p.of !== item) }, removed };
}

/** Rüstet einen Gegenstand an einer Stelle aus; die Waffe in der Hand folgt der Regel unter *Waffe in der Hand*. */
function withSlot(character: Character, slot: EquipSlot, possession: Possession, inHand = false): Character {
  const item = itemOf(possession.of);
  const value = slot === 'wears' ? item.id : item.weapon!;
  return withArms({ ...character, possessions: [...character.possessions, { ...possession, count: 1 }], [slot]: value, ...(inHand ? { wields: value } : {}) });
}

/**
 * Rüstet einen SC aus: ein Stück aus dem Gepäck (`from` fehlt) oder von einem anderen SC (`from`,
 * dort an der Stelle `fromSlot`) kommt an die Stelle `slot`. Was dort vorher war, kommt ins Gepäck.
 * Vom selben SC tauscht es die Stellen (etwa Sekundär- auf Primärwaffe).
 */
export function equip(campaign: Campaign, id: CharacterId, slot: EquipSlot, source: { readonly key: string } | { readonly from: CharacterId; readonly fromSlot: EquipSlot }): Campaign {
  let target = livingPc(campaign, id);
  let stash = campaign.stash;
  let piece: Possession;
  let characters = campaign.characters;
  if ('key' in source) {
    const had = stash.find((p) => possessionKey(p) === source.key);
    if (!had) throw new DomainError('Das ist nicht im Gepäck.');
    if (!fits(had.of, slot)) throw new DomainError(`${itemOf(had.of).name} passt nicht an diese Stelle.`);
    const taken = takeFromStash(stash, source.key, 1);
    stash = taken.stash;
    piece = taken.taken;
  } else {
    const giver = livingPc(campaign, source.from);
    const item = itemAt(giver, source.fromSlot);
    if (item === undefined) throw new DomainError(`${giver.name} hat dort nichts ausgerüstet.`);
    if (!fits(item, slot)) throw new DomainError(`${itemOf(item).name} passt nicht an diese Stelle.`);
    if (giver.id === id && source.fromSlot === slot) return campaign;
    const off = withoutSlot(giver, source.fromSlot);
    piece = off.removed!;
    if (giver.id === id) {
      // Tausch am selben SC: Was an der Zielstelle war, rückt an die frei gewordene Stelle, wenn es passt.
      const before = withoutSlot(off.character, slot);
      let after = withSlot(before.character, slot, piece);
      if (before.removed) {
        if (fits(before.removed.of, source.fromSlot)) after = withSlot(after, source.fromSlot, before.removed);
        else stash = addToStash(stash, before.removed);
      }
      return { ...replaceCharacter(campaign, after), stash };
    }
    characters = characters.map((c) => (c.id === giver.id ? withArms(off.character) : c));
    target = characters.find((c) => c.id === id)!;
  }
  // Dieselbe Waffe kann ein SC nicht zweimal führen; Primär- und Sekundärwaffe sind verschieden.
  const value = slot === 'wears' ? piece.of : itemOf(piece.of).weapon!;
  const other: EquipSlot | undefined = slot === 'primary' ? 'secondary' : slot === 'secondary' ? 'primary' : undefined;
  if (other !== undefined && target[other] === value) throw new DomainError(`${target.name} führt ${weaponOf(value).name} schon als ${other === 'primary' ? 'Primärwaffe' : 'Sekundärwaffe'}.`);
  const before = withoutSlot(target, slot);
  if (before.removed) stash = addToStash(stash, before.removed);
  const after = withSlot(before.character, slot, piece);
  return { ...campaign, characters: characters.map((c) => (c.id === id ? after : c)), stash };
}

/** Legt ab, was ein SC an dieser Stelle ausgerüstet hat: Es kommt ins Gepäck. */
export function unequip(campaign: Campaign, id: CharacterId, slot: EquipSlot): Campaign {
  const character = livingPc(campaign, id);
  const off = withoutSlot(character, slot);
  if (!off.removed) return campaign;
  return { ...replaceCharacter(campaign, withArms(off.character)), stash: addToStash(campaign.stash, off.removed) };
}

/** Rüstet einen SC mit einem neuen Stück aus (Kauf): was dort war, kommt ins Gepäck; eine neue Primärwaffe nimmt er in die Hand. */
export function equipNew(campaign: Campaign, id: CharacterId, slot: EquipSlot, possession: Possession): Campaign {
  const character = anyCharacterOf(campaign, id);
  const before = withoutSlot(character, slot);
  const stash = before.removed ? addToStash(campaign.stash, before.removed) : campaign.stash;
  return { ...replaceCharacter(campaign, withSlot(before.character, slot, possession, slot === 'primary')), stash };
}

// --- Last und Traglast --------------------------------------------------------------------------

/** Was zur Last zählt (SR 22, SE 5): Waffen, Munition, Ausrüstung und Jagdbeute; nicht Rüstung (der Vacc Suit ist Ausrüstung), Dagger, Fahrzeuge, Schiffe, Passagen, Mitgliedschaften. */
function counts(itemId: string): boolean {
  const item = itemOf(itemId);
  return itemId !== 'dagger' && (item.kind === 'weapon' || item.kind === 'ammunition' || item.kind === 'equipment' || item.kind === 'game');
}

function weightOf(possessions: readonly Possession[]): number {
  return possessions.reduce((sum, p) => sum + (counts(p.of) ? (itemOf(p.of).weight ?? 0) * p.count : 0), 0);
}

/** Die lebenden SC; sie tragen die Last. */
function carriers(campaign: Campaign): readonly Character[] {
  return livingCharacters(campaign).filter(isPc);
}

/** `/load`: das Gewicht von allem im Gepäck und allem, was die lebenden SC ausgerüstet haben, in kg. */
export function loadOf(campaign: Campaign): number {
  return Math.round((weightOf(campaign.stash) + carriers(campaign).reduce((sum, c) => sum + weightOf(c.possessions), 0)) * 100) / 100;
}

/** Der Anteil der Normallast je Größe der Welt (SE 5): Größe 8 = 100 %, je Stufe 12,5 %. */
export function gravityFactor(campaign: Campaign): number {
  if (campaign.location === undefined) return 1;
  const size = worldOf(campaign.hexes, campaign.location).uwp.size;
  return size === undefined ? 1 : 1 + (8 - size) * 0.125;
}

/** `/capacity`: die Summe der STR der lebenden SC (UPP, ohne Wunden) in kg, nach der Schwerkraft des Aufenthaltsorts. */
export function capacityOf(campaign: Campaign): number {
  return Math.round(carriers(campaign).reduce((sum, c) => sum + c.upp.str, 0) * gravityFactor(campaign) * 100) / 100;
}

/** `/burden` (Hausregel): 0 bis zur Traglast, 1 bis zum Doppelten, 2 darüber; ohne lebenden SC 0. */
export function burdenOf(campaign: Campaign): number {
  const capacity = capacityOf(campaign);
  if (carriers(campaign).length === 0) return 0;
  const load = loadOf(campaign);
  return load <= capacity ? 0 : load <= 2 * capacity ? 1 : 2;
}
