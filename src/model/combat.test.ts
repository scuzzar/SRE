import { describe, expect, it } from 'vitest';
import {
  appendLog,
  armedWeaponsOf,
  characterOf,
  createCampaign,
  damageOf,
  fromCampaignFile,
  inputOf,
  isSkillLevelInLog,
  pendingDamage,
  removeCharacter,
  removeLogEntry,
  rollDamage,
  setWields,
  toCampaignFile,
  updateCharacter,
  weaponsOf,
  writeNote,
  type AttackResult,
  type Campaign,
} from '.';
import { fixedClock, fixedRandom } from './testing';

const hit: AttackResult = {
  kind: 'attack',
  at: '2026-11-03T10:00:00.000Z',
  for: 'c1',
  with: 'automatic-pistol',
  uses: 'auto-pistol',
  armor: 'jack',
  range: 'short',
  dice: [4, 3],
  dm: 5,
  target: 8,
};
const miss: AttackResult = {
  ...hit,
  at: '2026-11-03T10:01:00.000Z',
  dice: [1, 1],
  dm: -7,
  armor: 'combat',
  range: 'medium',
};

describe('Waffe in der Hand', () => {
  it('sind die Hände oder eine Waffe aus dem Besitz', () => {
    const campaign = createCampaign();
    const kira = characterOf(campaign, 'c1');
    expect(weaponsOf(kira)).toEqual(['hands', 'automatic-pistol']);
    expect(kira.wields).toBeUndefined();
    expect(characterOf(setWields(campaign, 'c1', 'automatic-pistol'), 'c1').wields).toBe('automatic-pistol');
    expect(characterOf(setWields(setWields(campaign, 'c1', 'automatic-pistol'), 'c1', 'hands'), 'c1')).not.toHaveProperty('wields');
    expect(() => setWields(campaign, 'c1', 'rifle')).toThrow(/Kira Vant hat keine Rifle/);
  });

  it('fällt weg, wenn der Gegenstand aus dem Besitz geht, und bleibt beim Bearbeiten sonst stehen', () => {
    const armed = setWields(createCampaign(), 'c1', 'automatic-pistol');
    const kira = characterOf(armed, 'c1');
    expect(characterOf(updateCharacter(armed, 'c1', inputOf(kira)), 'c1').wields).toBe('automatic-pistol');
    const without = {
      ...inputOf(kira),
      possessions: kira.possessions.filter((p) => p.of !== 'automatic-pistol'),
    };
    expect(characterOf(updateCharacter(armed, 'c1', without), 'c1')).not.toHaveProperty('wields');
  });
});

describe('Primär- und Sekundärwaffe', () => {
  // Jonas besitzt Blade (Primärwaffe) und bekommt im Editor eine Cutlass und eine Rifle dazu.
  const jonasWith = (campaign: Campaign, change: Partial<ReturnType<typeof inputOf>>) => {
    const jonas = characterOf(campaign, 'c2');
    const input = inputOf(jonas);
    return updateCharacter(campaign, 'c2', { ...input, possessions: [...jonas.possessions, { of: 'cutlass', count: 1 }, { of: 'rifle', count: 1 }], ...change });
  };

  it('legt man im Editor fest; im Kampf wechselt man nur zwischen ihnen und den Händen', () => {
    const campaign = jonasWith(createCampaign(), { secondary: 'cutlass' });
    const jonas = characterOf(campaign, 'c2');
    expect(jonas).toMatchObject({ primary: 'blade', secondary: 'cutlass' });
    expect(armedWeaponsOf(jonas)).toEqual(['blade', 'cutlass', 'hands']);
    expect(characterOf(setWields(campaign, 'c2', 'cutlass'), 'c2').wields).toBe('cutlass');
    expect(() => setWields(campaign, 'c2', 'rifle')).toThrow(/weder Primär- noch Sekundärwaffe von Jonas Reyl/);
  });

  it('nur Waffen aus dem Besitz, verschieden; sonst fallen sie weg', () => {
    const campaign = jonasWith(createCampaign(), { primary: 'rifle', secondary: 'rifle' });
    expect(characterOf(campaign, 'c2')).toMatchObject({ primary: 'rifle' });
    expect(characterOf(campaign, 'c2')).not.toHaveProperty('secondary');
    const notOwned = updateCharacter(createCampaign(), 'c2', { ...inputOf(characterOf(createCampaign(), 'c2')), primary: 'rifle' });
    expect(characterOf(notOwned, 'c2')).not.toHaveProperty('primary');
  });

  it('ist die Waffe in der Hand keine der beiden mehr, nimmt er die Primärwaffe; die Hände bleiben die Hände', () => {
    const armed = setWields(jonasWith(createCampaign(), { secondary: 'cutlass' }), 'c2', 'cutlass');
    const swapped = updateCharacter(armed, 'c2', { ...inputOf(characterOf(armed, 'c2')), secondary: 'rifle' });
    expect(characterOf(swapped, 'c2')).toMatchObject({ primary: 'blade', secondary: 'rifle', wields: 'blade' });
    const bare = jonasWith(createCampaign(), { secondary: 'rifle' });
    expect(characterOf(bare, 'c2')).not.toHaveProperty('wields');
  });

  it('ältere Kampagnendateien: Die Waffe in der Hand wird die Primärwaffe', () => {
    const json = JSON.parse(toCampaignFile(setWields(createCampaign(), 'c1', 'automatic-pistol'))) as { campaign: { characters: Record<string, unknown>[] } };
    json.campaign.characters = json.campaign.characters.map((c) => Object.fromEntries(Object.entries(c).filter(([key]) => key !== 'primary')));
    expect(characterOf(fromCampaignFile(JSON.stringify(json), 'k2'), 'c1')).toMatchObject({ primary: 'automatic-pistol', wields: 'automatic-pistol' });
    json.campaign.characters[1] = { ...json.campaign.characters[1], primary: 'blade', wields: 'automatic-pistol' };
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/nicht im Besitz/);
  });
});

