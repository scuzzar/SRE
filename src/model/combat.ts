import { activeSkills, anyCharacterOf, isCampaignCharacter, replaceCharacter, type Campaign, type Character, type CharacterId, type SkillLevel, type Upp } from './campaign';
import { DomainError } from './errors';
import { damageRollsOf, isSuccess, volleyOf, type AttackResult, type DamageRoll, type LogEntry } from './log';
import type { Clock, Random } from './ports';
import { HANDS, itemOf, itemOfWeapon, weaponOf, type ArmorClass, type Range, type Weapon } from './reference';
import { valueOf, type Characteristic } from './rules';
import { autoWounds, checkWounds, fightingWounds, isAnimal, isFirstHitNow, woundStateOf, victimOf, woundedUpp, woundsOf, type WoundBlock, type WoundState } from './wounds';
import { animalRowOf } from './animals';

/** *Basic Throw to Hit* (S. 6): 2W6 + DM ≥ 8. */
export const ATTACK_TARGET = 8;

/** Die Waffe in der Hand; ohne sind es die Hände. */
export function wieldedWeapon(character: Character): Weapon {
  return weaponOf(character.wields ?? HANDS);
}

/** Ein Feuerstoß würfelt zweimal auf das Ziel (Book 1). */
export const BURST_ROLLS = 2;

/** Nachbarn eines Feuerstoßes werden mit DM −3 angegriffen (Book 4, S. 31). */
export const BURST_NEIGHBOUR_DM = -3;

/**
 * Die Zeile der Matrix, die ein Angriff nimmt: beim Einzelschuss einer Waffe mit `single` die Zeile
 * dieser Waffe (Automatic Rifle → Rifle), sonst die der Waffe selbst.
 */
export function rowOf(weapon: Weapon, burst: boolean): Weapon {
  return !burst && weapon.single !== undefined ? weaponOf(weapon.single) : weapon;
}

/** Wie viele Nachbarn ein Angriff mit dieser Waffe höchstens mit trifft: beim Feuerstoß und bei Waffen ohne Feuerstoß (Shotgun) `neighbours`, beim Einzelschuss keinen. */
export function neighboursOf(weapon: Weapon, burst: boolean): number {
  if (weapon.burst !== undefined && !burst) return 0;
  return weapon.neighbours ?? 0;
}

