import { describe, expect, it, vi } from 'vitest';
import { appendLog, createCampaign, DEMO_FUNDS, fromCampaignFile, ref, rollEncounter, rollSurprise, setHexes, setLocation, toCampaignFile, type CampaignRepository, type Random } from '../model';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';
import { surfaceLines } from './world-view';

async function started(random: Random = fixedRandom(), repository = memoryRepository(), download = memoryDownload()) {
  const game = new GameController({ repository, random, clock: fixedClock(), download, keys: countingKeys() });
  await game.init();
  return { game, repository, download };
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

  it('die erste Kampagne ist die Demo-Kampagne: mit der Startwelt, die Gruppe steht dort', async () => {
    const { game } = await started();
    const view = game.snapshot();
    expect(view.campaign.name).toBe('Demo-Kampagne');
    expect(view.location).toBe('0405');
    expect(view.shop!.world).toMatchObject({ name: 'Kessra', tech: 'A', law: '4' });
    expect(view.combat!.canEncounter).toBe(true);
    // Jede weitere Kampagne beginnt leer.
    game.createCampaign('Neu');
    expect(game.snapshot()).toMatchObject({ location: undefined, characters: [] });
    expect(game.snapshot().shop!.world).toBeUndefined();
  });

  it('lädt einen gespeicherten Spielstand', async () => {
    const saved = appendLog(createCampaign([]), { kind: 'dice', at: '2026-10-23T13:58:00.000Z', dice: [5, 4] });
    const { game } = await started(fixedRandom(), memoryRepository(saved));
    expect(game.snapshot().log).toEqual([{ kind: 'dice', at: '2026-10-23T13:58:00.000Z', dice: [5, 4], total: 9 }]);
  });

  it('meldet, wenn sich nicht speichern lässt', async () => {
    const broken: CampaignRepository = { ...memoryRepository(), save: async () => Promise.reject(new Error('voll')) };
    const game = new GameController({ repository: broken, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await game.init();
    await game.whenSaved();
    expect(game.snapshot().storageError).toMatch(/nicht speichern: Error: voll/);
  });

  it('meldet, ob der Browser den Speicher dauerhaft hält, ohne den Start aufzuhalten', async () => {
    let answer: (durable: boolean) => void = () => undefined;
    const durable = new Promise<boolean | undefined>((resolve) => (answer = resolve));
    const game = new GameController({ repository: memoryRepository(), random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys(), durable });
    await game.init();
    expect(game.snapshot()).toMatchObject({ ready: true, durable: undefined });
    answer(true);
    await durable;
    expect(game.snapshot().durable).toBe(true);
  });

  it('überschreibt nichts, wenn sich der Spielstand nicht laden lässt', async () => {
    const stored = createCampaign([], 'Spinward', 'k1');
    const repository = memoryRepository(stored);
    const broken: CampaignRepository = { ...repository, list: async () => Promise.reject(new Error('kaputt')) };
    const game = new GameController({ repository: broken, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await game.init();
    game.rollDice();
    await game.whenSaved();
    expect(game.snapshot()).toMatchObject({ ready: true, persistent: false, storageError: expect.stringMatching(/nicht laden: Error: kaputt/) });
    expect(repository.campaigns.get('k1')).toBe(stored);
    expect(repository.open).toBeUndefined();
  });

  it('öffnet die Kampagne, die zuletzt offen war', async () => {
    const repository = memoryRepository(createCampaign([], 'Spinward', 'k1'), createCampaign([], 'Aramis', 'k2'));
    repository.open = 'k1';
    const { game } = await started(fixedRandom(), repository);
    expect(game.snapshot().campaign).toEqual({ id: 'k1', name: 'Spinward' });
    expect(game.snapshot().campaigns.map((c) => [c.name, c.open])).toEqual([
      ['Aramis', false],
      ['Spinward', true],
    ]);
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
      { kind: 'oracle', at: '2026-10-23T14:02:00.000Z', question: 'Ist Halvek ehrlich?', odds: 'Gering', roll: 61, chance: 25, yes: false },
      { kind: 'oracle', at: '2026-10-23T14:04:00.000Z', question: undefined, odds: 'Gering', roll: 20, chance: 25, yes: true },
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
        at: '2026-10-23T14:01:00.000Z',
        question: 'Was steckt hinter dem Notsignal?',
        bell: undefined,
        scatter: undefined,
        map: undefined,
        items: [
          { section: 'Zufallsereignis', slot: 'Aktion', texts: ['aufgeben', 'Vorteil'], name: false },
          { section: 'Sinneseindrücke', slot: 'Riechen', texts: ['beißend', 'beißend'], name: false },
        ],
      },
    ]);
  });

  it('übernimmt Wurffelder mit ihrem Wert, vor den Feldern; ein Name steht am Stück', async () => {
    const { game } = await started();
    game.drawCard();
    const card = game.snapshot().card!;
    expect(card.bell).toMatchObject({ value: 1, picked: false });
    expect(card.scatter).toMatchObject({ value: 'n', picked: false });
    expect(card.map.value).toEqual({ north: 'path', east: 'path', south: 'path', west: 'path', up: 'path', down: 'path' });
    const npc = card.sections.find((s) => s.id === 'npc')!;
    expect(npc.slots.filter((s) => s.name).map((s) => s.label)).toEqual(['Weiblich, irdisch', 'Männlich, irdisch', 'Neutral, irdisch', 'Weiblich, spacig', 'Männlich, spacig', 'Neutral, spacig']);
    game.toggleRoll('map');
    game.toggleRoll('scatter');
    game.togglePick('npc.names.male.spacey');
    expect(game.snapshot().card).toMatchObject({ pickedCount: 3, canConfirm: true, scatter: { picked: true }, bell: { picked: false } });
    game.confirmCard();
    const [item] = game.snapshot().log;
    expect(item).toMatchObject({ kind: 'card', bell: undefined, scatter: 'n', map: card.map.value, items: [{ section: 'NSC', slot: 'Männlich, spacig', name: true }] });
  });

  it('Name von der Karte: zieht Vor- und Nachnamen zur Wahl, ohne Logeintrag', async () => {
    const { game } = await started();
    game.drawNames();
    const names = game.snapshot().names!;
    expect(names.first).toHaveLength(12);
    expect(names.first.slice(0, 6).every((n) => n.sound === 'earthly')).toBe(true);
    expect(names.first.slice(6).every((n) => n.sound === 'spacey')).toBe(true);
    expect(new Set(names.first.map((n) => n.text)).size).toBe(12);
    expect(names.last.length).toBeGreaterThanOrEqual(2);
    game.closeNames();
    expect(game.snapshot().names).toBeUndefined();
    expect(game.snapshot().log).toHaveLength(0);
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

describe('Charakter oben: Probe im Orakel-Screen', () => {
  it('bereitet die Probe für den Charakter oben vor, würfelt, zeigt das Ergebnis; „Weiter“ lässt sie vorbereitet', async () => {
    const { game } = await started(fixedRandom(4, 5));
    expect(game.snapshot()).toMatchObject({ screen: 'oracle', focus: 'c1', task: undefined });
    game.chooseSkill('pilot');
    game.toggleCharacteristic('DEX');
    game.setOdds('low');
    const task = game.snapshot().task!;
    expect(task).toMatchObject({ character: 'Kira Vant', ready: true, dm: 3, target: 10, need: 7 });
    expect(Math.round(task.chance)).toBe(58);
    expect(task.parts).toEqual([
      { kind: 'skill', name: 'Pilot', level: 2, dm: 2 },
      { kind: 'characteristic', characteristic: 'DEX', value: 10, dm: 1 },
    ]);

    game.rollTask();
    const view = game.snapshot();
    expect(view.screen).toBe('oracle');
    expect(view.result).toMatchObject({ character: 'Kira Vant', dice: [4, 5], dm: 3, total: 12, target: 10, success: true });
    expect(view.log.at(-1)).toEqual(view.result);

    game.closeResult();
    expect(game.snapshot()).toMatchObject({ result: undefined, task: { character: 'Kira Vant', ready: true } });
    game.endTask();
    expect(game.snapshot().task).toBeUndefined();
  });

  it('Wischen stellt einen anderen Charakter nach oben, speichert ihn und beendet die Probe', async () => {
    const { game, repository } = await started();
    game.chooseSkill('pilot');
    game.focusCharacter('c2');
    await game.whenSaved();
    expect(game.snapshot().characters.map((c) => [c.name, c.focus])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    expect(game.snapshot().task).toBeUndefined();
    expect(repository.saved?.focus).toBe('c2');
    game.chooseSkill(null);
    expect(game.snapshot().task).toMatchObject({ character: 'Jonas Reyl', ready: true, dm: -3 });
  });

  it('dieselbe Fertigkeit noch einmal nimmt die Wahl zurück', async () => {
    const { game } = await started();
    game.chooseSkill('pilot');
    game.chooseSkill('pilot');
    expect(game.snapshot().task?.ready).toBe(false);
    expect(game.snapshot().characters[0]!.skills.some((s) => s.chosen)).toBe(false);
  });

  it('zeigt am Charakter oben, welche Fertigkeit gewählt ist und welche Attribute wählbar sind', async () => {
    const { game } = await started();
    game.focusCharacter('c2');
    game.chooseSkill(null);
    const jonas = game.snapshot().characters[1]!;
    expect(jonas.unskilled).toEqual({ dm: -3, chosen: true });
    expect(jonas.characteristics.filter((c) => c.selectable).map((c) => c.characteristic)).toEqual(['INT']);
    // Wer nicht oben steht, hat nichts zu wählen.
    expect(game.snapshot().characters[0]!.characteristics.some((c) => c.selectable)).toBe(false);
  });

  it('holt mit einer Fertigkeit auf einer anderen Karte den Charakter nach oben und beginnt die Probe', async () => {
    const { game } = await started();
    game.chooseSkill('pilot');
    game.chooseSkillOf('c2', null);
    const [kira, jonas] = game.snapshot().characters;
    expect(jonas!.focus).toBe(true);
    expect(kira!.focus).toBe(false);
    expect(jonas!.unskilled).toEqual({ dm: -3, chosen: true });
    expect(game.snapshot().task?.character).toBe(jonas!.name);
    // Steht er schon oben, nimmt dieselbe Fertigkeit die Wahl zurück wie chooseSkill.
    game.chooseSkillOf('c2', null);
    expect(game.snapshot().characters[1]!.unskilled).toEqual({ dm: -3, chosen: false });
  });

  it('bietet mit Jack-of-all-Trades kein „ohne Fertigkeit“ an; JoT gibt ±0', async () => {
    const { game } = await started();
    const jonas = game.snapshot().characters[1]!;
    game.editCharacter('c2');
    game.saveCharacter({ ...game.snapshot().editor!.input, skills: [...game.snapshot().editor!.input.skills, { of: 'jack-of-all-trades', level: 1 }] });
    expect(game.snapshot().characters[1]!.unskilled).toBeUndefined();
    expect(jonas.unskilled).toEqual({ dm: -3, chosen: false });
    game.focusCharacter('c2');
    game.chooseSkill('jack-of-all-trades');
    expect(game.snapshot().task).toMatchObject({ ready: true, dm: 0, parts: [{ kind: 'skill', name: 'Jack-of-all-Trades', level: undefined, dm: 0 }] });
    // JoT zeigt keine Stufe, weder auf der Karte noch im Editor.
    expect(game.snapshot().characters[1]!.skills.find((s) => s.of === 'jack-of-all-trades')).toMatchObject({ short: 'JoT', level: undefined });
    expect(game.snapshot().skills.filter((s) => !s.leveled).map((s) => s.id)).toEqual(['jack-of-all-trades']);
  });

  it('klappt die Leiste ein und auf; das Gerät merkt es sich über einen Neustart', async () => {
    const { game, repository } = await started();
    expect(game.snapshot().stripCollapsed).toBe(false);
    game.toggleStrip();
    await game.whenSaved();
    expect(game.snapshot().stripCollapsed).toBe(true);
    expect(repository.stripCollapsed).toBe(true);
    const again = new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await again.init();
    expect(again.snapshot().stripCollapsed).toBe(true);
  });

  it('blendet den Hinweis im Shop aus; das Gerät merkt es sich über einen Neustart', async () => {
    const { game, repository } = await started();
    expect(game.snapshot().shopHintHidden).toBe(false);
    game.hideShopHint();
    await game.whenSaved();
    expect(game.snapshot().shopHintHidden).toBe(true);
    expect(repository.shopHintHidden).toBe(true);
    const again = new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await again.init();
    expect(again.snapshot().shopHintHidden).toBe(true);
  });

  it('ein neu erschaffener Charakter steht oben, im Orakel-Screen', async () => {
    const { game } = await started();
    game.newCharacter();
    game.saveCharacter({ name: 'Mara Quell', background: '', equipment: '', credits: 0, note: '', upp: { str: 6, dex: 7, end: 7, int: 11, edu: 10, soc: 6 }, skills: [] });
    expect(game.snapshot().focus).toBe('c3');
  });
});

describe('Kampf', () => {
  it('zeigt die Tabelle der Waffe in der Hand; ohne Waffe sind es die Hände', async () => {
    const { game } = await started();
    game.showScreen('combat');
    const combat = game.snapshot().combat!;
    expect(combat.character).toBe('Kira Vant');
    // Zur Wahl stehen Primärwaffe, Sekundärwaffe (Kira hat keine) und die Hände.
    expect(combat.weapons.map((w) => [w.name, w.short, w.wielded])).toEqual([
      ['Automatic Pistol', 'APi-1', false],
      ['Hände', 'Brw-0', true],
    ]);
    expect(combat.ranges.map((r) => r.dm)).toEqual([2, 1, undefined, undefined, undefined]);
    expect(combat.rows.map((r) => r.armor)).toEqual(['nothing', 'jack', 'mesh', 'cloth', 'reflec', 'ablat', 'combat']);
  });

  it('Kira zieht die Pistole, wählt ein Ziel in Jack auf Short, trifft und würfelt den Schaden', async () => {
    const { game, repository } = await started(fixedRandom(4, 3, 6, 5, 4));
    game.showScreen('combat');
    game.wieldWeapon('automatic-pistol');
    expect(game.snapshot().combat!.rows[1]!.cells.map((c) => c.odds?.need)).toEqual([4, 3, 9, 11, undefined]);
    game.chooseTarget('jack', 'short');
    expect(game.snapshot().combat!.target).toMatchObject({ dm: 5, need: 3 });
    game.rollAttack();
    const view = game.snapshot();
    expect(view.result).toMatchObject({ kind: 'attack', success: true, total: 12, damagePending: true, wounds: 3 });
    expect(view.combat!.damage).toMatchObject({ index: 0, wounds: 3 });
    game.rollDamage();
    const after = game.snapshot();
    expect(after.result).toMatchObject({ kind: 'damage', of: 0, dice: [6, 5, 4], damage: 15, weapon: 'Automatic Pistol' });
    expect(after.log[1]).toMatchObject({ kind: 'damage', of: 0, dice: [6, 5, 4], damage: 15 });
    game.closeResult();
    expect(game.snapshot().result).toBeUndefined();
    expect(after.combat!.damage).toBeUndefined();
    expect(after.combat!.target).toMatchObject({ armor: 'jack', range: 'short' });
    await game.whenSaved();
    expect(repository.saved?.characters[0]?.wields).toBe('automatic-pistol');
  });

  it('nimmt das Ziel mit derselben Zelle zurück, und Wischen beendet den Angriff', async () => {
    const { game } = await started();
    game.chooseTarget('mesh', 'close');
    game.chooseTarget('mesh', 'close');
    expect(game.snapshot().combat!.target).toBeUndefined();
    game.chooseTarget('mesh', 'close');
    game.focusCharacter('c2');
    expect(game.snapshot().combat).toMatchObject({ character: 'Jonas Reyl', target: undefined });
  });

  it('lässt die Reichweite fallen, wenn die neue Waffe nicht hinreicht', async () => {
    const { game } = await started();
    game.wieldWeapon('automatic-pistol');
    game.chooseTarget('cloth', 'long');
    game.wieldWeapon('hands');
    expect(game.snapshot().combat!.target).toBeUndefined();
    expect(() => game.chooseTarget('cloth', 'long')).toThrow(/kein Angriff/);
  });
});

describe('Shop und Gruppenkasse', () => {
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };

  it('die Beispiel-Charaktere tragen ihre Rüstung; eine gekaufte Rüstung trägt er gleich, die alte kommt ins Gepäck', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign(), [regina])));
    expect(game.snapshot().characters.map((c) => c.armor)).toEqual(['Jack', 'Mesh']);
    game.chooseHex(1, 1);
    game.stayHere();
    game.book('income', 1000, 'Belohnung');
    game.buy('cloth', 1, 'c1');
    expect(game.snapshot().characters[0]!.armor).toBe('Cloth');
    expect(game.snapshot().stash.items.map((i) => i.label)).toContain('Jack');
    // Im Gepäck-Bereich legt man sie wieder an; Cloth kommt dafür ins Gepäck.
    game.equip('c1', 'wears', { key: 'jack' });
    expect(game.snapshot().characters[0]!.armor).toBe('Jack');
    expect(game.snapshot().stash.items.map((i) => i.label)).toContain('Cloth');
    expect(game.snapshot().stash.members[0]!.slots.find((s) => s.slot === 'wears')).toMatchObject({ label: 'Jack' });
  });

  it('Gepäck: ausrüsten, zwischen SC tauschen, ablegen; Last und Traglast', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign(), [regina])));
    // Kira (STR 7) und Jonas (STR 6) tragen zusammen 13 kg auf Größe 8; Regina hat Größe 7: 112,5 %.
    expect(game.snapshot().stash.capacity).toBe(13);
    game.chooseHex(1, 1);
    game.stayHere();
    expect(game.snapshot().stash.capacity).toBeCloseTo(14.63, 2);
    // Kira gibt ihre Automatic Pistol an Jonas: Sie wird seine Primärwaffe, seine Blade kommt ins Gepäck.
    game.equip('c2', 'primary', { from: 'c1', fromSlot: 'primary' });
    const [kira, jonas] = game.snapshot().stash.members;
    expect(kira!.slots[0]).toMatchObject({ label: undefined });
    expect(jonas!.slots[0]).toMatchObject({ label: 'Automatic Pistol' });
    expect(game.snapshot().stash.items.map((i) => i.label)).toContain('Blade');
    // Jonas legt sie ab: Sie kommt ins Gepäck.
    game.unequip('c2', 'primary');
    expect(game.snapshot().stash.items.map((i) => i.label)).toEqual(expect.arrayContaining(['Automatic Pistol', 'Blade']));
    // Eine Rüstung passt nicht auf Primär: Der Fehler steht im Gepäck, nichts ändert sich.
    game.equip('c2', 'primary', { key: 'vacc-suit-tl12' });
    expect(game.snapshot().stash.error).toMatch(/passt nicht/);
  });

  it('die Gruppe ist auf Regina, bucht eine Belohnung, kauft eine Rifle mit Magazin, lädt und schießt', async () => {
    const { game, repository } = await started(fixedRandom(6, 6), memoryRepository(setHexes(createCampaign(), [regina])));
    expect(game.snapshot().shop).toMatchObject({ funds: 0, world: undefined, offer: [] });
    game.chooseHex(1, 1);
    game.stayHere();
    expect(game.snapshot().location).toBe('0101');
    expect(game.snapshot().shop!.world).toMatchObject({ name: 'Regina', tech: '7', law: '5' });

    game.book('income', 1000, 'Belohnung von Dr. Halvek');
    game.buy('rifle', 1, 'c2');
    game.buy('rifle-ammo', 1, 'c2');
    game.buy('free-trader', 1, 'c2');
    const shop = game.snapshot().shop!;
    expect(shop.error).toMatch(/gibt es auf Regina nicht/);
    expect(shop.funds).toBe(780);
    expect(shop.bookings.map((b) => [b.kind, b.amount])).toEqual([
      ['purchase', -20],
      ['purchase', -200],
      ['income', 1000],
    ]);
    expect(shop.offer.find((g) => g.kind === 'weapon')!.items.find((i) => i.id === 'revolver')).toMatchObject({ banned: 5, affordable: true });

    game.focusCharacter('c2');
    game.wieldWeapon('rifle');
    expect(game.snapshot().combat!.ammo).toEqual({ rounds: 0, capacity: 20, magazine: 'Rifle Ammo (20 rds)', magazines: 1 });
    game.chooseTarget('nothing', 'medium');
    expect(() => game.rollAttack()).toThrow(/leer/);
    game.reload();
    game.rollAttack();
    expect(game.snapshot().combat!.ammo).toMatchObject({ rounds: 19, magazines: 0 });
    await game.whenSaved();
    expect(repository.saved?.bookings).toHaveLength(3);
    expect(repository.saved?.location).toBe('0101');
  });

  it('zeigt die Waffen mit Magazin daneben und was sie dem Charakter oben taugen', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign(), [regina])));
    game.chooseHex(1, 1);
    game.stayHere();
    game.book('income', 1000);
    game.buy('rifle-ammo', 2, 'c1');
    let shop = game.snapshot().shop!;
    expect(shop.owner).toBe('c1');
    // Kira hat Auto Pistol-1 und DEX 9: Die Automatic Pistol steht fett, mit DEX +1.
    expect(shop.weapons.find((w) => w.item.id === 'automatic-pistol')).toMatchObject({ attack: 'shot', wounds: 3, skill: 'Auto Pistol-1', ammo: { id: 'automatic-pistol-ammo', rounds: 15, price: 10 } });
    expect(shop.weapons.find((w) => w.item.id === 'rifle')).toMatchObject({ skill: undefined, ammo: { owned: 2 } });
    expect(shop.weapons.find((w) => w.item.id === 'dagger')).toMatchObject({ attack: 'swing', ammo: undefined });
    expect(shop.armor.find((a) => a.id === 'jack')).toMatchObject({ owned: 1 });
    expect(shop.gear.map((g) => g.kind)).toEqual(['equipment', 'vehicle', 'passage']);
    // Der Charakter oben wechselt: Die Theke zeigt, was Jonas taugt; vorhanden ist, was die Gruppe hat.
    game.focusCharacter('c2');
    shop = game.snapshot().shop!;
    expect(shop.owner).toBe('c2');
    expect(shop.weapons.find((w) => w.item.id === 'rifle')!.ammo!.owned).toBe(2);
  });

  it('verkauft aus dem Besitz eines Charakters, mit dem vorgeschlagenen halben Preis', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign(), [regina])));
    game.chooseHex(1, 1);
    game.stayHere();
    const jonas = game.snapshot().shop!.members.find((m) => m.name === 'Jonas Reyl')!;
    expect(jonas.sellable.find((s) => s.id === 'blade')).toMatchObject({ count: 1, price: 25 });
    game.sell('blade', 1, 30, 'c2');
    const shop = game.snapshot().shop!;
    expect(shop.funds).toBe(30);
    expect(shop.bookings[0]).toMatchObject({ kind: 'sale', amount: 30, item: 'Blade', character: 'Jonas Reyl', world: 'Regina' });
  });

  it('meldet im Shop, was nicht geht, und ändert dann nichts', async () => {
    const { game } = await started();
    game.book('expense', DEMO_FUNDS + 100);
    expect(game.snapshot().shop).toMatchObject({ funds: DEMO_FUNDS, error: expect.stringMatching(/nicht in der Gruppenkasse/) });
    game.book('deposit', 400, undefined, 'c1');
    expect(game.snapshot().shop).toMatchObject({ funds: DEMO_FUNDS + 400, error: undefined });
    expect(game.snapshot().shop!.members[0]).toMatchObject({ name: 'Kira Vant', credits: 12000 });
  });
});

