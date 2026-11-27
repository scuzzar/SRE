import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createCampaign, setHexes, type Campaign } from './campaign';
import { toCampaignFile } from './campaign-file';
import { currentEncounter, rollEncounter, rollSurprise, setDistance } from './encounter';
import type { DamageRoll } from './log';
import { canFight, woundStateOf } from './wounds';
import { ref } from './reference';
import { hexFromFlat } from './sector';
import { setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';

/** Schlägt `who` mit der Hand nieder, bis er nicht mehr kämpfen kann. */
function down(campaign: Campaign, who: string): Campaign {
  let running = campaign;
  for (let hit = 0; hit < 4 && canFight(woundStateOf(running, who)); hit += 1) {
    const at = `2026-11-27T15:0${hit}:00.000Z`;
    const attack = { kind: 'attack' as const, at, for: 'c1', against: who, with: 'hands', armor: 'nothing' as const, range: 'close' as const, dice: [6, 6] as const, dm: 0, target: 8 };
    const damage: DamageRoll = { kind: 'damage' as const, at, of: running.log.length, dice: [6], to: ['STR'] as const, points: [6] };
    running = { ...running, log: [...running.log, attack, damage] };
  }
  return running;
}

const path = 'e2e/fixtures/moral-flucht.json';

/**
 * Die Grundlage der GUI-Tests in `e2e/morale.spec.ts` (S. 5, SR 23): vier Marines (Art 24 –
 * militärisch, mit Anführer) gegen zwei SC, alle in Berührung, je zwei NSC und einer von zwei SC
 * bewusstlos – also beide Parteien bei 50 % Verlusten, die Moralwürfe ab der neuen Runde gesichert.
 * Der Test steht ein: Die Datei stimmt bytegenau mit dem überein, was das Modell heute daraus macht.
 * Ändert sich das Modell, die Datei neu erzeugen: `MORAL_FIXTURE=1 npx vitest run src/model/fixture-moral.test.ts`.
 */
describe('Fixture moral-flucht.json', () => {
  it('entspricht dem Modell (neu erzeugen mit MORAL_FIXTURE=1)', () => {
    const home = setLocation(setHexes(createCampaign(), [hexFromFlat({ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' })]), '0101');
    let campaign = rollSurprise(rollEncounter(home, fixedRandom(), fixedClock(), 24, 4).campaign, fixedRandom(3, 3));
    const npcs = currentEncounter(campaign)!.npcs.map((n) => n.id);
    campaign = down(campaign, npcs[1]!);
    campaign = down(campaign, npcs[2]!);
    campaign = down(campaign, 'c2');
    for (const pc of ['c1', 'c2']) campaign = setDistance(campaign, pc, 0, true);
    const encounter = currentEncounter(campaign)!;
    expect(encounter.npcs).toHaveLength(4);
    expect(woundStateOf(campaign, npcs[1]!)).toBe('unconscious');
    expect(woundStateOf(campaign, npcs[2]!)).toBe('unconscious');
    expect(woundStateOf(campaign, 'c2')).toBe('unconscious');
    const file = toCampaignFile(campaign) + '\n';
    if (process.env.MORAL_FIXTURE === '1') {
      if (!existsSync('e2e/fixtures')) mkdirSync('e2e/fixtures', { recursive: true });
      writeFileSync(path, file);
    }
    expect(file).toBe(readFileSync(path, 'utf8'));
  });
});
