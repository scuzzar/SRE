import type { Upp } from './campaign';
import { DomainError } from './errors';
import { cascadeOf, gainOf, ref, serviceOf, skillOf, tableOf, weaponFor, type Aging, type Cascade, type Gain, type Service, type Throw } from './reference';
import { characteristics, type Characteristic } from './rules';

/**
 * Der Lebenslauf: alle Würfe einer Charaktererschaffung der Reihe nach, jeder mit der Entscheidung,
 * die zu ihm gehört. Alles andere (UPP, Fertigkeiten, Laufbahn, Terms, Rang, Geld, Gegenstände und
 * welcher Schritt dran ist) folgt aus dem Nachspielen (`replay`).
 */
export interface Career {
  readonly rolls: readonly CareerRoll[];
}

export type RollKind =
  | 'characteristic'
  | 'enlistment'
  | 'draft'
  | 'survival'
  | 'commission'
  | 'promotion'
  | 'skill'
  | 'aging'
  | 'crisis'
  | 'reenlist'
  | 'cash'
  | 'benefit';

/** Ein Wurf der Laufbahn. Welche Felder er hat, hängt von der Art ab (siehe domain-model.md). */
export interface CareerRoll {
  readonly kind: RollKind;
  /** Ein oder zwei Würfel. */
  readonly dice: readonly number[];
  readonly dm: number;
  readonly target?: number;
  /** Bei der Weiterverpflichtung: ob man bleiben will. */
  readonly wants?: boolean;
  /** Das Attribut bei `characteristic`, `aging`, `crisis`. */
  readonly of?: Characteristic;
  /** Die Laufbahn bei `enlistment` (gewählt) und `draft` (eingezogen). */
  readonly for?: string;
  /** Die Tabelle bei `skill`. */
  readonly on?: string;
  /** Die Zeile bei `skill`, `cash`, `benefit`. */
  readonly gained?: string;
  /** Die Fertigkeit, gewählt aus einer Kaskade. */
  readonly chosen?: string;
  /** Die Zeile der Aging Table bei `aging`. */
  readonly against?: string;
}

export type GenerationStep =
  | 'characteristics'
  | 'service'
  | 'draft'
  | 'survival'
  | 'commission'
  | 'promotion'
  | 'skill'
  | 'cascade'
  | 'aging'
  | 'crisis'
  | 'reenlist'
  | 'muster'
  | 'name'
  | 'dead';

/** Was ein Wurf bewirkt hat, für den Lebenslauf. */
export type Effect =
  | { readonly kind: 'characteristic'; readonly characteristic: Characteristic; readonly value: number; readonly change?: number }
  | { readonly kind: 'skill'; readonly skill: string; readonly level: number }
  | { readonly kind: 'item'; readonly item: string; readonly count: number }
  | { readonly kind: 'credits'; readonly amount: number }
  | { readonly kind: 'service'; readonly service: string; readonly drafted: boolean }
  | { readonly kind: 'rank'; readonly level: number; readonly title: string }
  | { readonly kind: 'term'; readonly term: number }
  | { readonly kind: 'muster'; readonly rolls: number }
  | { readonly kind: 'dead' }
  | { readonly kind: 'nothing' };

/** Woraus der DM eines Wurfs besteht: ein Attribut über seiner Schwelle, Gambling oder ein hoher Rang. */
export interface DmSource {
  readonly label: string;
  readonly dm: number;
}

/** Eine Bedingung eines Wurfs mit Zielwert und ob sie beim Stand der UPP greift. */
export interface ThrowCondition {
  readonly characteristic: Characteristic;
  readonly atLeast: number;
  readonly dm: number;
  readonly applies: boolean;
}

export interface RollOutcome {
  /** Der Term, in dem gewürfelt wurde; 0 vor dem ersten. */
  readonly term: number;
  readonly effects: readonly Effect[];
  /** Woraus der DM bestand, nach dem heutigen Stand der Tabellen; der Wurf selbst hält nur die Summe fest. */
  readonly sources: readonly DmSource[];
}