describe('Begegnung und Kampfsimulation', () => {
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };

  /** Eine Zufallsquelle, der man vor jedem Wurf die nächsten Zahlen gibt; sonst das Kleinste. */
  function queued() {
    const queue: number[] = [];
    return { queue, int: (min: number) => queue.shift() ?? min };
  }

  async function onRegina() {
    const random = queued();
    const { game, repository } = await started(random, memoryRepository(setHexes(createCampaign(), [regina])));
    game.chooseHex(1, 1);
    game.stayHere();
    game.closeWorld();
    return { game, random, repository };
  }

  it('ohne Begegnung zeigt Kampf die Waffentabelle; ohne Aufenthaltsort gibt es keine Begegnung, 61–66 bringen keine', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(createCampaign()));
    expect(game.snapshot().combat).toMatchObject({ canEncounter: false, sim: undefined });
    const { game: there, random } = await onRegina();
    random.queue.push(5, 6, 3);
    there.rollEncounter();
    expect(there.snapshot().combat).toMatchObject({ sim: undefined, note: 'Test 5 (5+ nötig), Wurf 63: keine Begegnung.' });
  });

  it('vor der Zufallsbegegnung steht der Test des Tages: unter 5 auf 1W6 gibt es keine; wer die Art wählt, überspringt ihn', async () => {
    const { game, random } = await onRegina();
    random.queue.push(4);
    game.rollEncounter();
    expect(game.snapshot().combat).toMatchObject({ sim: undefined, note: 'Test 4 (5+ nötig): heute keine Begegnung.' });
    expect(game.snapshot().checks?.random).toMatchObject({ label: 'heute 1×', met: true });
    // Der zweite Test am Tag geht nur mit langem Drücken.
    game.rollEncounter();
    expect(game.snapshot().combat?.note).toBe('Zufallsbegegnung: heute 1× getestet. Lange drücken für einen weiteren Test.');
    random.queue.push(6, 1, 5);
    game.rollEncounter(undefined, undefined, true);
    expect(game.snapshot().combat?.sim).toMatchObject({ roll: 15, name: 'Thugs' });
    game.endEncounter();
    game.rollEncounter(15);
    expect(game.snapshot().combat?.sim).toMatchObject({ roll: 15 });
  });

  it('Patron: erst der Test der Woche, dann wählt ein Würfel die Liste, dann der Wurf; Test und Wurf stehen im Log', async () => {
    const { game, random } = await onRegina();
    random.queue.push(4);
    game.rollPatron();
    expect(game.snapshot().patron).toMatchObject({ last: undefined, note: 'Test 4 (5+ nötig): diese Woche kein Patron.' });
    expect(game.snapshot().log.map((e) => e.kind)).toEqual(['check']);
    expect(game.snapshot().checks?.patron).toMatchObject({ label: 'diese Woche 1×', met: true });
    // Test 5, Listenwürfel 4 (Liste zwei), dann 3 und 6; Jonas' Admin-1 gibt +1 auf den zweiten Würfel.
    random.queue.push(5, 4, 3, 6);
    game.rollPatron(true);
    expect(game.snapshot().patron).toMatchObject({ last: { list: 2, dice: [3, 6], dms: [0, 1], roll: 36, name: 'Professor' }, note: 'Test 5 (5+ nötig): ein Patron.' });
    // Test 6, Listenwürfel 1 (Liste eins), 2 und 3: Zeile 23 ist ein Gerücht; gleich danach fällt es ohne Test (6 und 1: F).
    random.queue.push(6, 1, 2, 3, 6, 1);
    game.rollPatron(true);
    expect(game.snapshot().patron).toMatchObject({ last: { list: 1, roll: 23, rumor: true }, note: 'Test 6 (5+ nötig): ein Gerücht statt eines Patrons.' });
    expect(game.snapshot().rumor).toMatchObject({ last: { roll: 61, letter: 'F', text: 'Information leading to trap', general: false }, note: 'Ohne Test: Gerücht statt eines Patrons.' });
    expect(game.snapshot().log.map((e) => e.kind)).toEqual(['check', 'check', 'patron', 'check', 'patron', 'rumor']);
  });

  it('Gerücht: erst der Test der Woche (7+ auf 2W6), dann der Wurf auf die Rumors Matrix; Test und Wurf stehen im Log', async () => {
    const { game, random } = await onRegina();
    random.queue.push(3, 3);
    game.rollRumor();
    expect(game.snapshot().rumor).toMatchObject({ last: undefined, note: 'Test 3 + 3 = 6 (7+ nötig): diese Woche kein Gerücht.' });
    expect(game.snapshot().log.map((e) => e.kind)).toEqual(['check']);
    // Nach dem Ende der Woche zählt der Test neu.
    game.endWeek(true);
    expect(game.snapshot().checks?.rumor).toMatchObject({ label: 'diese Woche 0×', met: false });
    // Test 4 + 3, dann 2 und 3: Die Matrix führt bei 23 auf U, ein allgemeines Gerücht.
    random.queue.push(4, 3, 2, 3);
    game.rollRumor();
    expect(game.snapshot().rumor).toMatchObject({ last: { dice: [2, 3], roll: 23, letter: 'U', text: 'Broad background information', general: true }, note: 'Test 4 + 3 = 7 (7+ nötig): ein Gerücht.' });
    expect(game.snapshot().log.map((e) => e.kind)).toEqual(['check', 'time', 'check', 'rumor']);
  });

  it('Zeit: Tage und Woche erinnern an fehlende Tests, langes Drücken macht ohne Begegnung weiter; neue Einträge tragen den Tag', async () => {
    const { game, random } = await onRegina();
    expect(game.snapshot().time).toMatchObject({ label: 'Feiertag, 001-1105', toSunday: 7, missingDay: ['Zufallsbegegnung'] });
    game.passDays(2);
    expect(game.snapshot().time?.note).toBe('Noch nicht getestet: Zufallsbegegnung. Lange drücken, um ohne Begegnung weiterzumachen.');
    expect(game.snapshot().log).toHaveLength(0);
    random.queue.push(2);
    game.rollEncounter();
    game.passDays(2);
    expect(game.snapshot().time).toMatchObject({ label: 'Dienstag, 003-1105', note: undefined });
    game.endWeek();
    expect(game.snapshot().time?.note).toContain('Zufallsbegegnung, Patron, Gerücht, Polizei');
    game.endWeek(true);
    expect(game.snapshot().time?.label).toBe('Sonntag, 008-1105');
    expect(game.snapshot().logDays).toEqual(['Feiertag, 001-1105', 'Feiertag, 001-1105', 'Dienstag, 003-1105']);
  });

  it('Polizei: einmal je Woche nach Gesetz; der zweite Test nur mit langem Drücken', async () => {
    const { game, random } = await onRegina();
    random.queue.push(3, 4);
    game.rollLegal();
    expect(game.snapshot().legal).toMatchObject({ available: true, law: 5, last: { passed: true }, note: 'Test 3 + 4 = 7 (5+ nötig): die Polizei lässt die Gruppe in Ruhe.' });
    game.rollLegal();
    expect(game.snapshot().legal?.note).toContain('Lange drücken');
    random.queue.push(1, 1, 6, 5);
    game.rollLegal(true);
    expect(game.snapshot().legal?.last).toMatchObject({ passed: false, reaction: 11 });
  });

  it('Reise: von der Weltkarte zum Dialog, Passagen wählen, eine Woche später am Ziel', async () => {
    const random = queued();
    const nahe = { ...regina, column: 2, row: 1, name: 'Nahe' };
    const { game } = await started(random, memoryRepository(setHexes(createCampaign(), [regina, nahe])));
    game.chooseHex(1, 1);
    game.stayHere();
    game.closeWorld();
    game.chooseHex(2, 1);
    expect(game.snapshot().travel).toEqual({ blocker: undefined });
    random.queue.push(3);
    game.openJourney();
    const kira = game.snapshot().characters[0]!.id;
    const jonas = game.snapshot().characters[1]!.id;
    expect(game.snapshot()).toMatchObject({ world: undefined, journey: { toName: 'Nahe', fromName: 'Regina', parsecs: 1, npcs: 0, cost: 16000 } });
    game.choosePassage(kira, 'low-passage');
    game.choosePassage(jonas, 'low-passage');
    expect(game.snapshot().journey).toMatchObject({ npcs: 3, lowTotal: 5, pot: 50, cost: 2000 });
    game.travel();
    expect(game.snapshot().journey?.error).toContain('kosten');
    game.book('income', 2000);
    game.guessSurvivors(kira, 4);
    // Kira 6 + 6, Jonas 6 + 6, drei NSC je 6 + 6 mit Tipp 5.
    random.queue.push(6, 6, 6, 6, 6, 6, 5, 6, 6, 5, 6, 6, 5, 0);
    game.travel();
    expect(game.snapshot().journey?.result).toMatchObject({ survivors: 5, pot: 50, paid: true });
    expect(game.snapshot()).toMatchObject({ location: '0201', time: { label: 'Sonntag, 008-1105' } });
    game.closeJourney();
    expect(game.snapshot().journey).toBeUndefined();
  });

  it('im Reiter Begegnung gewürfelt, zeigt erst die Übersicht; danach bleibt der Reiter Begegnung, zum Kampf geht es erst auf Wunsch', async () => {
    const { game } = await onRegina();
    game.showScreen('encounter');
    game.rollEncounter(15, 'clear');
    game.rollSurprise();
    game.closeSurprise();
    expect(game.snapshot()).toMatchObject({ screen: 'encounter', combat: { intro: true } });
    game.closeEncounterIntro();
    expect(game.snapshot()).toMatchObject({ screen: 'encounter', combat: { intro: false } });
    // Die Übersicht im Kampf zu öffnen und zu schließen, bleibt im Kampf.
    game.showScreen('combat');
    game.showEncounterIntro();
    game.closeEncounterIntro();
    expect(game.snapshot()).toMatchObject({ screen: 'combat', combat: { intro: false } });
  });

  it('mit der Begegnung beginnt die Simulation: Entfernung und Überraschung gewürfelt, Partei für Partei, nur Ziel wählen und würfeln', async () => {
    const { game, random } = await onRegina();
    game.rollEncounter(15, 'clear');
    game.rollSurprise();
    game.closeSurprise();
    let sim = game.snapshot().combat!.sim!;
    // Entfernung 1 + 1 + 3 (Clear) = 5 → Short; Überraschung SC 1, Thugs 1 + 1 (Anführer): die NSC ziehen zuerst.
    expect(sim).toMatchObject({ round: 1, range: 'short', band: 0, close: false, escaped: false, bandDie: undefined, rangeDice: [1, 1], terrain: { name: 'Clear, Road, Open', dm: 3 }, surprise: undefined, first: 'npcs' });
    expect(sim.fighters.map((f) => f.id)).toEqual(['n1', 'n2', 'c1', 'c2']);
    // Der Anführer ist dran; die App schlägt Kira als Ziel vor, sie steht oben.
    expect(sim.turn).toMatchObject({ id: 'n1', target: 'c1', reaches: true });
    expect(game.snapshot().focus).toBe('c1');

    // Treffer mit der Body Pistol des Anführers (3W6, SR 50: ein Anführer trägt immer eine Schusswaffe);
    // der erste Schaden geht ganz auf STR; danach ist der zweite Thug dran und nimmt Jonas.
    random.queue.push(6, 6);
    game.fightAttack();
    expect(game.snapshot().result).toMatchObject({ kind: 'attack', success: true, victim: 'Kira Vant' });
    expect(game.snapshot().combat!.sim!.turn!.id).toBe('n1');
    random.queue.push(1, 1, 1, 0, 1);
    game.rollDamage();
    game.closeResult();
    sim = game.snapshot().combat!.sim!;
    expect(sim.fighters.find((f) => f.id === 'c1')).toMatchObject({ current: { str: 4 }, state: 'wounded' });
    expect(sim.turn).toMatchObject({ id: 'n2', target: 'c2' });
    expect(game.snapshot().focus).toBe('c2');

    // Daneben beendet den Zug gleich; dann ist Kira dran und zielt auf den ersten NSC.
    random.queue.push(1, 1);
    game.fightAttack();
    game.closeResult();
    sim = game.snapshot().combat!.sim!;
    expect(sim.turn).toMatchObject({ id: 'c1', side: 'pcs', target: 'n1' });
    expect(game.snapshot().focus).toBe('c1');
    game.chooseFightTarget('n2');
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ target: 'n2', odds: { parts: expect.arrayContaining([{ kind: 'range', range: 'short', dm: 1 }]) } });
    game.setBand('c1', 1);
    expect(game.snapshot().combat!.sim).toMatchObject({ focus: 'c1', range: 'medium', band: 1, turn: { reaches: false } });
    // Zwei Bands sind Laufen: Kira setzt von selbst aus; Jonas ist dran und steht noch auf Short.
    game.moveBand(-1);
    game.moveBand(-1);
    expect(game.snapshot().combat!.sim).toMatchObject({
      focus: 'c2',
      range: 'short',
      round: 1,
      turn: { id: 'c2' },
      positions: [
        { id: 'c1', initial: 'K', band: 0, close: true, focus: false },
        { id: 'c2', initial: 'J', band: 0, close: false, focus: true },
      ],
    });
    game.setBand('c2', 21);
    expect(game.snapshot().combat!.sim).toMatchObject({ focus: 'c2', range: undefined, escaped: true, turn: { reaches: false, odds: undefined } });
    game.setBand('c2', 0, true);
    game.skipTurn();
    expect(game.snapshot().combat!.sim).toMatchObject({ round: 2, turn: { id: 'n1', target: expect.stringMatching(/^c[12]$/), reaches: true } });
    game.skipTurn();
    game.skipTurn();
    expect(game.snapshot().combat!.sim).toMatchObject({ round: 2, turn: { id: 'c1' } });
    // Kira weicht aus: Das ist ihr Zug; ihre Karte zeigt es, bis sie wieder dran ist.
    game.evade();
    expect(game.snapshot().combat!.sim).toMatchObject({ turn: { id: 'c2' } });
    expect(game.snapshot().combat!.sim!.fighters.find((f) => f.id === 'c1')).toMatchObject({ evading: true });

    game.endEncounter();
    expect(game.snapshot().combat!.sim).toBeUndefined();
  });

  it('NSC zählen Munition wie SC: jeder Schuss zählt, Nachladen ist ihr Zug, die Hände gehen immer', async () => {
    const { game, random } = await onRegina();
    game.rollEncounter(15, 'clear');
    game.rollSurprise();
    game.closeSurprise();
    let turn = game.snapshot().combat!.sim!.turn!;
    // Der Anführer hat die Body Pistol geladen und 1W4 Magazine, hier 1; ohne zweite Waffe die Hände.
    expect(turn.id).toBe('n1');
    expect(turn.attacks.map((a) => [a.slot, a.weapon, a.ammo])).toEqual([
      ['primary', 'body-pistol', { rounds: 6, capacity: 6, magazines: 1 }],
      ['hands', 'hands', undefined],
    ]);
    random.queue.push(1, 1);
    game.fightAttack();
    game.closeResult();
    game.skipTurn();
    game.skipTurn();
    game.skipTurn();
    turn = game.snapshot().combat!.sim!.turn!;
    expect(turn).toMatchObject({ id: 'n1', attacks: [{ ammo: { rounds: 5, capacity: 6, magazines: 1 } }, {}] });
    game.fightReloadWith('body-pistol');
    expect(game.snapshot().combat!.sim!.turn!.id).toBe('n2');
    game.skipTurn();
    game.skipTurn();
    game.skipTurn();
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ id: 'n1', attacks: [{ ammo: { rounds: 6, capacity: 6, magazines: 0 } }, {}] });
  });

  it('ein Schaden, der den Kampf entscheidet, kommt an; danach ist keiner mehr dran', async () => {
    const { game, random } = await onRegina();
    // 1W6 Peasants: ein einziger NSC; die SC ziehen zuerst.
    game.rollEncounter(11);
    game.rollSurprise();
    game.closeSurprise();
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ id: 'c1', target: 'n1' });
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(6, 0);
    game.rollDamage();
    const view = game.snapshot();
    expect(view.result).toMatchObject({ kind: 'damage', damage: 6 });
    expect(view.combat!.sim).toMatchObject({ defeated: 'npcs', turn: undefined });
    expect(view.combat!.note).toBeUndefined();
    // Ohne Zug ist Aussetzen nichts, und nichts bricht ab.
    expect(() => game.skipTurn()).not.toThrow();
    expect(game.snapshot().combat!.sim!.defeated).toBe('npcs');
  });

  it('Wischen in der Leiste: im NSC-Zug wird der SC das Ziel; im SC-Zug greift trotzdem der SC am Zug an', async () => {
    const { game, random } = await onRegina();
    game.rollEncounter(15);
    game.rollSurprise();
    game.closeSurprise();
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ id: 'n1', target: 'c1' });
    game.focusCharacter('c2');
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ target: 'c2', odds: expect.anything() });
    random.queue.push(1, 1);
    game.fightAttack();
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'attack', victim: 'Jonas Reyl' });
    game.closeResult();
    game.skipTurn();
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ id: 'c1' });
    game.focusCharacter('c2');
    expect(game.snapshot().combat!.sim!.turn!.odds).toBeDefined();
    random.queue.push(1, 1);
    game.fightAttack();
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'attack', character: 'Kira Vant' });
    expect(game.snapshot().combat!.note).toBeUndefined();
  });

  it('viele zufällige Kämpfe laufen bis zur Entscheidung durch, ohne dass etwas stecken bleibt', async () => {
    let decided = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let state = seed;
      const random = {
        int(min: number, max: number) {
          state = (state * 1103515245 + 12345) % 2 ** 31;
          return min + (Math.floor(state / 65536) % (max - min + 1));
        },
      };
      const { game } = await started(random, memoryRepository(setHexes(createCampaign(), [regina])));
      game.chooseHex(1, 1);
      game.stayHere();
      game.closeWorld();
      game.rollEncounter(11 + (seed % 5) * 10 + (seed % 6));
      if (game.snapshot().combat?.sim?.needsSurprise) game.rollSurprise();
      game.closeSurprise();
      if (!game.snapshot().combat!.sim) continue;
      for (let step = 0; step < 400; step++) {
        const view = game.snapshot();
        const combat = view.combat;
        if (!combat?.sim) break;
        expect(combat.note).toBeUndefined();
        if (view.result) {
          game.closeResult();
          continue;
        }
        const sim = combat.sim;
        if (combat.wounding) {
          if (combat.wounding.next) game.assignWound(combat.wounding.next.open[step % combat.wounding.next.open.length]!);
          else game.confirmWounding();
          continue;
        }
        if (combat.damage) {
          game.rollDamage();
          continue;
        }
        const turn = sim.turn;
        if (!turn) break;
        if (turn.ammo && turn.ammo.rounds === 0) {
          game.skipTurn();
          continue;
        }
        if (!turn.reaches) game.setBand(sim.focus!, 0, true);
        else if (turn.target === undefined) game.chooseFightTarget(sim.fighters.find((f) => f.targetable)!.id);
        else game.fightAttack();
      }
      const end = game.snapshot().combat?.sim;
      expect(end === undefined || end.defeated !== undefined || end.turn !== undefined).toBe(true);
      if (end?.defeated) decided++;
    }
    // Die meisten Kämpfe kommen in 400 Schritten zur Entscheidung.
    expect(decided).toBeGreaterThan(20);
  }, 30_000); // 40 ganze Kämpfe: auf langsamen Rechnern (CI) über 5 s, deshalb ein eigenes Zeitlimit wie beim Fuzz-Test.

  it('ein Logeintrag löschen, während Schaden verteilt wird, bricht nicht ab: die Stelle rückt mit, oder das Verteilen endet', async () => {
    const { game, random } = await onRegina();
    game.askOracle('Vorher?');
    game.rollEncounter(15);
    game.rollSurprise();
    game.closeSurprise();
    // Der Anführer trifft Kira (erster Treffer, verteilt sich von selbst), dann der zweite Thug: den verteilt sie.
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(1, 1, 1, 0);
    game.rollDamage();
    game.closeResult();
    expect(game.snapshot().combat!.sim!.turn).toMatchObject({ id: 'n2', target: 'c1' });
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(2, 3);
    game.rollDamage();
    expect(game.snapshot().combat!.wounding).toMatchObject({ dice: [2, 3] });
    // Die Orakelfrage vorn löschen: Die Stelle des Treffers rückt mit, das Verteilen geht weiter.
    game.deleteLogEntry(0);
    game.assignWound('END');
    game.assignWound('END');
    game.confirmWounding();
    expect(game.snapshot().combat!.note).toBeUndefined();
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'damage', blocks: [{ to: 'END', points: 2 }, { to: 'END', points: 3 }] });
    // Die Würfel sind vor dem Verteilen gerollt; danach rollen sie nicht noch einmal.
    expect(game.snapshot().result).toBeUndefined();
    // Den Treffer selbst löschen, während verteilt wird: Das Verteilen endet.
    while (game.snapshot().combat!.sim!.turn!.side === 'pcs') game.skipTurn();
    game.chooseFightTarget('c1');
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(1, 1);
    game.rollDamage();
    expect(game.snapshot().combat!.wounding).toBeDefined();
    game.deleteLogEntry(game.snapshot().log.length - 1);
    expect(game.snapshot().combat!.wounding).toBeUndefined();
  });

  it('heilt einen SC in der Simulation und übernimmt einen NSC; er kämpft dann nicht mehr mit', async () => {
    const { game, random } = await onRegina();
    game.rollEncounter(15);
    game.rollSurprise();
    game.closeSurprise();
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(1, 1, 1, 1);
    game.rollDamage();
    game.closeResult();
    expect(game.snapshot().combat!.sim!.fighters.find((f) => f.id === 'c1')!.healing).toMatchObject({ rest: true });
    game.recover('rest', undefined, undefined, false, 'c1');
    expect(game.snapshot().combat!.sim!.fighters.find((f) => f.id === 'c1')!.state).toBe('unhurt');
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'recovery', how: 'rest', patient: 'Kira Vant' });

    game.adoptNpcs(['n1'], true);
    expect(game.snapshot().npcs).toHaveLength(1);
    expect(game.snapshot().combat!.sim!.fighters.map((f) => f.id)).toEqual(['n2', 'c1', 'c2']);
  });
  /** Kira wird von einem NSC getroffen (Schaden 6 je Würfel); gibt zurück, wie schwer. */
  async function kiraHit() {
    const { game, random, repository } = await onRegina();
    game.newCharacter();
    game.saveCharacter({ name: 'Doc', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [{ of: 'medical', level: 3 }], possessions: [{ of: 'medical-kit', count: 1 }] });
    game.rollEncounter(15);
    game.rollSurprise();
    game.closeSurprise();
    while (game.snapshot().combat!.sim!.turn?.side !== 'npcs') game.skipTurn();
    game.chooseFightTarget('c1');
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(6, 6, 6, 6, 6, 6);
    game.rollDamage();
    game.closeResult();
    const doc = game.snapshot().characters.find((c) => c.name === 'Doc')!.id;
    // Was die App erzeugt, muss sich als Kampagnendatei wieder einlesen lassen.
    const roundTrip = async () => {
      await game.whenSaved();
      return fromCampaignFile(toCampaignFile(repository.saved!), 'k9');
    };
    return { game, random, doc, roundTrip, damage: game.snapshot().log.length - 1 };
  }

  it('eine Behandlung bleibt gültig, wenn der Schadenswurf davor gelöscht wird', async () => {
    const { game, random, doc, damage, roundTrip } = await kiraHit();
    expect(game.snapshot().log[damage]).toMatchObject({ kind: 'damage' });
    random.queue.push(1, 1, 1, 1, 1);
    game.recover('treatment', undefined, doc, true, 'c1');
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'recovery', how: 'treatment' });
    game.deleteLogEntry(damage);
    await roundTrip();
  });

  it('Ruhe und Behandlung bleiben gültig, wenn eine spätere Änderung am Charakter die Wunde rückwirkend schwer oder leicht macht', async () => {
    const { game, random, doc, roundTrip } = await kiraHit();
    random.queue.push(1, 1, 1, 1, 1);
    game.recover('treatment', undefined, doc, true, 'c1');
    // Kira bekommt nachträglich viel mehr STR, DEX und END: Der Treffer war damit keine schwere Wunde.
    game.editCharacter('c1');
    const input = game.snapshot().editor!.input;
    game.saveCharacter({ ...input, upp: { ...input.upp, str: 15, dex: 15, end: 15 } });
    await roundTrip();
    // Ein leichter Treffer, Ruhe; danach sinken die Werte, und der Treffer war rückwirkend schwer.
    while (game.snapshot().combat!.sim!.turn?.side !== 'npcs') game.skipTurn();
    game.chooseFightTarget('c1');
    random.queue.push(6, 6);
    game.fightAttack();
    random.queue.push(1, 1, 1, 1, 1, 1);
    game.rollDamage();
    game.closeResult();
    game.recover('rest', undefined, undefined, false, 'c1');
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'recovery', how: 'rest' });
    game.editCharacter('c1');
    game.saveCharacter({ ...game.snapshot().editor!.input, upp: { ...input.upp, str: 1, dex: 1, end: 1 } });
    await roundTrip();
  });

  it('übernimmt mehrere NSC auf einmal; die Begegnung hat danach keine NSC mehr', async () => {
    const { game } = await onRegina();
    game.rollEncounter(15);
    game.rollSurprise();
    game.closeSurprise();
    const before = game.snapshot().characters.length;
    game.adoptNpcs(['n1', 'n2'], false);
    expect(game.snapshot().characters.length).toBe(before + 2);
    expect(game.snapshot().combat!.sim!.fighters.filter((f) => f.side === 'npcs')).toEqual([]);
    expect(() => game.adoptNpcs(['n1'], true)).toThrow();
  });
});

