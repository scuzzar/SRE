import { describe, expect, it } from 'vitest';
import { ammoOf, anyCharacterOf, createCampaign, currentEncounter, endTurn, fromCampaignFile, hasRun, moveSide, moveState, reloadableWeapon, replaceCharacter, rollEncounter, rollSurprise, setBand, setHexes, setLocation, toCampaignFile, turnOf, type Campaign, type Hex } from '..';
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

/** Gibt einem Kämpfer eine Body Pistol als Primärwaffe mit so vielen Schuss und Magazinen. */
function pistol(campaign: Campaign, id: string, rounds: number, magazines: number): Campaign {
  const character = anyCharacterOf(campaign, id);
  const rest = character.possessions.filter((p) => p.of !== 'body-pistol' && p.of !== 'body-pistol-ammo');
  const possessions = [...rest, { of: 'body-pistol', count: 1, rounds }, ...(magazines > 0 ? [{ of: 'body-pistol-ammo', count: magazines }] : [])];
  return replaceCharacter(campaign, { ...character, possessions, primary: 'body-pistol', wields: 'body-pistol' });
}

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

  it('ein zweites Band ist Laufen: nur bevor einer der Partei dran war; danach setzen ihre Kämpfer von selbst aus', () => {
    let campaign = moveSide(moveSide(thugs(), -1), -1);
    expect(band(campaign)).toBe(3);
    expect(hasRun(campaign, 'npcs')).toBe(true);
    // Beide Thugs setzen von selbst aus; die SC sind dran, in derselben Runde.
    expect(currentEncounter(campaign)).toMatchObject({ round: 1, acted: ['n1', 'n2'] });
    expect(turnOf(campaign)).toMatchObject({ id: 'c1', side: 'pcs' });
    expect(moveState(campaign)).toMatchObject({ side: 'pcs', moved: 0, can: true, ran: false });
    // Gegangen, dann war einer dran: laufen geht nicht mehr.
    campaign = endTurn(moveSide(thugs(), -1));
    expect(turnOf(campaign)?.id).toBe('n2');
    expect(() => moveSide(campaign, -1)).toThrow(/bevor einer von ihnen dran war/);
  });

  it('nach dem Laufen lädt ein NSC mit leerer Waffe und Magazin von selbst nach; ohne Magazin setzt er aus', () => {
    let campaign = pistol(pistol(thugs(), 'n1', 0, 2), 'n2', 0, 0);
    expect(reloadableWeapon(campaign, 'n1')).toBe('body-pistol');
    expect(reloadableWeapon(campaign, 'n2')).toBeUndefined();
    campaign = moveSide(moveSide(campaign, -1), -1);
    expect(ammoOf(anyCharacterOf(campaign, 'n1'))).toMatchObject({ rounds: 6, magazines: 1 });
    expect(ammoOf(anyCharacterOf(campaign, 'n2'))).toMatchObject({ rounds: 0, magazines: 0 });
    expect(turnOf(campaign)).toMatchObject({ id: 'c1', side: 'pcs' });
  });

  it('nach dem Laufen bleibt ein SC, der nachladen könnte, am Zug; die anderen setzen von selbst aus', () => {
    // Die NSC gehen nicht; dann sind die SC dran, Kira zuerst. Jonas hat eine leere Pistole und ein Magazin.
    let campaign = endTurn(endTurn(thugs()));
    expect(turnOf(campaign)?.id).toBe('c1');
    campaign = pistol(campaign, 'c2', 0, 1);
    campaign = moveSide(moveSide(campaign, -1), -1);
    // Kira kann nicht nachladen und setzt aus; Jonas bleibt am Zug, greift aber nicht an.
    expect(turnOf(campaign)).toMatchObject({ id: 'c2', side: 'pcs' });
    expect(() => turnAttack({ ...campaign, focus: 'c2' }, 'n1')).toThrow(/gelaufen und greifen nicht an/);
    // Setzt er aus, beginnt die nächste Runde.
    campaign = endTurn(campaign);
    expect(currentEncounter(campaign)!.round).toBe(2);
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
