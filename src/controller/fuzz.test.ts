import { describe, it } from 'vitest';
import { createCampaign, DomainError, fromCampaignFile, setHexes, toCampaignFile, type Campaign } from '../model';
import { fixedClock, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

// Zufällige Folgen von Eingaben über alle Reiter. Nach jedem Schritt muss der Spielstand eine gültige
// Kampagnendatei ergeben: Was die App erzeugt, lässt sich exportieren und wieder einlesen.

const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 9, government: 4, law: 5, tech: 12 } };

function seeded(seed: number) {
  let state = seed;
  return {
    int(min: number, max: number) {
      state = (state * 1103515245 + 12345) % 2 ** 31;
      return min + (Math.floor(state / 65536) % (max - min + 1));
    },
  };
}

type Step = (game: GameController, pick: (n: number) => number) => void;

const steps: readonly [string, Step][] = [
  ['oracle', (g) => g.askOracle('Frage?')],
  ['dice', (g) => g.rollDice()],
  ['note', (g, p) => g.writeNote('Notiz', g.snapshot().log.length > 0 ? p(g.snapshot().log.length) : undefined)],
  ['delete', (g, p) => g.snapshot().log.length > 0 && g.deleteLogEntry(p(g.snapshot().log.length))],
  ['focus', (g, p) => { const c = g.snapshot().characters; if (c.length) g.focusCharacter(c[p(c.length)]!.id); }],
  ['wield', (g, p) => { const w = g.snapshot().combat?.weapons ?? []; if (w.length) g.wieldWeapon(w[p(w.length)]!.id); }],
  ['table', (g, p) => { const c = g.snapshot().combat; if (!c || c.sim) return; const row = c.rows[p(c.rows.length)]!; const cell = row.cells[p(row.cells.length)]!; if (cell.odds) { g.chooseTarget(row.armor, cell.range); g.rollAttack(); } }],
  ['damage', (g) => g.snapshot().combat?.damage && g.rollDamage()],
  ['reload', (g) => { const a = g.snapshot().combat?.ammo; if (a && a.magazines > 0 && !g.snapshot().combat?.sim) g.reload(); }],
  ['income', (g, p) => g.book('income', 1 + p(5000), 'Fund')],
  ['deposit', (g, p) => { const m = g.snapshot().shop?.members ?? []; if (m.length) g.book('deposit', 1 + p(500), undefined, m[p(m.length)]!.id); }],
  ['buy', (g, p) => { const s = g.snapshot().shop; const items = s?.offer.flatMap((o) => o.items) ?? []; if (s && items.length && s.members.length) g.buy(items[p(items.length)]!.id, 1 + p(2), s.members[p(s.members.length)]!.id); }],
  ['sell', (g, p) => { const s = g.snapshot().shop; const m = s?.members.filter((x) => x.sellable.length) ?? []; if (s?.world && m.length) { const who = m[p(m.length)]!; const it = who.sellable[p(who.sellable.length)]!; g.sell(it.id, 1, it.price, who.id); } }],
  ['encounter', (g, p) => { if (!g.snapshot().combat?.sim) g.rollEncounter(11 + p(6) * 10 + p(6), p(2) ? 'clear' : undefined); }],
  ['animals', (g, p) => { if (g.snapshot().combat?.sim) return; const t = ['clear', 'forest', 'swamp', 'maritime-surface', 'city'][p(5)]!; g.setTerrain(t); g.rollAnimals(p(2) ? undefined : 2 + p(11)); }],
  ['saves', (g) => { const e = g.snapshot().combat?.animals.lastEvent; if (e?.canSave) g.rollEventSaves(e.index); }],
  ['struggle', (g) => g.snapshot().combat?.sim?.turn?.held && g.struggle()],
  ['loot', (g, p) => {
    const f = g.snapshot().combat?.sim?.fighters.filter((x) => x.loot && !x.loot.blocked) ?? [];
    const pcs = g.snapshot().characters;
    if (!f.length || !pcs.length) return;
    const target = f[p(f.length)]!;
    g.openLoot(target.id);
    const pc = pcs[p(pcs.length)]!.id;
    if (target.loot!.action === 'butcher') { g.butcher(target.id); g.closeButchered(); } else g.takeLoot(target.id, pc);
  }],
  ['sellGame', (g, p) => { const s = g.snapshot().shop; const game = s?.stash.filter((i) => i.perKg !== undefined) ?? []; if (s?.world && game.length) { const it = game[p(game.length)]!; g.sellGame(it.id, 1 + p(it.count), 1 + p(50)); } }],
  ['equip', (g, p) => { const st = g.snapshot().stash; const items = st.items.filter((i) => i.fits.length > 0); if (!items.length || !st.members.length) return; const it = items[p(items.length)]!; g.equip(st.members[p(st.members.length)]!.id, it.fits[p(it.fits.length)]!, { key: it.key }); }],
  ['unequip', (g, p) => { const st = g.snapshot().stash; if (!st.members.length) return; const m = st.members[p(st.members.length)]!; const full = m.slots.filter((x) => x.item !== undefined); if (full.length) g.unequip(m.id, full[p(full.length)]!.slot); }],
  ['surprise', (g) => { if (g.snapshot().combat?.sim?.needsSurprise) g.rollSurprise(); else g.closeSurprise(); }],
  ['end', (g) => g.snapshot().combat?.sim && g.endEncounter()],
  ['target', (g, p) => { const f = g.snapshot().combat?.sim?.fighters.filter((x) => x.targetable) ?? []; if (f.length) g.chooseFightTarget(f[p(f.length)]!.id); }],
  ['band', (g, p) => { const s = g.snapshot().combat?.sim; if (s?.focus) g.setBand(s.focus, p(22), false); }],
  ['evade', (g) => { const t = g.snapshot().combat?.sim?.turn; if (t && !t.ran) g.evade(); }],
  ['move', (g, p) => { const s = g.snapshot().combat?.sim; if (!s) return; const step = p(2) ? 1 : -1; if ((step < 0 && !s.close) || (step > 0 && !s.escaped)) g.moveBand(step); }],
  ['fight', (g) => { const t = g.snapshot().combat?.sim?.turn; if (t?.target && t.reaches && t.ammo?.rounds !== 0) g.fightAttack(); }],
  ['skip', (g) => g.snapshot().combat?.sim?.turn && g.skipTurn()],
  ['fightReload', (g) => { const t = g.snapshot().combat?.sim?.turn; if (t?.ammo && t.ammo.magazines > 0) g.fightReload(); }],
  ['wound', (g, p) => { const w = g.snapshot().combat?.wounding; if (!w) return; if (w.next) g.assignWound(w.next.open[p(w.next.open.length)]!); else g.confirmWounding(); }],
  ['heal', (g, p) => {
    const c = g.snapshot().combat;
    const pool = c?.sim ? c.sim.fighters : [];
    const f = pool[p(Math.max(1, pool.length))];
    const h = f?.healing ?? c?.healing;
    if (!h) return;
    const healer = h.healers.find((x) => x.able)?.id;
    const npc = f?.side === 'npcs' ? f.id : undefined;
    const pc = f?.side === 'pcs' ? f.id : undefined;
    if (h.wake) g.recover('wake', npc, undefined, false, pc);
    else if (h.rest && p(2)) g.recover('rest', npc, undefined, false, pc);
    else if (h.treatable && healer) g.recover('treatment', npc, healer, true, pc);
  }],
  ['adopt', (g, p) => { const n = g.snapshot().combat?.sim?.fighters.filter((f) => f.side === 'npcs' && f.state !== 'dead') ?? []; if (n.length && !p(4)) g.adoptNpcs(n.filter(() => p(2) === 0).map((f) => f.id), p(2) === 0); }],
  ['close', (g) => g.snapshot().result && g.closeResult()],
  ['remove', (g, p) => { const c = g.snapshot().characters; if (c.length > 1 && !p(6)) g.removeCharacter(c[p(c.length)]!.id); }],
  ['kill', (g, p) => { const c = g.snapshot().characters; if (c.length > 1 && !p(8)) { const who = c[p(c.length)]!; g.editCharacter(who.id); g.saveCharacter({ ...g.snapshot().editor!.input, dead: true }); } }],
  ['revive', (g) => { const d = g.snapshot().dead[0]; if (d) { g.editCharacter(d.id); g.saveCharacter({ ...g.snapshot().editor!.input, dead: false }); } }],
  ['npcFlag', (g, p) => { const c = g.snapshot().characters; if (c.length > 1 && !p(8)) { const who = c[p(c.length)]!; g.editCharacter(who.id); g.saveCharacter({ ...g.snapshot().editor!.input, npc: true }); } }],
  ['new', (g, p) => { if (!p(8)) { g.newCharacter(); g.saveCharacter({ name: 'Neu', background: '', equipment: '', credits: 100, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [{ of: 'medical', level: 3 }], possessions: [{ of: 'medical-kit', count: 1 }, { of: 'rifle', count: 1 }, { of: 'rifle-ammo', count: 2 }] }); } }],
  ['edit', (g, p) => {
    const c = g.snapshot().characters;
    if (!c.length) return;
    const who = c[p(c.length)]!;
    g.editCharacter(who.id);
    const input = g.snapshot().editor!.input;
    // Mal den ersten Gegenstand weglassen, mal die Fertigkeiten.
    g.saveCharacter({ ...input, possessions: p(2) ? (input.possessions ?? []).slice(1) : (input.possessions ?? []), skills: p(3) ? input.skills : input.skills.slice(1) });
    g.cancelEdit();
  }],
];

