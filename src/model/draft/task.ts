import {
  activeSkills,
  canGoUnskilled,
  characterOf,
  characteristicDm,
  characteristics,
  chance2d6,
  DomainError,
  oddsOf,
  ref,
  roll2d6,
  skillDm,
  skillOf,
  valueOf,
  type Campaign,
  type Character,
  type CharacterId,
  type Characteristic,
  type Clock,
  type Random,
  type SkillLevel,
  type TaskResult,
} from '..';

/**
 * Eine Probe, solange sie im Charakter-Screen vorbereitet wird. Flüchtig: wird beim Würfeln zum
 * `TaskResult`, nie gespeichert. Sie nutzt eine Fertigkeitsstufe des Charakters (`uses`) oder ist
 * `unskilled`, nie beides; keins von beiden heißt: noch keine Fertigkeit gewählt.
 */
export interface Task {
  readonly for: CharacterId;
  readonly uses?: string;
  readonly unskilled: boolean;
  readonly counts: readonly Characteristic[];
}

/** Die abgeleiteten Werte einer Probe: `/dm`, `/need`, `/chance` und der Zielwert der gewählten Stufe. */
export interface TaskOdds {
  readonly dm: number;
  readonly target: number;
  /** Was auf 2W6 nötig ist: Zielwert minus DM. */
  readonly need: number;
  /** In Prozent, exakt aus den 36 Kombinationen. */
  readonly chance: number;
}

/** Wie ein Attribut in der Probe wirken würde. */
export interface CharacteristicOption {
  readonly characteristic: Characteristic;
  readonly value: number;
  readonly dm: -1 | 0 | 1;
  readonly counted: boolean;
  /** Erst nach der Fertigkeit; Attribute mit ±0 nie. */
  readonly selectable: boolean;
}

function activeCharacter(campaign: Campaign, id: CharacterId): Character {
  const character = characterOf(campaign, id);
  if (character.retired) throw new DomainError(`${character.name} ist ausgeblendet.`);
  if (character.dead) throw new DomainError(`${character.name} ist tot.`);
  return character;
}

function usedSkill(task: Task, character: Character): SkillLevel | undefined {
  if (task.uses === undefined) return undefined;
  const skill = activeSkills(character).find((s) => s.of === task.uses);
  if (!skill) throw new DomainError(`${character.name} hat ${skillOf(task.uses).name} nicht.`);
  return skill;
}

/** Eine neue Probe für einen Charakter. Wechselt man den Charakter, beginnt eine neue Probe. */
export function startTask(campaign: Campaign, id: CharacterId): Task {
  return { for: activeCharacter(campaign, id).id, unskilled: false, counts: [] };
}

export function hasSkill(task: Task): boolean {
  return task.uses !== undefined || task.unskilled;
}

function checkUnskilled(character: Character): void {
  if (!canGoUnskilled(character.skills)) throw new DomainError(`${character.name} hat Jack-of-all-Trades; das zählt als Stufe 0 statt „ohne Fertigkeit“.`);
}

/**
 * Wählt die Fertigkeit: eine Fertigkeitsstufe des Charakters oder `null` für „ohne Fertigkeit“; das
 * gibt es nicht, wenn der Charakter Jack-of-all-Trades hat. Die gewählte noch einmal wählen nimmt
 * die Wahl zurück; dann zählen auch keine Attribute mehr.
 */
export function chooseSkill(task: Task, campaign: Campaign, skill: string | null): Task {
  const character = activeCharacter(campaign, task.for);
  const same = skill === null ? task.unskilled : task.uses === skill;
  if (same) return { for: task.for, unskilled: false, counts: [] };
  if (skill === null) {
    checkUnskilled(character);
    return { for: task.for, unskilled: true, counts: task.counts };
  }
  usedSkill({ ...task, uses: skill }, character);
  return { for: task.for, uses: skill, unskilled: false, counts: task.counts };
}

export function characteristicOptions(task: Task, campaign: Campaign): readonly CharacteristicOption[] {
  const character = characterOf(campaign, task.for);
  return characteristics.map((characteristic) => {
    const value = valueOf(character.upp, characteristic);
    const dm = characteristicDm(value, ref.houseRules);
    const counted = task.counts.includes(characteristic);
    return { characteristic, value, dm, counted, selectable: hasSkill(task) && (dm !== 0 || counted) };
  });
}

/** Schaltet ein Attribut an oder aus. Geht erst nach der Fertigkeit und nie für Attribute mit ±0. */
export function toggleCharacteristic(task: Task, campaign: Campaign, characteristic: Characteristic): Task {
  const option = characteristicOptions(task, campaign).find((o) => o.characteristic === characteristic)!;
  if (!hasSkill(task)) throw new DomainError('Erst eine Fertigkeit wählen, dann Attribute.');
  if (!option.selectable) throw new DomainError(`${characteristic} hat keinen Einfluss auf die Probe.`);
  const counts = option.counted
    ? task.counts.filter((c) => c !== characteristic)
    : characteristics.filter((c) => c === characteristic || task.counts.includes(c));
  return { ...task, counts };
}

/** 2W6 + Fertigkeit + gewählte Attribute ≥ Zielwert der gewählten Stufe; Jack-of-all-Trades zählt als Stufe 0. */
export function evaluateTask(task: Task, campaign: Campaign): TaskOdds {
  const character = characterOf(campaign, task.for);
  const skill = usedSkill(task, character);
  let dm = skill ? skillDm(skill) : task.unskilled ? ref.houseRules.unskilledDm : 0;
  for (const c of task.counts) dm += characteristicDm(valueOf(character.upp, c), ref.houseRules);
  const target = oddsOf(campaign.odds).target;
  const need = target - dm;
  return { dm, target, need, chance: chance2d6(need) };
}

/** Würfelt die Probe. Auch eine unmögliche Probe darf man würfeln; sie misslingt und steht trotzdem im Log. */
export function rollTask(task: Task, campaign: Campaign, random: Random, clock: Clock): TaskResult {
  if (!hasSkill(task)) throw new DomainError('Erst eine Fertigkeit wählen.');
  if (task.unskilled) checkUnskilled(activeCharacter(campaign, task.for));
  const { dm, target } = evaluateTask(task, campaign);
  const result: TaskResult = {
    kind: 'task',
    at: clock.now(),
    for: task.for,
    counts: task.counts,
    odds: campaign.odds,
    dice: roll2d6(random),
    dm,
    target,
  };
  return task.uses === undefined ? result : { ...result, uses: task.uses };
}
