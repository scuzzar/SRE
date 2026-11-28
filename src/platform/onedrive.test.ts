import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CloudChanged, CloudExpired, CloudOffline } from '../model';
import { InteractionRequiredAuthError, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser';
import { msalSession, oneDrive, type Msal, type Tokens } from './onedrive';
import { probeCloud } from './probe-cloud';
import { DexieCampaignRepository, MemoryCampaignRepository } from './repository';

const tokens: Tokens = { account: async () => 'kira@example.com', signIn: async () => {}, signOut: async () => {}, token: async () => 'geheim' };
const ROOT = 'https://graph.microsoft.com/v1.0/me/drive/special/approot';

interface Call {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

/** Ein nachgestelltes Microsoft Graph: beantwortet die Aufrufe der Reihe nach und merkt sie sich. */
function graph(...answers: (Response | Error)[]) {
  const calls: Call[] = [];
  const request: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers)), body: init?.body });
    const answer = answers.shift();
    if (!answer) throw new Error('unerwarteter Aufruf');
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { calls, cloud: oneDrive(tokens, request) };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('OneDrive über Microsoft Graph', () => {
  it('listet die Kampagnendateien des App-Ordners, auch über mehrere Seiten', async () => {
    const { calls, cloud } = graph(
      json({ value: [{ name: 'a.json', eTag: 'e1' }, { name: 'liesmich.txt', eTag: 'x' }], '@odata.nextLink': 'https://graph.microsoft.com/weiter' }),
      json({ value: [{ name: 'b.json', eTag: 'e2' }] }),
    );
    expect(await cloud.list()).toEqual([
      { key: 'a', revision: 'e1' },
      { key: 'b', revision: 'e2' },
    ]);
    expect(calls[0]).toMatchObject({ url: `${ROOT}/children?$select=name,eTag&$top=200`, headers: { authorization: 'Bearer geheim' } });
    expect(calls[1]!.url).toBe('https://graph.microsoft.com/weiter');
  });

  it('liest den Inhalt über die Download-Adresse, ohne Token', async () => {
    const { calls, cloud } = graph(json({ eTag: 'e1', '@microsoft.graph.downloadUrl': 'https://files.example/a' }), new Response('{"x":1}'));
    expect(await cloud.read('a')).toEqual({ text: '{"x":1}', revision: 'e1' });
    expect(calls[0]!.url).toBe(`${ROOT}:/a.json`);
    expect(calls[1]).toMatchObject({ url: 'https://files.example/a' });
    expect(calls[1]!.headers.authorization).toBeUndefined();
  });

  it('eine Datei, die es nicht gibt, ist undefined', async () => {
    expect(await graph(json({ error: { message: 'weg' } }, 404)).cloud.read('a')).toBeUndefined();
  });

  it('legt eine neue Datei nur an, wenn es sie noch nicht gibt', async () => {
    const { calls, cloud } = graph(json({ eTag: 'e1' }, 201), json({}, 409));
    expect(await cloud.write('a', 'inhalt')).toBe('e1');
    expect(calls[0]).toMatchObject({ url: `${ROOT}:/a.json:/content?@microsoft.graph.conflictBehavior=fail`, method: 'PUT', body: 'inhalt' });
    expect(calls[0]!.headers['if-match']).toBeUndefined();
    await expect(cloud.write('a', 'inhalt')).rejects.toBeInstanceOf(CloudChanged);
  });

  it('ersetzt und löscht nur gegen die erwartete Fassung', async () => {
    const { calls, cloud } = graph(json({ eTag: 'e2' }), json({}, 412), new Response(null, { status: 204 }), json({}, 412), json({}, 404));
    expect(await cloud.write('a', 'neu', 'e1')).toBe('e2');
    expect(calls[0]).toMatchObject({ url: `${ROOT}:/a.json:/content`, headers: { 'if-match': 'e1' } });
    await expect(cloud.write('a', 'neu', 'e1')).rejects.toBeInstanceOf(CloudChanged);
    await cloud.remove('a', 'e2');
    expect(calls[2]).toMatchObject({ url: `${ROOT}:/a.json`, method: 'DELETE', headers: { 'if-match': 'e2' } });
    await expect(cloud.remove('a', 'e2')).rejects.toBeInstanceOf(CloudChanged);
    // Schon weg ist auch gelöscht.
    await cloud.remove('a', 'e2');
  });

  it('Deckpläne: eigener Unterordner, ohne ihn keine; die Namen sagen Entwurf und Platz', async () => {
    const { calls, cloud } = graph(json({ error: { message: 'weg' } }, 404), json({ value: [{ name: 'S-Deck A.json', eTag: 'e1' }, { name: 'liesmich.txt', eTag: 'x' }, { name: 'A-Deck D.json', eTag: 'e2' }] }));
    expect(await cloud.listDeckPlans()).toEqual([]);
    expect(calls[0]!.url).toBe(`${ROOT}:/Deckplaene:/children?$select=name,eTag&$top=200`);
    expect(await cloud.listDeckPlans()).toEqual([
      { design: 'S', name: 'Deck A', revision: 'e1' },
      { design: 'A', name: 'Deck D', revision: 'e2' },
    ]);
  });

  it('Deckpläne: lesen, ersetzen und löschen gegen die Fassung, unter Entwurf und Platz', async () => {
    const { calls, cloud } = graph(json({ eTag: 'e1', '@microsoft.graph.downloadUrl': 'https://files.example/d' }), new Response('{"plan":1}'), json({ eTag: 'e2' }), json({}, 412), new Response(null, { status: 204 }));
    expect(await cloud.readDeckPlan('S', 'Deck A')).toEqual({ text: '{"plan":1}', revision: 'e1' });
    expect(calls[0]!.url).toBe(`${ROOT}:/Deckplaene/S-Deck%20A.json`);
    expect(await cloud.writeDeckPlan('S', 'Deck A', 'neu', 'e1')).toBe('e2');
    expect(calls[2]).toMatchObject({ url: `${ROOT}:/Deckplaene/S-Deck%20A.json:/content`, method: 'PUT', headers: { 'if-match': 'e1' } });
    await expect(cloud.writeDeckPlan('S', 'Deck A', 'neu', 'e1')).rejects.toBeInstanceOf(CloudChanged);
    await cloud.removeDeckPlan('S', 'Deck A', 'e2');
    expect(calls[4]).toMatchObject({ url: `${ROOT}:/Deckplaene/S-Deck%20A.json`, method: 'DELETE', headers: { 'if-match': 'e2' } });
  });

  it('Deckpläne: fehlt der Unterordner beim Schreiben, legt OneDrive ihn an und es geht noch einmal', async () => {
    const { calls, cloud } = graph(json({ error: { code: 'itemNotFound' } }, 404), json({ name: 'Deckplaene' }, 201), json({ eTag: 'e1' }, 201));
    expect(await cloud.writeDeckPlan('S', 'Deck A', 'bild')).toBe('e1');
    expect(calls[0]!.url).toBe(`${ROOT}:/Deckplaene/S-Deck%20A.json:/content?@microsoft.graph.conflictBehavior=fail`);
    expect(calls[1]).toMatchObject({ url: `${ROOT}/children`, method: 'POST' });
    expect(JSON.parse(String(calls[1]!.body))).toMatchObject({ name: 'Deckplaene', folder: {} });
    expect(calls[2]!.url).toBe(calls[0]!.url);
  });

  it('unterscheidet kein Netz, abgelaufene Anmeldung und andere Fehler', async () => {
    await expect(graph(new TypeError('Failed to fetch')).cloud.list()).rejects.toBeInstanceOf(CloudOffline);
    await expect(graph(json({}, 401)).cloud.list()).rejects.toBeInstanceOf(CloudExpired);
    await expect(graph(json({ error: { message: 'Zu viele Anfragen' } }, 429)).cloud.list()).rejects.toThrow('429 Zu viele Anfragen');
  });
});

