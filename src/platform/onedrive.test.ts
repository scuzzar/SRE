import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CloudChanged, CloudExpired, CloudOffline } from '../model';
import { oneDrive, type Tokens } from './onedrive';
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

  it('unterscheidet kein Netz, abgelaufene Anmeldung und andere Fehler', async () => {
    await expect(graph(new TypeError('Failed to fetch')).cloud.list()).rejects.toBeInstanceOf(CloudOffline);
    await expect(graph(json({}, 401)).cloud.list()).rejects.toBeInstanceOf(CloudExpired);
    await expect(graph(json({ error: { message: 'Zu viele Anfragen' } }, 429)).cloud.list()).rejects.toThrow('429 Zu viele Anfragen');
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
