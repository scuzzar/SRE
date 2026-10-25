import { describe, expect, it } from 'vitest';
import { createCampaign, setGeneration } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { agingFor, musterRollsOf, pensionOf, replay } from './career';
import {
  cascadeOptions,
  chooseCascade,
  enlist,
  finishGeneration,
  muster,
  nextThrow,
  reenlist,
  rollNext,
  rollSkill,
  serviceOptions,
  startGeneration,
  stateOf,
  tableOptions,
  type Generation,
} from './generation';
import { fixedRandom } from './testing';

/** Würfelt die sechs Attribute, je zwei Würfel aus `pairs`. */
function withCharacteristics(...pairs: [number, number][]): Generation {
  let g = startGeneration();
  for (const [a, b] of pairs) g = rollNext(g, fixedRandom(a, b));
  return g;
}

/** UPP 7A8975 wie Kira: STR 7, DEX 10, END 8, INT 9, EDU 7, SOC 5. */
const kira = () => withCharacteristics([3, 4], [5, 5], [4, 4], [4, 5], [3, 4], [2, 3]);

describe('Charaktererschaffung', () => {
  it('würfelt die Attribute einzeln in der Reihenfolge der UPP', () => {
    let g = startGeneration();
    g = rollNext(g, fixedRandom(3, 4));
    expect(stateOf(g)).toMatchObject({ step: 'characteristics', rolled: 1, upp: { str: 7, dex: 0 } });
    g = kira();
    expect(stateOf(g)).toMatchObject({ step: 'service', rolled: 6, upp: { str: 7, dex: 10, end: 8, int: 9, edu: 7, soc: 5 } });
    expect(g.career.rolls[1]).toEqual({ kind: 'characteristic', of: 'DEX', dice: [5, 5], dm: 0 });
  });

  it('zeigt für jede Laufbahn, was die Musterung braucht', () => {
    const navy = serviceOptions(stateOf(kira())).find((o) => o.service.id === 'navy')!;
    // Navy 8+, INT 9 ≥ 8 gibt +1, EDU 7 < 9 nichts.
    expect(navy.odds).toMatchObject({ dm: 1, target: 8, need: 7 });
    expect(navy.odds.conditions).toEqual([
      { characteristic: 'INT', atLeast: 8, dm: 1, applies: true },
      { characteristic: 'EDU', atLeast: 9, dm: 2, applies: false },
    ]);
  });

  it('hält fest, welche Attribute den DM eines Wurfs gebracht haben', () => {
    let g = enlist(kira(), 'marines', fixedRandom(6, 6));
    expect(stateOf(g).outcomes.at(-1)!.sources).toEqual([{ label: 'INT', dm: 1 }]);
    g = rollNext(g, fixedRandom(6, 6)); // Überleben: END 8 ≥ 8 gibt +2
    expect(stateOf(g).outcomes.at(-1)!.sources).toEqual([{ label: 'END', dm: 2 }]);
    expect(nextThrow(stateOf(g))!.conditions).toEqual([{ characteristic: 'EDU', atLeast: 7, dm: 1, applies: true }]);
  });

  it('nimmt bei gelungener Musterung die Laufbahn mit dem, was sie mitgibt, und beginnt den ersten Term', () => {
    const g = enlist(kira(), 'marines', fixedRandom(6, 6));
    expect(g.career.rolls.at(-1)).toEqual({ kind: 'enlistment', for: 'marines', dice: [6, 6], dm: 1, target: 9 });
    const state = stateOf(g);
    expect(state).toMatchObject({ step: 'survival', terms: 1, drafted: false, skills: [{ of: 'cutlass', level: 1 }] });
    expect(state.service?.id).toBe('marines');
  });

  it('beruft nach gescheiterter Musterung ein; im ersten Term gibt es dann kein Patent', () => {
    let g = enlist(kira(), 'navy', fixedRandom(1, 1));
    expect(stateOf(g).step).toBe('draft');
    g = rollNext(g, fixedRandom(3));
    expect(g.career.rolls.at(-1)).toEqual({ kind: 'draft', dice: [3], dm: 0, for: 'army' });
    expect(stateOf(g)).toMatchObject({ drafted: true, skills: [{ of: 'rifle', level: 1 }] });
    g = rollNext(g, fixedRandom(6, 6)); // überlebt
    expect(stateOf(g).step).toBe('skill');
  });

  it('endet mit dem Tod, wenn das Überleben misslingt', () => {
    let g = enlist(kira(), 'scouts', fixedRandom(6, 6));
    expect(nextThrow(stateOf(g))).toMatchObject({ target: 7, dm: 0 });
    g = rollNext(g, fixedRandom(1, 2));
    expect(stateOf(g)).toMatchObject({ step: 'dead', dead: true });
    expect(() => rollNext(g, fixedRandom(6, 6))).toThrow();
  });

  it('gibt mit Patent und Beförderung im selben Term je eine Fertigkeit mehr', () => {
    let g = enlist(kira(), 'army', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6)); // Überleben
    expect(stateOf(g).step).toBe('commission');
    g = rollNext(g, fixedRandom(6, 6)); // Patent: Lieutenant, SMG-1
    expect(stateOf(g)).toMatchObject({ step: 'promotion', rank: 1 });
    expect(stateOf(g).skills).toContainEqual({ of: 'submachinegun', level: 1 });
    g = rollNext(g, fixedRandom(6, 6)); // Beförderung: Captain
    expect(stateOf(g)).toMatchObject({ step: 'skill', rank: 2, skillsLeft: 4 });
  });

  it('wählt eine Tabelle vor dem Wurf; Advanced Education 8+ nur mit EDU 8+', () => {
    let g = enlist(kira(), 'navy', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6)); // Überleben
    g = rollNext(g, fixedRandom(1, 1)); // kein Patent
    expect(tableOptions(stateOf(g)).map((o) => o.available)).toEqual([true, true, true, false]);
    expect(() => rollSkill(g, 'navy.education8', fixedRandom(1))).toThrow(/EDU 8/);
    g = rollSkill(g, 'navy.personal', fixedRandom(5)); // +1 EDU
    expect(stateOf(g)).toMatchObject({ upp: { edu: 8 }, skillsLeft: 1 });
    expect(tableOptions(stateOf(g)).map((o) => o.available)).toEqual([true, true, true, true]);
  });

  it('fragt bei einer Kaskade nach der Fertigkeit und rechnet sie dann', () => {
    let g = enlist(kira(), 'navy', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(1, 1));
    g = rollSkill(g, 'navy.service', fixedRandom(5)); // Blade Cbt
    expect(stateOf(g)).toMatchObject({ step: 'cascade', skillsLeft: 2 });
    expect(cascadeOptions(g).map((o) => o.skill)).toContain('cutlass');
    expect(() => rollSkill(g, 'navy.service', fixedRandom(1))).toThrow();
    g = chooseCascade(g, 'cutlass');
    expect(g.career.rolls.at(-1)).toMatchObject({ kind: 'skill', gained: 'navy.service.5', chosen: 'cutlass' });
    expect(stateOf(g)).toMatchObject({ step: 'skill', skillsLeft: 1, skills: [{ of: 'cutlass', level: 1 }] });
  });

  it('nimmt die Zeilen der Aging Table mit dem größten Term, der passt', () => {
    expect(agingFor(3)).toEqual([]);
    expect(agingFor(4).map((a) => a.id)).toEqual(['aging.4.str', 'aging.4.dex', 'aging.4.end']);
    expect(agingFor(13).map((a) => a.id)).toEqual(['aging.12.str', 'aging.12.dex', 'aging.12.end', 'aging.12.int']);
  });

  it('verpflichtet bei einer 12 immer weiter und mustert sonst ab, wer nicht will oder es nicht schafft', () => {
    const atReenlist = () => {
      let g = enlist(kira(), 'other', fixedRandom(6, 6));
      g = rollNext(g, fixedRandom(6, 6));
      g = rollSkill(g, 'other.personal', fixedRandom(1));
      return rollSkill(g, 'other.personal', fixedRandom(2));
    };
    expect(stateOf(atReenlist()).step).toBe('reenlist');
    expect(stateOf(reenlist(atReenlist(), false, fixedRandom(6, 6)))).toMatchObject({ step: 'survival', terms: 2 });
    expect(stateOf(reenlist(atReenlist(), true, fixedRandom(3, 3)))).toMatchObject({ step: 'survival', terms: 2 });
    expect(stateOf(reenlist(atReenlist(), false, fixedRandom(3, 3)))).toMatchObject({ step: 'muster', musterLeft: 1 });
    expect(stateOf(reenlist(atReenlist(), true, fixedRandom(1, 2)))).toMatchObject({ step: 'muster', musterLeft: 1 });
  });

  it('mustert ab: Geld höchstens dreimal, TAS nur einmal, eine zweite gleiche Waffe als Fertigkeit', () => {
    // Navy, 4 Terms ohne Rang: 4 Abmusterungswürfe.
    let g = enlist(kira(), 'navy', fixedRandom(6, 6));
    for (let term = 1; term <= 4; term++) {
      g = rollNext(g, fixedRandom(6, 6)); // Überleben
      g = rollNext(g, fixedRandom(1, 1)); // kein Patent
      for (let i = 0; i < (term === 1 ? 2 : 1); i++) g = rollSkill(g, 'navy.personal', fixedRandom(1));
      while (stateOf(g).step === 'aging') g = rollNext(g, fixedRandom(6, 6));
      g = reenlist(g, term < 4, fixedRandom(6, 5));
    }
    expect(stateOf(g)).toMatchObject({ step: 'muster', terms: 4, musterLeft: 4 });
    g = muster(g, 'benefit', fixedRandom(5)); // Travellers'
    g = muster(g, 'benefit', fixedRandom(5)); // noch einmal: nichts
    g = muster(g, 'benefit', fixedRandom(4)); // Blade
    expect(stateOf(g).step).toBe('cascade');
    expect(cascadeOptions(g).find((o) => o.skill === 'cutlass')?.item).toBe('cutlass');
    g = chooseCascade(g, 'cutlass');
    expect(stateOf(g).possessions).toEqual([
      { of: 'travellers-aid-society', count: 1 },
      { of: 'cutlass', count: 1 },
    ]);
    expect(stateOf(g).outcomes.at(-2)!.effects).toEqual([{ kind: 'nothing' }]);
    g = muster(g, 'cash', fixedRandom(6));
    expect(stateOf(g)).toMatchObject({ step: 'name', credits: 50000 });
    expect(pensionOf(4, false)).toBe(0);
    expect(musterRollsOf(5, 3)).toBe(7);
  });

  it('gibt bei der zweiten gleichen Waffe aus der Abmusterung +1 in der Fertigkeit', () => {
    // Marines, 2 Terms ohne Rang: 2 Abmusterungswürfe; Cutlass-1 bringt die Musterung mit.
    let g = enlist(kira(), 'marines', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(1, 1));
    g = rollSkill(g, 'marines.personal', fixedRandom(1));
    g = rollSkill(g, 'marines.personal', fixedRandom(1));
    g = reenlist(g, true, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(1, 1));
    g = rollSkill(g, 'marines.personal', fixedRandom(1));
    g = reenlist(g, false, fixedRandom(1, 1));
    expect(stateOf(g).musterLeft).toBe(2);
    g = chooseCascade(muster(g, 'benefit', fixedRandom(4)), 'cutlass');
    expect(stateOf(g).possessions).toEqual([{ of: 'cutlass', count: 1 }]);
    g = muster(g, 'benefit', fixedRandom(4));
    expect(cascadeOptions(g).find((o) => o.skill === 'cutlass')?.item).toBeUndefined();
    g = chooseCascade(g, 'cutlass');
    expect(stateOf(g)).toMatchObject({ step: 'name', possessions: [{ of: 'cutlass', count: 1 }] });
    expect(stateOf(g).skills).toContainEqual({ of: 'cutlass', level: 2 });
  });

  it('schließt mit Namen ab: Charakter mit Lebenslauf, Herkunft und Besitz, die Erschaffung ist zu', () => {
    let g = enlist(kira(), 'merchants', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6)); // Überleben
    g = rollNext(g, fixedRandom(1, 1)); // kein Patent
    g = rollSkill(g, 'merchants.personal', fixedRandom(6)); // Bribery
    g = rollSkill(g, 'merchants.service', fixedRandom(2)); // Vacc Suit
    g = reenlist(g, false, fixedRandom(2, 2));
    g = muster(g, 'benefit', fixedRandom(1)); // Low Psg
    const campaign = setGeneration(createCampaign([]), g);
    expect(() => finishGeneration(setGeneration(createCampaign([]), kira()), 'Zu früh')).toThrow();
    const { campaign: done, id } = finishGeneration(campaign, 'Mara Quell');
    expect(done.generation).toBeUndefined();
    const character = done.characters.find((c) => c.id === id)!;
    expect(character).toMatchObject({
      name: 'Mara Quell',
      background: 'Ex-Merchants · 1 Term · 22 Jahre',
      upp: { str: 7, dex: 10, end: 8, int: 9, edu: 7, soc: 5 },
      credits: 0,
      possessions: [{ of: 'low-passage', count: 1 }],
    });
    expect(character.skills.map((s) => [s.of, s.level])).toEqual([
      ['bribery', 1],
      ['vacc-suit', 1],
    ]);
    expect(character.career).toEqual(g.career);
  });

  it('weist einen Lebenslauf zurück, dessen Würfe nicht zu den Regeln passen', () => {
    expect(() => replay({ rolls: [{ kind: 'characteristic', of: 'DEX', dice: [3, 4], dm: 0 }] })).toThrow(/STR/);
    expect(() => replay({ rolls: [{ kind: 'survival', dice: [3, 4], dm: 0, target: 5 }] })).toThrow();
    const g = kira();
    expect(() => replay({ rolls: [...g.career.rolls, { kind: 'draft', dice: [2], dm: 0, for: 'army' }] })).toThrow();
  });

  it('übersteht Export und Import, die offene Erschaffung und den Lebenslauf eingeschlossen', () => {
    let g = enlist(kira(), 'other', fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollSkill(g, 'other.personal', fixedRandom(1));
    g = rollSkill(g, 'other.service', fixedRandom(1)); // Vehicle
    const campaign = setGeneration(createCampaign([]), g);
    const back = fromCampaignFile(toCampaignFile(campaign), 'k9');
    expect(back.generation).toEqual(g);
    expect(stateOf(back.generation!).step).toBe('cascade');
    const broken = toCampaignFile(campaign).replace('"other.service.1"', '"other.service.2"');
    expect(() => fromCampaignFile(broken, 'k9')).toThrow(/Zeile passt nicht/);
  });

  it('spielt viele zufällige Laufbahnen bis zum Ende, ohne hängen zu bleiben', () => {
    let seed = 42;
    const random = {
      int(min: number, max: number) {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return min + (Math.floor(seed / 65536) % (max - min + 1));
      },
    };
    const pick = <T,>(xs: readonly T[]): T => xs[random.int(0, xs.length - 1)]!;
    const ends = { name: 0, dead: 0 };
    let longest = 0;
    for (let n = 0; n < 500; n++) {
      let g = startGeneration();
      for (let step = 0; step < 300; step++) {
        const state = stateOf(g);
        if (state.step === 'name' || state.step === 'dead') {
          ends[state.step]++;
          longest = Math.max(longest, state.terms);
          break;
        }
        if (step === 299) throw new Error(`hängt in ${state.step}`);
        switch (state.step) {
          case 'service':
            g = enlist(g, pick(serviceOptions(state)).service.id, random);
            break;
          case 'skill':
            g = rollSkill(g, pick(tableOptions(state).filter((o) => o.available)).table.id, random);
            break;
          case 'cascade':
            g = chooseCascade(g, pick(cascadeOptions(g)).skill);
            break;
          case 'reenlist':
            g = reenlist(g, random.int(1, 6) > 1, random);
            break;
          case 'muster':
            g = muster(g, state.cashRolls < 3 && random.int(0, 1) === 0 ? 'cash' : 'benefit', random);
            break;
          default:
            g = rollNext(g, random);
        }
      }
    }
    expect(ends.name + ends.dead).toBe(500);
    expect(ends.dead).toBeGreaterThan(0);
    expect(longest).toBeGreaterThanOrEqual(7);
  });
});
