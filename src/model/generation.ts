import { addCharacter, setGeneration, type Campaign, type CharacterId } from './campaign';
import {
  ageOf,
  CRISIS_TARGET,
  MAX_CASH_ROLLS,
  pensionOf,
  replay,
  throwDm,
  type Career,
  type CareerRoll,
  type CareerState,
} from './career';
import { DomainError } from './errors';
import type { Random } from './ports';
import { cascadeOf, ref, serviceOf, skillOf, weaponFor, type Service, type Table } from './reference';
import { chance2d6, characteristics } from './rules';

/** Eine Charaktererschaffung: je Kampagne höchstens eine; sie hält nur ihren Lebenslauf. */
export interface Generation {
  readonly career: Career;
}

/** Was ein Wurf mit Zielwert braucht: DM, Zielwert, nötiger Wurf auf 2W6 und die Chance in Prozent. */
export interface ThrowOdds {
  readonly dm: number;
  readonly target: number;
  readonly need: number;
  readonly chance: number;
}

export function startGeneration(): Generation {
  return { career: { rolls: [] } };
}

export function stateOf(generation: Generation): CareerState {
  return replay(generation.career);
}

function odds(dm: number, target: number): ThrowOdds {
  return { dm, target, need: target - dm, chance: chance2d6(target - dm) };
}

function append(generation: Generation, roll: CareerRoll): Generation {
  const next: Generation = { career: { rolls: [...generation.career.rolls, roll] } };
  replay(next.career);
  return next;
}

function expectStep(state: CareerState, ...steps: CareerState['step'][]): void {
  if (!steps.includes(state.step)) throw new DomainError(`Das geht im Schritt „${state.step}“ nicht.`);
}

function die(random: Random): number {
  return random.int(1, 6);
}

function twoDice(random: Random): number[] {
  return [die(random), die(random)];
}

/** Wie die Musterung für jede Laufbahn stünde. */
export function serviceOptions(state: CareerState): readonly { readonly service: Service; readonly odds: ThrowOdds }[] {
  return ref.services.map((service) => ({ service, odds: odds(throwDm(service.enlistment, state.upp), service.enlistment.target) }));
}

/** Die Fertigkeitstabellen der Laufbahn; die mit `minEdu` nur mit genug EDU. */
export function tableOptions(state: CareerState): readonly { readonly table: Table; readonly available: boolean }[] {
  return (state.service?.skills ?? []).map((table) => ({ table, available: table.minEdu === undefined || state.upp.edu >= table.minEdu }));
}

/**
 * Was die offene Kaskade anbietet. Bei einer Waffe aus der Abmusterung: der Gegenstand, oder +1 in
 * der Fertigkeit, wenn man diese Waffe schon aus der Abmusterung hat.
 */
export function cascadeOptions(generation: Generation): readonly { readonly skill: string; readonly item: string | undefined }[] {
  const state = stateOf(generation);
  if (!state.cascade) return [];
  const { cascade, weapon } = state.cascade;
  const earlier = new Set(
    generation.career.rolls.flatMap((r) => (r.kind === 'benefit' && r.chosen !== undefined ? [r.chosen] : [])),
  );
  return cascade.options.map((skill) => ({ skill, item: weapon && !earlier.has(skill) ? weaponFor(skill).id : undefined }));
}

/** DM auf Geld (Gambling) und auf Sachwerte (ab Rang 5). */
export function musterDm(state: CareerState, kind: 'cash' | 'benefit'): number {
  if (kind === 'cash') return state.skills.some((s) => s.of === 'gambling' && s.level > 0) ? 1 : 0;
  return state.rank >= 5 ? 1 : 0;
}

export function canTakeCash(state: CareerState): boolean {
  return state.step === 'muster' && state.cashRolls < MAX_CASH_ROLLS;
}

/** Der Wurf, der im jetzigen Schritt ohne weitere Wahl dran ist, mit seinen Zahlen; sonst nichts. */
export function nextThrow(state: CareerState): ThrowOdds | undefined {
  const service = state.service;
  switch (state.step) {
    case 'survival':
      return odds(throwDm(service!.survival, state.upp), service!.survival.target);
    case 'commission':
      return odds(throwDm(service!.commission!, state.upp), service!.commission!.target);
    case 'promotion':
      return odds(throwDm(service!.promotion!, state.upp), service!.promotion!.target);
    case 'aging':
      return odds(0, state.aging!.target);
    case 'crisis':
      return odds(0, CRISIS_TARGET);
    case 'reenlist':
      return odds(0, service!.reenlist);
    default:
      return undefined;
  }
}

/**
 * Würfelt den Schritt, der keine Wahl braucht: das nächste Attribut, Einberufung, Überleben,
 * Offizierspatent, Beförderung, Altern oder Krise.
 */