function check(campaign: Campaign, game: GameController, trail: readonly string[]): void {
  const where = `nach: ${trail.slice(-12).join(' → ')}`;
  try {
    fromCampaignFile(toCampaignFile(campaign), 'k9');
  } catch (error) {
    throw new Error(`Kampagnendatei ungültig ${where}\n${String(error)}`);
  }
  const view = game.snapshot();
  const fail = (what: string) => {
    throw new Error(`${what} ${where}`);
  };
  const focus = campaign.characters.find((c) => c.id === campaign.focus);
  if (focus && (focus.dead || focus.retired || focus.npc)) fail('Charakter oben ist tot, ausgeblendet oder NSC');
  if (campaign.encounters.filter((e) => !e.ended).length > 1) fail('Mehr als eine laufende Begegnung');
  for (const c of view.characters) {
    for (const k of ['str', 'dex', 'end'] as const) if (c.current[k] < 0 || c.current[k] > c.upp[k]) fail(`Unmögliche Wunden bei ${c.name}`);
  }
  const sim = view.combat?.sim;
  if (sim) {
    if (sim.turn && !sim.fighters.some((f) => f.id === sim.turn!.id && f.turn)) fail('Wer am Zug ist, steht nicht unter den Kämpfern');
    if (sim.turn && sim.defeated) fail('Am Zug, obwohl der Kampf entschieden ist');
    if (!sim.turn && !sim.defeated && !sim.needsSurprise) fail('Keiner am Zug, aber der Kampf ist nicht entschieden');
    for (const f of sim.fighters) for (const k of ['str', 'dex', 'end'] as const) if (f.current[k] < 0 || f.current[k] > f.upp[k]) fail(`Unmögliche Wunden bei ${f.name}`);
  }
  if (view.shop && view.shop.funds < 0) fail('Kasse negativ');
}

