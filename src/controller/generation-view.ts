import {
  ageOf,
  canTakeCash,
  cascadeOf,
  cascadeOptions,
  characteristics,
  gainOf,
  hexById,
  hexId,
  isWorld,
  itemOf,
  previousWorld,
  uwpCode,
  MAX_CASH_ROLLS,
  MAX_TERMS,
  musterSources,
  nextThrow,
  pensionOf,
  ref,
  replay,
  serviceOf,
  serviceOptions,
  shownLevel,
  skillOf,
  stateOf,
  successOf,
  sumOf,
  tableOf,
  tableOptions,
  type Career,
  type CareerRoll,
  type Characteristic,
  type DmSource,
  type Effect,
  type Gain,
  type RollKind,
  type Generation,
  type GenerationStep,
  type Hex,
  type Item,
  type ThrowOdds,
  type WeaponCharacteristic,
} from '../model';

/** Eine Zeile im Lebenslauf: ein Wurf mit dem, was er bewirkt hat. */
export interface CareerLine {
  readonly index: number;
  readonly kind: RollKind;
  /** 0 vor dem ersten Term. */
  readonly term: number;
  readonly label: string;
  readonly dice: readonly number[];
  readonly dm: number;
  /** Woraus der DM besteht, mit Namen: „INT +1“, „Gambling +1“. */
  readonly parts: readonly { readonly label: string; readonly dm: number }[];
  readonly total: number;
  readonly target: number | undefined;
  readonly success: boolean | undefined;
  readonly result: string;
  /** Was der Wurf eingebracht hat, knapp, Fertigkeiten mit Kürzel: „STR 10“, „SMG-1“, „Lieutenant“, „END −1“; für die Zusammenfassung eines Terms. */
  readonly gains: readonly string[];
}

export type GenerationAction =
  | { readonly kind: 'roll'; readonly label: string; readonly dice: 1 | 2; readonly odds: ThrowOdds | undefined }
  | { readonly kind: 'service'; readonly options: readonly ({ readonly id: string; readonly name: string } & ThrowOdds)[] }
  | {
      readonly kind: 'skill';
      readonly left: number;
      /** Die Tabellen der Laufbahn mit ihren Zeilen, je Zeile was sie bringt („+1 STR“, „Blade Combat“). */
      readonly options: readonly { readonly id: string; readonly name: string; readonly available: boolean; readonly rows: readonly string[] }[];
    }
  | {
      readonly kind: 'cascade';
      readonly name: string;
      /** Bei Blade und Gun Combat je Waffe das nötige und vorteilhafte Attribut, gemessen am UPP jetzt. */
      readonly options: readonly { readonly skill: string; readonly name: string; readonly item: string | undefined; readonly characteristic: WeaponCharacteristic | undefined }[];
    }
  | { readonly kind: 'reenlist'; readonly odds: ThrowOdds; readonly last: boolean }
  | {
      readonly kind: 'muster';
      readonly left: number;
      readonly cashLeft: number;
      /** Woraus der DM auf Geld bzw. Sachwerte besteht: Gambling, Rang 5+. */
      readonly cashDm: readonly DmSource[];
      readonly benefitDm: readonly DmSource[];
    }
  | {
      readonly kind: 'world';
      /** Die Heimatwelt oder die Welt eines Terms. */
      readonly for: 'homeworld' | 'term';
      /** Die fertigen Welten des Subsektors. */
      readonly worlds: readonly WorldChoice[];
      /** „Wie zuletzt“: die Welt des vorigen Terms, im ersten die Heimatwelt. */
      readonly previous: WorldChoice | undefined;
    }
  | { readonly kind: 'name' }
  | { readonly kind: 'dead' };

/** Eine Welt zur Wahl. */
export interface WorldChoice {
  readonly id: string;
  readonly name: string;
  readonly uwp: string;
}

export interface GenerationView {
  readonly step: GenerationStep;
  /** Was als Nächstes dran ist, in Worten. */
  readonly prompt: string;
  /** Laufbahn, Rang und Term, z. B. „Navy · Lt Cmdr · Term 3“; vor der Musterung leer. */
  readonly status: string;
  readonly age: number;
  readonly upp: readonly { readonly characteristic: Characteristic; readonly value: number | undefined }[];
  /** Ohne `level` bei Jack-of-all-Trades. */
  readonly skills: readonly { readonly name: string; readonly short: string; readonly level: number | undefined }[];
  readonly possessions: readonly { readonly name: string; readonly count: number }[];
  readonly credits: number;
  readonly pension: number;
  readonly lines: readonly CareerLine[];
  /** Der Name der Heimatwelt, sobald gewählt. */
  readonly homeworld: string | undefined;
  /** Je Term der Name seiner Welt, soweit gewählt. */
  readonly termWorlds: readonly string[];
  readonly action: GenerationAction;
  readonly error: string | undefined;
}