export interface Possessed {
  readonly of: string;
  readonly count: number;
}

/** Der Stand nach dem Nachspielen eines Lebenslaufs. */
export interface CareerState {
  readonly step: GenerationStep;
  /** Noch nicht gewürfelte Attribute stehen auf 0. */
  readonly upp: Upp;
  /** Wie viele Attribute schon gewürfelt sind, in der Reihenfolge der UPP. */
  readonly rolled: number;
  readonly service: Service | undefined;
  readonly drafted: boolean;
  readonly terms: number;
  readonly rank: number;
  readonly skills: readonly { readonly of: string; readonly level: number }[];
  readonly possessions: readonly Possessed[];
  readonly credits: number;
  readonly cashRolls: number;
  /** Abmusterungswürfe, die noch offen sind. */
  readonly musterLeft: number;
  /** Fertigkeitswürfe, die in diesem Term noch offen sind. */
  readonly skillsLeft: number;
  /** Die Kaskade, aus der man gerade wählt; mit `weapon` eine Waffe aus der Abmusterung. */
  readonly cascade: { readonly cascade: Cascade; readonly weapon: boolean } | undefined;
  /** Die Zeile der Aging Table, die als Nächstes dran ist. */
  readonly aging: Aging | undefined;
  /** Das Attribut der Krise, die gerade dran ist. */
  readonly crisis: Characteristic | undefined;
  readonly dead: boolean;
  /** Je Wurf, was er bewirkt hat. */
  readonly outcomes: readonly RollOutcome[];
}

export const START_AGE = 18;
export const TERM_YEARS = 4;
export const MAX_CASH_ROLLS = 3;
export const CRISIS_TARGET = 8;
/** Nach so vielen Terms geht es nur noch mit einer 12 weiter. */
export const MAX_TERMS = 7;
const MAX_VALUE = 15;

const uppKey = { STR: 'str', DEX: 'dex', END: 'end', INT: 'int', EDU: 'edu', SOC: 'soc' } as const;

/** Würfel und Arten mit einem oder zwei Würfeln. */
const oneDie: readonly RollKind[] = ['draft', 'skill', 'cash', 'benefit'];

export function sumOf(roll: CareerRoll): number {
  return roll.dice.reduce((a, b) => a + b, 0);
}

/** `/success`: Würfel + DM ≥ Zielwert; ohne Zielwert gibt es keinen Erfolg. */
export function successOf(roll: CareerRoll): boolean | undefined {
  return roll.target === undefined ? undefined : sumOf(roll) + roll.dm >= roll.target;
}

/** DM eines Wurfs der Laufbahn: je DM, dessen Attribut mindestens `atLeast` ist. */
export function throwDm(th: Throw, upp: Upp): number {
  return th.dms.reduce((dm, d) => (upp[uppKey[d.characteristic]] >= d.atLeast ? dm + d.dm : dm), 0);
}

/** Die Bedingungen eines Wurfs: welches Attribut ab welchem Wert welchen DM gibt, und ob es greift. */
export function throwConditions(th: Throw, upp: Upp): readonly ThrowCondition[] {
  return th.dms.map((d) => ({ ...d, applies: upp[uppKey[d.characteristic]] >= d.atLeast }));
}

/** DM-Quellen der Abmusterung: Gambling auf Geld, Rang 5+ auf Sachwerte. */
export function musterSources(kind: 'cash' | 'benefit', skills: readonly { readonly of: string; readonly level: number }[], rank: number): readonly DmSource[] {
  if (kind === 'cash') return skills.some((s) => s.of === 'gambling' && s.level > 0) ? [{ label: 'Gambling', dm: 1 }] : [];
  return rank >= 5 ? [{ label: `Rang ${rank}`, dm: 1 }] : [];
}