describe('Flächenschaden in der Kampfsimulation', () => {
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };

  /** Vier Thugs auf Regina; Kira hat ein geladenes Automatic Rifle in der Hand. */
  async function fourThugs() {
    const queue: number[] = [];
    const random = { int: (min: number) => queue.shift() ?? min };
    const there = setLocation(setHexes(createCampaign(), [regina]), '0101');
    const rolled = rollSurprise(rollEncounter(there, fixedRandom(1, 5), fixedClock(), undefined, 4).campaign, fixedRandom());
    const campaign = {
      ...rolled,
      characters: rolled.characters.map((c) => (c.id === 'c1' ? { ...c, possessions: [...c.possessions, { of: 'auto-rifle', count: 1 }], primary: 'auto-rifle', wields: 'auto-rifle' } : c)),
    };
    const { game } = await started(random, memoryRepository(campaign));
    // Die Thugs ziehen zuerst; sie setzen aus, bis Kira dran ist.
    while (game.snapshot().combat!.sim!.turn!.id !== 'c1') game.skipTurn();
    return { game, queue };
  }

  it('ein Feuerstoß würfelt vier Würfe; der Zug endet erst, wenn der Schaden aller Treffer gewürfelt ist', async () => {
    const { game, queue } = await fourThugs();
    game.chooseFightTarget('n2');
    expect(game.snapshot().combat!.sim!.turn!.fire).toMatchObject({ burst: true, choosable: true, rounds: 4, rolls: 2, neighbours: 2, pick: 'list' });
    queue.push(6, 6, 6, 6, 6, 6, 6, 6);
    game.fightAttack();
    const result = game.snapshot().result;
    expect(result).toMatchObject({ kind: 'attack', fire: 'burst', victim: expect.any(String), volleyPending: true });
    expect(result?.kind === 'attack' && result.rest.map((r) => r.neighbour)).toEqual([false, true, true]);
    expect(game.snapshot().combat!.ammo).toMatchObject({ rounds: 16 });
    // Auf Close: Der Nachbar in Mesh (n1) braucht mit DM −7 eine 15 und verfehlt; die drei anderen treffen.
    expect(game.snapshot().log.flatMap((e) => (e.kind === 'attack' ? [[e.dm, e.success]] : []))).toEqual([
      [0, true],
      [0, true],
      [-7, false],
      [-3, true],
    ]);
    game.closeResult();
    for (const left of [3, 2]) {
      expect(game.snapshot().combat!.damage).toMatchObject({ left });
      game.rollDamage();
      game.closeResult();
      expect(game.snapshot().combat!.sim!.turn!.id).toBe('c1');
    }
    game.rollDamage();
    game.closeResult();
    expect(game.snapshot().combat!.damage).toBeUndefined();
    expect(game.snapshot().combat!.sim!.turn!.id).toBe('c2');
  });

  it('Einzelschuss wählen: ein Wurf, ein Schuss, und der Zug endet mit dem Fehlschuss', async () => {
    const { game } = await fourThugs();
    game.chooseFightTarget('n2');
    game.chooseFire(false);
    expect(game.snapshot().combat!.sim!.turn!.fire).toMatchObject({ burst: false, rounds: 1, neighbours: 0 });
    game.fightAttack();
    expect(game.snapshot().result).toMatchObject({ kind: 'attack', success: false, fire: undefined, rest: [] });
    expect(game.snapshot().combat!.sim!.turn!.id).toBe('c2');
    game.focusCharacter('c1');
    expect(game.snapshot().combat!.ammo).toMatchObject({ rounds: 19 });
  });
});

