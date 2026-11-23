import { describe, expect, it } from 'vitest';
import {
  createDemoCampaign,
  crewOf,
  fromCampaignFile,
  holderOf,
  movePost,
  postSkill,
  postsHeldBy,
  postsOf,
  removeCharacter,
  removeTurret,
  roleSkill,
  seat,
  toCampaignFile,
  type Campaign,
  type CharacterId,
} from '.';
import { fixedClock } from './testing';

const clock = fixedClock();

/** Die Demo auf Kessra: eine Yacht mit einem Double Turret und ein Beiboot, Kira als Pilot. */
function demo(): Campaign {
  return createDemoCampaign(clock);
}

/** Dieselbe Demo mit leeren Posten. */
function leer(): Campaign {
  const c = demo();
  return { ...c, ships: c.ships.map((s) => ({ ...s, crew: postsOf(s) })) };
}

const idOf = (campaign: Campaign, name: string): CharacterId => campaign.characters.find((c) => c.name === name)!.id;
const yacht = (campaign: Campaign) => campaign.ships.find((s) => s.mother === undefined)!;
const boat = (campaign: Campaign) => campaign.ships.find((s) => s.mother !== undefined)!;
const stellen = (campaign: Campaign, at: number, wer: CharacterId): Campaign => seat(campaign, yacht(campaign).id, at, wer);

