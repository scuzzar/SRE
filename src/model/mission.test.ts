import { describe, expect, it } from 'vitest';
import {
  addCharacter,
  addMission,
  appendLog,
  createCampaign,
  createPatronMission,
  fromCampaignFile,
  LANDFORM_CODES,
  mapLocked,
  missionCells,
  missionPlaceBlocker,
  missionsAt,
  missionsIn,
  missionWorlds,
  missionsOfCharacter,
  moveParty,
  openMissions,
  removeCharacter,
  removeMission,
  restoreMission,
  setHexes,
  setLocation,
  surfaceGrid,
  toCampaignFile,
  updateMission,
  type Campaign,
  type CardPick,
  type Hex,
  type MissionInput,
  type PatronRoll,
  type Random,
} from '.';
import { fixedClock } from './testing';

const grid = surfaceGrid(2);
const clock = fixedClock();

function world(): Hex {
  let landforms = '';
  for (let c = 0; c < grid.cells; c++) landforms += LANDFORM_CODES.open;
  return {
    column: 1,
    row: 1,
    empty: false,
    name: 'Mora',
    navalBase: false,
    scoutBase: false,
    gasGiant: false,
    uwp: { starport: 12, size: 2, atmosphere: 6, hydrographics: 7, population: 6, government: 4, law: 3, tech: 8 },
    temperature: 'temperate',
    surface: { water: 70, plates: 5, majorContinents: 3, minorContinents: 3, majorIslands: 4, archipelagos: 6, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
    populationMultiplier: 2,
    map: { landforms, cities: [{ name: 'Startown', cell: 3, population: 5, multiplier: 2, rank: 'primary' }, { name: 'Orbital', population: 3, multiplier: 1, rank: 'secondary' }] },
  };
}

/** Eine Kampagne auf Mora, die Gruppe auf Feld 2, mit dem NSC Mara Voss (Patron). */
function campaign(): { c: Campaign; mara: string } {
  const base = moveParty(setLocation(setHexes(createCampaign([]), [world()]), '0101'), { world: '0101', cell: 2 });
  const { campaign: c, id: mara } = addCharacter(base, { name: 'Mara Voss', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [], npc: true, role: 'patron' });
  return { c, mara };
}

const input = (over: Partial<MissionInput> = {}): MissionInput => ({ title: 'Fracht nach Regina', text: '', state: 'open', places: [], ...over });

describe('Missionen', () => {
  it('legt eine Mission an: Titel ohne Leerraum, Auftraggeber, Orte mit Etikett', () => {
    const { c, mara } = campaign();
    const { campaign: after, id } = addMission(c, input({ title: '  Fracht nach Regina ', client: mara, places: [{ place: { world: '0101', cell: 5 }, label: ' Treffpunkt ' }, { place: { world: '0101', city: 0 }, label: '  ' }] }));
    const m = after.missions.find((x) => x.id === id)!;
    expect(m).toEqual({ id: 'm1', title: 'Fracht nach Regina', text: '', state: 'open', retired: false, client: mara, places: [{ place: { world: '0101', cell: 5 }, label: 'Treffpunkt' }, { place: { world: '0101', city: 0 } }], people: [] });
  });

  it('verknüpft Beteiligte mit Etikett, jeden höchstens einmal; ein Beteiligter wird nur ausgeblendet (2026-11-18b)', () => {
    const { c, mara } = campaign();
    expect(() => addMission(c, input({ people: [{ character: mara }, { character: mara }] }))).toThrow(/höchstens einmal/);
    expect(() => addMission(c, input({ people: [{ character: 'x9' }] }))).toThrow(/nicht zur Kampagne/);
    const { campaign: a } = addMission(c, input({ people: [{ character: mara, label: ' Opfer ' }] }));
    expect(a.missions[0]!.people).toEqual([{ character: mara, label: 'Opfer' }]);
    expect(missionsOfCharacter(a, mara).map((x) => [x.client, x.person?.label])).toEqual([[false, 'Opfer']]);
    expect(removeCharacter(a, mara).characters.find((x) => x.id === mara)?.retired).toBe(true);
    expect(fromCampaignFile(toCampaignFile(a), 'k2').missions[0]!.people).toEqual([{ character: mara, label: 'Opfer' }]);
  });

  it('braucht einen Titel', () => {
    expect(() => addMission(campaign().c, input({ title: '   ' }))).toThrow(/Titel/);
  });

  it('nimmt nur dauerhafte NSC als Auftraggeber', () => {
    const { c } = campaign();
    const { campaign: withPc, id: pc } = addCharacter(c, { name: 'Kira', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [] });
    expect(() => addMission(withPc, input({ client: pc }))).toThrow(/kein NSC/);
  });

  it('ein Missionsort ist ein Feld oder eine Stadt auf einem Feld, nie eine ganze Welt oder eine Orbitalstadt', () => {
    const { c } = campaign();
    expect(() => addMission(c, input({ places: [{ place: { world: '0101' } }] }))).toThrow(/keine ganze Welt/);
    expect(() => addMission(c, input({ places: [{ place: { world: '0101', city: 1 } }] }))).toThrow(/Orbitalstadt/);
    expect(missionPlaceBlocker(c, { world: '0101' })).toMatch(/keine ganze Welt/);
    expect(missionPlaceBlocker(c, c.location)).toBeUndefined();
  });

  it('wechselt den Zustand im Editor frei, auch zurück auf offen', () => {
    const { c } = campaign();
    const { campaign: a, id } = addMission(c, input());
    const done = updateMission(a, id, input({ state: 'done' }));
    expect(missionsIn(done, 'done').map((m) => m.id)).toEqual([id]);
    expect(openMissions(done)).toEqual([]);
    expect(openMissions(updateMission(done, id, input()))).toHaveLength(1);
  });

  it('findet offene Missionen auf einem Feld, auch über die Stadt darauf, und markiert Feld und Welt', () => {
    const { c } = campaign();
    let a = addMission(c, input({ title: 'A', places: [{ place: { world: '0101', city: 0 }, label: 'Ziel' }] })).campaign;
    a = addMission(a, input({ title: 'B', state: 'done', places: [{ place: { world: '0101', cell: 3 } }] })).campaign;
    expect(missionsAt(a, '0101', 3).map((h) => [h.mission.title, h.places.map((p) => p.label)])).toEqual([['A', ['Ziel']]]);
    expect(missionCells(a, '0101')).toEqual([3]);
    expect([...missionWorlds(a)]).toEqual(['0101']);
  });

  it('sperrt die Oberflächenkarte, solange ein Missionsort auf sie zeigt', () => {
    const { c } = campaign();
    const away = { ...c, location: { world: '0101' } };
    expect(mapLocked(away, 1, 1)).toBe(false);
    expect(mapLocked(addMission(away, input({ places: [{ place: { world: '0101', cell: 4 } }] })).campaign, 1, 1)).toBe(true);
  });

  it('löscht eine Mission; zeigt der Log auf sie als Faden, wird sie nur ausgeblendet', () => {
    const { c } = campaign();
    const { campaign: a, id } = addMission(c, input());
    expect(removeMission(a, id).missions).toEqual([]);
    const pick: CardPick = { kind: 'card', at: clock.now(), oracle: 11, odds: 'medium', chance: 50, eventFocus: 52, thread: id, items: [] };
    const logged = appendLog(a, pick);
    const hidden = removeMission(logged, id);
    expect(hidden.missions[0]!.retired).toBe(true);
    expect(openMissions(hidden)).toEqual([]);
    expect(openMissions(restoreMission(hidden, id))).toHaveLength(1);
  });

  it('blendet einen Auftraggeber nur aus, statt ihn zu löschen', () => {
    const { c, mara } = campaign();
    const a = addMission(c, input({ client: mara })).campaign;
    expect(removeCharacter(a, mara).characters.find((x) => x.id === mara)?.retired).toBe(true);
    expect(removeCharacter(c, mara).characters.find((x) => x.id === mara)).toBeUndefined();
  });

  it('übersteht die Kampagnendatei, auch mit Faden im Log; ältere Dateien haben keine Missionen', () => {
    const { c, mara } = campaign();
    const { campaign: a, id } = addMission(c, input({ client: mara, text: 'Mit Zoll', places: [{ place: { world: '0101', cell: 5 }, label: 'Treffpunkt' }] }));
    const logged = appendLog(a, { kind: 'card', at: clock.now(), oracle: 11, odds: 'medium', chance: 50, eventFocus: 52, thread: id, items: [] });
    const read = fromCampaignFile(toCampaignFile(logged), 'k2');
    expect(read.missions).toEqual(logged.missions);
    expect((read.log.at(-1) as CardPick).thread).toBe(id);
    const old = JSON.parse(toCampaignFile(c)) as { campaign: Record<string, unknown> };
    delete old.campaign.missions;
    expect(fromCampaignFile(JSON.stringify(old), 'k3').missions).toEqual([]);
  });

  it('weist einen Faden zurück, der auf keine Mission zeigt oder keinen Fadenfokus hat', () => {
    const { c } = campaign();
    const { campaign: a, id } = addMission(c, input());
    const bad = appendLog(a, { kind: 'card', at: clock.now(), oracle: 11, odds: 'medium', chance: 50, eventFocus: 30, thread: id, items: [] });
    expect(() => fromCampaignFile(toCampaignFile(bad), 'k2')).toThrow(/Fadenfokus/);
    const missing = appendLog(c, { kind: 'card', at: clock.now(), oracle: 11, odds: 'medium', chance: 50, eventFocus: 52, thread: 'm9', items: [] });
    expect(() => fromCampaignFile(toCampaignFile(missing), 'k2')).toThrow(/keine Mission/);
  });
});

describe('Als Mission', () => {
  it('legt zum Patron-Wurf den Patron-NSC und eine offene Mission mit ihm als Auftraggeber an', () => {
    const { c } = campaign();
    // Liste eins, 15: Smuggler, Laufbahn Merchants.
    const entry: PatronRoll = { kind: 'patron', at: clock.now(), list: 1, dice: [1, 5], dms: [0, 0] };
    const logged = appendLog(c, entry);
    const { campaign: after, npc, mission } = createPatronMission(logged, logged.log.length - 1, seeded(7));
    const m = after.missions.find((x) => x.id === mission)!;
    expect(m.client).toBe(npc);
    expect(m.state).toBe('open');
    expect(m.places).toEqual([{ place: { world: '0101', cell: 2 } }]);
    expect(m.title).toBe('Smuggler');
    expect(after.characters.find((x) => x.id === npc)?.role).toBe('patron');
  });
});

/** Eine lineare Kongruenz wie im Patron-Test: genug Zufall, damit die Charaktererschaffung zu Ende kommt. */
function seeded(start: number): Random {
  let seed = start;
  return {
    int(min: number, max: number) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return min + (Math.floor(seed / 65536) % (max - min + 1));
    },
  };
}