describe('Charakter-Screen: verwalten', () => {
  it('klappt die Details eines Charakters auf und wieder zu, ohne eine Probe zu beginnen', async () => {
    const { game } = await started();
    game.showScreen('characters');
    game.toggleDetails('c2');
    expect(game.snapshot().characters.map((c) => [c.name, c.open])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    expect(game.snapshot().task).toBeUndefined();
    game.toggleDetails('c2');
    expect(game.snapshot().characters[1]!.open).toBe(false);
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

  it('bearbeitet einen Charakter; bearbeitet man den Charakter oben, endet seine Probe', async () => {
    const { game } = await started();
    game.chooseSkill('pilot');
    game.editCharacter('c1');
    const input = game.snapshot().editor!.input;
    game.saveCharacter({ ...input, skills: input.skills.filter((s) => s.of !== 'pilot') });
    expect(game.snapshot().task).toBeUndefined();
    expect(game.snapshot().characters[0]!.skills.map((s) => s.name)).not.toContain('Pilot');
  });

  it('löscht Charaktere ohne Logeintrag und blendet die mit Logeintrag aus', async () => {
    const { game } = await started(fixedRandom(1, 1));
    game.focusCharacter('c2');
    game.chooseSkill(null);
    game.rollTask();
    game.closeResult();
    expect(game.snapshot().characters.map((c) => [c.name, c.inLog])).toEqual([
      ['Kira Vant', false],
      ['Jonas Reyl', true],
    ]);
    game.removeCharacter('c1');
    expect(game.snapshot()).toMatchObject({ focus: 'c2', task: { character: 'Jonas Reyl' } });
    game.removeCharacter('c2');
    expect(game.snapshot()).toMatchObject({ characters: [], focus: undefined, task: undefined });
    expect(game.snapshot().retired).toEqual([{ id: 'c2', name: 'Jonas Reyl' }]);
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'task', character: 'Jonas Reyl', success: false });
    game.restoreCharacter('c2');
    expect(game.snapshot().characters.map((c) => c.name)).toEqual(['Jonas Reyl']);
    expect(game.snapshot().focus).toBe('c2');
  });
});

describe('Tot', () => {
  it('markiert einen Charakter im Editor als tot: unter „Verstorben“, nicht mehr oben, wieder zurücknehmbar', async () => {
    const { game, repository } = await started();
    game.chooseSkill('pilot');
    game.editCharacter('c1');
    game.saveCharacter({ ...game.snapshot().editor!.input, dead: true });
    await game.whenSaved();
    const view = game.snapshot();
    expect(view.task).toBeUndefined();
    expect(view.characters.map((c) => c.name)).toEqual(['Jonas Reyl']);
    expect(view.dead).toEqual([{ id: 'c1', name: 'Kira Vant', background: 'Ex-Scout · 4 Terms · 34 Jahre' }]);
    expect(view.campaigns[0]?.characters).toBe(1);
    expect(repository.saved?.characters[0]?.dead).toBe(true);
    expect(view.focus).toBe('c2');
    expect(() => game.focusCharacter('c1')).toThrow('Kira Vant ist tot.');

    game.editCharacter('c1');
    expect(game.snapshot().editor?.input.dead).toBe(true);
    game.saveCharacter({ ...game.snapshot().editor!.input, dead: false });
    expect(game.snapshot()).toMatchObject({ dead: [], characters: [{ name: 'Kira Vant' }, { name: 'Jonas Reyl' }], focus: 'c2' });
  });

  it('löscht auch einen Toten nach denselben Regeln', async () => {
    const { game } = await started();
    game.editCharacter('c2');
    game.saveCharacter({ ...game.snapshot().editor!.input, dead: true });
    game.removeCharacter('c2');
    expect(game.snapshot()).toMatchObject({ dead: [], retired: [] });
  });
});

describe('Log', () => {
  it('löscht einen Logeintrag endgültig; die übrigen bleiben in ihrer Reihenfolge', async () => {
    const { game, repository } = await started(fixedRandom(1, 1, 2, 2, 3, 3));
    game.rollDice();
    game.rollDice();
    game.rollDice();
    game.deleteLogEntry(1);
    await game.whenSaved();
    expect(game.snapshot().log.map((e) => e.kind === 'dice' && e.total)).toEqual([2, 6]);
    expect(repository.saved?.log).toHaveLength(2);
  });

  it('schreibt Notizen und Deutungen; ein Ergebnis löschen löscht seine Deutungen mit', async () => {
    const { game, repository } = await started(fixedRandom(1, 1, 2, 2));
    game.rollDice();
    game.writeNote('  Wir landen auf Regina.  ');
    game.rollDice();
    game.writeNote('Der Zoll winkt uns durch.', 2);
    game.writeNote('Doch nicht ganz glatt.', 0);
    expect(game.snapshot().log.slice(1)).toEqual([
      { kind: 'note', at: '2026-10-23T14:03:00.000Z', text: 'Wir landen auf Regina.', interprets: undefined },
      expect.objectContaining({ kind: 'dice', total: 4 }),
      { kind: 'note', at: '2026-10-23T14:07:00.000Z', text: 'Der Zoll winkt uns durch.', interprets: 2 },
      { kind: 'note', at: '2026-10-23T14:09:00.000Z', text: 'Doch nicht ganz glatt.', interprets: 0 },
    ]);
    expect(() => game.writeNote('Zur Notiz?', 1)).toThrow(/nur ein Ergebnis/);
    game.deleteLogEntry(0);
    await game.whenSaved();
    expect(game.snapshot().log.map((e) => e.kind === 'note' ? [e.text, e.interprets] : e.kind)).toEqual([['Wir landen auf Regina.', undefined], 'dice', ['Der Zoll winkt uns durch.', 1]]);
    expect(repository.saved?.log).toHaveLength(3);
  });

  it('macht einen Charakter wieder löschbar, wenn der Eintrag weg ist, der auf ihn verwies', async () => {
    const { game } = await started();
    game.focusCharacter('c2');
    game.chooseSkill(null);
    game.rollTask();
    game.closeResult();
    expect(game.snapshot().characters[1]?.inLog).toBe(true);
    game.deleteLogEntry(0);
    expect(game.snapshot().characters[1]?.inLog).toBe(false);
    game.removeCharacter('c2');
    expect(game.snapshot()).toMatchObject({ characters: [{ name: 'Kira Vant' }], retired: [] });
  });
});

describe('Kampagnen', () => {
  it('legt eine leere Kampagne an, öffnet sie und merkt sich, welche offen ist', async () => {
    const { game, repository } = await started();
    game.showCampaigns();
    game.createCampaign('  ');
    expect(game.snapshot().campaignSheet?.error).toBe('Die Kampagne braucht einen Namen.');
    game.createCampaign('Spinward Run');
    await game.whenSaved();
    const view = game.snapshot();
    expect(view.campaignSheet).toBeUndefined();
    expect(view.campaign).toEqual({ id: 'k2', name: 'Spinward Run' });
    expect(view).toMatchObject({ characters: [], log: [], odds: expect.arrayContaining([expect.objectContaining({ name: 'Mittel', selected: true })]) });
    expect(repository.open).toBe('k2');
    expect([...repository.campaigns.keys()]).toEqual(['k1', 'k2']);
  });

  it('wechselt die Kampagne; offene Karte und Probe verfallen, jede behält ihren Log', async () => {
    const { game, repository } = await started(fixedRandom(3, 4));
    game.rollDice();
    game.createCampaign('Zweite');
    expect(game.snapshot().characters).toEqual([]);
    game.openCampaign('k1');
    game.chooseSkill('pilot');
    game.drawCard();
    game.openCampaign('k2');
    await game.whenSaved();
    expect(game.snapshot()).toMatchObject({ campaign: { name: 'Zweite' }, card: undefined, task: undefined, log: [] });
    expect(repository.open).toBe('k2');
    game.openCampaign('k1');
    expect(game.snapshot().log).toHaveLength(1);
  });

  it('benennt die offene Kampagne um', async () => {
    const { game, repository } = await started();
    game.showCampaigns();
    game.renameCampaign('Spinward Run');
    await game.whenSaved();
    expect(game.snapshot().campaign.name).toBe('Spinward Run');
    expect(game.snapshot().campaigns.map((c) => c.name)).toEqual(['Spinward Run']);
    expect(repository.saved?.name).toBe('Spinward Run');
  });

  it('löscht eine Kampagne, aber nie die letzte; war sie offen, öffnet sich eine andere', async () => {
    const { game, repository } = await started();
    game.showCampaigns();
    expect(game.snapshot().campaignSheet?.canDelete).toBe(false);
    game.deleteCampaign('k1');
    expect(game.snapshot().campaignSheet?.error).toMatch(/letzte Kampagne/);
    game.createCampaign('Zweite');
    game.showCampaigns();
    expect(game.snapshot().campaignSheet?.canDelete).toBe(true);
    game.deleteCampaign('k2');
    await game.whenSaved();
    expect(game.snapshot().campaign.id).toBe('k1');
    expect(repository.open).toBe('k1');
    expect([...repository.campaigns.keys()]).toEqual(['k1']);
  });

  it('exportiert eine Kampagne als Download und importiert sie als neue Kampagne', async () => {
    const { game, download } = await started(fixedRandom(5, 6));
    game.rollDice();
    game.renameCampaign('Spinward Run');
    game.exportCampaign('k1');
    expect(download.files).toHaveLength(1);
    const file = download.files[0]!;
    expect(file).toMatchObject({ fileName: 'Spinward-Run-2026-10-23.json', type: 'application/json' });
    expect(fromCampaignFile(file.content, 'x')).toMatchObject({ name: 'Spinward Run', log: [{ kind: 'dice', dice: [5, 6] }] });

    game.importCampaign(file.content);
    const view = game.snapshot();
    expect(view.campaign).toEqual({ id: 'k2', name: 'Spinward Run' });
    expect(view.campaigns.map((c) => c.id)).toEqual(['k1', 'k2']);
    expect(view.log).toEqual([expect.objectContaining({ kind: 'dice', total: 11 })]);
    expect(view.characters.map((c) => c.name)).toEqual(['Kira Vant', 'Jonas Reyl']);
  });

  it('importiert nichts aus einer falschen Datei und sagt, warum', async () => {
    const { game } = await started();
    game.showCampaigns();
    game.importCampaign('kein json');
    expect(game.snapshot().campaignSheet?.error).toMatch(/keine Kampagnendatei/);
    expect(game.snapshot().campaigns).toHaveLength(1);
  });
});

describe('Charaktererschaffung', () => {
  it('würfelt Schritt für Schritt, speichert dabei und schließt mit Namen ab', async () => {
    // Attribute 7, 10, 8, 9, 7, 5; Heimatwelt neu erschaffen (Vorkommen 5, dann C788545-7);
    // Other mit 6+6; überlebt; zwei Fertigkeiten; mustert ab; Geld 6.
    const world = [5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4, 3, 3, 4, 4, 4, 3, 4, 3, 4, 3, 2, 1, 1, 2, 2, 3, 3, 3, 4, 3, 3];
    const random = fixedRandom(3, 4, 5, 5, 4, 4, 4, 5, 3, 4, 2, 3, ...world, 6, 6, 6, 6, 1, 1, 1, 1, 6);
    const { game, repository } = await started(random, memoryRepository(createCampaign()));
    game.openGeneration();
    expect(game.snapshot().generation).toMatchObject({ step: 'characteristics', action: { kind: 'roll', label: 'STR würfeln' } });
    for (let i = 0; i < 6; i++) game.rollGeneration();
    expect(game.snapshot().generation?.upp.map((u) => u.value)).toEqual([7, 10, 8, 9, 7, 5]);
    expect(game.snapshot().generation?.action).toMatchObject({ kind: 'world', for: 'homeworld', worlds: [], previous: undefined });

    // „Später weiter“: Die Erschaffung bleibt gespeichert.
    game.closeGeneration();
    await game.whenSaved();
    expect(game.snapshot()).toMatchObject({ generation: undefined, generationRunning: true });
    expect(repository.saved?.generation?.career.rolls).toHaveLength(6);
    game.openGeneration();

    // Heimatwelt auf der Karte neu erschaffen: Feld wählen, Vorkommen, Welt, Name; dann ist sie gewählt.
    game.pickGenerationWorld();
    expect(game.snapshot().picking).toEqual({ title: 'Heimatwelt wählen' });
    game.chooseHex(3, 4);
    game.rollOccurrence();
    game.chooseHex(3, 4);
    for (let i = 0; i < 11; i++) game.rollWorld();
    game.nameWorld('Regina');
    expect(game.snapshot()).toMatchObject({ picking: undefined, world: undefined, generation: { step: 'service', homeworld: 'Regina' } });

    game.chooseService('other');
    expect(game.snapshot().generation).toMatchObject({ step: 'world', action: { kind: 'world', for: 'term', previous: { id: '0304', name: 'Regina' } } });
    game.chooseGenerationWorld('0304');
    expect(game.snapshot().generation).toMatchObject({ step: 'survival', status: 'Other · Term 1', termWorlds: ['Regina'] });
    game.rollGeneration();
    game.chooseSkillTable('other.personal');
    game.chooseSkillTable('other.personal');
    game.reenlist(false);
    // Nur ein Abmusterungswurf: Geld also auch nur noch einmal, nicht dreimal.
    expect(game.snapshot().generation?.action).toMatchObject({ kind: 'muster', left: 1, cashLeft: 1 });
    game.musterOut('cash');
    const view = game.snapshot().generation!;
    expect(view.step).toBe('name');
    expect(view.lines.map((l) => `${l.label}: ${l.result}`).slice(6)).toEqual([
      'Musterung Other: angenommen',
      'Überleben: überlebt',
      'Personal Development: STR +1',
      'Personal Development: STR +1',
      'Abmustern: mustert ab · 1 Abmusterungswurf',
      'Abmusterung: Geld: Cr 50.000',
    ]);
    // Wer abmustern will und abmustert, ist kein Fehlschlag.
    expect(view.lines[10]).toMatchObject({ label: 'Abmustern', success: undefined, target: undefined });

    game.finishGeneration('  ');
    expect(game.snapshot().generation?.error).toMatch(/Namen/);
    game.finishGeneration('Mara Quell');
    const after = game.snapshot();
    expect(after).toMatchObject({ generation: undefined, generationRunning: false, screen: 'oracle' });
    const mara = after.characters.find((c) => c.name === 'Mara Quell')!;
    expect(after.focus).toBe(mara?.id);
    expect(mara).toMatchObject({ background: 'Ex-Other · 1 Term · 22 Jahre', credits: 50000, upp: { str: 9 }, homeworld: 'Regina', termWorlds: ['Regina'] });
    expect(mara.career).toHaveLength(12);
  });

  it('fasst einen Term mit den Kürzeln der Fertigkeiten zusammen', async () => {
    const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };
    const { game } = await started(fixedRandom(3, 4, 5, 5, 4, 4, 4, 5, 3, 4, 2, 3, 6, 6), memoryRepository(setHexes(createCampaign([]), [regina])));
    game.openGeneration();
    for (let i = 0; i < 6; i++) game.rollGeneration();
    expect(game.snapshot().generation?.action).toMatchObject({ kind: 'world', worlds: [{ id: '0101', name: 'Regina', uwp: 'C788545-7' }] });
    // Auf der Karte eine fertige Welt antippen wählt sie.
    game.pickGenerationWorld();
    game.chooseHex(1, 1);
    expect(game.snapshot()).toMatchObject({ picking: undefined, generation: { step: 'service', homeworld: 'Regina' } });
    game.chooseService('marines'); // Musterung mit 6+6, die Marines geben Cutlass-1 mit
    const view = game.snapshot().generation!;
    expect(view.lines.at(-1)).toMatchObject({ result: 'angenommen · Cutlass-1', gains: ['Cut-1'] });
    expect(view.skills).toEqual([{ name: 'Cutlass', short: 'Cut', level: 1 }]);
  });

  it('zeigt einen Fehler in der Erschaffung, statt zu werfen, und verwirft auf Wunsch', async () => {
    const { game } = await started();
    game.openGeneration();
    game.chooseService('navy');
    expect(game.snapshot().generation?.error).toMatch(/Schritt/);
    game.discardGeneration();
    expect(game.snapshot()).toMatchObject({ generation: undefined, generationRunning: false });
  });
});

