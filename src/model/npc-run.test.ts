import { describe, expect, it } from 'vitest';
import { createCampaign, setHexes } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { generateNpc } from './npcs';
import { setLocation } from './shop';
import { replay } from './career';
import { MAX_TERMS } from './career';
import { runCareerIn, runOneCareer, startGeneration, stateOf } from './generation';
import { hexFromFlat } from './sector';
import { ref } from './reference';
import type { Random } from './ports';

/**
 * Der Lauf eines NSC (Kennzeichen **2026-11-24f** und **2026-11-24g**): Das Dienstalter setzt die
 * Zahl der Terms, Überleben und Weiterverpflichtung entfallen, und nichts kann töten. Ohne
 * Dienstalter will der Lauf bleiben, so lange es geht, und jeder verworfene Lauf meldet warum.
 */

/** Ein reproduzierbarer Zufall für ganze Läufe. */
function seeded(start: number): Random {
  let seed = start;
  return {
    int(min: number, max: number) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return min + (Math.floor(seed / 65536) % (max - min + 1));
    },
  };
}

const hexes = [hexFromFlat({ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' }), hexFromFlat({ ...ref.demoWorld, column: 5, row: 4, name: 'Fels' })];

describe('Der Lauf eines NSC', () => {
  it('würfelt mit Dienstalter genau so viele Terms, ohne Überleben und ohne Weiterverpflichtung', () => {
    for (const goal of [1, 3, MAX_TERMS]) {
      let gefunden = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const { end, generation } = runOneCareer(hexes, 'scouts', seeded(seed * 31), goal);
        // Abgelehnte Läufe (er würde eingezogen) sagen nichts über das Dienstalter.
        if (end !== 'name') {
          expect(end).toBe('drafted');
          continue;
        }
        gefunden++;
        const state = stateOf(generation);
        expect([goal, end, state.terms]).toEqual([goal, 'name', goal]);
        const kinds = generation.career.rolls.map((r) => r.kind);
        expect(kinds).not.toContain('survival');
        expect(kinds).not.toContain('reenlist');
        expect(state.dead).toBe(false);
      }
      expect(gefunden).toBeGreaterThan(10);
    }
  });

  it('kann mit Dienstalter nicht sterben: 200 Läufe über sieben Terms enden alle beim Namen', () => {
    for (let seed = 1; seed <= 200; seed++) {
      expect(runOneCareer(hexes, 'belter', seeded(seed * 7919), MAX_TERMS).end).not.toBe('dead');
    }
  });

  it('lässt mit Dienstalter die Krise das Attribut auf 1 stehen, statt zu töten', () => {
    // Ein Lauf über sieben Terms altert mehrfach; keiner der 200 oben ist gestorben. Einer davon
    // muss die Krise getroffen haben – sonst wäre die Regel nie erprobt. Hier gezielt: sieben
    // Terms in der harten Laufbahn, niedrig gewürfelte Attribute.
    let krise = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { end, generation } = runOneCareer(hexes, 'scouts', seeded(seed * 104729), MAX_TERMS);
      expect(end).not.toBe('dead');
      if (end === 'name' && generation.career.rolls.some((r) => r.kind === 'crisis')) krise++;
    }
    expect(krise).toBeGreaterThan(0);
  });

  it('lehnt ein Dienstalter ab, das nicht 1 bis sieben Terms sind', () => {
    for (const goal of [0, MAX_TERMS + 1, 2.5]) {
      expect(() => stateOf(startGeneration(goal))).toThrow(/Dienstalter ist 1 bis 7/);
    }
  });

  it('will ohne Dienstalter bleiben, so lange es geht: keine Weiterverpflichtung will weg', () => {
    let laeufe = 0;
    for (let seed = 1; seed <= 60; seed++) {
      for (const service of ['navy', 'scouts', 'bureaucrat', 'barbarian']) {
        const { end, generation } = runOneCareer(hexes, service, seeded(seed * 761 + service.length));
        if (end !== 'name') continue;
        laeufe++;
        for (const roll of generation.career.rolls) if (roll.kind === 'reenlist') expect(roll.wants).toBe(true);
      }
    }
    expect(laeufe).toBeGreaterThan(20);
  });

  it('meldet jeder verworfene Lauf, warum er verworfen wurde', () => {
    const enden = new Map<string, number>();
    for (let seed = 1; seed <= 120; seed++) {
      const { end } = runOneCareer(hexes, 'noble', seeded(seed * 1543));
      enden.set(end, (enden.get(end) ?? 0) + 1);
    }
    // Der Adlige braucht Stand 10+: die meisten Versuche scheitern an der Qualifikation, einer
    // schafft es doch, und keiner endet irgendwo anders.
    expect([...enden.keys()].sort()).toEqual(['dead', 'name', 'unqualified'].filter((k) => enden.has(k)).sort());
    expect((enden.get('dead') ?? 0) + (enden.get('name') ?? 0) + (enden.get('unqualified') ?? 0)).toBe(120);
    expect(enden.get('name') ?? 0).toBeGreaterThan(0);
    expect(enden.get('unqualified') ?? 0).toBeGreaterThan(20);
  });

  it('gibt `runCareerIn` den gefundenen Lauf, auch mit Dienstalter', () => {
    const generation = runCareerIn(hexes, 'army', seeded(11), 4);
    const state = replay(generation.career);
    expect(state).toMatchObject({ step: 'name', terms: 4 });
    expect(generation.career.termsGoal).toBe(4);
    // Und ohne Dienstalter bleibt das Feld fort, wie bei einer Erschaffung einer Spielfigur.
    expect(runCareerIn(hexes, 'army', seeded(11)).career.termsGoal).toBeUndefined();
  });
});

describe('Das Dienstalter in der Kampagnendatei', () => {
  it('wandert mit dem Lebenslauf durch die Datei', () => {
    const campaign = setLocation(setHexes(createCampaign([]), hexes), '0101');
    const { campaign: withNpc, id } = generateNpc(campaign, { service: 'merchants', role: 'other', termsGoal: 2 }, seeded(5));
    const npc = withNpc.characters.find((c) => c.id === id)!;
    expect(npc.career?.termsGoal).toBe(2);
    expect(replay(npc.career!).terms).toBe(2);
    const back = fromCampaignFile(toCampaignFile(withNpc), withNpc.id);
    expect(back.characters.find((c) => c.id === id)).toEqual(npc);
  });
});