/** Der Name einer Welt, auf die verwiesen wird; ihr Feld, falls sie nicht (mehr) da ist. */
export function worldName(hexes: readonly Hex[], id: string): string {
  return hexById(hexes, id)?.name ?? id;
}

function worldChoice(hexes: readonly Hex[], id: string): WorldChoice {
  const hex = hexById(hexes, id);
  return { id, name: worldName(hexes, id), uwp: hex ? uwpCode(hex.uwp) : '' };
}

/** Die fertigen Welten des Subsektors zur Wahl, nach Namen. */
export function worldChoices(hexes: readonly Hex[]): readonly WorldChoice[] {
  return hexes
    .filter(isWorld)
    .map((h) => worldChoice(hexes, hexId(h.column, h.row)))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

/** Der Name eines Gegenstands, mit TL, wenn es ihn in mehreren TL gibt: „Vacc Suit (TL 8)“. */
export function itemLabel(item: Item): string {
  const twins = ref.items.filter((i) => i.name === item.name).length;
  return twins > 1 && item.tl !== undefined ? `${item.name} (TL ${item.tl})` : item.name;
}

function credits(n: number): string {
  return `Cr ${n.toLocaleString('de-DE')}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0';
}

/** Was eine Zeile einer Tabelle bringt, knapp: „+1 STR“, „Pilot“, „Blade Combat“, „Low Passage“, „Cr 5.000“. */
export function gainText(gain: Gain): string {
  if (gain.skill !== undefined) return skillOf(gain.skill).name;
  if (gain.choose !== undefined) return cascadeOf(gain.choose).name;
  if (gain.characteristic !== undefined) return `${signed(gain.change!)} ${gain.characteristic}`;
  if (gain.item !== undefined) return itemLabel(itemOf(gain.item));
  if (gain.credits !== undefined) return credits(gain.credits);
  return '–';
}

/** Eine Fertigkeit mit Kürzel: „SMG-1“, bei Jack-of-all-Trades ohne Stufe: „JoT“. */
function shortSkillText(of: string, level: number): string {
  const shown = shownLevel({ of, level });
  return shown === undefined ? skillOf(of).short : `${skillOf(of).short}-${shown}`;
}

function effectText(effect: Effect): string | undefined {
  switch (effect.kind) {
    case 'characteristic':
      return effect.change === undefined ? `${effect.characteristic} ${effect.value}` : `${effect.characteristic} ${signed(effect.change)}`;
    case 'skill':
    {
      const level = shownLevel({ of: effect.skill, level: effect.level });
      return level === undefined ? skillOf(effect.skill).name : `${skillOf(effect.skill).name}-${level}`;
    }
    case 'item':
      return effect.count > 1 ? `${itemLabel(itemOf(effect.item))} (${effect.count})` : itemLabel(itemOf(effect.item));
    case 'credits':
      return credits(effect.amount);
    case 'rank':
      return effect.title;
    case 'dead':
      return 'tot';
    case 'nothing':
      return 'nichts';
    case 'again':
      return 'schon da · noch ein Wurf';
    case 'muster':
      return `${effect.rolls} ${effect.rolls === 1 ? 'Abmusterungswurf' : 'Abmusterungswürfe'}`;
    case 'service':
    case 'term':
      return undefined;
  }
}

function label(roll: CareerRoll): string {
  switch (roll.kind) {
    case 'characteristic':
      return roll.of!;
    case 'enlistment':
      return `Musterung ${serviceOf(roll.for!).name}`;
    case 'draft':
      return 'Einberufung';
    case 'survival':
      return 'Überleben';
    case 'commission':
      return 'Offizierspatent';
    case 'promotion':
      return 'Beförderung';
    case 'skill': {
      const table = tableOf(roll.on!);
      return table.minEdu === undefined ? table.name : `${table.name} ${table.minEdu}+`;
    }
    case 'aging':
      return `Altern ${roll.of}`;
    case 'crisis':
      return `Krise ${roll.of}`;
    case 'reenlist':
      return roll.wants ? 'Weiterverpflichtung' : 'Abmustern';
    case 'cash':
      return 'Abmusterung: Geld';
    case 'benefit':
      return 'Abmusterung: Sachwerte';
  }
}

function result(roll: CareerRoll, effects: readonly Effect[]): string {
  const success = successOf(roll);
  const gains = effects.flatMap((e) => (e.kind === 'characteristic' || e.kind === 'skill' || e.kind === 'item' ? [effectText(e)!] : []));
  const withGains = (head: string) => [head, ...gains].join(' · ');
  const pending = () => {
    const gained = roll.gained ? gainOf(roll.gained) : undefined;
    const cascade = gained?.choose ? cascadeOf(gained.choose) : undefined;
    return cascade ? `${cascade.name}: wählen` : undefined;
  };
  switch (roll.kind) {
    case 'characteristic':
      return String(sumOf(roll));
    case 'enlistment':
      return success ? withGains('angenommen') : 'abgelehnt';
    case 'draft':
      return withGains(serviceOf(roll.for!).name);
    case 'survival':
      return success ? 'überlebt' : 'tot';
    case 'commission':
    case 'promotion': {
      const rank = effects.find((e) => e.kind === 'rank');
      if (!rank) return roll.kind === 'commission' ? 'kein Patent' : 'keine Beförderung';
      return withGains(effectText(rank)!);
    }
    case 'aging':
      return success ? 'gehalten' : gains.join(' · ');
    case 'crisis':
      return success ? 'überstanden' : 'tot';
    case 'reenlist': {
      const stays = effects.some((e) => e.kind === 'term');
      if (stays) return sumOf(roll) === 12 && !roll.wants ? 'muss bleiben (12)' : 'bleibt';
      const muster = effects.find((e) => e.kind === 'muster');
      return `mustert ab${muster ? ` · ${effectText(muster)}` : ''}`;
    }
    case 'skill':
    case 'cash':
    case 'benefit': {
      const texts = effects.flatMap((e) => {
        const text = effectText(e);
        return text === undefined ? [] : [text];
      });
      return texts.length > 0 ? texts.join(' · ') : (pending() ?? 'nichts');
    }
  }
}

/** Der Lebenslauf als Zeilen. */
export function careerLines(career: Career): readonly CareerLine[] {
  const { outcomes } = replay(career);
  return career.rolls.map((roll, index) => {
    const outcome = outcomes[index]!;
    // Wer abmustern will, hat weder Erfolg noch Fehlschlag; der Zielwert zählt für ihn nicht, nur eine 12.
    const leaving = roll.kind === 'reenlist' && !roll.wants;
    return {
      index,
      kind: roll.kind,
      term: outcome.term,
      label: label(roll),
      dice: roll.dice,
      dm: roll.dm,
      parts: outcome.sources,
      total: sumOf(roll) + roll.dm,
      target: leaving ? undefined : roll.target,
      success: leaving ? undefined : roll.kind === 'reenlist' ? outcome.effects.some((e) => e.kind === 'term') : successOf(roll),
      result: result(roll, outcome.effects),
      gains: outcome.effects.flatMap((e) => {
        const gained = e.kind === 'characteristic' || e.kind === 'skill' || e.kind === 'item' || e.kind === 'credits' || e.kind === 'rank';
        const text = e.kind === 'skill' ? shortSkillText(e.skill, e.level) : gained ? effectText(e) : undefined;
        return text === undefined ? [] : [text];
      }),
    };
  });
}

const stepNames: Partial<Record<GenerationStep, string>> = {
  survival: 'Überleben',
  commission: 'Offizierspatent',
  promotion: 'Beförderung',
};

export function generationView(generation: Generation, hexes: readonly Hex[], error: string | undefined): GenerationView {
  const state = stateOf(generation);
  const service = state.service;
  const rank = service && state.rank > 0 ? service.ranks[state.rank - 1]!.title : undefined;
  const status = service ? [service.name, rank, `Term ${state.terms}`].filter(Boolean).join(' · ') : '';
  const term = `Term ${state.terms}`;

  let prompt: string;
  let action: GenerationAction;
  const odds = nextThrow(state);
  switch (state.step) {
    case 'characteristics': {
      const c = characteristics[state.rolled]!;
      prompt = `Attribute würfeln: ${c} (${state.rolled + 1} von 6)`;
      action = { kind: 'roll', label: `${c} würfeln`, dice: 2, odds: undefined };
      break;
    }
    case 'homeworld':
    case 'world': {
      const previous = previousWorld(state);
      prompt = state.step === 'homeworld' ? 'Heimatwelt: eine Welt wählen oder auf der Karte eine neue erschaffen' : `${term}: Auf welcher Welt? Wählen oder neu erschaffen`;
      action = { kind: 'world', for: state.step === 'homeworld' ? 'homeworld' : 'term', worlds: worldChoices(hexes), previous: previous === undefined ? undefined : worldChoice(hexes, previous) };
      break;
    }
    case 'service':
      prompt = 'Laufbahn wählen; dann wird die Musterung gewürfelt';
      action = {
        kind: 'service',
        options: serviceOptions(state).map((o) => ({ id: o.service.id, name: o.service.name, ...o.odds })),
      };
      break;
    case 'draft':
      prompt = 'Musterung abgelehnt: Einberufung (1W6 bestimmt die Laufbahn)';
      action = { kind: 'roll', label: 'Einberufung würfeln', dice: 1, odds: undefined };
      break;
    case 'survival':
    case 'commission':
    case 'promotion':
      prompt = `${term}: ${stepNames[state.step]}`;
      action = { kind: 'roll', label: `${stepNames[state.step]} würfeln`, dice: 2, odds };
      break;
    case 'skill':
      prompt = `${term}: ${state.skillsLeft === 1 ? 'eine Fertigkeit' : `${state.skillsLeft} Fertigkeiten`}; Tabelle wählen`;
      action = {
        kind: 'skill',
        left: state.skillsLeft,
        options: tableOptions(state).map(({ table, available }) => ({
          id: table.id,
          name: table.minEdu === undefined ? table.name : `${table.name} (EDU ${table.minEdu}+)`,
          available,
          rows: table.rows.map(gainText),
        })),
      };
      break;
    case 'cascade': {
      const cascade = state.cascade!;
      prompt = cascade.weapon ? `${cascade.cascade.name}: Waffe wählen` : `${cascade.cascade.name}: Fertigkeit wählen`;
      action = {
        kind: 'cascade',
        name: cascade.cascade.name,
        options: cascadeOptions(generation).map((o) => ({
          skill: o.skill,
          name: skillOf(o.skill).name,
          item: o.item && itemLabel(itemOf(o.item)),
          characteristic: o.characteristic,
        })),
      };
      break;
    }
    case 'aging':
      prompt = `Ende von ${term}: Altern ${state.aging!.characteristic} (−${state.aging!.loss} unter ${state.aging!.target}+)`;
      action = { kind: 'roll', label: `Altern ${state.aging!.characteristic} würfeln`, dice: 2, odds };
      break;
    case 'crisis':
      prompt = `Krise: ${state.crisis} ist auf 0 gefallen; misslingt der Wurf, stirbt der Charakter`;
      action = { kind: 'roll', label: 'Krise würfeln', dice: 2, odds };
      break;
    case 'reenlist': {
      const last = state.terms >= MAX_TERMS;
      prompt = last ? `Ende von ${term}: nach ${MAX_TERMS} Terms bleibt nur, wer eine 12 würfelt` : `Ende von ${term}: weiterverpflichten?`;
      action = { kind: 'reenlist', odds: odds!, last };
      break;
    }
    case 'muster':
      prompt = `Abmusterung: noch ${state.musterLeft} ${state.musterLeft === 1 ? 'Wurf' : 'Würfe'}`;
      action = {
        kind: 'muster',
        left: state.musterLeft,
        // Geld höchstens dreimal, und nie öfter, als es noch Würfe gibt.
        cashLeft: canTakeCash(state) ? Math.min(MAX_CASH_ROLLS - state.cashRolls, state.musterLeft) : 0,
        cashDm: musterSources('cash', state.skills, state.rank),
        benefitDm: musterSources('benefit', state.skills, state.rank),
      };
      break;
    case 'name':
      prompt = 'Fertig: Namen eingeben und übernehmen';
      action = { kind: 'name' };
      break;
    case 'dead':
      prompt = state.terms > 0 ? `Gestorben in ${term}` : 'Gestorben';
      action = { kind: 'dead' };
      break;
  }

  return {
    step: state.step,
    prompt,
    status,
    age: ageOf(state.terms),
    upp: characteristics.map((characteristic, i) => ({
      characteristic,
      value: i < state.rolled ? state.upp[characteristic.toLowerCase() as keyof typeof state.upp] : undefined,
    })),
    skills: state.skills.map((s) => {
      const skill = skillOf(s.of);
      return { name: skill.name, short: skill.short, level: shownLevel(s) };
    }),
    possessions: state.possessions.map((p) => ({ name: itemLabel(itemOf(p.of)), count: p.count })),
    credits: state.credits,
    pension: pensionOf(state.terms, state.dead),
    lines: careerLines(generation.career),
    homeworld: state.homeworld === undefined ? undefined : worldName(hexes, state.homeworld),
    termWorlds: state.worlds.map((id) => worldName(hexes, id)),
    action,
    error,
  };
}
