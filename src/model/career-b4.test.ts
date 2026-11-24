import { describe, expect, it } from 'vitest';
import { addCharacter, createCampaign } from './campaign';
import { ageOf, replay, standingRank, termDmOf, throwConditions, throwDm, type TermDm } from './career';
import {
  cascadeOptions,
  careerInput,
  chooseCascade,
  enlist,
  muster,
  nextThrow,
  reenlist,
  rollNext,
  rollSkill,
  serviceOptions,
  stateOf,
  type Generation,
} from './generation';
import { weaponSkillDm, UNSKILLED_GUN_DM } from './combat';
import { ref, serviceOf, weaponOf } from './reference';
import { fixedRandom } from './testing';

/**
 * Die Grundlagen aus Supplement 4 *Citizens of the Imperium* (Kennzeichen 2026-11-24a):
 * Gegenprobe, Term-DM, Beginnsalter, Weiterbewerbung, Ruhestand, natürliche Waffenkunde.
 */

/** UPP 7A8975 wie Kira: STR 7, DEX 10, END 8, INT 9, EDU 7, SOC 5. */
const kiraUpp = { str: 7, dex: 10, end: 8, int: 9, edu: 7, soc: 5 };

/** Ein Lebenslauf ohne Welten, wie es sie vor den Welten gab: nach den Attributen kommt die Laufbahn. */
function kira(pairs: [number, number][] = [[3, 4], [5, 5], [4, 4], [4, 5], [3, 4], [2, 3]]): Generation {
  let g: Generation = { career: { rolls: [] } };
  for (const [a, b] of pairs) g = rollNext(g, fixedRandom(a, b));
  return g;
}

