import { describe, expect, it } from 'vitest';
import {
  activeCharacters,
  addCharacter,
  appendLog,
  createCampaign,
  inputOf,
  removeCharacter,
  restoreCharacter,
  retiredCharacters,
  setOdds,
  updateCharacter,
  type Campaign,
  type CharacterInput,
} from './campaign';
import type { TaskResult } from './log';

const input: CharacterInput = {
  name: 'Mara Quell',
  background: '',
  equipment: '',
  credits: 0,
  note: '',
  upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 },
  skills: [{ of: 'medical', level: 1 }],
};

function taskFor(id: string, uses?: string): TaskResult {
  const result: TaskResult = { kind: 'task', at: '', for: id, counts: [], odds: 'medium', dice: [3, 4], dm: 0, target: 8 };
  return uses ? { ...result, uses } : result;
}

describe('Kampagne', () => {
  it('beginnt mit Stufe Mittel, leerem Log und den Beispielcharakteren', () => {
    const campaign = createCampaign();
    expect(campaign.odds).toBe('medium');
    expect(campaign.log).toEqual([]);
    expect(campaign.characters.map((c) => [c.id, c.name])).toEqual([
      ['c1', 'Kira Vant'],
      ['c2', 'Jonas Reyl'],
    ]);
  });

  it('merkt sich die gewählte Stufe', () => {
    expect(setOdds(createCampaign(), 'low').odds).toBe('low');
    expect(() => setOdds(createCampaign(), 'sure')).toThrow();
  });

  it('hängt Logeinträge nur an', () => {
    const campaign = appendLog(appendLog(createCampaign([]), taskFor('a')), taskFor('b'));
    expect(campaign.log.map((e) => e.kind === 'task' && e.for)).toEqual(['a', 'b']);
  });
});

describe('Charaktere anlegen und bearbeiten', () => {
  it('legt einen Charakter mit neuer Id an', () => {
    const { campaign, id } = addCharacter(createCampaign(), input);
    expect(id).toBe('c3');
    expect(campaign.characters.at(-1)).toMatchObject({ name: 'Mara Quell', retired: false, skills: [{ of: 'medical', level: 1, retired: false }] });
  });

  it.each([
    [{ ...input, name: '  ' }, /Namen/],
    [{ ...input, upp: { ...input.upp, dex: 16 } }, /zwischen 0 und 15/],
    [{ ...input, credits: 1.5 }, /ganze Zahl/],
    [{ ...input, skills: [{ of: 'pilot', level: 1 }, { of: 'pilot', level: 2 }] }, /Pilot kommt doppelt vor/],
    [{ ...input, skills: [{ of: 'pilot', level: -1 }] }, /0 oder mehr/],
    [{ ...input, skills: [{ of: 'telepathy', level: 1 }] }, /gibt es nicht/],
  ])('weist ungültige Eingaben zurück (%#)', (wrong, message) => {
    expect(() => addCharacter(createCampaign(), wrong)).toThrow(message);
  });

  it('ändert die Stufe einer Fertigkeit; alte Logeinträge zeigen den neuen Stand', () => {
    const campaign = appendLog(createCampaign(), taskFor('c1', 'pilot'));
    const kira = inputOf(campaign.characters[0]!);
    const after = updateCharacter(campaign, 'c1', { ...kira, skills: kira.skills.map((s) => (s.of === 'pilot' ? { ...s, level: 3 } : s)) });
    expect(after.characters[0]!.skills.find((s) => s.of === 'pilot')).toEqual({ of: 'pilot', level: 3, retired: false });
  });

  it('löscht eine Fertigkeitsstufe ohne Logeintrag und blendet eine mit Logeintrag aus', () => {
    const campaign = appendLog(createCampaign(), taskFor('c1', 'pilot'));
    const after = updateCharacter(campaign, 'c1', { ...inputOf(campaign.characters[0]!), skills: [] });
    expect(after.characters[0]!.skills).toEqual([{ of: 'pilot', level: 2, retired: true }]);
  });

  it('blendet eine ausgeblendete Fertigkeit wieder ein, wenn sie wiederkommt', () => {
    let campaign = appendLog(createCampaign(), taskFor('c1', 'pilot'));
    campaign = updateCharacter(campaign, 'c1', { ...inputOf(campaign.characters[0]!), skills: [] });
    campaign = updateCharacter(campaign, 'c1', { ...inputOf(campaign.characters[0]!), skills: [{ of: 'pilot', level: 1 }] });
    expect(campaign.characters[0]!.skills).toEqual([{ of: 'pilot', level: 1, retired: false }]);
  });
});

describe('Charaktere löschen und ausblenden', () => {
  it('löscht einen Charakter, auf den kein Logeintrag verweist', () => {
    const campaign = removeCharacter(createCampaign(), 'c2');
    expect(campaign.characters.map((c) => c.name)).toEqual(['Kira Vant']);
  });

  it('blendet einen Charakter aus, der im Log vorkommt, und kann ihn wieder einblenden', () => {
    let campaign: Campaign = appendLog(createCampaign(), taskFor('c2'));
    campaign = removeCharacter(campaign, 'c2');
    expect(activeCharacters(campaign).map((c) => c.name)).toEqual(['Kira Vant']);
    expect(retiredCharacters(campaign).map((c) => c.name)).toEqual(['Jonas Reyl']);
    campaign = restoreCharacter(campaign, 'c2');
    expect(activeCharacters(campaign)).toHaveLength(2);
  });

  it('vergibt nach dem Löschen keine Id doppelt, solange ein Charakter mit höherer Id bleibt', () => {
    const campaign = removeCharacter(createCampaign(), 'c1');
    expect(addCharacter(campaign, input).id).toBe('c3');
  });
});
