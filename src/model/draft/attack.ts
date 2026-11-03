import {
  ammoOf,
  armorClasses,
  ATTACK_TARGET,
  attackDm,
  canFight,
  chance2d6,
  currentEncounter,
  DomainError,
  fighterOf,
  focusOf,
  npcOf,
  rangeDm,
  ranges,
  roll2d6,
  weaponSkill,
  type ArmorClass,
  type AttackDm,
  type AttackResult,
  type Campaign,
  type Character,
  type Clock,
  type Fighter,
  type Random,
  type Range,
} from '..';

/**
 * Ein Angriff, solange er vorbereitet wird. Flüchtig: wird beim Würfeln zum `AttackResult`, nie
 * gespeichert. Ohne `by` greift der Charakter oben an (`/for`) mit seiner Waffe in der Hand (`/with`);
 * mit `by` greift ein NSC der laufenden Begegnung den Charakter oben an (`/victim`). Mit `against` ist
 * das Ziel ein NSC. Rüstung und Reichweite sind die des Ziels; bei einem Ziel steht die Rüstung fest.
 */
export interface Attack {
  readonly armor?: ArmorClass;
  readonly range?: Range;
  readonly by?: string;
  readonly against?: string;
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

/** Der Charakter oben: Er greift an oder wird angegriffen. Ohne ihn gibt es keinen Angriff. */
export function attackCharacter(campaign: Campaign): Character {
  const character = focusOf(campaign);
  if (!character) throw new DomainError('Es gibt keinen lebenden Charakter für einen Angriff.');
  return character;
}

/** Ein NSC der laufenden Begegnung, der nicht übernommen ist. */
function encounterNpc(campaign: Campaign, id: string) {
  const npc = npcOf(campaign, id);
  if (!currentEncounter(campaign)?.npcs.some((n) => n.id === id)) throw new DomainError(`${npc.name} ist in keiner laufenden Begegnung.`);
  if (npc.became !== undefined) throw new DomainError(`${npc.name} ist übernommen und kämpft nicht mehr in der Begegnung.`);
  return npc;
}

/** Wer angreift: der NSC (`by`) oder der Charakter oben. */
export function attackerOf(attack: Attack, campaign: Campaign): Fighter {
  if (attack.by !== undefined) return fighterOf(campaign, { npc: encounterNpc(campaign, attack.by).id });
  return fighterOf(campaign, { pc: attackCharacter(campaign).id });
}

/** Wer angegriffen wird, wenn es ein Ziel gibt: der NSC (`against`) oder, wenn ein NSC angreift, der Charakter oben. */
export function defenderOf(attack: Attack, campaign: Campaign): Fighter | undefined {
  if (attack.against !== undefined) return fighterOf(campaign, { npc: encounterNpc(campaign, attack.against).id });
  if (attack.by !== undefined) return fighterOf(campaign, { pc: attackCharacter(campaign).id });
  return undefined;
}

/** Ein neuer Angriff des Charakters oben, noch ohne Ziel. */
export function startAttack(campaign: Campaign): Attack {
  attackCharacter(campaign);
  return {};
}

/** Behält die Reichweite, wenn die Waffe dorthin reicht. */
function withRange(attack: Attack, campaign: Campaign): Attack {
  const rest: Attack = Object.fromEntries(Object.entries(attack).filter(([key]) => key !== 'range'));
  const range = attack.range;
  return range !== undefined && rangeDm(attackerOf(rest, campaign).weapon, range) !== undefined ? { ...rest, range } : rest;
}

/** Der Angriff ohne Ziel und ohne NSC als Angreifer; nur die Reichweite bleibt. */
function untargeted(attack: Attack): Attack {
  return attack.range === undefined ? {} : { range: attack.range };
}

/** Der Charakter oben zielt auf einen NSC der laufenden Begegnung; seine Rüstung steht damit fest. `undefined` hebt das Ziel auf. */
export function aimAt(attack: Attack, campaign: Campaign, npc: string | undefined): Attack {
  const rest = untargeted(attack);
  if (npc === undefined) return withRange(rest, campaign);
  const defender = fighterOf(campaign, { npc: encounterNpc(campaign, npc).id });
  if (defender.state === 'dead') throw new DomainError(`${defender.name} ist tot.`);
  return withRange({ ...rest, against: npc, armor: defender.armor }, campaign);
}

/** Ein NSC der laufenden Begegnung greift den Charakter oben an; dessen getragene Rüstung steht fest. `undefined`: wieder der SC. */
export function attackBy(attack: Attack, campaign: Campaign, npc: string | undefined): Attack {
  const rest = untargeted(attack);
  if (npc === undefined) return withRange(rest, campaign);
  encounterNpc(campaign, npc);
  return withRange({ ...rest, by: npc, armor: fighterOf(campaign, { pc: attackCharacter(campaign).id }).armor }, campaign);
}

/** Wählt Rüstung und Reichweite des Ziels. Steht das Ziel fest, ist seine Rüstung die einzige. */
export function chooseTarget(campaign: Campaign, armor: ArmorClass, range: Range, attack: Attack = {}): Attack {
  const attacker = attackerOf(attack, campaign);
  if (!armorClasses.includes(armor) || !ranges.includes(range)) throw new DomainError('Diese Rüstung oder Reichweite gibt es nicht.');
  const defender = defenderOf(attack, campaign);
  if (defender && defender.armor !== armor) throw new DomainError(`${defender.name} trägt ${defender.armor}, nicht ${armor}.`);
  if (rangeDm(attacker.weapon, range) === undefined) throw new DomainError(`Mit ${attacker.weapon.name} geht auf diese Reichweite kein Angriff.`);
  return { ...attack, armor, range };
}

/** Nach einem Wechsel der Waffe oder der Rüstung: das Ziel bleibt, die Reichweite nur, wenn die Waffe hinreicht. */
export function keepTarget(attack: Attack, campaign: Campaign): Attack {
  const defender = defenderOf(attack, campaign);
  const fixed = defender ? { ...attack, armor: defender.armor } : attack;
  return withRange(fixed, campaign);
}

function odds(attacker: Fighter, armor: ArmorClass, range: Range): AttackOdds | undefined {
  const dm = attackDm(attacker, attacker.weapon, armor, range);
  if (!dm) return undefined;
  const need = ATTACK_TARGET - dm.total;
  return { dm, target: ATTACK_TARGET, need, chance: chance2d6(need) };
}

/** DM, nötiger Wurf und Chance; erst mit Rüstung und Reichweite. */
export function evaluateAttack(attack: Attack, campaign: Campaign): AttackOdds | undefined {
  if (attack.armor === undefined || attack.range === undefined) return undefined;
  return odds(attackerOf(attack, campaign), attack.armor, attack.range);
}

/**
 * Die klassische Tabelle der Waffe des Angreifers: je Rüstung eine Zeile, je Reichweite eine Spalte,
 * in jeder Zelle die Werte mit allen DMs des Angreifers; `undefined`, wo die Waffe nicht hinreicht.
 */
export function attackTable(campaign: Campaign, attack: Attack = {}): readonly (readonly (AttackOdds | undefined)[])[] {
  const attacker = attackerOf(attack, campaign);
  return armorClasses.map((armor) => ranges.map((range) => odds(attacker, armor, range)));
}

/** Würfelt den Angriff. Auch ein unmöglicher Angriff darf gewürfelt werden; er misslingt und steht trotzdem im Log. */
export function rollAttack(attack: Attack, campaign: Campaign, random: Random, clock: Clock): AttackResult {
  const attacker = attackerOf(attack, campaign);
  const evaluated = evaluateAttack(attack, campaign);
  if (!evaluated || attack.armor === undefined || attack.range === undefined) throw new DomainError('Erst Rüstung und Reichweite des Ziels wählen.');
  if (!canFight(attacker.state)) throw new DomainError(`${attacker.name} ist ${attacker.state === 'dead' ? 'tot' : 'bewusstlos'} und greift nicht an.`);
  const defender = defenderOf(attack, campaign);
  if (defender?.state === 'dead') throw new DomainError(`${defender.name} ist tot.`);
  const base = { kind: 'attack' as const, at: clock.now(), with: attacker.weapon.id, armor: attack.armor, range: attack.range, dice: roll2d6(random), dm: evaluated.dm.total, target: evaluated.target };
  if (attack.by !== undefined) return { ...base, by: attack.by, victim: attackCharacter(campaign).id };
  const character = attackCharacter(campaign);
  if (ammoOf(character)?.rounds === 0) throw new DomainError(`${attacker.weapon.name} ist leer. Erst nachladen.`);
  const skill = weaponSkill(character, attacker.weapon);
  const result: AttackResult = { ...base, for: character.id, ...(attack.against === undefined ? {} : { against: attack.against }) };
  return skill ? { ...result, uses: skill.of } : result;
}
