import { describe, expect, it } from 'vitest';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

async function started() {
  const game = new GameController({ repository: memoryRepository(), random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
  await game.init();
  return game;
}

/** Die Demo-Kampagne mit der Gruppe auf einem Feld von Kessra (0405). */
async function onField(cell = 10) {
  const game = await started();
  game.openGlobeAt(4, 5);
  game.pickCell(cell);
  game.moveParty();
  game.pickCell(undefined);
  return game;
}

describe('Missionen (2026-11-18)', () => {
  it('„+ Neue Mission“ öffnet den Editor im Reiter Missionen, mit dem Feld der Gruppe als erstem Ort', async () => {
    const game = await onField();
    game.newMission();
    const view = game.snapshot();
    expect(view.screen).toBe('missions');
    expect(view.missions.editor?.places.map((p) => [p.world, p.cell])).toEqual([['0405', 10]]);
    expect(view.missions.editor?.places[0]?.text).toMatch(/Kessra$/);
  });

  it('ohne Feld der Gruppe beginnt die Mission ohne Ort, und „+ Aufenthaltsort“ sagt warum', async () => {
    const game = await started();
    game.newMission();
    expect(game.snapshot().missions.editor?.places).toEqual([]);
    expect(game.snapshot().missions.hereBlocker).toMatch(/keine ganze Welt/);
  });

  it('speichert, zeigt die Mission oben und hält einen Fehler im Editor fest', async () => {
    const game = await onField();
    game.newMission();
    game.saveMission({ title: '  ', text: '', state: 'open', places: [] });
    expect(game.snapshot().missions.editor?.error).toMatch(/Titel/);
    game.saveMission({ title: 'Fracht nach Regina', text: 'Ohne Zoll', state: 'open', places: [{ place: { world: '0405', cell: 10 }, label: 'Treffpunkt' }] });
    const view = game.snapshot();
    expect(view.missions.editor).toBeUndefined();
    expect(view.missions.open.map((m) => [m.title, m.here, m.places[0]?.label])).toEqual([['Fracht nach Regina', true, 'Treffpunkt']]);
  });

  it('Ort wählen: der Editor tritt zurück, ein Feld auf dem Globus, „OK“ bringt es als Ort zurück', async () => {
    const game = await onField();
    game.newMission();
    const rev = game.snapshot().missions.editor!.rev;
    game.startMissionPicking({ title: 'Expedition', text: '', state: 'open', places: [{ place: { world: '0405', cell: 10 } }] });
    expect(game.snapshot().missions.editor).toBeUndefined();
    expect(game.snapshot().missions.picking).toEqual({ title: 'Expedition' });
    expect(game.snapshot().globe?.id).toBe('0405');
    game.pickCell(20);
    game.confirmMissionPlace();
    const editor = game.snapshot().missions.editor!;
    expect(editor.title).toBe('Expedition');
    expect(editor.rev).toBeGreaterThan(rev);
    expect(editor.places.map((p) => p.cell)).toEqual([10, 20]);
    expect(game.snapshot().screen).toBe('missions');
  });

  it('ein Reiter bricht das Ort wählen ab, die Eingabe bleibt', async () => {
    const game = await onField();
    game.newMission();
    game.startMissionPicking({ title: 'X', text: '', state: 'open', places: [] });
    game.showScreen('oracle');
    expect(game.snapshot().missions.picking).toBeUndefined();
    game.showScreen('missions');
    expect(game.snapshot().missions.editor?.title).toBe('X');
  });

  it('zeigt offene Missionen am Feld und als Fahne auf Globus und Subsektor', async () => {
    const game = await onField();
    game.newMission();
    game.saveMission({ title: 'Fracht', text: '', state: 'open', places: [{ place: { world: '0405', cell: 10 }, label: 'Treffpunkt' }] });
    game.showMissionPlace('0405', 10);
    const view = game.snapshot();
    expect(view.globe?.picked?.missions).toEqual([{ id: 'm1', title: 'Fracht', labels: ['Treffpunkt'] }]);
    expect(view.globe?.missionCells).toEqual([10]);
    expect(view.sector.find((h) => h.id === '0405')?.mission).toBe(true);
  });

  it('ein Ortsverweis lässt den Globus hinfliegen: Feld angetippt, Blatt höchstens halb, Fokus für die Karte', async () => {
    const game = await onField();
    game.setTrayStop('full');
    game.showMissionPlace('0405', 20);
    const view = game.snapshot();
    expect(view.globe?.picked?.cell).toBe(20);
    expect(view.trayStop).toBe('half');
    expect(view.globeFocus).toEqual({ cell: 20, n: 1 });
    // Derselbe Ort noch einmal fliegt wieder hin; ein anderes Feld anzutippen nimmt den Fokus weg.
    game.showMissionPlace('0405', 20);
    expect(game.snapshot().globeFocus).toEqual({ cell: 20, n: 2 });
    game.pickCell(21);
    expect(game.snapshot().globeFocus).toBeUndefined();
  });

  it('Beteiligte (2026-11-18b): SC oder NSC mit Etikett, in Reiter und Charakter-Editor', async () => {
    const game = await onField();
    const kira = game.snapshot().characters.find((c) => c.name === 'Kira Vant')!;
    expect(game.snapshot().missions.persons[0]).toMatchObject({ group: 'SC' });
    game.newMission();
    game.saveMission({ title: 'Mord in Startown', text: '', state: 'open', places: [], people: [{ character: kira.id, label: 'Zeugin' }] });
    expect(game.snapshot().missions.open[0]?.people).toEqual([{ id: kira.id, name: 'Kira Vant', label: 'Zeugin', dead: false }]);
    game.editMission('m1');
    expect(game.snapshot().missions.editor?.people.map((p) => p.label)).toEqual(['Zeugin']);
    game.closeMissionEditor();
    game.editCharacter(kira.id);
    expect(game.snapshot().editor).toMatchObject({ missions: [{ id: 'm1', title: 'Mord in Startown', state: 'open', as: 'Zeugin' }], inLog: true });
  });

  it('erledigte Missionen stehen getrennt; Löschen löscht wirklich, solange der Log nicht auf sie zeigt', async () => {
    const game = await onField();
    game.newMission();
    game.saveMission({ title: 'Post', text: '', state: 'done', places: [] });
    expect(game.snapshot().missions.done.map((m) => m.title)).toEqual(['Post']);
    game.editMission('m1');
    game.deleteMission('m1');
    expect(game.snapshot().missions).toMatchObject({ open: [], done: [], retired: [] });
  });

  it('zeigt im NSC-Editor die Missionen, die der NSC vergeben hat', async () => {
    const game = await onField();
    game.newCharacter(true, 'patron');
    game.saveCharacter({ name: 'Mara Voss', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [], npc: true, role: 'patron' });
    const mara = game.snapshot().npcs.worlds.flatMap((w) => w.roles.flatMap((r) => r.npcs)).find((n) => n.name === 'Mara Voss')!;
    expect(game.snapshot().missions.clients).toEqual([{ role: 'patron', npcs: [{ id: mara.id, name: 'Mara Voss' }] }]);
    game.newMission();
    game.saveMission({ title: 'Fracht', text: '', state: 'open', client: mara.id, places: [] });
    expect(game.snapshot().missions.open[0]?.client).toMatchObject({ name: 'Mara Voss', role: 'patron' });
    game.editCharacter(mara.id);
    expect(game.snapshot().editor?.missions).toEqual([{ id: 'm1', title: 'Fracht', state: 'open', as: 'Auftraggeber' }]);
  });
});