export function rollNext(generation: Generation, random: Random): Generation {
  const state = stateOf(generation);
  switch (state.step) {
    case 'characteristics':
      return append(generation, { kind: 'characteristic', of: characteristics[state.rolled]!, dice: twoDice(random), dm: 0 });
    case 'draft': {
      const d = die(random);
      const service = ref.services.find((s) => s.draft === d)!;
      return append(generation, { kind: 'draft', dice: [d], dm: 0, for: service.id });
    }
    case 'survival':
    case 'commission':
    case 'promotion':
    case 'crisis': {
      const { dm, target } = nextThrow(state)!;
      const roll: CareerRoll = { kind: state.step, dice: twoDice(random), dm, target };
      return append(generation, state.step === 'crisis' ? { ...roll, of: state.crisis! } : roll);
    }
    case 'aging': {
      const row = state.aging!;
      return append(generation, { kind: 'aging', of: row.characteristic, against: row.id, dice: twoDice(random), dm: 0, target: row.target });
    }
    default:
      throw new DomainError(`Im Schritt „${state.step}“ braucht der Wurf eine Wahl.`);
  }
}

/** Wählt eine Laufbahn und würfelt die Musterung. */
export function enlist(generation: Generation, serviceId: string, random: Random): Generation {
  const state = stateOf(generation);
  expectStep(state, 'service');
  const service = serviceOf(serviceId);
  const dm = throwDm(service.enlistment, state.upp);
  return append(generation, { kind: 'enlistment', for: service.id, dice: twoDice(random), dm, target: service.enlistment.target });
}

/** Wählt eine Fertigkeitstabelle und würfelt darauf. */
export function rollSkill(generation: Generation, tableId: string, random: Random): Generation {
  const state = stateOf(generation);
  expectStep(state, 'skill');
  const option = tableOptions(state).find((o) => o.table.id === tableId);
  if (!option) throw new DomainError('Diese Tabelle gehört nicht zur Laufbahn.');
  if (!option.available) throw new DomainError(`${option.table.name} geht erst mit EDU ${option.table.minEdu}+.`);
  const d = die(random);
  return append(generation, { kind: 'skill', on: tableId, dice: [d], dm: 0, gained: option.table.rows[d - 1]!.id });
}

/** Wählt aus der offenen Kaskade; die Wahl gehört zum letzten Wurf. */
export function chooseCascade(generation: Generation, skill: string): Generation {
  const state = stateOf(generation);
  expectStep(state, 'cascade');
  if (!state.cascade!.cascade.options.includes(skill)) throw new DomainError(`${skillOf(skill).name} gehört nicht zu ${cascadeOf(state.cascade!.cascade.id).name}.`);
  const rolls = generation.career.rolls;
  const next: Generation = { career: { rolls: [...rolls.slice(0, -1), { ...rolls.at(-1)!, chosen: skill }] } };
  replay(next.career);
  return next;
}

/** Sagt, ob man bleiben will, und würfelt die Weiterverpflichtung; gewürfelt wird immer. */
export function reenlist(generation: Generation, wants: boolean, random: Random): Generation {
  const state = stateOf(generation);
  expectStep(state, 'reenlist');
  return append(generation, { kind: 'reenlist', wants, dice: twoDice(random), dm: 0, target: state.service!.reenlist });
}

/** Ein Abmusterungswurf auf Geld oder Sachwerte. */
export function muster(generation: Generation, kind: 'cash' | 'benefit', random: Random): Generation {
  const state = stateOf(generation);
  expectStep(state, 'muster');
  if (kind === 'cash' && !canTakeCash(state)) throw new DomainError(`Geld gibt es höchstens ${MAX_CASH_ROLLS}-mal.`);
  const table = kind === 'cash' ? state.service!.cash : state.service!.benefits;
  const dm = musterDm(state, kind);
  const d = die(random);
  return append(generation, { kind, dice: [d], dm, gained: table.rows[Math.min(d + dm, table.rows.length) - 1]!.id });
}

function thousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Die Herkunft aus Laufbahn, Rang, Terms und Alter: „Ex-Navy · Commander · 5 Terms · 38 Jahre“. */
export function backgroundOf(state: CareerState): string {
  const rank = state.rank > 0 ? state.service!.ranks[state.rank - 1]!.title : undefined;
  const terms = `${state.terms} ${state.terms === 1 ? 'Term' : 'Terms'}`;
  return [`Ex-${state.service!.name}`, rank, terms, `${ageOf(state.terms)} Jahre`].filter(Boolean).join(' · ');
}

/**
 * Schließt die Erschaffung ab: legt den Charakter an (Name, UPP, Fertigkeiten, Besitz, Credits,
 * Herkunft, Pension in der Notiz) mit dem Lebenslauf, und die Erschaffung ist zu.
 */
export function finishGeneration(campaign: Campaign, name: string): { campaign: Campaign; id: CharacterId } {
  const generation = campaign.generation;
  if (!generation) throw new DomainError('Es läuft keine Charaktererschaffung.');
  const state = stateOf(generation);
  expectStep(state, 'name');
  const pension = pensionOf(state.terms, state.dead);
  const { campaign: added, id } = addCharacter(
    campaign,
    {
      name,
      background: backgroundOf(state),
      equipment: '',
      credits: state.credits,
      note: pension > 0 ? `Pension Cr ${thousands(pension)} im Jahr` : '',
      upp: state.upp,
      skills: state.skills,
      possessions: state.possessions,
    },
    generation.career,
  );
  return { campaign: setGeneration(added, undefined), id };
}