describe('Subsektor und Weltenerschaffung', () => {
  // Vorkommen 5; Raumhafen C; Scoutbasis ja; Gasriese ja; dann UWP C788545-7.
  const regina = [5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4, 3, 3, 4, 4, 4, 3, 4, 3, 4, 3, 2, 1, 1, 2, 2, 3, 3, 3, 4, 3, 3];

  it('zeigt 80 Felder, alle nicht erzeugt, im Reiter Sektor', async () => {
    const { game } = await started(fixedRandom(), memoryRepository(createCampaign()));
    game.showScreen('sector');
    const view = game.snapshot();
    expect(view.screen).toBe('sector');
    expect(view.sector).toHaveLength(80);
    expect(view.sector[0]).toMatchObject({ id: '0101', state: 'open' });
    expect(view.sector.at(-1)).toMatchObject({ id: '0810', state: 'open' });
    expect(view.worlds).toEqual([]);
  });

  it('würfelt das Vorkommen im Subsektor und erschafft die Welt dann Wurf für Wurf auf der Weltkarte', async () => {
    const { game, repository } = await started(fixedRandom(...regina), memoryRepository(createCampaign()));
    // Ein nicht erzeugtes Feld antippen wählt es nur; die Weltkarte geht nicht auf.
    game.chooseHex(3, 4);
    expect(game.snapshot()).toMatchObject({ world: undefined, selected: { id: '0304', state: 'open', target: 4, occurrence: undefined } });
    expect(game.snapshot().sector.find((h) => h.id === '0304')?.state).toBe('open');
    game.rollOccurrence();
    await game.whenSaved();
    expect(repository.saved?.hexes).toHaveLength(1);
    expect(game.snapshot()).toMatchObject({ world: undefined, selected: { id: '0304', state: 'pending', occurrence: { label: 'Vorkommen', dice: [5], target: 4, success: true, result: 'Welt' } } });
    expect(game.snapshot().sector.find((h) => h.id === '0304')?.state).toBe('pending');
    // Noch einmal würfeln geht nicht: Das Feld ist erzeugt.
    game.rollOccurrence();
    expect(game.snapshot().selected?.error).toMatch(/schon erzeugt/);

    // „Welt erschaffen“: Die Weltkarte geht auf, die Wahl auf der Karte ist weg.
    game.chooseHex(3, 4);
    expect(game.snapshot()).toMatchObject({ selected: undefined, world: { id: '0304', step: 'starport' } });

    // „Später weiter“ und wieder öffnen: Es geht weiter, wo es war.
    game.closeWorld();
    expect(game.snapshot().world).toBeUndefined();
    game.chooseHex(3, 4);
    expect(game.snapshot().world?.step).toBe('starport');

    for (let i = 0; i < 11; i++) game.rollWorld();
    const before = game.snapshot().world!;
    expect(before).toMatchObject({ step: 'name', uwp: 'C788545-7', navalBase: false, scoutBase: true, gasGiant: true, action: { kind: 'name' } });
    expect(before.profile.find((p) => p.kind === 'atmosphere')).toEqual({ kind: 'atmosphere', label: 'Atmosphäre', code: '8', text: 'Dense' });
    // Mit dem TL kam die Oberfläche, ohne eigenen Knopf.
    expect(before.surface).toEqual(['80 % Wasser', '8 tektonische Platten', '1 großer Kontinent, 4 kleine Kontinente, 5 große Inseln, 7 Archipele', 'einheimisches Leben']);
    expect(before.lines.find((l) => l.kind === 'tech')).toMatchObject({ dm: 3, parts: [{ label: 'Raumhafen C', dm: 2 }, { label: 'Bevölkerung 5', dm: 1 }], result: '7 · circa 1970 to 1979' });

    game.nameWorld('');
    expect(game.snapshot().world?.error).toMatch(/Namen/);
    game.nameWorld('Regina');
    const after = game.snapshot();
    expect(after.world).toMatchObject({ name: 'Regina', step: 'done', action: { kind: 'done' }, trade: [{ code: 'Ag' }, { code: 'Ni' }] });
    expect(after.sector.find((h) => h.id === '0304')).toMatchObject({ state: 'world', name: 'Regina', starport: 'C', scoutBase: true, gasGiant: true, hydrographics: 8 });
    expect(after.worlds).toEqual([{ id: '0304', column: 3, row: 4, name: 'Regina', uwp: 'C788545-7', bases: 'S', trade: ['Ag', 'Ni'], gasGiant: true, note: undefined }]);
  });

  it('schreibt einer fertigen Welt eine Notiz, ändert und entfernt sie; die Liste zeigt ihre erste Zeile', async () => {
    const world = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 }, temperature: 'temperate' as const, surface: { water: 80, plates: 8, majorContinents: 1, minorContinents: 4, majorIslands: 5, archipelagos: 7, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true } };
    const unfinished = { column: 2, row: 1, empty: false, uwp: { starport: 12 } };
    const { game, repository } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign([]), [world, unfinished])));
    game.chooseHex(1, 1);
    expect(game.snapshot().world).toMatchObject({ canNote: true, note: undefined });
    game.noteWorld('  Halveks Werft am Südpol.\nZoll ist bestechlich.  ');
    await game.whenSaved();
    expect(game.snapshot().world?.note).toBe('Halveks Werft am Südpol.\nZoll ist bestechlich.');
    expect(game.snapshot().worlds[0]?.note).toBe('Halveks Werft am Südpol.');
    expect(repository.saved?.hexes.find((h) => h.name === 'Regina')?.note).toBe('Halveks Werft am Südpol.\nZoll ist bestechlich.');
    game.noteWorld('   ');
    await game.whenSaved();
    expect(game.snapshot().world?.note).toBeUndefined();
    expect('note' in repository.saved!.hexes.find((h) => h.name === 'Regina')!).toBe(false);

    game.closeWorld();
    game.chooseHex(2, 1);
    expect(game.snapshot().world).toMatchObject({ canNote: false });
    game.noteWorld('Noch nicht.');
    expect(game.snapshot().world?.error).toMatch(/fertige Welt/);
  });

  it('würfelt einer älteren Welt mit Temperatur die Oberfläche nach', async () => {
    const old = { column: 1, row: 1, empty: false, name: 'Alt', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 }, temperature: 'temperate' as const };
    const { game } = await started(fixedRandom(), memoryRepository(setHexes(createCampaign([]), [old])));
    game.chooseHex(1, 1);
    expect(game.snapshot().world).toMatchObject({ step: 'done', surface: undefined, action: { kind: 'surface', label: 'Oberfläche würfeln' } });
    game.rollWorld();
    expect(game.snapshot().world).toMatchObject({ action: { kind: 'done' }, lines: [] });
    expect(game.snapshot().world?.surface?.[0]).toBe('75 % Wasser');
  });

  it('schreibt „nur Archipele“ und „nur Seen“ statt der ganzen Fläche als Zahl', () => {
    const none = { water: 0, plates: 1, majorContinents: 0, minorContinents: 0, majorIslands: 0, archipelagos: 0, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: false };
    expect(surfaceLines({ ...none, water: 85, archipelagos: 150 })).toContain('Land nur als Archipele');
    expect(surfaceLines({ ...none, water: 3, scatteredLakes: 30 })).toContain('Wasser nur als verstreute Seen');
    expect(surfaceLines({ ...none, water: 60, archipelagos: 7, majorIslands: 2 })).toContain('2 große Inseln, 7 Archipele');
  });

  it('lässt ein leeres Feld zu; antippen zeigt nur sein Vorkommen', async () => {
    const { game } = await started(fixedRandom(2));
    game.chooseHex(1, 1);
    game.rollOccurrence();
    expect(game.snapshot()).toMatchObject({ world: undefined, selected: { state: 'empty', occurrence: { result: 'leer', success: false } } });
    expect(game.snapshot().sector[0]?.state).toBe('empty');
    // Dasselbe Feld noch einmal antippen hebt die Wahl auf, ein weiteres Mal wählt es wieder.
    game.chooseHex(1, 1);
    expect(game.snapshot().selected).toBeUndefined();
    game.chooseHex(1, 1);
    expect(game.snapshot()).toMatchObject({ world: undefined, selected: { id: '0101', state: 'empty' } });
    game.clearHex();
    expect(game.snapshot().selected).toBeUndefined();
  });

  it('verwirft eine Welt in Erschaffung', async () => {
    const { game } = await started(fixedRandom(5));
    game.chooseHex(2, 2);
    game.rollOccurrence();
    game.chooseHex(2, 2);
    game.discardWorld();
    const view = game.snapshot();
    expect(view.world).toBeUndefined();
    expect(view.sector.find((h) => h.id === '0202')?.state).toBe('open');
  });

  it('nimmt die Hexfelder in die Kampagnendatei mit', async () => {
    const { game, download } = await started(fixedRandom(2), memoryRepository(createCampaign()));
    game.chooseHex(5, 5);
    game.rollOccurrence();
    game.exportCampaign(game.snapshot().campaign.id);
    const imported = fromCampaignFile(download.files.at(-1)!.content, 'k9');
    expect(imported.hexes).toEqual([{ column: 5, row: 5, empty: true, uwp: {} }]);
  });
});

