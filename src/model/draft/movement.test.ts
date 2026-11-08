import { describe, expect, it } from 'vitest';
import { ammoOf, anyCharacterOf, blowsOf, createCampaign, evadeDm, currentEncounter, distanceOf, endTurn, evadeTurn, fromCampaignFile, hasRun, isEvading, moveSide, moveState, reloadableWeapon, replaceCharacter, rollEncounter, rollSurprise, setDistance, setHexes, setLocation, toCampaignFile, turnOf, weaponOf, type Campaign, type Hex } from '..';
import { allPcsAt, fixedClock, fixedRandom } from '../testing';
import { aimAt, attackExtras, evaluateAttack, neighbourTargets, turnAttack } from './attack';

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

/** Zwei Thugs, alle SC auf Band 5; die NSC sind zuerst dran. */
function thugs(): Campaign {
  const there = setLocation(setHexes(createCampaign(), [regina]), '0207');
  return allPcsAt(rollSurprise(rollEncounter(there, fixedRandom(1, 5), fixedClock(), undefined, 2).campaign, fixedRandom()), 5);
}

/** Wo dieser SC steht: „5“, „0c“ (Berührung). */
const at = (c: Campaign, pc: string) => {
  const d = distanceOf(currentEncounter(c)!, pc);
  return `${d.band}${d.close ? 'c' : ''}`;
};

/** Gibt einem Kämpfer eine Body Pistol als Primärwaffe mit so vielen Schuss und Magazinen. */
function pistol(campaign: Campaign, id: string, rounds: number, magazines: number): Campaign {
  const character = anyCharacterOf(campaign, id);
  const rest = character.possessions.filter((p) => p.of !== 'body-pistol' && p.of !== 'body-pistol-ammo');
  const possessions = [...rest, { of: 'body-pistol', count: 1, rounds }, ...(magazines > 0 ? [{ of: 'body-pistol-ammo', count: magazines }] : [])];
  return replaceCharacter(campaign, { ...character, possessions, primary: 'body-pistol', wields: 'body-pistol' });
}

