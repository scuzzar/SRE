import { describe, expect, it } from 'vitest';
import {
  activeCharacters,
  addCharacter,
  appendLog,
  characterOf,
  createCampaign,
  focusOf,
  inputOf,
  keepFocus,
  removeCharacter,
  restoreCharacter,
  retiredCharacters,
  setFocus,
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

describe('Charakter oben', () => {
  const input = (name: string, dead = false): CharacterInput => ({ name, background: '', equipment: '', credits: 0, note: '', dead, upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [] });
  // Kira (c1), Jonas (c2), Mira (c3); oben steht zuerst Kira.
  const three = (): Campaign => setFocus(addCharacter(createCampaign(), input('Mira')).campaign, 'c1');
  const inLog = (campaign: Campaign, id: string): Campaign => appendLog(campaign, { kind: 'task', at: '', for: id, counts: [], odds: 'medium', dice: [1, 1], dm: 0, target: 8 });

  it('ist in einer neuen Kampagne der erste Lebende, in einer leeren keiner', () => {
    expect(focusOf(createCampaign())?.name).toBe('Kira Vant');
    expect(createCampaign().focus).toBe('c1');
    expect(focusOf(createCampaign([]))).toBeUndefined();
    expect('focus' in createCampaign([])).toBe(false);
  });

  it('wechselt beim Wischen, aber nur zu Lebenden, die nicht ausgeblendet sind', () => {
    expect(setFocus(three(), 'c3').focus).toBe('c3');
    const dead = updateCharacter(three(), 'c2', { ...inputOf(characterOf(three(), 'c2')), dead: true });
    expect(() => setFocus(dead, 'c2')).toThrow(/tot/);
    const retired = removeCharacter(inLog(three(), 'c2'), 'c2');
    expect(() => setFocus(retired, 'c2')).toThrow(/ausgeblendet/);
  });

  it('ein neuer Charakter steht oben, ein toter nicht', () => {
    expect(addCharacter(three(), input('Ada')).campaign.focus).toBe('c4');
    expect(addCharacter(three(), input('Bea', true)).campaign.focus).toBe('c1');
  });

  it('stirbt der Charakter oben, rückt der nächste Lebende nach, hinter dem letzten der vorige', () => {
    const kira = characterOf(three(), 'c1');
    expect(updateCharacter(three(), 'c1', { ...inputOf(kira), dead: true }).focus).toBe('c2');
    const last = setFocus(three(), 'c3');
    expect(updateCharacter(last, 'c3', { ...inputOf(characterOf(last, 'c3')), dead: true }).focus).toBe('c2');
  });

  it('auch beim Ausblenden und Löschen; ohne Lebende gibt es keinen', () => {
    expect(removeCharacter(inLog(three(), 'c1'), 'c1').focus).toBe('c2');
    expect(removeCharacter(three(), 'c1').focus).toBe('c2');
    const alone = removeCharacter(addCharacter(createCampaign([]), input('Ada')).campaign, 'c1');
    expect(alone.focus).toBeUndefined();
    expect(focusOf(alone)).toBeUndefined();
  });

  it('wieder lebendig oder eingeblendet ändert nichts, außer es gab keinen', () => {
    const jonasDead = updateCharacter(three(), 'c2', { ...inputOf(characterOf(three(), 'c2')), dead: true });
    expect(updateCharacter(jonasDead, 'c2', { ...inputOf(characterOf(jonasDead, 'c2')), dead: false }).focus).toBe('c1');
    const gone = removeCharacter(inLog(addCharacter(createCampaign([]), input('Ada')).campaign, 'c1'), 'c1');
    expect(gone.focus).toBeUndefined();
    expect(restoreCharacter(gone, 'c1').focus).toBe('c1');
  });

  it('bleibt bei anderen Änderungen der Kampagne erhalten', () => {
    const campaign = setOdds(setFocus(three(), 'c2'), 'high');
    expect(campaign.focus).toBe('c2');
    expect(keepFocus(campaign, campaign)).toBe(campaign);
  });
});