describe('Durchlaufen lassen', () => {
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };

  /** Eine Zufallsquelle, die immer weiter würfelt, reproduzierbar. */
  function seeded(seed: number) {
    return {
      int(min: number, max: number) {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return min + (Math.floor(seed / 65536) % (max - min + 1));
      },
    };
  }

  it('würfelt die ganze Erschaffung bis zum Namen oder Tod, mit Heimatwelt und Welt je Term', async () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { game } = await started(seeded(seed), memoryRepository(setHexes(createCampaign([]), [regina])));
      game.openGeneration();
      game.runGeneration();
      const view = game.snapshot().generation!;
      expect(['name', 'dead']).toContain(view.step);
      expect(view.homeworld).toBe('Regina');
      // Jeder Term fand auf einer Welt statt: „wie zuletzt“, also Regina.
      const terms = new Set(view.lines.map((l) => l.term).filter((t) => t > 0)).size;
      expect(view.termWorlds).toEqual(Array.from({ length: terms }, () => 'Regina'));
    }
  });

  it('hält ohne fertige Welt bei der Heimatwelt an', async () => {
    const { game } = await started(seeded(1), memoryRepository(createCampaign()));
    game.openGeneration();
    game.runGeneration();
    expect(game.snapshot().generation).toMatchObject({ step: 'homeworld', action: { kind: 'world', worlds: [] } });
    expect(game.snapshot().generation?.lines).toHaveLength(6);
  });

  it('lässt eine Welt bis zum Namen durchlaufen, im Subsektor mit dem Vorkommen', async () => {
    // Vorkommen 5, dann die Welt C788545-7.
    const { game } = await started(fixedRandom(5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4, 3, 3, 4, 4, 4, 3, 4, 3, 4, 3, 2, 1, 1, 2, 2, 3, 3, 3, 4, 3, 3));
    game.chooseHex(3, 4);
    game.runOccurrence();
    expect(game.snapshot()).toMatchObject({ selected: undefined, world: { id: '0304', step: 'name', uwp: 'C788545-7' } });
    expect(game.snapshot().world?.lines.map((l) => l.kind)).toEqual(['occurrence', 'starport', 'scoutBase', 'gasGiant', 'size', 'atmosphere', 'temperature', 'hydrographics', 'population', 'government', 'law', 'tech']);
  });

  it('bleibt bei einem leeren Feld im Subsektor und zeigt das Vorkommen', async () => {
    const { game } = await started(fixedRandom(2));
    game.chooseHex(3, 4);
    game.runOccurrence();
    expect(game.snapshot()).toMatchObject({ world: undefined, selected: { state: 'empty', occurrence: { result: 'leer' } } });
  });

  it('lässt eine angefangene Welt auf der Weltkarte durchlaufen', async () => {
    const { game } = await started(fixedRandom(5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4, 3, 3, 4, 4, 4, 3, 4, 3, 4, 3, 2, 1, 1, 2, 2, 3, 3, 3, 4, 3, 3));
    game.chooseHex(3, 4);
    game.rollOccurrence();
    game.chooseHex(3, 4);
    game.rollWorld();
    game.runWorld();
    expect(game.snapshot().world).toMatchObject({ step: 'name', uwp: 'C788545-7' });
    expect(game.snapshot().world?.lines).toHaveLength(11);
  });
});