export function ageOf(terms: number): number {
  return START_AGE + TERM_YEARS * terms;
}

/** Pension im Jahr: ab 5 Terms Cr 4000, je weiteren Term Cr 2000 mehr. */
export function pensionOf(terms: number, dead: boolean): number {
  return dead || terms < 5 ? 0 : 4000 + 2000 * (terms - 5);
}

/** Abmusterungswürfe: einer je Term, dazu +1 bei Rang 1–2, +2 bei Rang 3–4, +3 bei Rang 5–6. */
export function musterRollsOf(terms: number, rank: number): number {
  return terms + Math.ceil(rank / 2);
}

/** Die Zeilen der Aging Table für einen Term: je Attribut die mit dem größten `fromTerm` ≤ Term. */
export function agingFor(term: number): readonly Aging[] {
  return characteristics.flatMap((c) => {
    const rows = ref.aging.filter((a) => a.characteristic === c && a.fromTerm <= term);
    const row = rows.sort((a, b) => b.fromTerm - a.fromTerm)[0];
    return row ? [row] : [];
  });
}

class Replay {
  step: GenerationStep = 'characteristics';
  upp: Record<keyof Upp, number> = { str: 0, dex: 0, end: 0, int: 0, edu: 0, soc: 0 };
  rolled = 0;
  service: Service | undefined;
  drafted = false;
  terms = 0;
  rank = 0;
  promoted = false;
  skills: { of: string; level: number }[] = [];
  possessions: Possessed[] = [];
  credits = 0;
  cashRolls = 0;
  musterLeft = 0;
  skillsLeft = 0;
  cascade: { cascade: Cascade; weapon: boolean } | undefined;
  agingQueue: Aging[] = [];
  crisis: Characteristic | undefined;
  dead = false;
  /** Waffen, die man schon aus der Abmusterung hat (ihre Fertigkeit). */
  musterWeapons = new Set<string>();
  outcomes: RollOutcome[] = [];
  private effects: Effect[] = [];

