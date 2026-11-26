import { describe, expect, it } from 'vitest';
import { countingKeys, fixedClock, fixedRandom, memoryCloud, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

type TestCloud = ReturnType<typeof memoryCloud>;

/** Ein Gerät: ein Controller mit eigenem Speicher an der gemeinsamen Wolke. Die Uhren der Geräte gehen verschieden. */
async function device(cloud: TestCloud, name: string, start: string) {
  const repository = memoryRepository();
  const game = new GameController({ repository, random: fixedRandom(), clock: fixedClock(start), download: memoryDownload(), keys: countingKeys(name), cloud });
  await game.init();
  await game.sync();
  await game.whenSaved();
  return { game, repository };
}

const names = (game: GameController) => game.snapshot().campaigns.map((c) => c.name);

/** Zwei Geräte, die beide „Spinward Run“ haben und gleich sind. */
async function pair() {
  const cloud = memoryCloud();
  const handy = await device(cloud, 'handy', '2026-11-13T10:00:00.000Z');
  handy.game.createCampaign('Spinward Run');
  await handy.game.sync();
  const tablet = await device(cloud, 'tablet', '2026-11-13T12:00:00.000Z');
  tablet.game.openCampaign(tablet.game.snapshot().campaigns.find((c) => c.name === 'Spinward Run')!.id);
  return { cloud, handy, tablet };
}

describe('Abgleich mit OneDrive', () => {
  it('ohne Wolke gibt es keinen Abgleich, ohne Anmeldung geschieht nichts', async () => {
    const plain = new GameController({ repository: memoryRepository(), random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await plain.init();
    expect(plain.snapshot().sync.status).toBe('off');

    const cloud = memoryCloud(false);
    const { game } = await device(cloud, 'handy', '2026-11-13T10:00:00.000Z');
    expect(game.snapshot().sync).toMatchObject({ status: 'signedOut', account: undefined });
    expect(cloud.files.size).toBe(0);
  });

  it('lädt nach dem Anmelden alles hoch; ein zweites Gerät bekommt es', async () => {
    const cloud = memoryCloud(false);
    const handy = await device(cloud, 'handy', '2026-11-13T10:00:00.000Z');
    await handy.game.signIn();
    expect(handy.game.snapshot().sync).toMatchObject({ status: 'synced', account: 'kira@example.com' });
    expect([...cloud.files.keys()]).toEqual(['handy-1']);

    const tablet = await device(cloud, 'tablet', '2026-11-13T12:00:00.000Z');
    // Jedes Gerät hat seine eigene Demo-Kampagne; nach dem Abgleich haben beide beide.
    expect(names(tablet.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne']);
    await handy.game.sync();
    expect(names(handy.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne']);
    expect(handy.game.snapshot().conflicts).toEqual([]);
  });

  it('bringt eine Änderung auf das andere Gerät und ersetzt dort die offene Kampagne', async () => {
    const { handy, tablet } = await pair();
    handy.game.writeNote('Wir landen auf Regina.');
    await handy.game.sync();
    await tablet.game.sync();
    expect(tablet.game.snapshot().log.map((e) => e.kind)).toEqual(['note']);
    await tablet.game.whenSaved();
    expect(tablet.repository.saved?.log).toHaveLength(1);
    // Danach ist nichts mehr zu tun.
    const before = [...handy.repository.marks.values()];
    await handy.game.sync();
    expect([...handy.repository.marks.values()]).toEqual(before);
  });

  it('eine Kampagne, die gelöscht wird, während sie hochlädt, bleibt gelöscht und kommt nicht zurück', async () => {
    const { cloud, handy } = await pair();
    const id = handy.game.snapshot().campaigns.find((c) => c.name === 'Spinward Run')!.id;
    handy.game.writeNote('Noch schnell notiert.');
    // Das Hochladen hängt im Netz; derweil löscht der Spieler die Kampagne.
    const write = cloud.write.bind(cloud);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    cloud.write = async (...args) => {
      await held;
      return write(...args);
    };
    const running = handy.game.sync();
    await new Promise((resolve) => setTimeout(resolve, 0));
    handy.game.showCampaigns();
    handy.game.deleteCampaign(id);
    release();
    await running;
    cloud.write = write;
    await handy.game.sync();
    await handy.game.sync();
    expect(names(handy.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne']);
    expect(cloud.files.size).toBe(2);
  });

  it('löscht eine hier gelöschte Kampagne dort und auf dem anderen Gerät', async () => {
    const { cloud, handy, tablet } = await pair();
    const id = handy.game.snapshot().campaigns.find((c) => c.name === 'Spinward Run')!.id;
    handy.game.showCampaigns();
    handy.game.deleteCampaign(id);
    await handy.game.sync();
    expect(cloud.files.size).toBe(2);
    await tablet.game.sync();
    expect(names(tablet.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne']);
    // Sie war auf dem Tablet offen: Jetzt ist die erste nach Namen offen.
    expect(tablet.game.snapshot().campaign.name).toBe('Demo-Kampagne');
  });

  it('fragt bei einem Konflikt und ändert bis dahin nichts', async () => {
    const { cloud, handy, tablet } = await pair();
    handy.game.writeNote('Vom Handy.');
    tablet.game.writeNote('Vom Tablet.');
    tablet.game.writeNote('Noch eine.');
    await handy.game.sync();
    await tablet.game.sync();
    const [conflict] = tablet.game.snapshot().conflicts;
    expect(conflict).toMatchObject({ name: 'Spinward Run', local: { entries: 2 }, remote: { entries: 1 }, choices: ['local', 'remote', 'both'] });
    // Der Abgleich fragt: Die Kampagnenwahl ist offen.
    expect(tablet.game.snapshot().campaignSheet).toBeDefined();
    const text = cloud.files.get(conflict!.key)!.text;
    // Solange nicht gewählt ist, spielt man weiter, und die Kampagne wird nicht abgeglichen.
    tablet.game.writeNote('Weitergespielt.');
    await tablet.game.sync();
    expect(cloud.files.get(conflict!.key)!.text).toBe(text);
    expect(tablet.game.snapshot().conflicts).toHaveLength(1);
    expect(tablet.game.snapshot().conflicts[0]!.local).toMatchObject({ entries: 3 });
  });

  it('„Dieses Gerät“: der Stand hier gilt und geht hoch', async () => {
    const { handy, tablet } = await pair();
    handy.game.writeNote('Vom Handy.');
    tablet.game.writeNote('Vom Tablet.');
    await handy.game.sync();
    await tablet.game.sync();
    await tablet.game.resolveConflict(tablet.game.snapshot().conflicts[0]!.key, 'local');
    expect(tablet.game.snapshot().conflicts).toEqual([]);
    await handy.game.sync();
    expect(handy.game.snapshot().conflicts).toEqual([]);
    const run = handy.game.snapshot().campaigns.find((c) => c.name === 'Spinward Run')!;
    expect(run.entries).toBe(1);
    handy.game.openCampaign(run.id);
    expect(handy.game.snapshot().log).toMatchObject([{ kind: 'note', text: 'Vom Tablet.' }]);
  });

  it('„OneDrive“: der Stand dort ersetzt den hier', async () => {
    const { handy, tablet } = await pair();
    handy.game.writeNote('Vom Handy.');
    tablet.game.writeNote('Vom Tablet.');
    await handy.game.sync();
    await tablet.game.sync();
    await tablet.game.resolveConflict(tablet.game.snapshot().conflicts[0]!.key, 'remote');
    expect(tablet.game.snapshot().log).toMatchObject([{ kind: 'note', text: 'Vom Handy.' }]);
    await handy.game.sync();
    expect(handy.game.snapshot().conflicts).toEqual([]);
  });

  it('„Beide behalten“: der Stand hier wird die Kopie und bleibt offen, der von dort kommt daneben', async () => {
    const { cloud, handy, tablet } = await pair();
    handy.game.writeNote('Vom Handy.');
    tablet.game.writeNote('Vom Tablet.');
    await handy.game.sync();
    await tablet.game.sync();
    await tablet.game.resolveConflict(tablet.game.snapshot().conflicts[0]!.key, 'both');
    expect(names(tablet.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne', 'Spinward Run', 'Spinward Run (Kopie)']);
    expect(tablet.game.snapshot().campaign.name).toBe('Spinward Run (Kopie)');
    expect(tablet.game.snapshot().log).toMatchObject([{ text: 'Vom Tablet.' }]);
    expect(cloud.files.size).toBe(4);
    // Das Handy sieht an seiner Kampagne keine Änderung, nur eine neue daneben.
    await handy.game.sync();
    expect(names(handy.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne', 'Spinward Run', 'Spinward Run (Kopie)']);
    expect(handy.game.snapshot().conflicts).toEqual([]);
  });

  it('hier geändert, dort gelöscht: nur zwei Wahlen; „OneDrive“ löscht hier', async () => {
    const { handy, tablet } = await pair();
    const id = handy.game.snapshot().campaigns.find((c) => c.name === 'Spinward Run')!.id;
    handy.game.showCampaigns();
    handy.game.deleteCampaign(id);
    tablet.game.writeNote('Vom Tablet.');
    await handy.game.sync();
    await tablet.game.sync();
    const [conflict] = tablet.game.snapshot().conflicts;
    expect(conflict).toMatchObject({ remote: undefined, choices: ['local', 'remote'] });
    await tablet.game.resolveConflict(conflict!.key, 'both');
    expect(tablet.game.snapshot().sync.status).toBe('error');
    await tablet.game.resolveConflict(conflict!.key, 'remote');
    expect(names(tablet.game)).toEqual(['Demo-Kampagne', 'Demo-Kampagne']);
  });

  it('ohne Netz spielt man weiter; der nächste Abgleich holt nach', async () => {
    const { cloud, handy, tablet } = await pair();
    cloud.offline = true;
    handy.game.writeNote('Im Funkloch.');
    await handy.game.sync();
    expect(handy.game.snapshot().sync.status).toBe('offline');
    cloud.offline = false;
    await handy.game.sync();
    expect(handy.game.snapshot().sync.status).toBe('synced');
    await tablet.game.sync();
    expect(tablet.game.snapshot().log).toMatchObject([{ text: 'Im Funkloch.' }]);
  });

  it('nach Abmelden und erneutem Anmelden ist Gleiches kein Konflikt', async () => {
    const { cloud, handy } = await pair();
    await handy.game.signOut();
    expect(handy.game.snapshot().sync.status).toBe('signedOut');
    expect(handy.repository.marks.size).toBe(0);
    expect(cloud.files.size).toBe(3);
    await handy.game.signIn();
    expect(handy.game.snapshot().conflicts).toEqual([]);
    expect(handy.repository.marks.size).toBe(3);
  });

  it('eine kaputte Datei dort hält die übrigen nicht auf', async () => {
    const { cloud, handy, tablet } = await pair();
    cloud.files.set('fremd', { text: 'kein JSON', revision: 'x' });
    handy.game.writeNote('Trotzdem.');
    await handy.game.sync();
    expect(handy.game.snapshot().sync.status).toBe('error');
    await tablet.game.sync();
    expect(tablet.game.snapshot().log).toMatchObject([{ text: 'Trotzdem.' }]);
  });

  it('stößt den Abgleich kurz nach einer Änderung an', async () => {
    const cloud = memoryCloud();
    const runs: (() => void)[] = [];
    const game = new GameController({ repository: memoryRepository(), random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys(), cloud, later: (run) => runs.push(run) });
    await game.init();
    await game.sync();
    game.writeNote('Neu.');
    expect(runs).toHaveLength(1);
    runs[0]!();
    await game.sync();
    expect(cloud.files.get('key-1')!.text).toContain('Neu.');
  });

  it('merkt beim Start, wenn die Anmeldung verloren ging, ohne dass sich jemand abgemeldet hat', async () => {
    const cloud = memoryCloud(false);
    const handy = await device(cloud, 'handy', '2026-11-13T10:00:00.000Z');
    await handy.game.signIn();
    await handy.game.whenSaved();
    // Die Anmeldung ist weg (etwa nach einer neuen Fassung), die Abgleichsmarken sind noch da.
    cloud.user = undefined;
    const again = new GameController({ repository: handy.repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys('handy'), cloud });
    await again.init();
    expect(again.snapshot().sync).toMatchObject({ status: 'expired', account: undefined });
    await again.signIn();
    expect(again.snapshot().sync).toMatchObject({ status: 'synced', account: 'kira@example.com' });

    // Wer sich selbst abmeldet, wird beim nächsten Start nicht daran erinnert.
    await again.signOut();
    await again.whenSaved();
    const third = new GameController({ repository: handy.repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys('handy'), cloud });
    await third.init();
    expect(third.snapshot().sync.status).toBe('signedOut');
  });
});

describe('Abgleich der Deckpläne (2026-11-17)', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** Ein Gerät mit einem Free Trader (Entwurf A) in der offenen Kampagne. */
  async function trader(cloud: TestCloud, name: string, start: string) {
    const { game, repository } = await device(cloud, name, start);
    game.book('income', 45_000_000, 'Testgeld');
    game.buyShipDesign('A', 'cash');
    await tick();
    return { game, repository };
  }
  const shown = (game: GameController) => game.snapshot().ship!.deckPlans.map((p) => [p.name, p.image]);
  const stored = (repository: ReturnType<typeof memoryRepository>) => repository.deckPlans.map((p) => [p.name, p.image]).sort();

  it('ein Plan von einem Gerät kommt auf das andere, auch in eine andere Kampagne, und Löschen reist mit', async () => {
    const cloud = memoryCloud();
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    await handy.game.addDeckPlan(png);
    await handy.game.sync();
    expect([...cloud.deckFiles.keys()]).toEqual(['A/Deck A']);
    // Kampagnendateien bleiben ohne Bilder.
    expect([...cloud.files.values()].some((f) => f.text.includes('data:image'))).toBe(false);

    const tablet = await trader(cloud, 'tablet', '2026-11-17T12:00:00.000Z');
    await tablet.game.sync();
    await tick();
    expect(shown(tablet.game)).toEqual([['Deck A', png]]);
    expect(tablet.repository.deckPlans[0]!.key).toBe(handy.repository.deckPlans[0]!.key);

    await tablet.game.removeDeckPlan('Deck A');
    await tablet.game.sync();
    expect(cloud.deckFiles.size).toBe(0);
    await handy.game.sync();
    await tick();
    expect(shown(handy.game)).toEqual([]);
    expect(handy.repository.deckPlans).toEqual([]);
  });

  it('zwei verschiedene Bilder auf demselben Platz: beide bleiben, auf beiden Geräten', async () => {
    const cloud = memoryCloud();
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    const tablet = await trader(cloud, 'tablet', '2026-11-17T12:00:00.000Z');
    await handy.game.addDeckPlan(`${png}handy`);
    await tablet.game.addDeckPlan(`${png}tablet`);
    await handy.game.sync();
    await tablet.game.sync();
    await handy.game.sync();
    await tick();
    // Der Plan aus OneDrive (vom Handy) hat den Platz, der vom Tablet rückt auf Deck B.
    const both = [
      ['Deck A', `${png}handy`],
      ['Deck B', `${png}tablet`],
    ];
    expect(stored(tablet.repository)).toEqual(both);
    expect(stored(handy.repository)).toEqual(both);
    expect(shown(handy.game)).toEqual(both);
    expect([...cloud.deckFiles.keys()].sort()).toEqual(['A/Deck A', 'A/Deck B']);
  });

  it('hier gelöscht, dort ein neues Bild auf den Platz: das neue Bild bleibt', async () => {
    const cloud = memoryCloud();
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    await handy.game.addDeckPlan(`${png}alt`);
    await handy.game.sync();
    const tablet = await trader(cloud, 'tablet', '2026-11-17T12:00:00.000Z');
    await tablet.game.sync();
    await tick();
    // Das Tablet ersetzt den Plan, das Handy löscht ihn, beide ohne Abgleich dazwischen.
    await tablet.game.removeDeckPlan('Deck A');
    await tablet.game.addDeckPlan(`${png}neu`);
    await tablet.game.sync();
    await handy.game.removeDeckPlan('Deck A');
    await handy.game.sync();
    await tick();
    expect(stored(handy.repository)).toEqual([['Deck A', `${png}neu`]]);
    expect(shown(handy.game)).toEqual([['Deck A', `${png}neu`]]);
  });

  it('mehr als drei nur über den Abgleich: der Bereich Schiff zeigt alle, ein neues Bild geht erst wieder bei weniger als drei', async () => {
    const cloud = memoryCloud();
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    const tablet = await trader(cloud, 'tablet', '2026-11-17T12:00:00.000Z');
    for (let i = 0; i < 3; i++) await handy.game.addDeckPlan(`${png}h${i}`);
    for (let i = 0; i < 2; i++) await tablet.game.addDeckPlan(`${png}t${i}`);
    await handy.game.sync();
    await tablet.game.sync();
    await tick();
    expect(shown(tablet.game).map(([name]) => name)).toEqual(['Deck A', 'Deck B', 'Deck C', 'Deck D', 'Deck E']);
    expect(tablet.game.snapshot().ship!.freeDeckSlots).toBe(0);
    await tablet.game.addDeckPlan(`${png}x`);
    expect(tablet.game.snapshot().ship!.error).toMatch(/Mehr als 3/);
  });

  it('Abmelden vergisst die Marken der Deckpläne; die Pläne bleiben hier und dort', async () => {
    const cloud = memoryCloud();
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    await handy.game.addDeckPlan(png);
    await handy.game.sync();
    expect(handy.repository.deckMarks).toHaveLength(1);
    await handy.game.signOut();
    await handy.game.whenSaved();
    expect(handy.repository.deckMarks).toHaveLength(0);
    expect(handy.repository.deckPlans).toHaveLength(1);
    expect(cloud.deckFiles.size).toBe(1);
    // Wieder angemeldet: gleicher Schlüssel hier und dort, nur die Marke kommt zurück.
    await handy.game.signIn();
    await handy.game.whenSaved();
    expect(handy.repository.deckMarks).toHaveLength(1);
    expect(handy.repository.deckPlans).toHaveLength(1);
    expect(cloud.deckFiles.size).toBe(1);
  });

  it('eine kaputte Datei dort meldet der Abgleich, die übrigen Pläne kommen trotzdem', async () => {
    const cloud = memoryCloud();
    cloud.deckFiles.set('A/Deck A', { text: 'kaputt', revision: 'x1' });
    const handy = await trader(cloud, 'handy', '2026-11-17T10:00:00.000Z');
    cloud.deckFiles.set('A/Deck B', { text: '{"format":"solo-rpg-engine-deckplan","version":1,"plan":{"key":"q","design":"A","name":"Deck B","image":"data:image/png;base64,AA=="}}', revision: 'x2' });
    await handy.game.sync();
    await tick();
    expect(handy.game.snapshot().sync.error).toMatch(/Deckplan A\/Deck A/);
    expect(shown(handy.game).map(([name]) => name)).toEqual(['Deck B']);
  });
});