/** Ein nachgestelltes MSAL: ein bekanntes Konto; das stille Erneuern klappt oder verlangt eine Anmeldung. */
function msal(silent: 'ok' | 'interaction', known = true) {
  const account = { username: 'kira@example.com' } as AccountInfo;
  const redirects: { kind: string; request: Record<string, unknown> }[] = [];
  const app = {
    getAllAccounts: () => (known ? [account] : []),
    loginRedirect: async (request?: object) => void redirects.push({ kind: 'login', request: { ...request } }),
    acquireTokenRedirect: async (request: object) => void redirects.push({ kind: 'token', request: { ...request } }),
    acquireTokenSilent: async () => {
      if (silent === 'interaction') throw new InteractionRequiredAuthError('interaction_required');
      return { accessToken: 'frisch' } as AuthenticationResult;
    },
    clearCache: async () => {},
  } as unknown as Msal;
  const data = new Map<string, string>();
  const memo = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
  return { app, redirects, memo, data };
}
const pending = (promise: Promise<unknown>) => Promise.race([promise.then(() => 'fertig'), new Promise((r) => setTimeout(() => r('wartet'), 10))]);

describe('Anmeldung über MSAL', () => {
  it('ist das Token abgelaufen, erneuert der erste Abgleich nach dem Start es unsichtbar über eine Umleitung', async () => {
    const { app, redirects, memo } = msal('interaction');
    const tokens = msalSession(app, null, memo);
    expect(await pending(tokens.token())).toBe('wartet');
    expect(redirects).toEqual([{ kind: 'token', request: expect.objectContaining({ prompt: 'none' }) }]);
  });

  it('kommt die unsichtbare Erneuerung ohne Anmeldung zurück, gilt sie als abgelaufen, ohne zweite Umleitung', async () => {
    const { app, redirects, memo } = msal('interaction');
    await pending(msalSession(app, null, memo).token());
    const afterReturn = msalSession(app, null, memo);
    await expect(afterReturn.token()).rejects.toBeInstanceOf(CloudExpired);
    expect(redirects).toHaveLength(1);
  });

  it('mitten im Spiel verlässt die App die Seite nie: nur der erste Abgleich darf umleiten', async () => {
    const { app, redirects, memo } = msal('interaction');
    const tokens = msalSession(app, null, memo);
    memo.setItem('sre-onedrive-erneuert', '1');
    await expect(tokens.token()).rejects.toBeInstanceOf(CloudExpired);
    memo.removeItem('sre-onedrive-erneuert');
    await expect(tokens.token()).rejects.toBeInstanceOf(CloudExpired);
    expect(redirects).toEqual([]);
  });

  it('nach einer geglückten Anmeldung darf die nächste Sitzung wieder unsichtbar erneuern', async () => {
    const { app, memo, data } = msal('ok');
    memo.setItem('sre-onedrive-erneuert', '1');
    msalSession(app, { account: { username: 'kira@example.com' } } as AuthenticationResult, memo);
    expect(data.size).toBe(0);
    expect(await msalSession(app, null, memo).token()).toBe('frisch');
  });

  it('„Neu anmelden“ nimmt das bekannte Konto ohne Kontowahl; ohne Konto gibt es die Kontowahl', async () => {
    const known = msal('ok');
    await msalSession(known.app, null, known.memo).signIn();
    expect(known.redirects[0]!.request).toMatchObject({ loginHint: 'kira@example.com' });
    expect(known.redirects[0]!.request.prompt).toBeUndefined();
    const fresh = msal('ok', false);
    await msalSession(fresh.app, null, fresh.memo).signIn();
    expect(fresh.redirects[0]!.request).toMatchObject({ prompt: 'select_account' });
  });
});