  apply(roll: CareerRoll, last: boolean): void {
    this.effects = [];
    const term = this.terms;
    this.checkDice(roll);
    this.expect(roll);
    const sources = this.sources(roll);
    switch (roll.kind) {
      case 'characteristic': {
        const c = characteristics[this.rolled]!;
        if (roll.of !== c) throw new DomainError(`Als Nächstes wird ${c} gewürfelt.`);
        this.set(c, sumOf(roll));
        this.rolled++;
        if (this.rolled === characteristics.length) this.step = 'service';
        break;
      }
      case 'enlistment': {
        const service = serviceOf(this.need(roll.for, 'die Laufbahn'));
        if (successOf(this.withTarget(roll))) this.enter(service, false);
        else this.step = 'draft';
        break;
      }
      case 'draft': {
        const service = ref.services.find((s) => s.draft === roll.dice[0]);
        if (!service || roll.for !== service.id) throw new DomainError('Die Einberufung passt nicht zum Würfel.');
        this.enter(service, true);
        break;
      }
      case 'survival':
        if (successOf(this.withTarget(roll))) this.afterSurvival();
        else this.die();
        break;
      case 'commission':
        if (successOf(this.withTarget(roll))) {
          this.promote(1);
          this.step = this.canPromote() ? 'promotion' : 'skill';
        } else {
          this.step = 'skill';
        }
        break;
      case 'promotion':
        if (successOf(this.withTarget(roll))) {
          this.promote(this.rank + 1);
          this.promoted = true;
        }
        this.step = 'skill';
        break;
      case 'skill': {
        const table = tableOf(this.need(roll.on, 'die Tabelle'));
        if (!this.service!.skills.some((t) => t.id === table.id)) throw new DomainError(`${table.name} gehört nicht zur Laufbahn.`);
        if (table.minEdu !== undefined && this.upp.edu < table.minEdu) throw new DomainError(`${table.name} geht erst mit EDU ${table.minEdu}+.`);
        const gain = this.row(roll, table.rows, roll.dice[0]!);
        if (!this.gain(gain, roll.chosen, last, false)) break;
        this.skillsLeft--;
        this.afterSkill();
        break;
      }
      case 'aging': {
        const row = this.agingQueue[0]!;
        if (roll.of !== row.characteristic || roll.against !== row.id) throw new DomainError(`Als Nächstes altert ${row.characteristic}.`);
        if (successOf(this.withTarget(roll))) {
          this.effects.push({ kind: 'nothing' });
        } else {
          const value = this.value(row.characteristic) - row.loss;
          this.set(row.characteristic, Math.max(0, value), -row.loss);
          if (value < 1) {
            this.crisis = row.characteristic;
            this.step = 'crisis';
            break;
          }
        }
        this.nextAging();
        break;
      }
      case 'crisis': {
        const crisis = this.crisis;
        if (crisis === undefined || roll.of !== crisis) throw new DomainError(`Die Krise betrifft ${crisis}.`);
        if (successOf(this.withTarget(roll))) {
          this.set(crisis, 1, 1 - this.value(crisis));
          this.crisis = undefined;
          this.nextAging();
        } else {
          this.die();
        }
        break;
      }
      case 'reenlist': {
        if (roll.wants === undefined) throw new DomainError('Bei der Weiterverpflichtung fehlt, ob man bleiben will.');
        const sum = sumOf(roll);
        const stays = sum === 12 || (this.terms < MAX_TERMS && roll.wants && successOf(this.withTarget(roll)) === true);
        if (stays) {
          this.beginTerm();
        } else {
          this.musterLeft = musterRollsOf(this.terms, this.rank);
          this.effects.push({ kind: 'muster', rolls: this.musterLeft });
          this.step = 'muster';
        }
        break;
      }
      case 'cash':
      case 'benefit': {
        const service = this.service!;
        if (roll.kind === 'cash' && this.cashRolls >= MAX_CASH_ROLLS) throw new DomainError(`Geld gibt es höchstens ${MAX_CASH_ROLLS}-mal.`);
        const table = roll.kind === 'cash' ? service.cash : service.benefits;
        const gain = this.row(roll, table.rows, Math.min(roll.dice[0]! + roll.dm, table.rows.length));
        if (roll.kind === 'cash') this.cashRolls++;
        if (!this.gain(gain, roll.chosen, last, true)) break;
        this.musterLeft--;
        if (this.musterLeft === 0) this.step = 'name';
        break;
      }
    }
    this.outcomes.push({ term: Math.max(term, this.terms), effects: this.effects, sources });
  }

  /** Woraus der DM des Wurfs besteht, beim Stand vor dem Wurf. */
  private sources(roll: CareerRoll): readonly DmSource[] {
    const th =
      roll.kind === 'enlistment' && roll.for !== undefined
        ? serviceOf(roll.for).enlistment
        : roll.kind === 'survival' || roll.kind === 'commission' || roll.kind === 'promotion'
          ? this.service?.[roll.kind]
          : undefined;
    if (th) return throwConditions(th, this.upp).flatMap((c) => (c.applies ? [{ label: c.characteristic, dm: c.dm }] : []));
    if (roll.kind === 'cash' || roll.kind === 'benefit') return musterSources(roll.kind, this.skills, this.rank);
    return [];
  }

  /** Ob die Art des Wurfs zum Schritt passt. */
  private expect(roll: CareerRoll): void {
    const allowed: Record<GenerationStep, readonly RollKind[]> = {
      characteristics: ['characteristic'],
      service: ['enlistment'],
      draft: ['draft'],
      survival: ['survival'],
      commission: ['commission'],
      promotion: ['promotion'],
      skill: ['skill'],
      cascade: [],
      aging: ['aging'],
      crisis: ['crisis'],
      reenlist: ['reenlist'],
      muster: ['cash', 'benefit'],
      name: [],
      dead: [],
    };
    if (!allowed[this.step].includes(roll.kind)) throw new DomainError(`Ein Wurf „${roll.kind}“ passt nicht zum Schritt „${this.step}“.`);
  }