describe('Laufbahnen aus Citizens of the Imperium', () => {
  it('gilt die Gegenprobe „Stand 7−“ und „Stä 8−“ (S. 6 und 8)', () => {
    const pirate = serviceOf('pirate').enlistment;
    // SOC 5 ≤ 7 gibt +1, END 8 < 9 nichts: 7+ mit DM +1.
    expect(throwDm(pirate, kiraUpp)).toBe(1);
    expect(throwConditions(pirate, kiraUpp)[0]).toMatchObject({ characteristic: 'SOC', atMost: 7, dm: 1, applies: true });
    // SOC 9 > 7 gibt nichts, END 9 ≥ 9 dafür +2.
    expect(throwDm(pirate, { ...kiraUpp, soc: 9, end: 9 })).toBe(2);

    const bureau = serviceOf('bureaucrat').enlistment;
    // EDU 7 < 8 nichts, STR 7 ≤ 8 gibt +2.
    expect(throwDm(bureau, kiraUpp)).toBe(2);
    expect(throwDm(bureau, { ...kiraUpp, edu: 8, str: 9 })).toBe(1);
  });

  it('zählt der Term-DM den laufenden Term: erster +1, zweiter +2, siebenter +7 (S. 6, unter der Tabelle)', () => {
    const belter = serviceOf('belter').survival;
    expect(belter.target).toBe(9);
    // B4 S. 6 sagt die drei Beispiele ausdrücklich: „in the first term of service, the DM is +1“.
    expect(throwDm(belter, kiraUpp, 1)).toBe(1);
    expect(throwDm(belter, kiraUpp, 2)).toBe(2);
    expect(throwDm(belter, kiraUpp, 7)).toBe(7);
    expect(termDmOf(belter, 7)).toEqual<TermDm>({ perTerm: 1, terms: 7, dm: 7 });
    // Vor dem ersten Term steht kein Term-DM zu, und der Pirat hat gar keinen.
    expect(throwDm(belter, kiraUpp, 0)).toBe(0);
    expect(termDmOf(serviceOf('pirate').survival, 3)).toBeUndefined();
  });

  it('gibt der Belterer im ersten Term +1, im zweiten +2, im dritten +3 – der Wurf gilt dem angefangenen Term', () => {
    let g = enlist(kira(), 'belter', fixedRandom(6, 6));
    const daechs: number[] = [];
    for (let i = 0; i < 40 && daechs.length < 3; i++) {
      const state = stateOf(g);
      if (state.step === 'survival') {
        daechs.push(nextThrow(state)!.dm);
        g = rollNext(g, fixedRandom(6, 6));
      } else if (state.step === 'reenlist') {
        g = reenlist(g, true, fixedRandom(6, 6));
      } else if (state.step === 'skill') {
        g = rollSkill(g, 'belter.personal', fixedRandom(3));
      } else {
        throw new Error(`unerwarteter Schritt ${state.step}`);
      }
    }
    expect(daechs).toEqual([1, 2, 3]);
  });

  it('beginnt die Laufbahn mit dem Alter der Laufbahn (Belterer und Barbar: 14, S. 2)', () => {
    expect(ageOf(3)).toBe(30);
    expect(ageOf(3, serviceOf('pirate'))).toBe(30);
    expect(ageOf(3, { ...serviceOf('pirate'), startAge: 14 })).toBe(26);
  });

  it('bewirbt sich weiter, wer in einer Laufbahn ohne Einberufungszahl abgelehnt wird', () => {
    // Navy 8+ mit INT 9 ≥ 8 → +1: 1+1 +1 = 3 < 8 → Einberufung.
    expect(stateOf(enlist(kira(), 'navy', fixedRandom(1, 1))).step).toBe('draft');
    // Pirate 7+ mit SOC ≤ 7 → +1: 2+2 +1 = 5 < 7 → zurück zur Laufbahnwahl, kein Würfel für die Einberufung.
    const refused = stateOf(enlist(kira(), 'pirate', fixedRandom(2, 2)));
    expect(refused.step).toBe('service');
    expect(refused.service).toBeUndefined();
    // Und dort kann er sich gleich wieder bewerben.
    const inPirate = stateOf(enlist(kira(), 'pirate', fixedRandom(3, 4)));
    expect(inPirate).toMatchObject({ step: 'survival', terms: 1 });
    // Die Automatik-Fertigkeit der Laufbahn kommt sofort mit (Pirate Brawling-1, S. 7).
    expect(inPirate.skills).toEqual([{ of: 'brawling', level: 1 }]);
  });

  it('zeigt die neuen Laufbahnen in der Wahl, ohne Einberufungszahl in der Einberufung', () => {
    const options = serviceOptions(stateOf(kira()));
    const b4 = ['pirate', 'bureaucrat', 'belter', 'sailor', 'diplomat', 'doctor', 'flyer', 'barbarian', 'rogue', 'noble', 'scientist', 'hunter'];
    expect(options.map((o) => o.service.id)).toEqual(['navy', 'marines', 'army', 'scouts', 'merchants', 'other', ...b4]);
    // Gesperrt ist nur, was eine Qualifikation verlangt und nicht mitbringt: der Adlige will Stand 10+.
    expect(options.filter((o) => !o.available).map((o) => o.service.id)).toEqual(stateOf(kira()).upp.soc >= 10 ? [] : ['noble']);
    expect(ref.services.filter((s) => s.draft === undefined).map((s) => s.id)).toEqual(b4);
  });

  it('sperrt die Qualifikation die Laufbahn, wer den Attributswert nicht mitbringt (S. 8)', () => {
    const other = ref.services.find((s) => s.id === 'other')!;
    const had = other.needs;
    other.needs = { characteristic: 'SOC', atLeast: 10 };
    try {
      // Stand 5: nicht wählbar, und die Musterung gibt es nicht.
      expect(serviceOptions(stateOf(kira())).find((o) => o.service.id === 'other')!.available).toBe(false);
      expect(() => enlist(kira(), 'other', fixedRandom(6, 6))).toThrow(/SOC 10\+/);
      // Stand 10: wählbar.
      const noble = kira([[3, 4], [5, 5], [4, 4], [4, 5], [3, 4], [5, 5]]);
      expect(serviceOptions(stateOf(noble)).find((o) => o.service.id === 'other')!.available).toBe(true);
      expect(stateOf(enlist(noble, 'other', fixedRandom(6, 6))).service?.id).toBe('other');
    } finally {
      if (had === undefined) delete (other as { needs?: unknown }).needs;
      else other.needs = had;
    }
  });

  it('lässt den Bürokrat nur die gelungene Weiterverpflichtung aussteigen (S. 8)', () => {
    const atReenlist = () => {
      let g = enlist(kira(), 'bureaucrat', fixedRandom(2, 2)); // 4 + 2 = 6 ≥ 5+
      g = rollNext(g, fixedRandom(6, 6)); // Überleben 4+
      g = rollNext(g, fixedRandom(1, 1)); // Patent 6+ misslingt
      g = rollSkill(g, 'bureaucrat.personal', fixedRandom(1));
      return rollSkill(g, 'bureaucrat.personal', fixedRandom(2));
    };
    expect(stateOf(atReenlist()).step).toBe('reenlist');
    // Will weg und der Wurf misslingt (2 < 3+): er darf nicht weg.
    expect(stateOf(reenlist(atReenlist(), false, fixedRandom(1, 1)))).toMatchObject({ step: 'survival', terms: 2 });
    // Will weg und der Wurf gelingt: er mussert ab.
    expect(stateOf(reenlist(atReenlist(), false, fixedRandom(2, 2)))).toMatchObject({ step: 'muster', musterLeft: 1 });
    // Will bleiben: bleibt nur mit dem gelungenen Wurf – misslingt er, tritt er ab wie sonst auch.
    expect(stateOf(reenlist(atReenlist(), true, fixedRandom(2, 2)))).toMatchObject({ step: 'survival', terms: 2 });
    expect(stateOf(reenlist(atReenlist(), true, fixedRandom(1, 1)))).toMatchObject({ step: 'muster' });
  });

  it('lässt eine Laufbahn ohne Ruhestand bis zum siebenten Term dienen (Barbar, S. 9)', () => {
    const other = ref.services.find((s) => s.id === 'other')!;
    const was = other.retirement;
    other.retirement = false;
    try {
      let g = enlist(kira(), 'other', fixedRandom(6, 6));
      g = rollNext(g, fixedRandom(6, 6));
      g = rollSkill(g, 'other.personal', fixedRandom(1));
      g = rollSkill(g, 'other.personal', fixedRandom(2));
      expect(stateOf(g).step).toBe('reenlist');
      // Weg will, und der Wurf gelingt: ohne Ruhestand bleibt er trotzdem.
      expect(stateOf(reenlist(g, false, fixedRandom(6, 6)))).toMatchObject({ step: 'survival', terms: 2 });
    } finally {
      other.retirement = was;
    }
  });

  it('hält Barbar, Bürokrat und Arzt für völlig ungebildet an Schusswaffen (S. 11, Book 1 S. 30)', () => {
    const rifle = weaponOf('rifle');
    let g = enlist(kira(), 'bureaucrat', fixedRandom(2, 2));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(1, 1));
    g = rollSkill(g, 'bureaucrat.personal', fixedRandom(1));
    g = rollSkill(g, 'bureaucrat.personal', fixedRandom(2));
    g = reenlist(g, false, fixedRandom(2, 2));
    g = muster(g, 'cash', fixedRandom(3));
    expect(stateOf(g).step).toBe('name');
    const { campaign, id } = addCharacter(createCampaign([]), careerInput(stateOf(g), 'Amtsverweser'), g.career);
    const bureau = campaign.characters.find((c) => c.id === id)!;
    expect(bureau.career).toBeDefined();
    expect(weaponSkillDm(bureau, rifle)).toBe(UNSKILLED_GUN_DM);
    // Die übrigen Laufbahnen behalten ihre natürliche Waffenkunde von einem halben Grad.
    let k = enlist(kira(), 'other', fixedRandom(6, 6));
    k = rollNext(k, fixedRandom(6, 6));
    k = rollSkill(k, 'other.personal', fixedRandom(1));
    k = rollSkill(k, 'other.personal', fixedRandom(2));
    const other = addCharacter(createCampaign([]), careerInput(stateOf(k), 'Müßiggänger'), k.career);
    expect(weaponSkillDm(other.campaign.characters.find((c) => c.id === other.id)!, rifle)).toBe(0);
    // Und wer die Fertigkeit hat, schießt normal – auch als Bürokrat.
    expect(weaponSkillDm({ ...bureau, skills: [...(bureau.skills ?? []), { of: 'rifle', level: 1, retired: false }] }, rifle)).toBe(1);
  });

  it('zeichnet die Gegenprobe im Lebenslauf des Bürokraten', () => {
    const g = enlist(kira(), 'bureaucrat', fixedRandom(2, 2));
    const roll = g.career.rolls.at(-1)!;
    expect(roll).toMatchObject({ kind: 'enlistment', for: 'bureaucrat', dm: 2, target: 5 });
    expect(replay(g.career).outcomes[6]!.sources).toEqual([{ label: 'STR 8−', dm: 2 }]);
  });
});