describe('Fuzz: zufällige Eingaben', () => {
  it('jeder Zustand ergibt eine gültige Kampagnendatei, und die View bricht nie ab', async () => {
    // Ausgiebig: FUZZ_SEEDS=200 npx vitest run src/controller/fuzz.test.ts
    const seeds = Number(process.env.FUZZ_SEEDS ?? 30);
    for (let seed = 1; seed <= seeds; seed++) {
      const random = seeded(seed);
      const repository = memoryRepository(setHexes(createCampaign(), [regina]));
      const game = new GameController({ repository, random, clock: fixedClock(), download: memoryDownload() });
      await game.init();
      game.chooseHex(1, 1);
      game.stayHere();
      game.closeWorld();
      const pick = (n: number) => random.int(0, n - 1);
      const trail: string[] = [];
      for (let i = 0; i < 300; i++) {
        const [name, step] = steps[pick(steps.length)]!;
        trail.push(name);
        try {
          step(game, pick);
        } catch (error) {
          if (!(error instanceof DomainError)) throw new Error(`Absturz in ${name} nach: ${trail.slice(-12).join(' → ')}\n${(error as Error).stack}`);
          trail.push(`(${error.message})`);
        }
        await game.whenSaved();
        check(repository.saved!, game, trail);
      }
    }
  }, 120_000);
});