/** Wie viele Schuss ein Angriff verbraucht: ein Feuerstoß `burst`, sonst einer. */
export function roundsFor(weapon: Weapon, burst: boolean): number {
  return burst ? (weapon.burst ?? 1) : 1;
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

/** Das Attribut zu einer Waffe: nötiger und vorteilhafter Wert mit ihren DMs, der jetzige Wert und der DM, den er gibt. */
export interface WeaponCharacteristic {
  readonly characteristic: Characteristic;
  readonly value: number;
  readonly required: number;
  readonly requiredDm: number;
  readonly advantageous: number;
  readonly advantageousDm: number;
  readonly dm: number;
}

/** Wie ein UPP zu einer Waffe steht: STR bei Schlägen und Hieben, DEX bei Schüssen. */
export function weaponCharacteristic(weapon: Weapon, upp: Upp): WeaponCharacteristic {
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(upp, characteristic);
  const { required, requiredDm, advantageous, advantageousDm } = weapon;
  return { characteristic, value, required, requiredDm, advantageous, advantageousDm, dm: characteristicAttackDm(weapon, value) };
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

/** Woraus der DM eines Angriffs besteht: Fertigkeit, Rüstung, Reichweite, Attribut, geschwächter Schlag, Parade und Ausweichen des Ziels. */
export interface AttackDm {
  readonly skill: number;
  readonly armor: number;
  readonly range: number;
  readonly characteristic: number;
  readonly weakened: number;
  readonly parry: number;
  readonly evade: number;
  /** Der DM des Tierangriffs („claws +1“) und der Tierrüstung des Ziels („combat +4“). */
  readonly natural: number;
  readonly hide: number;
  readonly total: number;
}

/** Die getragene Rüstung eines Charakters als Rüstungsklasse; ohne Nothing. */
export function wornArmor(character: { readonly wears?: string }): ArmorClass {
  return character.wears === undefined ? 'nothing' : (itemOf(character.wears).armor ?? 'nothing');
}

/** Wer kämpft, mit allem, was ein Angriff von ihm und auf ihn braucht. */
export interface Fighter {
  readonly who: CharacterId;
  readonly name: string;
  /** Das UPP mit allen Wunden, wie es angezeigt wird und über den Zustand entscheidet. */
  readonly upp: Upp;
  /** Das UPP, mit dem er kämpft (DMs aus STR und DEX): in der laufenden Begegnung ohne deren Wunden (SR 21). */
  readonly fighting: Upp;
  readonly weapon: Weapon;
  /** Die Stufe in der Fertigkeit der Waffe; ohne 0. */
  readonly skill: number;
  readonly armor: ArmorClass;
  readonly state: WoundState;
  /** Ein Tier: kämpft mit seiner Zeile der Tiertabelle; der DM seines Angriffs mit der Waffe in der Hand und der seiner Rüstung. */
  readonly animal: boolean;
  readonly natural: number;
  readonly hide: number;
}

/** Ein Kämpfer, SC oder NSC einer Begegnung: beide sind Charaktere und kämpfen nach denselben Regeln; ein Tier mit den Werten seiner Zeile. */
export function fighterOf(campaign: Campaign, who: CharacterId): Fighter {
  const character = anyCharacterOf(campaign, who);
  if (character.animal) {
    const row = animalRowOf(campaign.hexes, character.animal);
    const weapon = wieldedWeapon(character);
    const natural = row.attacks!.find((a) => a.with === weapon.id)?.dm ?? 0;
    return { who, name: character.name, upp: character.upp, fighting: character.upp, weapon, skill: 0, armor: row.armor ?? 'nothing', state: woundStateOf(campaign, who), animal: true, natural, hide: row.armorDm ?? 0 };
  }
  const upp = woundedUpp(character.upp, woundsOf(campaign, who));
  const fighting = woundedUpp(character.upp, fightingWounds(campaign, who));
  const weapon = wieldedWeapon(character);
  return { who, name: character.name, upp, fighting, weapon, skill: weaponSkill(character, weapon)?.level ?? 0, armor: wornArmor(character), state: woundStateOf(campaign, who), animal: false, natural: 0, hide: 0 };
}

/**
 * Der DM eines Angriffs; `undefined`, wenn auf diese Reichweite mit der Waffe kein Angriff geht.
 * Rüstung und Reichweite kommen aus der Zeile `row` (beim Einzelschuss des Automatic Rifle die des
 * Rifle), das Attribut aus der Waffe selbst.
 */
export function attackDm(
  attacker: { readonly upp: Upp; readonly skill: number },
  weapon: Weapon,
  armor: ArmorClass,
  range: Range,
  row: Weapon = weapon,
  extra: { readonly weakened?: number; readonly parry?: number; readonly evade?: number; readonly natural?: number; readonly hide?: number } = {},
): AttackDm | undefined {
  const atRange = rangeDm(row, range);
  if (atRange === undefined) return undefined;
  const skill = attacker.skill;
  const vsArmor = armorDm(row, armor);
  const characteristic = characteristicAttackDm(weapon, valueOf(attacker.upp, attackCharacteristic(weapon)));
  const weakened = extra.weakened ?? 0;
  const parry = extra.parry ?? 0;
  const evade = extra.evade ?? 0;
  const natural = extra.natural ?? 0;
  const hide = extra.hide ?? 0;
  return {
    skill,
    armor: vsArmor,
    range: atRange,
    characteristic,
    weakened,
    parry,
    evade,
    natural,
    hide,
    total: skill + vsArmor + atRange + characteristic + weakened + parry + evade + natural + hide,
  };
}

/** Ein Treffer: ein Angriffsergebnis mit Erfolg. */
function isHit(entry: LogEntry | undefined): entry is AttackResult {
  return entry?.kind === 'attack' && isSuccess(entry);
}

/** Der Schadenswurf an der Stelle `at` verweist auf einen früheren Treffer, auf den kein anderer verweist. */
export function checkDamageRoll(log: readonly LogEntry[], roll: DamageRoll, at: number, animals?: ReadonlySet<CharacterId>): void {
  const target = log[roll.of];
  if (!Number.isInteger(roll.of) || roll.of < 0 || roll.of >= at || !target) throw new DomainError('Ein Schadenswurf verweist auf einen Eintrag, den es davor nicht gibt.');
  if (!isHit(target)) throw new DomainError('Schaden gibt es nur für einen Treffer.');
  if (damageRollsOf(log, roll.of).some((i) => i !== at)) throw new DomainError('Für diesen Treffer ist der Schaden schon gewürfelt.');
  const wounds = weaponOf(target.with).wounds;
  if (roll.fixed !== undefined) {
    if (roll.dice.length > 0 || !Number.isInteger(roll.fixed) || roll.fixed < 1) throw new DomainError('Fester Schaden hat keine Würfel und ist mindestens 1.');
  } else if (roll.dice.length !== wounds) throw new DomainError(`Der Schaden mit ${weaponOf(target.with).name} sind ${wounds}W6.`);
  if (roll.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) throw new DomainError('Ein Würfel zeigt 1 bis 6.');
  checkWounds(log.slice(0, at), roll, target, animals);
}

/**
 * Die Stelle des Treffers, für den als Nächstes Schaden ansteht: der erste Treffer ohne Schaden in
 * der Garbe des neuesten Treffers im Log (ein einzelner Wurf ist eine Garbe für sich).
 */
export function pendingDamage(log: readonly LogEntry[]): number | undefined {
  for (let i = log.length - 1; i >= 0; i--) {
    if (isHit(log[i])) return volleyOf(log, i).find((j) => isHit(log[j]) && damageRollsOf(log, j).length === 0);
  }
  return undefined;
}

/** Der Wurf an der Stelle `at` gehört zu einer Garbe: Er verweist auf einen früheren ersten Wurf desselben Angreifers mit derselben Waffe. */
export function checkVolley(log: readonly LogEntry[], entry: AttackResult, at: number): void {
  if (entry.volley === undefined) return;
  const first = log[entry.volley];
  if (!Number.isInteger(entry.volley) || entry.volley < 0 || entry.volley >= at || first?.kind !== 'attack') throw new DomainError('Ein Wurf einer Garbe verweist auf keinen früheren Angriff.');
  if (first.volley !== undefined) throw new DomainError('Ein Wurf einer Garbe verweist nicht auf ihren ersten Wurf.');
  if (first.for !== entry.for || first.with !== entry.with) throw new DomainError('Die Würfe einer Garbe haben denselben Angreifer und dieselbe Waffe.');
  const weapon = weaponOf(entry.with);
  const most = (weapon.burst === undefined ? 1 : BURST_ROLLS) + (weapon.neighbours ?? 0);
  if (volleyOf(log.slice(0, at + 1), entry.volley).length > most) throw new DomainError(`Eine Garbe mit ${weapon.name} hat höchstens ${most} Würfe.`);
}

/** Der Treffer an der Stelle `of`; sonst gibt es keinen Schaden. */
export function hitAt(log: readonly LogEntry[], of: number): AttackResult {
  const target = log[of];
  if (!isHit(target)) throw new DomainError('Schaden gibt es nur für einen Treffer.');
  return target;
}

/** Der feste Schaden des Treffers an der Stelle `of`, wenn ein Tier traf: der seines Tierangriffs (SR 48). */
export function fixedDamageOf(campaign: Campaign, of: number): number | undefined {
  const hit = hitAt(campaign.log, of);
  const attacker = anyCharacterOf(campaign, hit.for);
  if (!attacker.animal) return undefined;
  const attack = animalRowOf(campaign.hexes, attacker.animal).attacks!.find((a) => a.with === hit.with);
  if (!attack) throw new DomainError(`${attacker.name} hat keinen Angriff mit ${weaponOf(hit.with).name}.`);
  return attack.damage;
}

/** Die Schadenswürfel des Treffers an der Stelle `of`: so viele W6, wie die Waffe `wounds` hat; bei einem Tier sein fester Schaden als ein Würfel. */
export function damageDice(campaign: Campaign, of: number, random: Random): readonly number[] {
  const fixed = fixedDamageOf(campaign, of);
  if (fixed !== undefined) return [fixed];
  return Array.from({ length: weaponOf(hitAt(campaign.log, of).with).wounds }, () => random.int(1, 6));
}

/** Die Tiere der Kampagne: Schaden an ihnen geht nicht auf Attribute. */
export function animalIds(campaign: Campaign): ReadonlySet<CharacterId> {
  return new Set(campaign.encounters.flatMap((e) => e.npcs.filter((n) => n.animal !== undefined).map((n) => n.id)));
}

/** Muss der Spieler den Schaden dieses Treffers selbst verteilen? Bei einem SC (Charakter der Kampagne) nach seinem ersten Treffer. */
export function needsWounding(campaign: Campaign, of: number): boolean {
  const who = victimOf(hitAt(campaign.log, of));
  return who !== undefined && isCampaignCharacter(campaign, who) && !isFirstHitNow(campaign, who);
}

/** Ein Schadenswurf aus Würfeln und, bei einem Treffer mit Ziel, den Blöcken auf den Attributen. */
export function damageRoll(campaign: Campaign, of: number, dice: readonly number[], blocks: readonly WoundBlock[] | undefined, clock: Clock): DamageRoll {
  const fixed = fixedDamageOf(campaign, of);
  const base = fixed === undefined ? { kind: 'damage' as const, at: clock.now(), of, dice } : { kind: 'damage' as const, at: clock.now(), of, dice: [], fixed: dice[0]! };
  const roll: DamageRoll = blocks === undefined ? base : { ...base, to: blocks.map((b) => b.to), points: blocks.map((b) => b.points) };
  checkDamageRoll(campaign.log, roll, campaign.log.length, animalIds(campaign));
  return roll;
}

/**
 * Würfelt den Schaden des Treffers an der Stelle `of` und verteilt ihn, wo die App es tut (ohne Ziel
 * gar nicht, beim ersten Treffer und bei NSC selbst). Bei einem SC nach dem ersten Treffer verteilt
 * der Spieler; das geht über `Wounding` im Paket draft.
 */
export function rollDamage(campaign: Campaign, of: number, random: Random, clock: Clock): DamageRoll {
  const who = victimOf(hitAt(campaign.log, of));
  const dice = damageDice(campaign, of, random);
  // Schaden an einem Tier zählt gegen seine Hits, nicht gegen Attribute.
  if (!who || isAnimal(campaign, who)) return damageRoll(campaign, of, dice, undefined, clock);
  const blocks = autoWounds(campaign, who, dice, random);
  if (!blocks) throw new DomainError('Den Schaden an einem SC verteilt der Spieler.');
  return damageRoll(campaign, of, dice, blocks, clock);
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

/** Ein Angriff mit einer Schusswaffe verbraucht einen Schuss, ein Feuerstoß `count`; sind nicht so viele geladen, gibt es keinen. */
export function spendRound(campaign: Campaign, id: string, count = 1): Campaign {
  const character = anyCharacterOf(campaign, id);
  const ammo = ammoOf(character);
  if (!ammo) return campaign;
  checkRounds(character, count);
  const item = itemOfWeapon(wieldedWeapon(character).id)!.id;
  return replaceCharacter(campaign, { ...character, possessions: character.possessions.map((p) => (p.of === item ? { ...p, rounds: ammo.rounds - count } : p)) });
}

/** Hat die Waffe in der Hand die Schuss geladen, die der Angriff braucht? Hände und Klingen brauchen keine. */
export function checkRounds(character: Character, count: number): void {
  const ammo = ammoOf(character);
  if (!ammo) return;
  const name = wieldedWeapon(character).name;
  if (ammo.rounds === 0) throw new DomainError(`${name} ist leer. Erst nachladen.`);
  if (ammo.rounds < count) throw new DomainError(`Ein Feuerstoß braucht ${count} Schuss, ${name} hat nur noch ${ammo.rounds}. Erst nachladen.`);
}

/** Nachladen: ein Magazin aus dem Besitz, die Waffe ist wieder voll; ein angebrochenes Magazin geht verloren. */
export function reload(campaign: Campaign, id: string): Campaign {
  const character = anyCharacterOf(campaign, id);
  const ammo = ammoOf(character);
  if (!ammo) throw new DomainError(`${wieldedWeapon(character).name} lädt man nicht nach.`);
  if (ammo.magazines === 0) throw new DomainError(`${character.name} hat kein ${itemOf(ammo.ammo).name} mehr.`);
  const item = itemOfWeapon(wieldedWeapon(character).id)!.id;
  const possessions = character.possessions.flatMap((p) => {
    if (p.of === item) return [{ ...p, rounds: ammo.capacity }];
    if (p.of === ammo.ammo) return p.count > 1 ? [{ ...p, count: p.count - 1 }] : [];
    return [p];
  });
  return replaceCharacter(campaign, { ...character, possessions });
}