describe('Angriffsergebnis und Schaden', () => {
  const campaign: Campaign = appendLog(createCampaign(), hit);

  it('bietet den Schaden für den neuesten Treffer an, solange er nicht gewürfelt ist', () => {
    expect(pendingDamage(campaign.log)).toBe(0);
    const roll = rollDamage(campaign, 0, fixedRandom(4, 2, 6), fixedClock());
    expect(roll).toMatchObject({ kind: 'damage', of: 0, dice: [4, 2, 6] });
    expect(damageOf(roll)).toBe(12);
    const after = appendLog(campaign, roll);
    expect(pendingDamage(after.log)).toBeUndefined();
    expect(() => rollDamage(after, 0, fixedRandom(), fixedClock())).toThrow(/schon gewürfelt/);
  });

  it('gibt keinen Schaden für einen Fehlschlag', () => {
    const missed = appendLog(createCampaign(), miss);
    expect(pendingDamage(missed.log)).toBeUndefined();
    expect(() => rollDamage(missed, 0, fixedRandom(), fixedClock())).toThrow(/nur für einen Treffer/);
    // Nach einem Fehlschlag gilt weiter der neueste Treffer davor.
    expect(pendingDamage(appendLog(campaign, miss).log)).toBe(0);
  });

  it('löscht mit dem Treffer seinen Schadenswurf und dessen Deutungen; die Verweise danach rücken nach', () => {
    let log = appendLog(appendLog(createCampaign(), miss), hit);
    log = appendLog(log, rollDamage(log, 1, fixedRandom(1, 2, 3), fixedClock()));
    log = appendLog(log, writeNote(log.log, 'Streifschuss', fixedClock(), 2));
    expect(removeLogEntry(log, 1).log).toEqual([miss]);
    const shifted = removeLogEntry(log, 0).log;
    expect(shifted.map((e) => e.kind)).toEqual(['attack', 'damage', 'note']);
    expect(shifted[1]).toMatchObject({ of: 0 });
    expect(shifted[2]).toMatchObject({ interprets: 1 });
    // Den Schadenswurf allein löschen lässt den Treffer stehen; dann lässt er sich neu würfeln.
    expect(pendingDamage(removeLogEntry(log, 2).log)).toBe(1);
  });

  it('hält Charakter und Fertigkeitsstufe fest: ausgeblendet statt gelöscht', () => {
    expect(isSkillLevelInLog(campaign, 'c1', 'auto-pistol')).toBe(true);
    expect(characterOf(removeCharacter(campaign, 'c1'), 'c1').retired).toBe(true);
  });
});

describe('Kampagnendatei mit Angriff', () => {
  it('übernimmt Waffe in der Hand, Angriff und Schaden unverändert', () => {
    let campaign = setWields(appendLog(createCampaign(), hit), 'c1', 'automatic-pistol');
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(6, 5, 4), fixedClock()));
    const back = fromCampaignFile(toCampaignFile(campaign), 'k2');
    expect(back.log).toEqual(campaign.log);
    expect(characterOf(back, 'c1').wields).toBe('automatic-pistol');
  });

  it('weist einen Schaden ohne Treffer, mit falscher Würfelzahl oder doppelt zurück', () => {
    const file = (log: unknown[]) =>
      JSON.stringify({
        ...JSON.parse(toCampaignFile(createCampaign())),
        campaign: {
          ...JSON.parse(toCampaignFile(createCampaign())).campaign,
          log,
        },
      });
    const damage = { kind: 'damage', at: hit.at, of: 0, dice: [1, 2, 3] };
    expect(() => fromCampaignFile(file([miss, damage]), 'k2')).toThrow(/nur für einen Treffer/);
    expect(() => fromCampaignFile(file([hit, { ...damage, dice: [1, 2] }]), 'k2')).toThrow(/3W6/);
    expect(() => fromCampaignFile(file([hit, damage, damage]), 'k2')).toThrow(/schon gewürfelt/);
    expect(() => fromCampaignFile(file([{ ...hit, with: 'laser-rifle', uses: 'laser-rifle' }]), 'k2')).toThrow(/Fertigkeit/);
  });

  it('weist eine Waffe in der Hand zurück, die nicht im Besitz ist', () => {
    const json = JSON.parse(toCampaignFile(createCampaign()));
    json.campaign.characters[0].wields = 'rifle';
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/nicht im Besitz/);
  });
});
