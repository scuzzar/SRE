import { describe, expect, it, vi } from 'vitest';
import { appendLog, createCampaign, type CampaignRepository } from '../model';
import { fixedClock, fixedRandom, memoryRepository } from '../model/testing';
import { GameController } from './game';

async function started(random = fixedRandom(), repository = memoryRepository()) {
  const game = new GameController({ repository, random, clock: fixedClock() });
  await game.init();
  return { game, repository };
}

describe('Start', () => {
  it('beginnt eine neue Kampagne mit den Beispielcharakteren und speichert sie', async () => {
    const { game, repository } = await started();
    await game.whenSaved();
    const view = game.snapshot();
    expect(view.ready).toBe(true);
    expect(view.screen).toBe('oracle');
    expect(view.characters.map((c) => c.name)).toEqual(['Kira Vant', 'Jonas Reyl']);
    expect(view.odds.find((o) => o.selected)?.name).toBe('Mittel');
    expect(repository.saved?.characters).toHaveLength(2);
  });

  it('lädt einen gespeicherten Spielstand', async () => {
    const saved = appendLog(createCampaign([]), { kind: 'dice', at: '2026-10-23T13:58:00.000Z', dice: [5, 4] });
    const { game } = await started(fixedRandom(), memoryRepository(saved));
    expect(game.snapshot().log).toEqual([{ kind: 'dice', at: '2026-10-23T13:58:00.000Z', dice: [5, 4], total: 9 }]);
  });

  it('meldet, wenn sich nicht speichern lässt', async () => {
    const broken: CampaignRepository = { load: async () => undefined, save: async () => Promise.reject(new Error('voll')) };
    const game = new GameController({ repository: broken, random: fixedRandom(), clock: fixedClock() });
    await game.init();
    await game.whenSaved();
    expect(game.snapshot().storageError).toMatch(/nicht speichern: Error: voll/);
  });

  it('meldet Änderungen an die View und hält den Snapshot dazwischen stabil', async () => {
    const { game } = await started();
    const listener = vi.fn();
    const unsubscribe = game.subscribe(listener);
    expect(game.snapshot()).toBe(game.snapshot());
    game.rollDice();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    game.rollDice();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('Orakel-Screen', () => {
  it('fragt das Orakel mit der eingestellten Stufe; die Stufe bleibt stehen und wird gespeichert', async () => {
    const { game, repository } = await started(fixedRandom(61, 20));
    game.setOdds('low');
    game.askOracle('Ist Halvek ehrlich?');
    game.askOracle();
    await game.whenSaved();
    expect(game.snapshot().log).toEqual([
      { kind: 'oracle', at: '2026-10-23T14:00:00.000Z', question: 'Ist Halvek ehrlich?', odds: 'Gering', roll: 61, chance: 25, yes: false },
      { kind: 'oracle', at: '2026-10-23T14:01:00.000Z', question: undefined, odds: 'Gering', roll: 20, chance: 25, yes: true },
    ]);
    expect(repository.saved?.odds).toBe('low');
  });

  it('würfelt 2W6 in den Log', async () => {
    const { game } = await started(fixedRandom(5, 4));
    game.rollDice();
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'dice', dice: [5, 4], total: 9 });
  });

  it('zeigt eine gezogene Karte im Vordergrund und übernimmt nur die Auswahl in den Log', async () => {
    const { game } = await started();
    game.drawCard('Was steckt hinter dem Notsignal?');
    const card = game.snapshot().card!;
    expect(card.question).toBe('Was steckt hinter dem Notsignal?');
    expect(card.canConfirm).toBe(false);
    const smell = card.sections.find((s) => s.id === 'senses')!.slots.find((s) => s.label === 'Riechen')!;
    const action = card.sections[0]!.slots[0]!;
    expect(action).toMatchObject({ label: 'Aktion', texts: ['aufgeben', 'Vorteil'] });
    game.togglePick(smell.id);
    game.togglePick(action.id);
    expect(game.snapshot().card).toMatchObject({ pickedCount: 2, canConfirm: true });
    expect(game.snapshot().log).toHaveLength(0);
    game.confirmCard();
    expect(game.snapshot().card).toBeUndefined();
    expect(game.snapshot().log).toEqual([
      {
        kind: 'card',
        at: '2026-10-23T14:00:00.000Z',
        question: 'Was steckt hinter dem Notsignal?',
        items: [
          { section: 'Zufallsereignis', slot: 'Aktion', texts: ['aufgeben', 'Vorteil'] },
          { section: 'Sinneseindrücke', slot: 'Riechen', texts: ['beißend', 'beißend'] },
        ],
      },
    ]);
  });

  it('verwirft eine Karte ohne Logeintrag; neu ziehen behält die Frage', async () => {
    const { game } = await started();
    game.drawCard('Und jetzt?');
    game.togglePick(game.snapshot().card!.sections[0]!.slots[0]!.id);
    game.redrawCard();
    expect(game.snapshot().card).toMatchObject({ question: 'Und jetzt?', pickedCount: 0 });
    game.discardCard();
    expect(game.snapshot().card).toBeUndefined();
    expect(game.snapshot().log).toHaveLength(0);
  });
});

describe('Charakter-Screen: Probe würfeln → Popup → zurück zum Orakel', () => {
  it('bereitet die Probe vor, würfelt, zeigt das Ergebnis und kehrt zum Orakel zurück', async () => {
    const { game } = await started(fixedRandom(4, 5));
    game.showScreen('characters');
    game.chooseCharacter('c1');
    expect(game.snapshot().task).toMatchObject({ character: 'Kira Vant', ready: false });
    game.chooseSkill('c1', 'pilot');
    game.toggleCharacteristic('DEX');
    game.setOdds('low');
    const task = game.snapshot().task!;
    expect(task).toMatchObject({ ready: true, dm: 3, target: 10, need: 7 });
    expect(Math.round(task.chance)).toBe(58);
    expect(task.parts).toEqual([
      { kind: 'skill', name: 'Pilot', level: 2, dm: 2 },
      { kind: 'characteristic', characteristic: 'DEX', value: 10, dm: 1 },
    ]);

    game.rollTask();
    const view = game.snapshot();
    expect(view.screen).toBe('characters');
    expect(view.result).toMatchObject({ character: 'Kira Vant', dice: [4, 5], dm: 3, total: 12, target: 10, success: true });
    expect(view.log.at(-1)).toEqual(view.result);

    game.closeResult();
    expect(game.snapshot()).toMatchObject({ screen: 'oracle', result: undefined, task: undefined });
  });

  it('beginnt mit einem anderen Charakter eine neue Probe und klappt denselben wieder zu', async () => {
    const { game } = await started();
    game.chooseCharacter('c1');
    game.chooseSkill('c1', 'pilot');
    game.chooseCharacter('c2');
    expect(game.snapshot().characters.map((c) => [c.name, c.chosen])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    expect(game.snapshot().task?.ready).toBe(false);
    game.chooseCharacter('c2');
    expect(game.snapshot().task).toBeUndefined();
  });

  it('startet die Probe direkt mit der Fertigkeit, ohne die Details aufzuklappen', async () => {
    const { game } = await started();
    game.chooseSkill('c1', 'pilot');
    expect(game.snapshot().task).toMatchObject({ character: 'Kira Vant', ready: true, dm: 2 });
    expect(game.snapshot().characters[0]).toMatchObject({ chosen: true, open: false });
    game.chooseCharacter('c1');
    expect(game.snapshot().characters[0]).toMatchObject({ chosen: true, open: true });
    expect(game.snapshot().task?.ready).toBe(true);
    game.chooseSkill('c1', 'navigation');
    expect(game.snapshot().characters[0]).toMatchObject({ open: true });
    game.chooseSkill('c2', null);
    expect(game.snapshot().characters.map((c) => [c.name, c.chosen])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    expect(game.snapshot().task).toMatchObject({ character: 'Jonas Reyl', ready: true, dm: -3 });
  });

  it('zeigt im Charakter, welche Fertigkeit gewählt ist und welche Attribute wählbar sind', async () => {
    const { game } = await started();
    game.chooseCharacter('c2');
    game.chooseSkill('c2', null);
    const jonas = game.snapshot().characters[1]!;
    expect(jonas.unskilled).toEqual({ dm: -3, chosen: true });
    expect(jonas.characteristics.filter((c) => c.selectable).map((c) => c.characteristic)).toEqual(['INT']);
  });
});

describe('Charaktere anlegen, bearbeiten, entfernen', () => {
  const mara = {
    name: 'Mara Quell',
    background: 'Ärztin',
    equipment: 'Medkit',
    credits: 800,
    note: '',
    upp: { str: 6, dex: 7, end: 7, int: 11, edu: 10, soc: 6 },
    skills: [{ of: 'medical', level: 2 }],
  };

  it('legt einen Charakter an und meldet ungültige Eingaben im Editor', async () => {
    const { game } = await started();
    game.newCharacter();
    expect(game.snapshot().editor).toMatchObject({ id: undefined, input: { name: '' }, error: undefined });
    game.saveCharacter({ ...mara, name: '' });
    expect(game.snapshot().editor?.error).toBe('Der Charakter braucht einen Namen.');
    game.saveCharacter(mara);
    expect(game.snapshot().editor).toBeUndefined();
    expect(game.snapshot().characters.at(-1)).toMatchObject({ name: 'Mara Quell', skills: [{ of: 'medical', name: 'Medical', level: 2 }] });
  });

  it('bearbeitet einen Charakter; die Probe für ihn beginnt neu', async () => {
    const { game } = await started();
    game.chooseCharacter('c1');
    game.chooseSkill('c1', 'pilot');
    game.editCharacter('c1');
    const input = game.snapshot().editor!.input;
    game.saveCharacter({ ...input, skills: input.skills.filter((s) => s.of !== 'pilot') });
    expect(game.snapshot().task).toMatchObject({ character: 'Kira Vant', ready: false });
    expect(game.snapshot().characters[0]!.skills.map((s) => s.name)).not.toContain('Pilot');
  });

  it('löscht Charaktere ohne Logeintrag und blendet die mit Logeintrag aus', async () => {
    const { game } = await started(fixedRandom(1, 1));
    game.chooseCharacter('c2');
    game.chooseSkill('c2', null);
    game.rollTask();
    game.closeResult();
    expect(game.snapshot().characters.map((c) => [c.name, c.inLog])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    game.removeCharacter('c1');
    game.removeCharacter('c2');
    expect(game.snapshot().characters).toEqual([]);
    expect(game.snapshot().retired).toEqual([{ id: 'c2', name: 'Jonas Reyl' }]);
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'task', character: 'Jonas Reyl', success: false });
    game.restoreCharacter('c2');
    expect(game.snapshot().characters.map((c) => c.name)).toEqual(['Jonas Reyl']);
  });
});
