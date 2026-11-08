import {
  armorClasses,
  ATTACK_TARGET,
  attackDm,
  BURST_NEIGHBOUR_DM,
  BURST_ROLLS,
  canFight,
  chance2d6,
  checkRounds,
  currentEncounter,
  DomainError,
  encounterRangeOf,
  fighterOf,
  focusOf,
  hasRun,
  livingCharacters,
  neighboursOf,
  npcOf,
  parryDm,
  strikeDm,
  strikeOf,
  rangeDm,
  ranges,
  roll2d6,
  roundsFor,
  rowOf,
  turnOf,
  weaponSkill,
  woundStateOf,
  type ArmorClass,
  type AttackDm,
  type AttackResult,
  type Campaign,
  type Character,
  type Clock,
  type Combatant,
  type Fighter,
  type Random,
  type Range,
  type Strike,
  type Weapon,
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
  /** Feuerstoß (`true`) oder Einzelschuss; zählt nur bei einer Waffe, die beides kann. Fehlt: Feuerstoß. */
  readonly burst?: boolean;
  /** Ein SC schwächt seinen Schlag oder Hieb freiwillig, damit er nicht gegen die END zählt (SR 22). */
  readonly weakened?: boolean;
}

/** Schießt die Waffe einen Feuerstoß? Ohne `burst` nie, ohne `single` immer, sonst nach der Wahl (vorgewählt: Feuerstoß). */
export function firesBurst(weapon: Weapon, attack: Attack): boolean {
  if (weapon.burst === undefined) return false;
  if (weapon.single === undefined) return true;
  return attack.burst ?? true;
}

