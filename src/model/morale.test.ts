import { describe, expect, it } from 'vitest';
import { createCampaign, setHexes, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { currentEncounter, distanceOf, rollAnimalEncounter, rollEncounter, rollSurprise, setTerrain, type Encounter } from './encounter';
import { turnOf, withEncounter } from './fight';
import type { DamageRoll } from './log';
import { FLEE_BANDS, leaderDownDm, lossesOf, isFleeing, moraleDue, npcEscaped, npcMoraleParts, pcMoraleParts, retreatSuggested, startRound } from './morale';
import { ref } from './reference';
import { hexFromFlat } from './sector';
import { setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';
import { canFight, woundStateOf } from './wounds';
import type { AnimalRow, AnimalTable } from './animals';

/** Regina (0101) als Aufenthaltsort der Gruppe. */
const home = setLocation(setHexes(createCampaign(), [hexFromFlat({ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' })]), '0101');

/** Eine laufende Begegnung mit `count` NSC der Art `of`; die Überraschung ist gewürfelt, keiner hat Überraschung. */
function fight(of = 24, count = 4): Campaign {
  const rolled = rollEncounter(home, fixedRandom(), fixedClock(), of, count).campaign;
  return rollSurprise(rolled, fixedRandom(3, 3));
}

/** Schlägt diesen Kämpfer nieder: Treffer mit der Hand, je 1W6 auf STR, bis sein STR auf 0 steht (S. 7). */
function down(campaign: Campaign, who: string): Campaign {
  let running = campaign;
  for (let hit = 0; hit < 4 && canFight(woundStateOf(running, who)); hit += 1) {
    const at = `2026-11-27T15:0${hit}:00.000Z`;
    const attack = { kind: 'attack' as const, at, for: 'c1', against: who, with: 'hands', armor: 'nothing' as const, range: 'close' as const, dice: [6, 6] as const, dm: 0, target: 8 };
    const damage: DamageRoll = { kind: 'damage', at, of: running.log.length, dice: [6], to: ['STR'], points: [6] };
    running = { ...running, log: [...running.log, attack, damage] };
  }
  return running;
}

/** Die Begegnung in der Runde `round`: wie am Anfang einer neuen Runde – keiner war dran, keiner ist gegangen. */
function inRound(campaign: Campaign, round: number): Campaign {
  const running = currentEncounter(campaign)!;
  const encounter: Encounter = { ...running, round, acted: [], npcMoved: 0, ...(running.distances ? { distances: running.distances.map((d) => ({ ...d, moved: 0 })) } : {}) };
  return withEncounter(campaign, encounter);
}

/** Der `skip`-te NSC, der nicht Anführer ist und noch kämpft. */
function follower(campaign: Campaign, skip = 0): string {
  const encounter = currentEncounter(campaign)!;
  return encounter.npcs.filter((n) => n.id !== encounter.leader && canFight(woundStateOf(campaign, n.id)))[skip]!.id;
}

/** Wie weit ein SC von der Gruppe weg ist, in Bands: Berührung 0, Band 0 ist 1 Band weg (SR 21). */
function posOf(encounter: Encounter, who: string): number {
  const distance = distanceOf(encounter, who);
  return distance.close ? 0 : distance.band + 1;
}

describe('Moral (S. 5, SR 23)', () => {
  it('würfelt erst ab 25 % Verlusten und erst ab der zweiten Runde', () => {
    const campaign = fight(24, 4);
    const npc = follower(campaign);
    expect(lossesOf(campaign, currentEncounter(campaign)!, 'npcs').percent).toBe(0);
    expect(moraleDue(campaign, currentEncounter(campaign)!, 'npcs')).toBe(false);
    // Ein von vier NSC fällt aus: 25 %. In der ersten Runde wird nicht gewürfelt, ab der zweiten je Runde einmal.
    const one = down(campaign, npc);
    expect(lossesOf(one, currentEncounter(one)!, 'npcs')).toEqual({ lost: 1, total: 4, percent: 25 });
    expect(moraleDue(one, currentEncounter(one)!, 'npcs')).toBe(false);
    const second = inRound(one, 2);
    expect(moraleDue(second, currentEncounter(second)!, 'npcs')).toBe(true);
    expect(moraleDue(second, currentEncounter(second)!, 'pcs')).toBe(false);
  });

  it('die DMs der NSC: militärische Art und Anführer je +1, über 50 % Verluste und ein ausgefallener Anführer je −2', () => {
    const campaign = fight(24, 4); // Marines: militärisch, mit Anführer
    expect(npcMoraleParts(campaign, currentEncounter(campaign)!).map((p) => p.label)).toEqual(['militärisch', 'Anführer']);
    // Bei der Hälfte ist es nicht über 50 %: erst drei von vier zählen.
    const two = down(down(campaign, follower(campaign, 0)), follower(campaign, 1));
    expect(lossesOf(two, currentEncounter(two)!, 'npcs').percent).toBe(50);
    expect(npcMoraleParts(two, currentEncounter(two)!).map((p) => p.label)).toEqual(['militärisch', 'Anführer']);
    const three = down(two, follower(campaign, 2));
    expect(lossesOf(three, currentEncounter(three)!, 'npcs').percent).toBe(75);
    expect(npcMoraleParts(three, currentEncounter(three)!).map((p) => p.label)).toEqual(['militärisch', 'Anführer', 'über 50 % Verluste']);
    // Der ausgefallene Anführer zählt zwei Runden, danach nicht mehr (S. 5).
    const fallen = withEncounter(campaign, { ...currentEncounter(campaign)!, leaderDown: 3 });
    const withDown = currentEncounter(withEncounter(fallen, { ...currentEncounter(fallen)!, round: 3 }))!;
    expect(leaderDownDm(withDown)).toBe(-2);
    expect(npcMoraleParts(campaign, withDown).map((p) => p.label)).toContain('Anführer ausgefallen');
    // Der ausgefallene Anführer zählt als Verlust der Partei, bleibt aber ihr Anführer.
    const lostLeader = down(campaign, currentEncounter(campaign)!.leader!);
    expect(lossesOf(lostLeader, currentEncounter(lostLeader)!, 'npcs').percent).toBe(25);
    expect(npcMoraleParts(lostLeader, currentEncounter(lostLeader)!).map((p) => p.label)).toEqual(['militärisch', 'Anführer']);
    const nextRound = currentEncounter(withEncounter(campaign, { ...currentEncounter(campaign)!, leaderDown: 3, round: 4 }))!;
    expect(leaderDownDm(nextRound)).toBe(-2);
    expect(leaderDownDm(currentEncounter(withEncounter(campaign, { ...currentEncounter(campaign)!, leaderDown: 3, round: 5 }))!)).toBe(0);
    // Die SC-Seite hat keinen Anführer-DM: nur Fertigkeiten, Laufbahn und Verluste.
    const pc = down(campaign, 'c1');
    expect(pcMoraleParts(pc, currentEncounter(pc)!).map((p) => p.label)).toEqual([]);
    const both = down(pc, 'c2');
    expect(pcMoraleParts(both, currentEncounter(both)!).map((p) => p.label)).toEqual(['über 50 % Verluste']);
  });

  it('zu Beginn der neuen Runde würfelt jede betroffene Partei einmal; die Würfel bleiben an der Begegnung', () => {
    let campaign = fight(24, 4);
    campaign = down(campaign, follower(campaign));
    campaign = down(campaign, 'c1'); // die SC: einer von zwei = 50 %
    const opened = startRound(inRound(campaign, 2), fixedRandom(3, 3, 1, 1));
    const encounter = currentEncounter(opened.campaign)!;
    // Die SC würfeln zuerst: 3 + 3 gegen 7+ – verloren; die NSC: 1 + 1 + 2 (militärisch, Anführer) – verloren.
    expect(encounter.pcMorale).toEqual({ dice: [3, 3], dm: 0, round: 2 });
    expect(encounter.npcMorale).toEqual({ dice: [1, 1], dm: 2, round: 2 });
    expect(opened.morale).toBe(true);
    expect(opened.fled).toBe(true);
    expect(isFleeing(encounter)).toBe(true);
    expect(retreatSuggested(encounter)).toBe(true);
    // Noch einmal in derselben Runde: nichts Neues.
    const again = startRound(opened.campaign, fixedRandom(6, 6, 6, 6));
    expect(again.morale).toBe(false);
    expect(currentEncounter(again.campaign)).toEqual(encounter);
    // Die Würfel überstehen die Kampagnendatei.
    expect(fromCampaignFile(toCampaignFile(opened.campaign), 'k1').encounters).toEqual(opened.campaign.encounters);
  });

  it('die NSC-Partei steht bei 7+ und flieht bei 6 oder weniger', () => {
    let campaign = fight(24, 4);
    campaign = down(campaign, follower(campaign));
    const holds = startRound(inRound(campaign, 2), fixedRandom(3, 3));
    expect(holds.fled).toBe(false);
    expect(isFleeing(currentEncounter(holds.campaign)!)).toBe(false);
    const breaks = startRound(inRound(campaign, 2), fixedRandom(2, 2));
    expect(breaks.fled).toBe(true);
    expect(isFleeing(currentEncounter(breaks.campaign)!)).toBe(true);
  });

  it('eine fliehende Gruppe kämpft nicht mehr und rückt je neuer Runde 2 Bands weg', () => {
    let campaign = fight(24, 4);
    campaign = down(campaign, follower(campaign));
    const fled = startRound(inRound(campaign, 2), fixedRandom(1, 1)).campaign;
    // Ihr Zug entfällt: nie ein NSC am Zug, auch nicht in ihrer ersten Runde.
    expect(turnOf(fled)?.side).not.toBe('npcs');
    // In der Fluchtrunde bleibt sie stehen; mit jeder neuen Runde rücken die SC 2 Bands ab.
    const at = posOf(currentEncounter(fled)!, 'c1');
    expect(at).toBe(posOf(currentEncounter(campaign)!, 'c1'));
    const third = startRound(inRound(fled, 3), fixedRandom(6, 6));
    expect(posOf(currentEncounter(third.campaign)!, 'c1')).toBe(at + FLEE_BANDS);
    expect(third.escaped).toBe(false);
    // Und wieder, bis über 20 Bands: dann ist sie entkommen.
    let running = third.campaign;
    let escaped = false;
    for (let round = 4; round <= 20 && !escaped; round += 1) {
      const step = startRound(inRound(running, round), fixedRandom(6, 6));
      running = step.campaign;
      escaped = step.escaped;
    }
    expect(escaped).toBe(true);
    expect(npcEscaped(fight(24, 4), currentEncounter(fight(24, 4))!)).toBe(false);
  });

  it('der ausgefallene Anführer: die Fallrunde auch im letzten Zug, und ein zweiter Ausfall zählt neu', () => {
    const campaign = fight(24, 4);
    const leader = currentEncounter(campaign)!.leader!;
    // Er fällt mitten in Runde 3: Es ist schon einer dran gewesen, die Runde ist die Fallrunde.
    const mid = withEncounter(down(inRound(campaign, 3), leader), { ...currentEncounter(campaign)!, round: 3, acted: ['c1'] });
    expect(currentEncounter(startRound(mid, fixedRandom(6, 6)).campaign)!.leaderDown).toBe(3);
    // Er fällt im letzten Zug von Runde 3; bemerkt wird es am Anfang von Runde 4 – gefallen ist er in 3.
    const late = startRound(inRound(down(campaign, leader), 4), fixedRandom(6, 6)).campaign;
    expect(currentEncounter(late)!.leaderDown).toBe(3);
    // Er wacht auf (Runde 6, der −2 ist abgelaufen): das Feld wird frei.
    const woken = { ...late, log: [...late.log, { kind: 'recovery' as const, at: '2026-11-27T16:00:00.000Z', how: 'wake' as const, for: leader }] };
    const up = startRound(inRound(woken, 6), fixedRandom(6, 6)).campaign;
    expect(currentEncounter(up)!.leaderDown).toBeUndefined();
    // Er fällt erneut, mitten in Runde 8: jetzt steht die neue Runde da, und der −2 gilt wieder.
    const again = withEncounter(down(up, leader), { ...currentEncounter(up)!, round: 8, acted: ['c1'] });
    const second = currentEncounter(startRound(again, fixedRandom(6, 6)).campaign)!;
    expect(second.leaderDown).toBe(8);
    expect(leaderDownDm(second)).toBe(-2);
  });

  it('für Tiere gilt die Moral nicht', () => {
    const row: AnimalRow = { roll: 7, type: 'grazer', weight: 400, hits: [10, 10], attacks: [{ with: 'hooves', dm: 0, damage: 6 }], attack: 6, flee: 6, speed: 2 };
    const rows = Array.from({ length: 11 }, (_, i) => (i + 2 === 7 ? row : { roll: i + 2, event: 'tracks' }));
    const table: AnimalTable = { terrain: 'clear', rows };
    const hex = hexFromFlat({ ...ref.demoWorld, column: 1, row: 1, name: 'Regina', animals: [table] });
    const there = setTerrain(setLocation(setHexes(createCampaign(), [hex]), '0101'), 'clear');
    const rolled = rollAnimalEncounter(there, fixedRandom(1, 1, 1, 1, 1, 1), fixedClock(), 7, 1);
    const campaign = rollSurprise(rolled.campaign, fixedRandom(3, 3));
    expect(moraleDue(campaign, currentEncounter(campaign)!, 'npcs')).toBe(false);
    const opened = startRound(inRound(campaign, 2), fixedRandom(1, 1));
    expect(opened.morale).toBe(false);
    expect(currentEncounter(opened.campaign)!.npcMorale).toBeUndefined();
  });
});