  private checkDice(roll: CareerRoll): void {
    const count = oneDie.includes(roll.kind) ? 1 : 2;
    if (roll.dice.length !== count || roll.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
      throw new DomainError(`Ein Wurf „${roll.kind}“ hat ${count === 1 ? 'einen Würfel' : 'zwei Würfel'} von 1 bis 6.`);
    }
    if (!Number.isInteger(roll.dm) || (roll.target !== undefined && !Number.isInteger(roll.target))) throw new DomainError('DM und Zielwert sind ganze Zahlen.');
  }

  private need<T>(value: T | undefined, what: string): T {
    if (value === undefined) throw new DomainError(`Einem Wurf fehlt ${what}.`);
    return value;
  }

  private withTarget(roll: CareerRoll): CareerRoll {
    this.need(roll.target, 'der Zielwert');
    return roll;
  }

  /** Die Zeile, die der Wurf festhält; sie muss zur Würfelzahl passen. */
  private row(roll: CareerRoll, rows: readonly Gain[], index: number): Gain {
    const gain = gainOf(this.need(roll.gained, 'die Zeile'));
    if (rows[index - 1]?.id !== gain.id) throw new DomainError('Die Zeile passt nicht zum Würfel.');
    return gain;
  }

  private value(c: Characteristic): number {
    return this.upp[uppKey[c]];
  }

  private set(c: Characteristic, value: number, change?: number): void {
    this.upp[uppKey[c]] = value;
    this.effects.push(change === undefined ? { kind: 'characteristic', characteristic: c, value } : { kind: 'characteristic', characteristic: c, value, change });
  }

  private enter(service: Service, drafted: boolean): void {
    this.service = service;
    this.drafted = drafted;
    this.effects.push({ kind: 'service', service: service.id, drafted });
    if (service.onEnlistment) this.gain(service.onEnlistment, undefined, false, false);
    this.beginTerm();
  }

  private beginTerm(): void {
    this.terms++;
    this.promoted = false;
    this.skillsLeft = this.service!.skillsPerTerm ?? (this.terms === 1 ? 2 : 1);
    this.effects.push({ kind: 'term', term: this.terms });
    this.step = 'survival';
  }

  private canCommission(): boolean {
    return this.service!.commission !== undefined && this.rank === 0 && !(this.drafted && this.terms === 1);
  }

  private canPromote(): boolean {
    return this.service!.promotion !== undefined && this.rank >= 1 && this.rank < this.service!.ranks.length && !this.promoted;
  }

  private afterSurvival(): void {
    this.step = this.canCommission() ? 'commission' : this.canPromote() ? 'promotion' : 'skill';
  }

  private promote(level: number): void {
    const rank = this.service!.ranks[level - 1]!;
    this.rank = level;
    this.skillsLeft++;
    this.effects.push({ kind: 'rank', level, title: rank.title });
    if (rank.grants) this.gain(rank.grants, undefined, false, false);
  }

  private afterSkill(): void {
    if (this.skillsLeft > 0) {
      this.step = 'skill';
      return;
    }
    this.agingQueue = this.terms >= 4 ? [...agingFor(this.terms)] : [];
    this.step = this.agingQueue.length > 0 ? 'aging' : 'reenlist';
  }

  private nextAging(): void {
    this.agingQueue.shift();
    this.step = this.agingQueue.length > 0 ? 'aging' : 'reenlist';
  }

  private die(): void {
    this.dead = true;
    this.effects.push({ kind: 'dead' });
    this.step = 'dead';
  }