describe('Posten der Crew (2026-11-22d)', () => {
  it('ein Schiff hat die Posten aus SR 33, die Gunner zwischen Pilot und Navigator', () => {
    expect(postsOf(yacht(demo())).map((p) => `${p.post}${p.turret === undefined ? '' : ` ${p.turret + 1}`}`)).toEqual(['pilot', 'gunner 1', 'navigator', 'engineer', 'steward', 'medic']);
    expect(crewOf(yacht(leer())).every((p) => p.who === undefined)).toBe(true);
  });

  it('die Demo setzt Kira Vant als Pilot und Jonas Reyl als Gunner ein', () => {
    expect(crewOf(yacht(demo())).map((p) => p.who)).toEqual(['c1', 'c2', undefined, undefined, undefined, undefined]);
    expect(postSkill(demo(), yacht(demo()), 0)).toBe(2);
    expect(postSkill(demo(), yacht(demo()), 1)).toBe(0);
  });

  it('je Turret ein Gunner; ein ausgebauter Turret nimmt seinen Posten mit, der andere folgt', () => {
    const basis = leer();
    const zwei = { ...basis, ships: basis.ships.map((s) => (s.mother === undefined ? { ...s, turrets: [{ type: 'double', weapons: [] }, { type: 'double', weapons: [] }] } : s)) };
    expect(postsOf(yacht(zwei)).map((p) => p.post)).toEqual(['pilot', 'gunner', 'gunner', 'navigator', 'engineer', 'steward', 'medic']);
    const c = stellen(zwei, 2, idOf(zwei, 'Kira Vant'));
    expect(yacht(c).crew?.[2]).toEqual({ post: 'gunner', turret: 1, who: idOf(zwei, 'Kira Vant') });
    const aus = removeTurret(c, 0);
    expect(yacht(aus).crew?.[1]).toEqual({ post: 'gunner', turret: 0, who: idOf(zwei, 'Kira Vant') });
    expect(yacht(aus).crew?.[0]).toEqual({ post: 'pilot' });
  });

  it('ein Small Craft hat nur den Piloten', () => {
    expect(postsOf(boat(demo()))).toEqual([{ post: 'pilot' }]);
  });

  it('die Besetzung liest die Fertigkeit des Posten', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const c = stellen(leer(), 0, kira);
    expect(holderOf(c, yacht(c), 0)?.name).toBe('Kira Vant');
    expect(postSkill(c, yacht(c), 0)).toBe(2);
    expect(postSkill(c, yacht(c), 3)).toBe(0);
    expect(holderOf(leer(), yacht(leer()), 0)).toBeUndefined();
  });

  it('zwei Posten: jede Fertigkeit zählt auf beiden um 1 niedriger', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const c = stellen(stellen(leer(), 0, kira), 3, kira);
    expect(postsHeldBy(c, kira).length).toBe(2);
    expect(yacht(c).crew?.[0]?.who).toBe(kira);
    expect(postSkill(c, yacht(c), 0)).toBe(1);
    expect(postSkill(c, yacht(c), 3)).toBe(0);
    expect(roleSkill(c.characters.find((p) => p.id === kira)!, 'navigator', yacht(c))).toBe(1);
  });

  it('ein dritter Posten geht nicht, auch nicht auf dem Beiboot', () => {
    const kira = idOf(demo(), 'Kira Vant');
    const c = stellen(demo(), 1, kira);
    expect(() => seat(c, yacht(c).id, 4, kira)).toThrow(/zwei Posten/);
    expect(() => seat(c, boat(c).id, 0, kira)).toThrow(/zwei Posten/);
  });

  it('geben macht den Posten frei', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const c = seat(stellen(leer(), 0, kira), yacht(leer()).id, 0, undefined);
    expect(yacht(c).crew?.[0]).toEqual({ post: 'pilot' });
    expect(postsHeldBy(c, kira)).toEqual([]);
  });

  it('ziehen tauscht zwei Posten, ein freier Posten wird leer', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const jonas = idOf(leer(), 'Jonas Reyl');
    const zwei = stellen(stellen(leer(), 0, kira), 4, jonas);
    const tau = movePost(zwei, { ship: yacht(zwei).id, at: 0 }, { ship: yacht(zwei).id, at: 4 });
    expect(yacht(tau).crew?.[0]).toEqual({ post: 'pilot', who: jonas });
    expect(yacht(tau).crew?.[4]).toEqual({ post: 'steward', who: kira });
    const frei = movePost(zwei, { ship: yacht(zwei).id, at: 0 }, { ship: yacht(zwei).id, at: 3 });
    expect(yacht(frei).crew?.[0]).toEqual({ post: 'pilot' });
    expect(yacht(frei).crew?.[3]).toEqual({ post: 'engineer', who: kira });
    expect(postsHeldBy(frei, kira).length).toBe(1);
  });

  it('über Schiffe hinweg: der Posten am anderen Schiff wird frei', () => {
    const jonas = idOf(leer(), 'Jonas Reyl');
    const c = stellen(leer(), 4, jonas);
    const um = movePost(c, { ship: yacht(c).id, at: 4 }, { ship: boat(c).id, at: 0 });
    expect(yacht(um).crew?.[4]?.who).toBeUndefined();
    expect(boat(um).crew?.[0]).toEqual({ post: 'pilot', who: jonas });
    expect(postsHeldBy(um, jonas).length).toBe(1);
  });

  it(`auf dem Small Craft zählt das bessere von Ship's Boat und Pilot − 1`, () => {
    const kira = idOf(leer(), 'Kira Vant');
    expect(roleSkill(demo().characters.find((p) => p.id === kira)!, 'pilot', yacht(demo()))).toBe(2);
    const c = seat(leer(), boat(leer()).id, 0, kira);
    expect(postSkill(c, boat(c), 0)).toBe(1);
  });

  it('ein toter Charakter verliert seinen Posten, die Kampagnendatei behält ihn', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const c = stellen(leer(), 0, kira);
    const tot = { ...c, characters: c.characters.map((p) => (p.id === kira ? { ...p, dead: true } : p)) };
    expect(holderOf(tot, yacht(tot), 0)).toBeUndefined();
    expect(postSkill(tot, yacht(tot), 0)).toBe(0);
    expect(yacht(tot).crew?.[0]?.who).toBe(kira);
  });

  it('ein gelöschter Charakter gibt seine Posten frei, die Datei bleibt zu lesen', () => {
    const c = stellen(leer(), 0, idOf(leer(), 'Jonas Reyl'));
    const weg = removeCharacter(c, idOf(c, 'Jonas Reyl'));
    expect(crewOf(yacht(weg))[1]?.who).toBeUndefined();
    expect(() => fromCampaignFile(toCampaignFile(weg), 'x')).not.toThrow();
  });

  it('die Datei hält die Crew; drei Posten sind kein Stand, ein fehlender Charakter verliert seinen', () => {
    const kira = idOf(leer(), 'Kira Vant');
    const c = stellen(leer(), 0, kira);
    expect(fromCampaignFile(toCampaignFile(c), 'x').ships).toEqual(c.ships);
    const drei = { ...c, ships: c.ships.map((s) => (s.mother === undefined ? { ...s, crew: [{ post: 'pilot' as const, who: kira }, { post: 'gunner' as const, turret: 0, who: kira }, { post: 'navigator' as const, who: kira }] } : s)) };
    expect(() => fromCampaignFile(toCampaignFile(drei), 'x')).toThrow(/3 Posten/);
    // Ein Charakter, den die Datei nicht mehr nennt – etwa einen gelöschten – verliert seinen Posten.
    const fremd = { ...c, ships: c.ships.map((s) => (s.mother === undefined ? { ...s, crew: [{ post: 'pilot' as const, who: 'c99' }] } : s)) };
    expect(yacht(fromCampaignFile(toCampaignFile(fremd), 'x')).crew?.[0]?.who).toBeUndefined();
    // Ein Posten, den das Schiff nicht (mehr) hat, fällt beim Lesen weg.
    const postenfremd = { ...c, ships: c.ships.map((s) => (s.mother === undefined ? { ...s, crew: [{ post: 'gunner' as const, turret: 4, who: kira }, { post: 'pilot' as const }] } : s)) };
    expect(yacht(fromCampaignFile(toCampaignFile(postenfremd), 'x')).crew?.[1]?.who).toBeUndefined();
  });

  it('ein Schiff von vor der Änderung hat alle Posten frei', () => {
    const c = stellen(leer(), 0, idOf(leer(), 'Kira Vant'));
    const datei = JSON.parse(toCampaignFile(c)) as { campaign: { ships: { crew?: unknown }[] } };
    for (const s of datei.campaign.ships) delete s.crew;
    const alt = fromCampaignFile(JSON.stringify(datei), 'x');
    expect(crewOf(yacht(alt)).length).toBe(6);
    expect(yacht(alt).crew).toBeUndefined();
    expect(yacht(alt).crew?.[0]).toBeUndefined();
    expect(holderOf(alt, yacht(alt), 0)).toBeUndefined();
  });
});