describe('Rangstufen und Automatikgaben (2026-11-24c)', () => {
  it('fragt die Automatik der Musterung nach der genauen Fertigkeit (der Flyer: Air Craft-1, S. 7)', () => {
    // Flyer 6+ ohne DMs: 5+5 gelingt und gibt Air Craft-1 – eine Gruppe, also fragt die App nach.
    const g = enlist(kira(), 'flyer', fixedRandom(5, 5));
    const state = stateOf(g);
    expect(state.service?.id).toBe('flyer');
    expect(state.step).toBe('cascade');
    expect(state.cascade?.cascade.id).toBe('air-craft');
    expect(cascadeOptions(g).map((o) => o.skill)).toEqual(['prop-fixed-wing', 'jet-fixed-wing', 'helicopter']);
    // Gewählt wird auf dem Wurf der Musterung; erst danach kommt das Überleben.
    const after = chooseCascade(g, 'jet-fixed-wing');
    expect(stateOf(after)).toMatchObject({ step: 'survival', terms: 1 });
    expect(stateOf(after).skills).toEqual([{ of: 'jet-fixed-wing', level: 1 }]);
  });

  it('gibt der Rangwurf die unterste Rangstufe der Laufbahn und lässt die nächste vorhandene gelten (der Barbar: Warrior und Chief, S. 9)', () => {
    // Barbar: Musterung 5+ (Schwert-1), Überleben 6+, Position 6+, Beförderung 9+.
    let g = enlist(kira(), 'barbarian', fixedRandom(3, 4));
    expect(stateOf(g).skills).toEqual([{ of: 'sword', level: 1 }]);
    g = rollNext(g, fixedRandom(3, 4));
    expect(stateOf(g).step).toBe('commission');
    g = rollNext(g, fixedRandom(1, 6));
    // Warrior steht auf Stufe 2 – die Stufen 1, 3 und 4 kennt die Tafel des Barbars nicht.
    expect(stateOf(g).rank).toBe(2);
    expect(stateOf(g).service?.ranks.map((r) => r.level)).toEqual([2, 5]);
    // Die Gabe des Warriors ist Blade Combat-1: die App fragt nach der Klinge.
    expect(stateOf(g).step).toBe('cascade');
    expect(stateOf(g).cascade?.cascade.id).toBe('blade-combat');
    g = chooseCascade(g, 'broadsword');
    expect(stateOf(g).skills).toContainEqual({ of: 'broadsword', level: 1 });
    expect(stateOf(g).step).toBe('promotion');
    // Beförderung 9+: vom Warrior direkt auf Chief (Stufe 5), und der gibt Leader-1.
    g = rollNext(g, fixedRandom(4, 6));
    const state = stateOf(g);
    expect(state.rank).toBe(5);
    expect(state.skills).toContainEqual({ of: 'leader', level: 1 });
    expect(state.step).toBe('skill');
    // Höher als Chief kann der Barbar nicht steigen.
    expect(state.rank).toBeLessThanOrEqual(Math.max(...(state.service?.ranks.map((r) => r.level) ?? [])));
  });

  it('lässt die Rangfolge der übrigen Laufbahnen unverändert (Navy 1 bis 6)', () => {
    const navy = serviceOf('navy');
    expect(navy.ranks.map((r) => r.level)).toEqual([1, 2, 3, 4, 5, 6]);
    // Der Flyer beginnt mit Pilot auf Stufe 1 und endet beim Air Marshal auf Stufe 6.
    expect(serviceOf('flyer').ranks.map((r) => `${r.level}:${r.title}`)).toEqual(['1:Pilot', '2:Flight Leader', '3:Sqdrn Leader', '4:Staff Major', '5:Group Leader', '6:Air Marshal']);
    // Und eine Laufbahn ohne Rangtafel hat weder Rangwurf noch Beförderung.
    for (const id of ['belter', 'doctor', 'rogue', 'scientist', 'hunter', 'scouts']) {
      expect(serviceOf(id).commission, id).toBeUndefined();
      expect(serviceOf(id).ranks, id).toEqual([]);
    }
  });
});