  /**
   * Wendet einen Zugewinn an. Eine Kaskade ohne Wahl geht nur beim letzten Wurf: Dann ist der Schritt
   * `cascade`, und es gibt `false` zurück.
   */
  private gain(gain: Gain, chosen: string | undefined, last: boolean, muster: boolean): boolean {
    if (gain.choose !== undefined) {
      const cascade = cascadeOf(gain.choose);
      if (chosen === undefined) {
        if (!last) throw new DomainError(`Aus ${cascade.name} wurde nichts gewählt.`);
        this.cascade = { cascade, weapon: gain.weapon };
        this.step = 'cascade';
        return false;
      }
      if (!cascade.options.includes(chosen)) throw new DomainError(`${skillOf(chosen).name} gehört nicht zu ${cascade.name}.`);
      this.cascade = undefined;
      if (gain.weapon && muster && !this.musterWeapons.has(chosen)) {
        this.musterWeapons.add(chosen);
        this.addItem(weaponFor(chosen).id, false);
      } else {
        this.addSkill(chosen);
      }
      return true;
    }
    if (chosen !== undefined) throw new DomainError('Eine Wahl gibt es nur bei einer Kaskade.');
    if (gain.skill !== undefined) this.addSkill(gain.skill);
    else if (gain.characteristic !== undefined) {
      const value = this.value(gain.characteristic) + gain.change!;
      this.set(gain.characteristic, Math.min(MAX_VALUE, Math.max(0, value)), gain.change);
    } else if (gain.item !== undefined) this.addItem(gain.item, true);
    else if (gain.credits !== undefined) {
      this.credits += gain.credits;
      this.effects.push({ kind: 'credits', amount: gain.credits });
    } else this.effects.push({ kind: 'nothing' });
    return true;
  }

  private addSkill(of: string): void {
    const skill = this.skills.find((s) => s.of === of);
    if (skill) skill.level++;
    else this.skills.push({ of, level: 1 });
    this.effects.push({ kind: 'skill', skill: of, level: skill?.level ?? 1 });
  }

  /** Ein Gegenstand mit `once` kommt nur einmal; ein zweites Mal bringt nichts. */
  private addItem(of: string, onceMatters: boolean): void {
    const index = this.possessions.findIndex((p) => p.of === of);
    const had = this.possessions[index];
    if (had && onceMatters && ref.items.find((i) => i.id === of)?.once) {
      this.effects.push({ kind: 'nothing' });
      return;
    }
    const count = (had?.count ?? 0) + 1;
    if (had) this.possessions[index] = { of, count };
    else this.possessions.push({ of, count });
    this.effects.push({ kind: 'item', item: of, count });
  }

  state(): CareerState {
    return {
      step: this.step,
      upp: { ...this.upp },
      rolled: this.rolled,
      service: this.service,
      drafted: this.drafted,
      terms: this.terms,
      rank: this.rank,
      skills: this.skills.map((s) => ({ ...s })),
      possessions: [...this.possessions],
      credits: this.credits,
      cashRolls: this.cashRolls,
      musterLeft: this.musterLeft,
      skillsLeft: this.skillsLeft,
      cascade: this.cascade,
      aging: this.step === 'aging' ? this.agingQueue[0] : undefined,
      crisis: this.crisis,
      dead: this.dead,
      outcomes: this.outcomes,
    };
  }
}

/**
 * Spielt einen Lebenslauf von vorn nach und prüft dabei jeden Wurf gegen die Regeln. Ergebnisse
 * folgen allein aus dem, was die Würfe festhalten (Würfel, DM, Zielwert, Zeile), nie aus dem heutigen
 * Stand der Tabellen. Verletzt ein Wurf eine Regel, gibt es einen DomainError.
 */
export function replay(career: Career): CareerState {
  const r = new Replay();
  career.rolls.forEach((roll, i) => r.apply(roll, i === career.rolls.length - 1));
  return r.state();
}