describe('Tiere im Kampf', () => {
  const regina = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina' };

  /** Eine Zufallsquelle, der man vor jedem Wurf die nächsten Zahlen gibt; sonst das Kleinste. */
  function queued() {
    const queue: number[] = [];
    return { queue, int: (min: number) => queue.shift() ?? min };
  }

  async function withAnimals() {
    const random = queued();
    const { game } = await started(random, memoryRepository(setHexes(createCampaign(), [regina])));
    game.chooseHex(1, 1);
    game.stayHere();
    game.closeWorld();
    game.setTerrain('clear');
    // Zeile 7 wählen: ohne Test, die Tabelle entsteht dabei.
    game.rollAnimals(7);
    game.closeEncounterIntro();
    return { game, random };
  }

  it('die Tiere stehen mit Hits statt Attributen in der Kampfsimulation, ohne Hände und ohne Heilen', async () => {
    const { game } = await withAnimals();
    const sim = game.snapshot().combat!.sim!;
    expect(sim.animal).toBeDefined();
    expect(sim.reaction).toBeUndefined();
    const animal = sim.fighters.find((f) => f.side === 'npcs')!;
    expect(animal.animal).toMatchObject({ hurt: 0 });
    expect(animal.healing).toMatchObject({ wake: false, treatable: false });
    expect(animal.state).toBe('unhurt');
  });

  it('ein Treffer auf ein Tier zählt gegen seine Hits; erreicht der Schaden die erste Zahl, ist es bewusstlos', async () => {
    const { game, random } = await withAnimals();
    game.rollSurprise();
    game.closeSurprise();
    let sim = game.snapshot().combat!.sim!;
    const animal = sim.fighters.find((f) => f.side === 'npcs')!;
    // Solange die SC dran sind: Kira greift das Tier an, bis es außer Gefecht ist.
    for (let i = 0; i < 30 && game.snapshot().combat!.sim!.fighters.find((f) => f.id === animal.id)!.state !== 'unconscious' && game.snapshot().combat!.sim!.fighters.find((f) => f.id === animal.id)!.state !== 'dead'; i++) {
      sim = game.snapshot().combat!.sim!;
      if (!sim.turn) break;
      if (sim.turn.side === 'pcs') {
        game.chooseFightTarget(animal.id);
        random.queue.push(6, 6);
        game.fightAttack();
        random.queue.push(6, 6, 6, 6, 6);
        if (game.snapshot().combat!.damage) game.rollDamage();
      } else {
        random.queue.push(1, 1);
        game.fightAttack();
      }
    }
    const after = game.snapshot().combat!.sim!.fighters.find((f) => f.id === animal.id)!;
    expect(after.animal!.hurt).toBeGreaterThanOrEqual(after.animal!.hits[0]);
    expect(['unconscious', 'dead', 'destroyed']).toContain(after.state);
  });

  it('Ausweiden: der Knopf am Tier öffnet den Dialog, das Ergebnis steht im Vordergrund und im Log, die Beute im Gepäck', async () => {
    const { game, random } = await withAnimals();
    game.rollSurprise();
    game.closeSurprise();
    const animal = game.snapshot().combat!.sim!.fighters.find((f) => f.side === 'npcs')!;
    for (let i = 0; i < 40; i++) {
      const sim = game.snapshot().combat!.sim!;
      const now = sim.fighters.find((f) => f.id === animal.id)!;
      if (now.state === 'dead' || now.state === 'unconscious' || now.state === 'destroyed' || !sim.turn) break;
      if (sim.turn.side === 'pcs') {
        game.chooseFightTarget(animal.id);
        random.queue.push(6, 6);
        game.fightAttack();
        random.queue.push(2, 2, 2, 2, 2);
        if (game.snapshot().combat!.damage) game.rollDamage();
      } else game.skipTurn();
    }
    const down = game.snapshot().combat!.sim!.fighters.find((f) => f.id === animal.id)!;
    if (down.state === 'destroyed') {
      expect(down.loot).toMatchObject({ action: 'butcher' });
      expect(down.loot!.blocked).toMatch(/zerstört/);
      return;
    }
    expect(down.loot).toEqual({ action: 'butcher', blocked: undefined });
    game.openLoot(animal.id);
    expect(game.snapshot().combat!.loot).toMatchObject({ animal: true, meatWorker: 'Jonas · Steward-1', furWorker: 'Jonas · Blade-1' });
    random.queue.push(3);
    game.butcher(animal.id);
    const shown = game.snapshot().combat!.butchered!;
    expect(shown).toMatchObject({ meatWorker: 'Jonas · Steward-1', furWorker: 'Jonas · Blade-1' });
    // Die Jagdbeute liegt im Gepäck der Gruppe.
    expect(game.snapshot().stash.items.some((i) => i.kind === 'game')).toBe(true);
    expect(game.snapshot().log.at(-1)).toMatchObject({ kind: 'butchering' });
    game.closeButchered();
    expect(game.snapshot().combat!.butchered).toBeUndefined();
    expect(game.snapshot().combat!.sim!.fighters.find((f) => f.id === animal.id)!.loot!.blocked).toMatch(/schon ausgeweidet/);
  });

  it('trifft ein Tier einen SC, ist der Schaden fest, ohne Würfel; er geht als ein Block auf ein Attribut', async () => {
    const { game, random } = await withAnimals();
    game.rollSurprise();
    game.closeSurprise();
    for (let i = 0; i < 20; i++) {
      const sim = game.snapshot().combat!.sim!;
      if (!sim.turn) break;
      if (sim.turn.side === 'npcs') {
        game.chooseFightTarget('c1');
        random.queue.push(6, 6);
        game.fightAttack();
        if (game.snapshot().combat!.damage) game.rollDamage();
        break;
      }
      game.skipTurn();
    }
    const damage = game.snapshot().log.find((e) => e.kind === 'damage');
    expect(damage).toMatchObject({ kind: 'damage', dice: [], victim: 'Kira Vant' });
    expect(damage && damage.kind === 'damage' ? damage.fixed : undefined).toBeGreaterThanOrEqual(1);
  });
});