describe('Standesränge des Adels (2026-11-24d)', () => {
  /** Kira mit anderem Stand: die letzten beiden Würfe sind SOC. */
  const kiraMit = (soc: [number, number]): Generation =>
    kira([[3, 4], [5, 5], [4, 4], [4, 5], [3, 4], soc]);

  it('nennt nur der Adel Standesränge, aufsteigend von B (11) bis F (15)', () => {
    expect(serviceOf('noble').ranks.map((r) => `${r.title}:${r.standing}`)).toEqual([
      'B Knight:11', 'C Baron:12', 'D Marquis:13', 'E Count:14', 'F Duke:15',
    ]);
    expect(ref.services.filter((sv) => sv.ranks.some((r) => r.standing !== undefined)).map((sv) => sv.id)).toEqual(['noble']);
    expect(standingRank(serviceOf('noble'), 10)).toBeUndefined();
    expect(standingRank(serviceOf('noble'), 11)?.title).toBe('B Knight');
    expect(standingRank(serviceOf('noble'), 12)?.title).toBe('C Baron');
    expect(standingRank(serviceOf('noble'), 15)?.title).toBe('F Duke');
    expect(standingRank(serviceOf('navy'), 15)?.title).toBeUndefined();
  });

  it('setzt die Musterung den Adligen auf den Rang seines Stands, ohne Rangwurf (Stand 11 ist Knight)', () => {
    let g = enlist(kiraMit([5, 6]), 'noble', fixedRandom(1, 1));
    const state = stateOf(g);
    expect(state).toMatchObject({ service: { id: 'noble' }, rank: 1, step: 'survival' });
    expect(state.upp.soc).toBe(11);
    // Der Eintrag hält den Rang fest, und es folgt keine Offizierstelle, sondern die Beförderung.
    // Der siebte Wurf ist die Musterung: sie hält Musterung und Rang fest.
    expect(replay(g.career).outcomes[6]!.effects.filter((e) => e.kind === 'rank')).toEqual([{ kind: 'rank', level: 1, title: 'B Knight' }]);
    g = rollNext(g, fixedRandom(3, 3));
    expect(stateOf(g).step).toBe('promotion');
  });

  it('lässt den Adligen mit Stand 10 den Rangwurf würfeln, ohne dass der Stand steigt', () => {
    let g = enlist(kiraMit([5, 5]), 'noble', fixedRandom(1, 1));
    expect(stateOf(g).rank).toBe(0);
    g = rollNext(g, fixedRandom(3, 3));
    expect(stateOf(g).step).toBe('commission');
    g = rollNext(g, fixedRandom(1, 5));
    const state = stateOf(g);
    expect(state.rank).toBe(1);
    expect(state.upp.soc).toBe(10);
  });

  it('gibt jede Beförderung auf einen Standesrang +1 Stand (Baron mit 12 wird Marquis mit 13)', () => {
    let g = enlist(kiraMit([6, 6]), 'noble', fixedRandom(1, 1));
    expect(stateOf(g).rank).toBe(2);
    g = rollNext(g, fixedRandom(3, 3));
    // Beförderung 12+ (Kira hat INT 9, kein DM): 6+6 gelingt.
    g = rollNext(g, fixedRandom(6, 6));
    const state = stateOf(g);
    expect(state.rank).toBe(3);
    expect(state.upp.soc).toBe(13);
    expect(replay(g.career).outcomes.at(-1)!.effects.some((e) => e.kind === 'characteristic' && e.characteristic === 'SOC' && e.change === 1)).toBe(true);
  });
});
