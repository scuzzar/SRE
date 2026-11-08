import { describe, expect, it } from 'vitest';
import { createCampaign, currentEncounter, endTurn, fromCampaignFile, hasRun, moveSide, moveState, rollEncounter, rollSurprise, setBand, setHexes, setLocation, toCampaignFile, turnOf, type Campaign, type Hex } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { turnAttack } from './attack';

// Regina: TL 7. Zwei Thugs (15, L); die NSC ziehen zuerst (Anführer +1 auf die Überraschung), Start auf Short.
const regina: Hex = {
  column: 2,
  row: 7,
  empty: false,
  name: 'Regina',
  navalBase: false,
  scoutBase: true,
  gasGiant: true,
  uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
};

/** Zwei Thugs auf Band 5; die NSC sind zuerst dran. */
function thugs(): Campaign {
  const there = setLocation(setHexes(createCampaign(), [regina]), '0207');
  return setBand(rollSurprise(rollEncounter(there, fixedRandom(1, 5), fixedClock(), undefined, 2).campaign, fixedRandom()), 5);
}

const band = (c: Campaign) => currentEncounter(c)!.band;

describe('Bewegung nach den Regeln', () => {
  it('die Partei am Zug geht ein Band; das ist kein Zug', () => {
    let campaign = thugs();
    expect(turnOf(campaign)).toMatchObject({ id: 'n1', side: 'npcs' });
    campaign = moveSide(campaign, -1);
    expect(band(campaign)).toBe(4);
    expect(currentEncounter(campaign)).toMatchObject({ npcMoved: 1 });
    expect(turnOf(campaign)?.id).toBe('n1');
    expect(moveState(campaign)).toMatchObject({ side: 'npcs', moved: 1, can: true, ran: false });
  });

  it('ein zweites Band ist Laufen: nur bevor einer der Partei dran war, danach kein Angriff', () => {
    let campaign = moveSide(moveSide(thugs(), -1), -1);
    expect(band(campaign)).toBe(3);
    expect(hasRun(campaign, 'npcs')).toBe(true);
    expect(moveState(campaign)).toMatchObject({ can: false, ran: true });
    expect(() => moveSide(campaign, -1)).toThrow(/schon gelaufen/);
    expect(() => turnAttack({ ...campaign, focus: 'c1' }, 'c1')).toThrow(/gelaufen und greifen nicht an/);
    // Gegangen, dann war einer dran: laufen geht nicht mehr.
    campaign = endTurn(moveSide(thugs(), -1));
    expect(turnOf(campaign)?.id).toBe('n2');
    expect(() => moveSide(campaign, -1)).toThrow(/bevor einer von ihnen dran war/);
  });

  it('mit der neuen Runde beginnt jede Partei wieder bei 0; die SC bewegen sich in ihrem Zug', () => {
    let campaign = moveSide(thugs(), 1);
    campaign = endTurn(endTurn(campaign));
    expect(turnOf(campaign)).toMatchObject({ side: 'pcs' });
    expect(moveState(campaign)).toMatchObject({ side: 'pcs', moved: 0, can: true });
    campaign = moveSide(campaign, -1);
    expect(currentEncounter(campaign)).toMatchObject({ npcMoved: 1, pcMoved: 1 });
    campaign = endTurn(endTurn(campaign));
    expect(currentEncounter(campaign)!.round).toBe(2);
    expect(currentEncounter(campaign)).not.toHaveProperty('pcMoved');
    expect(currentEncounter(campaign)).not.toHaveProperty('npcMoved');
  });

  it('frei setzen zählt nicht als Bewegung; die Bewegung übersteht die Kampagnendatei', () => {
    const campaign = setBand(moveSide(thugs(), -1), 12);
    expect(currentEncounter(campaign)).toMatchObject({ band: 12, npcMoved: 1 });
    expect(currentEncounter(fromCampaignFile(toCampaignFile(campaign), 'k1'))).toMatchObject({ band: 12, npcMoved: 1 });
  });
});