describe('Bewegung: jeder SC für sich, die NSC als Gruppe auf Band 0', () => {
  it('die NSC-Gruppe geht ein Band: alle SC rücken mit; das ist kein Zug', () => {
    let campaign = setDistance(thugs(), 'c2', 2);
    expect(turnOf(campaign)).toMatchObject({ id: 'n1', side: 'npcs' });
    campaign = moveSide(campaign, -1);
    expect([at(campaign, 'c1'), at(campaign, 'c2')]).toEqual(['4', '1']);
    expect(currentEncounter(campaign)).toMatchObject({ npcMoved: 1 });
    expect(turnOf(campaign)?.id).toBe('n1');
    expect(moveState(campaign)).toMatchObject({ side: 'npcs', pc: undefined, moved: 1, can: true, ran: false });
  });

  it('wer in Berührung ist, bleibt es, wenn die NSC näher kommen; sind alle in Berührung, geht es nicht näher', () => {
    let campaign = setDistance(allPcsAt(thugs(), 0, true), 'c2', 1);
    campaign = moveSide(campaign, -1);
    expect([at(campaign, 'c1'), at(campaign, 'c2')]).toEqual(['0c', '0']);
    campaign = moveSide(campaign, -1);
    expect([at(campaign, 'c1'), at(campaign, 'c2')]).toEqual(['0c', '0c']);
    expect(() => moveSide(endTurn(allPcsAt(thugs(), 0, true)), -1)).toThrow(/Alle SC sind schon in Berührung/);
  });

  it('ein zweites Band ist Laufen: die NSC nur, bevor einer von ihnen dran war; danach setzen sie von selbst aus', () => {
    let campaign = moveSide(moveSide(thugs(), -1), -1);
    expect(at(campaign, 'c1')).toBe('3');
    expect(hasRun(campaign, { id: 'n1', side: 'npcs' })).toBe(true);
    expect(currentEncounter(campaign)).toMatchObject({ npcRuns: 1, round: 1, acted: ['n1', 'n2'] });
    expect(turnOf(campaign)).toMatchObject({ id: 'c1', side: 'pcs' });
    expect(moveState(campaign)).toMatchObject({ side: 'pcs', pc: 'c1', moved: 0, can: true, ran: false });
    // Gegangen, dann war einer dran: laufen geht nicht mehr.
    campaign = endTurn(moveSide(thugs(), -1));
    expect(turnOf(campaign)?.id).toBe('n2');
    expect(() => moveSide(campaign, -1)).toThrow(/bevor einer von ihnen dran war/);
  });

  it('ein SC bewegt sich in seinem Zug für sich; die anderen SC bleiben stehen', () => {
    let campaign = endTurn(endTurn(thugs()));
    expect(turnOf(campaign)?.id).toBe('c1');
    campaign = moveSide(campaign, -1);
    expect([at(campaign, 'c1'), at(campaign, 'c2')]).toEqual(['4', '5']);
    expect(distanceOf(currentEncounter(campaign)!, 'c1')).toMatchObject({ moved: 1 });
    expect(moveState(campaign)).toMatchObject({ pc: 'c1', moved: 1, can: true });
    // Kira greift danach noch an: Gehen ist kein Zug.
    expect(turnAttack(campaign, 'n1')).toMatchObject({ against: 'n1', range: 'long' });
    campaign = endTurn(campaign);
    // Jonas hat sich noch nicht bewegt.
    expect(moveState(campaign)).toMatchObject({ pc: 'c2', moved: 0 });
  });

  it('läuft ein SC, greift er nicht an und zahlt einen Combat-Schlag; nur er, nicht die anderen', () => {
    let campaign = endTurn(endTurn(thugs()));
    const kiraBlows = blowsOf(campaign, 'c1')!;
    const jonasBlows = blowsOf(campaign, 'c2')!;
    campaign = pistol(campaign, 'c2', 0, 1);
    campaign = moveSide(moveSide(campaign, -1), -1);
    // Kira kann nicht nachladen und setzt von selbst aus; Jonas ist dran und nicht gelaufen.
    expect(turnOf(campaign)).toMatchObject({ id: 'c2', side: 'pcs' });
    expect(distanceOf(currentEncounter(campaign)!, 'c1')).toMatchObject({ band: 3, moved: 2, runs: 1 });
    expect(blowsOf(campaign, 'c1')).toBe(kiraBlows - 1);
    expect(blowsOf(campaign, 'c2')).toBe(jonasBlows);
    expect(hasRun(campaign, { id: 'c2', side: 'pcs' })).toBe(false);
    // Läuft Jonas, der nachladen könnte, bleibt er am Zug, greift aber nicht an.
    campaign = moveSide(moveSide(campaign, 1), 1);
    expect(turnOf(campaign)).toMatchObject({ id: 'c2' });
    expect(() => turnAttack({ ...campaign, focus: 'c2' }, 'n1')).toThrow(/Jonas.* gelaufen und greift nicht an/);
    expect(() => moveSide(campaign, 1)).toThrow(/schon gelaufen/);
    campaign = endTurn(campaign);
    expect(currentEncounter(campaign)!.round).toBe(2);
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

  it('mit der neuen Runde beginnen alle wieder bei 0', () => {
    let campaign = moveSide(thugs(), 1);
    campaign = endTurn(endTurn(campaign));
    campaign = moveSide(campaign, -1);
    expect(currentEncounter(campaign)).toMatchObject({ npcMoved: 1 });
    expect(distanceOf(currentEncounter(campaign)!, 'c1')).toMatchObject({ moved: 1 });
    campaign = endTurn(endTurn(campaign));
    expect(currentEncounter(campaign)!.round).toBe(2);
    expect(currentEncounter(campaign)).not.toHaveProperty('npcMoved');
    expect(distanceOf(currentEncounter(campaign)!, 'c1')).not.toHaveProperty('moved');
  });

  it('frei setzen zählt nicht als Bewegung; die Bewegung übersteht die Kampagnendatei', () => {
    const campaign = setDistance(moveSide(thugs(), -1), 'c1', 12);
    expect(at(campaign, 'c1')).toBe('12');
    expect(currentEncounter(campaign)).toMatchObject({ npcMoved: 1 });
    const back = fromCampaignFile(toCampaignFile(campaign), 'k1');
    expect(at(back, 'c1')).toBe('12');
    expect(at(back, 'c2')).toBe('4');
    expect(currentEncounter(back)).toMatchObject({ npcMoved: 1 });
  });
});

describe('Ausweichen (SR 20)', () => {
  it('ist ein Zug; bis zu seinem nächsten Zug bekommt jeder Angriff auf ihn DM nach der Reichweite', () => {
    // Kira auf Band 5 (Long): −4. Die NSC sind zuerst dran.
    let campaign = endTurn(endTurn(thugs()));
    expect(turnOf(campaign)?.id).toBe('c1');
    campaign = evadeTurn(campaign);
    expect(isEvading(campaign, 'c1')).toBe(true);
    expect(currentEncounter(campaign)).toMatchObject({ evading: ['c1'], acted: ['n1', 'n2', 'c1'] });
    campaign = endTurn(campaign);
    // Runde 2, der Anführer zielt auf Kira (Band 5, Long: −4).
    expect(turnOf(campaign)?.id).toBe('n1');
    const onKira = aimAt({}, campaign, 'c1');
    expect(attackExtras(onKira, campaign)).toMatchObject({ evading: true, parry: 0 });
    expect(evadeDm(campaign, 'c1', 'long')).toBe(-4);
    expect(evadeDm(campaign, 'c1', 'medium')).toBe(-2);
    expect(evadeDm(campaign, 'c1', 'short')).toBe(-1);
    expect(evadeDm(campaign, 'c2', 'long')).toBe(0);
    // Im DM des Angriffs: auf Close −1 gegen Kira, nichts gegen Jonas.
    expect(evaluateAttack({ ...onKira, range: 'close' }, campaign)!.dm.evade).toBe(-1);
    expect(evaluateAttack({ ...aimAt({}, campaign, 'c2'), range: 'close' }, campaign)!.dm.evade).toBe(0);
    // Kiras nächster Zug nimmt sie heraus.
    campaign = endTurn(endTurn(campaign));
    expect(turnOf(campaign)?.id).toBe('c1');
    expect(isEvading(campaign, 'c1')).toBe(true);
    campaign = endTurn(campaign);
    expect(isEvading(campaign, 'c1')).toBe(false);
    expect(currentEncounter(campaign)).not.toHaveProperty('evading');
  });

  it('wer ausweicht, ist kein Nachbar; bei SC als Ziel nur SC mit derselben Entfernung', () => {
    let campaign = allPcsAt(thugs(), 0);
    const weapon = weaponOf('shotgun');
    expect(neighbourTargets(campaign, 'c1', weapon, false, fixedRandom())).toEqual(['c2']);
    campaign = setDistance(campaign, 'c2', 3);
    expect(neighbourTargets(campaign, 'c1', weapon, false, fixedRandom())).toEqual([]);
    campaign = allPcsAt(campaign, 0);
    campaign = { ...campaign, encounters: campaign.encounters.map((e) => ({ ...e, evading: ['c2'] })) };
    expect(neighbourTargets(campaign, 'c1', weapon, false, fixedRandom())).toEqual([]);
  });
});