describe('Probe-Wolke', () => {
  it('verhält sich wie die Wolke: Fassungen, anlegen nur wenn neu, löschen nur gegen die Fassung', async () => {
    const data = new Map<string, string>();
    const cloud = probeCloud({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
    expect(await cloud.account()).toBeUndefined();
    await cloud.signIn();
    expect(await cloud.account()).toBe('Probe-Wolke');
    const first = await cloud.write('a', 'eins');
    await expect(cloud.write('a', 'zwei')).rejects.toBeInstanceOf(CloudChanged);
    const second = await cloud.write('a', 'zwei', first);
    expect(await cloud.list()).toEqual([{ key: 'a', revision: second }]);
    expect(await cloud.read('a')).toEqual({ text: 'zwei', revision: second });
    await expect(cloud.remove('a', first)).rejects.toBeInstanceOf(CloudChanged);
    await cloud.remove('a', second);
    expect(await cloud.list()).toEqual([]);
    await cloud.signOut();
    expect(await cloud.account()).toBeUndefined();
  });

  it('hält Deckpläne getrennt von den Kampagnen, mit Fassungen wie dort', async () => {
    const data = new Map<string, string>();
    const cloud = probeCloud({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) });
    const first = await cloud.writeDeckPlan('S', 'Deck A', 'bild');
    await expect(cloud.writeDeckPlan('S', 'Deck A', 'bild')).rejects.toBeInstanceOf(CloudChanged);
    expect(await cloud.list()).toEqual([]);
    expect(await cloud.listDeckPlans()).toEqual([{ design: 'S', name: 'Deck A', revision: first }]);
    expect(await cloud.readDeckPlan('S', 'Deck A')).toEqual({ text: 'bild', revision: first });
    await cloud.removeDeckPlan('S', 'Deck A', first);
    expect(await cloud.listDeckPlans()).toEqual([]);
  });
});

describe.each([
  ['Dexie', () => new DexieCampaignRepository(`test-${Math.random()}`).open()],
  ['Arbeitsspeicher', async () => new MemoryCampaignRepository()],
])('Abgleichsmarken im Speicher (%s)', (_name, open) => {
  it('merkt sich je Schlüssel eine Marke, ersetzt, entfernt und leert', async () => {
    const repository = await open();
    expect(await repository.loadMarks()).toEqual([]);
    await repository.saveMark({ key: 'a', changedAt: '2026-11-13T10:00:00.000Z', revision: 'e1' });
    await repository.saveMark({ key: 'b', changedAt: '2026-11-13T10:00:00.000Z', revision: 'e1' });
    await repository.saveMark({ key: 'a', changedAt: '2026-11-13T11:00:00.000Z', revision: 'e2', deleted: true });
    expect([...(await repository.loadMarks())].sort((x, y) => x.key.localeCompare(y.key))).toEqual([
      { key: 'a', changedAt: '2026-11-13T11:00:00.000Z', revision: 'e2', deleted: true },
      { key: 'b', changedAt: '2026-11-13T10:00:00.000Z', revision: 'e1' },
    ]);
    await repository.removeMark('a');
    expect(await repository.loadMarks()).toHaveLength(1);
    await repository.clearMarks();
    expect(await repository.loadMarks()).toEqual([]);
  });
});

describe.each([
  ['Dexie', () => new DexieCampaignRepository(`test-${Math.random()}`).open()],
  ['Arbeitsspeicher', async () => new MemoryCampaignRepository()],
])('Deckpläne und ihre Marken im Speicher (%s)', (_name, open) => {
  it('listet alle Pläne aller Entwürfe; je Platz eine Marke, ersetzt, entfernt und geleert', async () => {
    const repository = await open();
    await repository.saveDeckPlan({ key: 'p1', design: 'S', name: 'Deck A', image: 'data:image/png;base64,AA==' });
    await repository.saveDeckPlan({ key: 'p2', design: 'A', name: 'Deck A', image: 'data:image/png;base64,AA==' });
    expect((await repository.listDeckPlans()).map((p) => p.key).sort()).toEqual(['p1', 'p2']);
    expect(await repository.loadDeckMarks()).toEqual([]);
    await repository.saveDeckMark({ design: 'S', name: 'Deck A', key: 'p1', revision: 'e1' });
    await repository.saveDeckMark({ design: 'S', name: 'Deck A', key: 'p1', revision: 'e2' });
    await repository.saveDeckMark({ design: 'A', name: 'Deck A', key: 'p2', revision: 'e1' });
    expect(await repository.loadDeckMarks()).toHaveLength(2);
    await repository.removeDeckMark('S', 'Deck A');
    expect(await repository.loadDeckMarks()).toEqual([{ design: 'A', name: 'Deck A', key: 'p2', revision: 'e1' }]);
    await repository.clearDeckMarks();
    expect(await repository.loadDeckMarks()).toEqual([]);
  });
});

describe('Deckpläne von vor dem Abgleich', () => {
  it('bekommen beim Öffnen des Speichers einen Schlüssel', async () => {
    const name = `test-${Math.random()}`;
    const old = new Dexie(name);
    old.version(1).stores({ campaigns: 'key' });
    old.version(2).stores({ campaigns: 'key', settings: 'key' });
    old.version(3).stores({ campaigns: 'key', settings: 'key', marks: 'key' });
    old.version(4).stores({ deckPlans: '[design+name], design' });
    await old.open();
    await old.table('deckPlans').put({ design: 'S', name: 'Deck A', image: 'data:image/png;base64,AA==' });
    old.close();
    const repository = await new DexieCampaignRepository(name).open();
    const [plan] = await repository.listDeckPlans();
    expect(plan!.key).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('cryptoKeys', () => {
  it('gibt UUIDs der Version 4, auch ohne crypto.randomUUID', async () => {
    const { cryptoKeys } = await import('./keys');
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(cryptoKeys.next()).toMatch(uuid);
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const keys = new Set(Array.from({ length: 50 }, () => cryptoKeys.next()));
      expect(keys.size).toBe(50);
      for (const key of keys) expect(key).toMatch(uuid);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
