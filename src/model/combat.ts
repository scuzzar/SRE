import { activeSkills, characterOf, type Campaign, type Character, type SkillLevel } from './campaign';
import { DomainError } from './errors';
import { damageRollsOf, isSuccess, type AttackResult, type DamageRoll, type LogEntry } from './log';
import type { Clock, Random } from './ports';
import { HANDS, itemOf, itemOfWeapon, weaponOf, type ArmorClass, type Range, type Weapon } from './reference';
import { valueOf, type Characteristic } from './rules';

/** *Basic Throw to Hit* (S. 6): 2W6 + DM ≥ 8. */
export const ATTACK_TARGET = 8;

/** Die Waffe in der Hand; ohne sind es die Hände. */
export function wieldedWeapon(character: Character): Weapon {
  return weaponOf(character.wields ?? HANDS);
}

/** Bei Schlägen und Hieben zählt STR, bei Schüssen DEX. */
export function attackCharacteristic(weapon: Weapon): Characteristic {
  return weapon.attack === 'shot' ? 'DEX' : 'STR';
}

/** DM des Attributs: unter dem nötigen Wert `requiredDm`, ab dem vorteilhaften `advantageousDm`, sonst ±0. */
export function characteristicAttackDm(weapon: Weapon, value: number): number {
  if (value < weapon.required) return weapon.requiredDm;
  if (value >= weapon.advantageous) return weapon.advantageousDm;
  return 0;
}

/** Die Fertigkeitsstufe des Charakters in der Fertigkeit der Waffe; ohne zählt Stufe 0. */
export function weaponSkill(character: Character, weapon: Weapon): SkillLevel | undefined {
  return activeSkills(character).find((s) => s.of === weapon.uses);
}

export function armorDm(weapon: Weapon, armor: ArmorClass): number {
  return weapon.vsArmor.find((a) => a.armor === armor)!.dm;
}

/** Der DM auf diese Reichweite; ohne („no“) geht auf diese Reichweite kein Angriff. */
export function rangeDm(weapon: Weapon, range: Range): number | undefined {
  return weapon.atRange.find((r) => r.range === range)!.dm;
}

/** Woraus der DM eines Angriffs besteht: Fertigkeit, Rüstung, Reichweite, Attribut. */
export interface AttackDm {
  readonly skill: number;
  readonly armor: number;
  readonly range: number;
  readonly characteristic: number;
  readonly total: number;
}

/** Der DM eines Angriffs; `undefined`, wenn auf diese Reichweite mit der Waffe kein Angriff geht. */
export function attackDm(character: Character, weapon: Weapon, armor: ArmorClass, range: Range): AttackDm | undefined {
  const atRange = rangeDm(weapon, range);
  if (atRange === undefined) return undefined;
  const skill = weaponSkill(character, weapon)?.level ?? 0;
  const vsArmor = armorDm(weapon, armor);
  const characteristic = characteristicAttackDm(weapon, valueOf(character.upp, attackCharacteristic(weapon)));
  return {
    skill,
    armor: vsArmor,
    range: atRange,
    characteristic,
    total: skill + vsArmor + atRange + characteristic,
  };
}

/** Ein Treffer: ein Angriffsergebnis mit Erfolg. */
function isHit(entry: LogEntry | undefined): entry is AttackResult {
  return entry?.kind === 'attack' && isSuccess(entry);
}

/** Der Schadenswurf an der Stelle `at` verweist auf einen früheren Treffer, auf den kein anderer verweist. */
export function checkDamageRoll(log: readonly LogEntry[], roll: DamageRoll, at: number): void {
  const target = log[roll.of];
  if (!Number.isInteger(roll.of) || roll.of < 0 || roll.of >= at || !target) throw new DomainError('Ein Schadenswurf verweist auf einen Eintrag, den es davor nicht gibt.');
  if (!isHit(target)) throw new DomainError('Schaden gibt es nur für einen Treffer.');
  if (damageRollsOf(log, roll.of).some((i) => i !== at)) throw new DomainError('Für diesen Treffer ist der Schaden schon gewürfelt.');
  const wounds = weaponOf(target.with).wounds;
  if (roll.dice.length !== wounds) throw new DomainError(`Der Schaden mit ${weaponOf(target.with).name} sind ${wounds}W6.`);
  if (roll.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) throw new DomainError('Ein Würfel zeigt 1 bis 6.');
}

