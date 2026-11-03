import {
  ammoOf,
  armorClasses,
  ATTACK_TARGET,
  attackDm,
  chance2d6,
  DomainError,
  focusOf,
  rangeDm,
  ranges,
  roll2d6,
  weaponSkill,
  wieldedWeapon,
  type ArmorClass,
  type AttackDm,
  type AttackResult,
  type Campaign,
  type Character,
  type Clock,
  type Random,
  type Range,
  type Weapon,
} from '..';

/**
 * Ein Angriff, solange er für den Charakter oben vorbereitet wird. Flüchtig: wird beim Würfeln zum
 * `AttackResult`, nie gespeichert. Für wen er gilt (`/for`: der Charakter oben) und womit (`/with`:
 * seine Waffe in der Hand), folgt aus der Kampagne. Rüstung und Reichweite sind die des Ziels.
 */
export interface Attack {
  readonly armor?: ArmorClass;
  readonly range?: Range;
}

/** Die abgeleiteten Werte eines Angriffs: `/dm`, `/need`, `/chance`, der Zielwert und woraus der DM besteht. */
export interface AttackOdds {
  readonly dm: AttackDm;
  readonly target: number;
  /** Was auf 2W6 nötig ist: Zielwert minus DM. */
  readonly need: number;
  /** In Prozent, exakt aus den 36 Kombinationen. */
  readonly chance: number;
}

/** Für wen der Angriff gilt: den Charakter oben. Ohne ihn gibt es keinen Angriff. */
export function attackCharacter(campaign: Campaign): Character {
  const character = focusOf(campaign);
  if (!character) throw new DomainError('Es gibt keinen lebenden Charakter für einen Angriff.');
  return character;
}

/** Ein neuer Angriff für den Charakter oben, noch ohne Ziel. */
export function startAttack(campaign: Campaign): Attack {
  attackCharacter(campaign);
  return {};
}

/** Wählt Rüstung und Reichweite des Ziels. Auf eine Reichweite, auf die die Waffe nicht reicht, geht es nicht. */
export function chooseTarget(campaign: Campaign, armor: ArmorClass, range: Range): Attack {
  const weapon = wieldedWeapon(attackCharacter(campaign));
  if (!armorClasses.includes(armor) || !ranges.includes(range)) throw new DomainError('Diese Rüstung oder Reichweite gibt es nicht.');
  if (rangeDm(weapon, range) === undefined) throw new DomainError(`Mit ${weapon.name} geht auf diese Reichweite kein Angriff.`);
  return { armor, range };
}

/** Nach einem Wechsel der Waffe: Rüstung und Reichweite bleiben, außer die Reichweite geht mit der neuen Waffe nicht. */
export function keepTarget(attack: Attack, campaign: Campaign): Attack {
  const weapon = wieldedWeapon(attackCharacter(campaign));
  if (attack.range !== undefined && rangeDm(weapon, attack.range) === undefined) return attack.armor === undefined ? {} : { armor: attack.armor };
  return attack;
}

function odds(character: Character, weapon: Weapon, armor: ArmorClass, range: Range): AttackOdds | undefined {
  const dm = attackDm(character, weapon, armor, range);
  if (!dm) return undefined;
  const need = ATTACK_TARGET - dm.total;
  return { dm, target: ATTACK_TARGET, need, chance: chance2d6(need) };
}

/** DM, nötiger Wurf und Chance; erst mit Rüstung und Reichweite. */
export function evaluateAttack(attack: Attack, campaign: Campaign): AttackOdds | undefined {
  if (attack.armor === undefined || attack.range === undefined) return undefined;
  const character = attackCharacter(campaign);
  return odds(character, wieldedWeapon(character), attack.armor, attack.range);
}

/**
 * Die klassische Tabelle der Waffe in der Hand: je Rüstung eine Zeile, je Reichweite eine Spalte, in
 * jeder Zelle die Werte mit allen DMs des Charakters; `undefined`, wo die Waffe nicht hinreicht.
 */
export function attackTable(campaign: Campaign): readonly (readonly (AttackOdds | undefined)[])[] {
  const character = attackCharacter(campaign);
  const weapon = wieldedWeapon(character);
  return armorClasses.map((armor) => ranges.map((range) => odds(character, weapon, armor, range)));
}

/** Würfelt den Angriff. Auch ein unmöglicher Angriff darf gewürfelt werden; er misslingt und steht trotzdem im Log. */
export function rollAttack(attack: Attack, campaign: Campaign, random: Random, clock: Clock): AttackResult {
  const character = attackCharacter(campaign);
  const weapon = wieldedWeapon(character);
  const evaluated = evaluateAttack(attack, campaign);
  if (!evaluated || attack.armor === undefined || attack.range === undefined) throw new DomainError('Erst Rüstung und Reichweite des Ziels wählen.');
  if (ammoOf(character)?.rounds === 0) throw new DomainError(`${weapon.name} ist leer. Erst nachladen.`);
  const skill = weaponSkill(character, weapon);
  const result: AttackResult = {
    kind: 'attack',
    at: clock.now(),
    for: character.id,
    with: weapon.id,
    armor: attack.armor,
    range: attack.range,
    dice: roll2d6(random),
    dm: evaluated.dm.total,
    target: evaluated.target,
  };
  return skill ? { ...result, uses: skill.of } : result;
}