/** Kann man mit dieser Waffe zwischen Feuerstoß und Einzelschuss wählen? */
export function canChooseFire(weapon: Weapon): boolean {
  return weapon.burst !== undefined && weapon.single !== undefined;
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

/** Feuerstoß oder Einzelschuss; nur bei einer Waffe, die beides kann. */
export function chooseFire(attack: Attack, campaign: Campaign, burst: boolean): Attack {
  const weapon = attackerOf(attack, campaign).weapon;
  if (!canChooseFire(weapon)) throw new DomainError(`${weapon.name} hat keine Wahl zwischen Feuerstoß und Einzelschuss.`);
  return withRange({ ...attack, burst }, campaign);
}

/** Der Angriff mit der vorgewählten Feuerart, etwa nach einem Wechsel der Waffe. */
export function withoutFire(attack: Attack): Attack {
  return Object.fromEntries(Object.entries(attack).filter(([key]) => key !== 'burst'));
}

/** Behält die Reichweite, wenn die Waffe dorthin reicht. */
function withRange(attack: Attack, campaign: Campaign): Attack {
  const rest: Attack = Object.fromEntries(Object.entries(attack).filter(([key]) => key !== 'range'));
  const range = attack.range;
  const weapon = attackerOf(rest, campaign).weapon;
  return range !== undefined && rangeDm(rowOf(weapon, firesBurst(weapon, rest)), range) !== undefined ? { ...rest, range } : rest;
}

/** Der Angriff ohne Ziel und ohne NSC als Angreifer; nur die Reichweite, die Feuerart und das Schwächen bleiben. */
function untargeted(attack: Attack): Attack {
  return {
    ...(attack.range === undefined ? {} : { range: attack.range }),
    ...(attack.burst === undefined ? {} : { burst: attack.burst }),
    ...(attack.weakened === undefined ? {} : { weakened: attack.weakened }),
  };
}

/** Den Schlag oder Hieb schwächen (`true`) oder mit voller Kraft führen. */
export function chooseWeakened(attack: Attack, weakened: boolean): Attack {
  return { ...attack, weakened };
}

/** Was zum DM eines Angriffs neben der Matrix kommt: die Schlagart (geschwächt) und die Parade des Ziels (SR 22). */
export interface AttackExtras {
  readonly strike: Strike | undefined;
  readonly weakened: number;
  readonly parry: number;
}

/** Schlagart und Parade dieses Angriffs; ein NSC schwächt nie freiwillig. */
export function attackExtras(attack: Attack, campaign: Campaign): AttackExtras {
  const attacker = attackerOf(attack, campaign);
  const defender = defenderOf(attack, campaign);
  const strike = strikeOf(campaign, attacker.who, attacker.weapon, defender?.state, attack.weakened === true && attack.by === undefined);
  return { strike, weakened: strikeDm(attacker.weapon, strike), parry: parryDm(campaign, defender?.who, attacker.weapon) };
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

/**
 * Der Angriff dessen, der in der Kampfsimulation am Zug ist, auf dieses Ziel, mit der Reichweite
 * aus dem Band der Begegnung; sind die Parteien entkommen, hat er keine. Ist ein SC am Zug, muss er
 * oben stehen; greift ein NSC an, steht sein Ziel oben.
 */
export function turnAttack(campaign: Campaign, target: string): Attack {
  const turn = turnOf(campaign);
  const encounter = currentEncounter(campaign);
  if (!turn || !encounter) throw new DomainError('Es ist keiner am Zug.');
  if (hasRun(campaign, turn.side)) throw new DomainError(`Die ${turn.side === 'pcs' ? 'SC' : 'NSC'} sind in dieser Runde gelaufen und greifen nicht an.`);
  const top = attackCharacter(campaign);
  const range = encounterRangeOf(encounter);
  const at = range === undefined ? {} : { range };
  if (turn.side === 'pcs') {
    if (top.id !== turn.id) throw new DomainError('Der SC am Zug steht nicht oben.');
    return { ...aimAt({}, campaign, target), ...at };
  }
  if (top.id !== target) throw new DomainError('Das Ziel des NSC steht nicht oben.');
  return { ...attackBy({}, campaign, turn.id), ...at };
}

/** Wählt Rüstung und Reichweite des Ziels. Steht das Ziel fest, ist seine Rüstung die einzige. */
export function chooseTarget(campaign: Campaign, armor: ArmorClass, range: Range, attack: Attack = {}): Attack {
  const attacker = attackerOf(attack, campaign);
  if (!armorClasses.includes(armor) || !ranges.includes(range)) throw new DomainError('Diese Rüstung oder Reichweite gibt es nicht.');
  const defender = defenderOf(attack, campaign);
  if (defender && defender.armor !== armor) throw new DomainError(`${defender.name} trägt ${defender.armor}, nicht ${armor}.`);
  if (rangeDm(rowOf(attacker.weapon, firesBurst(attacker.weapon, attack)), range) === undefined) throw new DomainError(`Mit ${attacker.weapon.name} geht auf diese Reichweite kein Angriff.`);
  return { ...attack, armor, range };
}

/** Nach einem Wechsel der Waffe oder der Rüstung: das Ziel bleibt, die Reichweite nur, wenn die Waffe hinreicht. */
export function keepTarget(attack: Attack, campaign: Campaign): Attack {
  const defender = defenderOf(attack, campaign);
  const fixed = defender ? { ...attack, armor: defender.armor } : attack;
  return withRange(fixed, campaign);
}

function odds(attacker: Fighter, armor: ArmorClass, range: Range, burst: boolean, extras?: AttackExtras): AttackOdds | undefined {
  // STR und DEX zählen ohne die Wunden aus dem laufenden Kampf (SR 21).
  const dm = attackDm({ upp: attacker.fighting, skill: attacker.skill }, attacker.weapon, armor, range, rowOf(attacker.weapon, burst), extras);
  if (!dm) return undefined;
  const need = ATTACK_TARGET - dm.total;
  return { dm, target: ATTACK_TARGET, need, chance: chance2d6(need) };
}

/** DM, nötiger Wurf und Chance; erst mit Rüstung und Reichweite. */
export function evaluateAttack(attack: Attack, campaign: Campaign): AttackOdds | undefined {
  if (attack.armor === undefined || attack.range === undefined) return undefined;
  const attacker = attackerOf(attack, campaign);
  return odds(attacker, attack.armor, attack.range, firesBurst(attacker.weapon, attack), attackExtras(attack, campaign));
}

/**
 * Die klassische Tabelle der Waffe des Angreifers: je Rüstung eine Zeile, je Reichweite eine Spalte,
 * in jeder Zelle die Werte mit allen DMs des Angreifers; `undefined`, wo die Waffe nicht hinreicht.
 */
export function attackTable(campaign: Campaign, attack: Attack = {}): readonly (readonly (AttackOdds | undefined)[])[] {
  const attacker = attackerOf(attack, campaign);
  const burst = firesBurst(attacker.weapon, attack);
  const extras = attackExtras(attack, campaign);
  return armorClasses.map((armor) => ranges.map((range) => odds(attacker, armor, range, burst, extras)));
}

/** Die Partei des Ziels als Liste: NSC in der Reihenfolge der Begegnung (ohne Übernommene), SC in der der Kampagne. */
function partyOf(campaign: Campaign, who: Combatant): readonly Combatant[] {
  if ('pc' in who) return livingCharacters(campaign).map((c) => ({ pc: c.id }));
  const encounter = campaign.encounters.find((e) => e.npcs.some((n) => n.id === who.npc));
  return (encounter?.npcs ?? []).filter((n) => n.became === undefined).map((n) => ({ npc: n.id }));
}

function same(a: Combatant, b: Combatant): boolean {
  return 'pc' in a ? 'pc' in b && a.pc === b.pc : 'npc' in b && a.npc === b.npc;
}

/**
 * Die Nachbarn, die ein Angriff auf `who` mit trifft (Hausregel): Infrage kommen Kämpfer seiner
 * Partei, die nicht tot sind. Beim Feuerstoß der nächste darüber und der nächste darunter in der
 * Liste; bei der Shotgun bis zu `neighbours` ausgeloste.
 */
export function neighbourTargets(campaign: Campaign, who: Combatant, weapon: Weapon, burst: boolean, random: Random): readonly Combatant[] {
  const most = neighboursOf(weapon, burst);
  if (most === 0) return [];
  const party = partyOf(campaign, who);
  const at = party.findIndex((c) => same(c, who));
  const alive = (c: Combatant) => woundStateOf(campaign, c) !== 'dead';
  if (burst) {
    const above = party.slice(0, Math.max(0, at)).reverse().find(alive);
    const below = party.slice(at + 1).find(alive);
    return [above, below].filter((c): c is Combatant => c !== undefined).slice(0, most);
  }
  const pool = party.filter((c) => !same(c, who) && alive(c));
  const picked: Combatant[] = [];
  while (picked.length < most && pool.length > 0) picked.push(pool.splice(random.int(0, pool.length - 1), 1)[0]!);
  return picked;
}

/** Wie viele Schuss der Angriff verbraucht: ein Feuerstoß `burst`, sonst einer. */
export function attackRounds(attack: Attack, campaign: Campaign): number {
  const weapon = attackerOf(attack, campaign).weapon;
  return roundsFor(weapon, firesBurst(weapon, attack));
}

/**
 * Würfelt den Angriff als Garbe: der erste Wurf auf das Ziel, beim Feuerstoß ein zweiter, dann je
 * einer auf jeden Nachbarn (beim Feuerstoß mit DM −3). Die weiteren Würfe verweisen auf den ersten,
 * der an die nächste Stelle des Logs kommt. Ein einzelner Schuss, Schlag oder Hieb ist eine Garbe
 * aus einem Wurf. Auch ein unmöglicher Angriff darf gewürfelt werden; er misslingt und steht
 * trotzdem im Log.
 */
export function rollAttack(attack: Attack, campaign: Campaign, random: Random, clock: Clock): readonly AttackResult[] {
  const attacker = attackerOf(attack, campaign);
  const evaluated = evaluateAttack(attack, campaign);
  if (!evaluated || attack.armor === undefined || attack.range === undefined) throw new DomainError('Erst Rüstung und Reichweite des Ziels wählen.');
  if (!canFight(attacker.state)) throw new DomainError(`${attacker.name} ist ${attacker.state === 'dead' ? 'tot' : 'bewusstlos'} und greift nicht an.`);
  const defender = defenderOf(attack, campaign);
  if (defender?.state === 'dead') throw new DomainError(`${defender.name} ist tot.`);
  const weapon = attacker.weapon;
  const burst = firesBurst(weapon, attack);
  const range = attack.range;
  const at = clock.now();
  let who: Partial<AttackResult>;
  if (attack.by !== undefined) who = { by: attack.by };
  else {
    const character = attackCharacter(campaign);
    checkRounds(character, roundsFor(weapon, burst));
    const skill = weaponSkill(character, weapon);
    who = { for: character.id, ...(skill ? { uses: skill.of } : {}) };
  }
  const strike = attackExtras(attack, campaign).strike;
  const roll = (target: Combatant | undefined, armor: ArmorClass, dm: number, volley: number | undefined): AttackResult => ({
    kind: 'attack',
    at,
    ...who,
    ...(target === undefined ? {} : 'pc' in target ? { victim: target.pc } : { against: target.npc }),
    with: weapon.id,
    armor,
    range,
    dice: roll2d6(random),
    dm,
    target: evaluated.target,
    ...(volley === undefined ? {} : { volley }),
    ...(strike === undefined ? {} : { strike }),
  });
  const first = campaign.log.length;
  const target = defender?.who;
  const results = [roll(target, attack.armor, evaluated.dm.total, undefined)];
  if (burst) results.push(roll(target, attack.armor, evaluated.dm.total, first));
  if (target) {
    for (const neighbour of neighbourTargets(campaign, target, weapon, burst, random)) {
      const fighter = fighterOf(campaign, neighbour);
      const dm = odds(attacker, fighter.armor, range, burst)!.dm.total + (burst ? BURST_NEIGHBOUR_DM : 0);
      results.push(roll(neighbour, fighter.armor, dm, first));
    }
  }
  return results;
}

/** Wie viele Würfe ein Feuerstoß höchstens auf das Ziel hat; für die Anzeige. */
export const burstRolls = BURST_ROLLS;