/** Die Stelle des neuesten Treffers im Log, wenn dafür noch kein Schaden gewürfelt ist. */
export function pendingDamage(log: readonly LogEntry[]): number | undefined {
  for (let i = log.length - 1; i >= 0; i--) {
    if (isHit(log[i])) return damageRollsOf(log, i).length === 0 ? i : undefined;
  }
  return undefined;
}

/** Würfelt den Schaden des Treffers an der Stelle `of`: so viele W6, wie die Waffe `wounds` hat. */
export function rollDamage(campaign: Campaign, of: number, random: Random, clock: Clock): DamageRoll {
  const target = campaign.log[of];
  if (!isHit(target)) throw new DomainError('Schaden gibt es nur für einen Treffer.');
  characterOf(campaign, target.for);
  const dice = Array.from({ length: weaponOf(target.with).wounds }, () => random.int(1, 6));
  const roll: DamageRoll = { kind: 'damage', at: clock.now(), of, dice };
  checkDamageRoll(campaign.log, roll, campaign.log.length);
  return roll;
}

/** Munition der Waffe in der Hand: geladene Schuss, wie viele das Magazin fasst und wie viele Magazine im Besitz sind. */
export interface Ammo {
  readonly rounds: number;
  readonly capacity: number;
  /** Der Gegenstand, mit dem man nachlädt. */
  readonly ammo: string;
  readonly magazines: number;
}

/** Die Munition der Waffe in der Hand; `undefined` bei Händen und Klingen. */
export function ammoOf(character: Character): Ammo | undefined {
  const weapon = wieldedWeapon(character);
  if (weapon.rounds === undefined || weapon.ammo === undefined) return undefined;
  const item = itemOfWeapon(weapon.id)!;
  const rounds = character.possessions.find((p) => p.of === item.id)?.rounds ?? weapon.rounds;
  const magazines = character.possessions.find((p) => p.of === weapon.ammo)?.count ?? 0;
  return { rounds, capacity: weapon.rounds, ammo: weapon.ammo, magazines };
}

function withCharacter(campaign: Campaign, character: Character): Campaign {
  return { ...campaign, characters: campaign.characters.map((c) => (c.id === character.id ? character : c)) };
}

/** Ein Angriff mit einer Schusswaffe verbraucht einen Schuss; mit leerem Magazin gibt es keinen. */
export function spendRound(campaign: Campaign, id: string): Campaign {
  const character = characterOf(campaign, id);
  const ammo = ammoOf(character);
  if (!ammo) return campaign;
  if (ammo.rounds === 0) throw new DomainError(`${wieldedWeapon(character).name} ist leer. Erst nachladen.`);
  const item = itemOfWeapon(wieldedWeapon(character).id)!.id;
  return withCharacter(campaign, { ...character, possessions: character.possessions.map((p) => (p.of === item ? { ...p, rounds: ammo.rounds - 1 } : p)) });
}

/** Nachladen: ein Magazin aus dem Besitz, die Waffe ist wieder voll; ein angebrochenes Magazin geht verloren. */
export function reload(campaign: Campaign, id: string): Campaign {
  const character = characterOf(campaign, id);
  const ammo = ammoOf(character);
  if (!ammo) throw new DomainError(`${wieldedWeapon(character).name} lädt man nicht nach.`);
  if (ammo.magazines === 0) throw new DomainError(`${character.name} hat kein ${itemOf(ammo.ammo).name} mehr.`);
  const item = itemOfWeapon(wieldedWeapon(character).id)!.id;
  const possessions = character.possessions.flatMap((p) => {
    if (p.of === item) return [{ ...p, rounds: ammo.capacity }];
    if (p.of === ammo.ammo) return p.count > 1 ? [{ ...p, count: p.count - 1 }] : [];
    return [p];
  });
  return withCharacter(campaign, { ...character, possessions });
}
