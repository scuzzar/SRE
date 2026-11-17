import { BrowserAuthError, InteractionRequiredAuthError, PublicClientApplication, type AccountInfo } from '@azure/msal-browser';
import { CloudChanged, CloudExpired, CloudOffline, type Cloud, type CloudFile, type DeckFile } from '../model';

/** Die App darf nur ihren eigenen Ordner lesen und schreiben (`Apps/<Name der Registrierung>`). */
const SCOPES = ['Files.ReadWrite.AppFolder'];
const APP_FOLDER = 'https://graph.microsoft.com/v1.0/me/drive/special/approot';

/** Die Anmeldung: wer angemeldet ist, und ein Zugangstoken für Microsoft Graph. */
export interface Tokens {
  account(): Promise<string | undefined>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Ein gültiges Token; `CloudExpired`, wenn sich der Spieler neu anmelden muss. */
  token(): Promise<string>;
}

/**
 * Die Anmeldung bei Microsoft über MSAL, mit Umleitung: Die App verlässt die Seite und kommt
 * angemeldet zurück. Das Token erneuert MSAL still; geht das nicht mehr, ist die Anmeldung abgelaufen.
 */
export async function msalTokens(clientId: string, authority: string, redirectUri: string): Promise<Tokens> {
  const app = new PublicClientApplication({ auth: { clientId, authority, redirectUri }, cache: { cacheLocation: 'localStorage' } });
  await app.initialize();
  // Kommt die Seite gerade von der Anmeldung zurück, steht die Antwort in der Adresse.
  const back = await app.handleRedirectPromise().catch(() => null);
  const current = (): AccountInfo | undefined => back?.account ?? app.getAllAccounts()[0];
  return {
    async account() {
      const account = current();
      return account && (account.username || account.name || 'angemeldet');
    },
    async signIn() {
      await app.loginRedirect({ scopes: SCOPES, prompt: 'select_account' });
    },
    async signOut() {
      // Nur hier abmelden: Die Anmeldung bei Microsoft im Browser bleibt.
      await app.clearCache({ account: current() ?? null });
    },
    async token() {
      const account = current();
      if (!account) throw new CloudExpired('Niemand ist angemeldet.');
      try {
        return (await app.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) throw new CloudExpired(error.message);
        if (error instanceof BrowserAuthError && ['no_network_connectivity', 'post_request_failed', 'get_request_failed'].includes(error.errorCode)) throw new CloudOffline(error.message);
        throw error;
      }
    },
  };
}

interface DriveItem {
  readonly name?: string;
  readonly eTag?: string;
  readonly '@microsoft.graph.downloadUrl'?: string;
}

/** Der Dateiname einer Kampagne im App-Ordner: ihr Schlüssel. */
const fileName = (key: string): string => `${encodeURIComponent(key)}.json`;

/** Der Unterordner der Deckpläne (2026-11-17); die Liste der Kampagnen im App-Ordner sieht ihn nicht. */
const DECK_FOLDER = 'Deckplaene';
/** Der Pfad einer Deckplan-Datei im App-Ordner: nach Entwurf und Platz, z. B. `Deckplaene/S-Deck%20A.json`. */
const deckPath = (design: string, name: string): string => `${DECK_FOLDER}/${encodeURIComponent(`${design}-${name}`)}.json`;
/** Entwurf und Platz aus dem Namen einer Deckplan-Datei. */
const deckNamePattern = /^(.+)-(Deck [A-Z])\.json$/;

/**
 * OneDrive über Microsoft Graph: je Kampagne eine Datei `<key>.json` im App-Ordner. Die Fassung
 * einer Datei ist ihr eTag; geschrieben und gelöscht wird nur gegen die erwartete Fassung.
 */
export function oneDrive(tokens: Tokens, request: typeof fetch = (input, init) => fetch(input, init)): Cloud {
  /** Ein Aufruf bei Graph mit Token. Kein Netz heißt `CloudOffline`, 401 heißt `CloudExpired`. */
  async function graph(url: string, init: RequestInit = {}, anonymous = false): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!anonymous) headers.set('Authorization', `Bearer ${await tokens.token()}`);
    let response: Response;
    try {
      response = await request(url, { ...init, headers });
    } catch (error) {
      throw new CloudOffline(String(error));
    }
    if (response.status === 401) throw new CloudExpired('OneDrive nimmt die Anmeldung nicht mehr an.');
    return response;
  }

  async function failed(response: Response, what: string): Promise<Error> {
    const text = await response.text().catch(() => '');
    let message = text.slice(0, 200);
    try {
      message = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? message;
    } catch {
      // Keine JSON-Antwort: der Text, wie er ist.
    }
    return new Error(`${what}: ${response.status} ${message}`.trim());
  }

  const revisionOf = (item: DriveItem, what: string): string => {
    if (!item.eTag) throw new Error(`${what}: OneDrive nennt keine Fassung.`);
    return item.eTag;
  };

  /** Liest eine Datei unter `path` samt Fassung; `undefined`, wenn es sie nicht gibt. */
  async function readFile(path: string, what: string): Promise<{ text: string; revision: string } | undefined> {
    const response = await graph(`${APP_FOLDER}:/${path}`);
    if (response.status === 404) return undefined;
    if (!response.ok) throw await failed(response, `${what} ließ sich in OneDrive nicht finden`);
    const item = (await response.json()) as DriveItem;
    const url = item['@microsoft.graph.downloadUrl'];
    if (!url) throw new Error('OneDrive nennt keine Adresse für den Inhalt der Datei.');
    // Die Adresse ist schon berechtigt; mit Token weist OneDrive den Aufruf aus dem Browser ab.
    const content = await graph(url, {}, true);
    if (!content.ok) throw await failed(content, `${what} ließ sich nicht aus OneDrive laden`);
    return { text: await content.text(), revision: revisionOf(item, 'Laden') };
  }

  /** Schreibt eine Datei unter `path`: mit Fassung nur gegen sie, ohne nur, wenn es sie noch nicht gibt. */
  async function writeFile(path: string, text: string, revision: string | undefined, what: string): Promise<Response> {
    const url = `${APP_FOLDER}:/${path}:/content${revision === undefined ? '?@microsoft.graph.conflictBehavior=fail' : ''}`;
    const response = await graph(url, { method: 'PUT', body: text, headers: { 'Content-Type': 'text/plain', ...(revision === undefined ? {} : { 'If-Match': revision }) } });
    if (response.status === 412 || response.status === 409) throw new CloudChanged();
    if (!response.ok && response.status !== 404) throw await failed(response, `${what} ließ sich nicht in OneDrive speichern`);
    return response;
  }

  /** Löscht eine Datei unter `path`, wenn sie noch diese Fassung hat. */
  async function removeFile(path: string, revision: string, what: string): Promise<void> {
    const response = await graph(`${APP_FOLDER}:/${path}`, { method: 'DELETE', headers: { 'If-Match': revision } });
    if (response.status === 412) throw new CloudChanged();
    if (!response.ok && response.status !== 404) throw await failed(response, `${what} ließ sich in OneDrive nicht löschen`);
  }

  return {
    account: () => tokens.account(),
    signIn: () => tokens.signIn(),
    signOut: () => tokens.signOut(),

    async list() {
      const files: CloudFile[] = [];
      let url: string | undefined = `${APP_FOLDER}/children?$select=name,eTag&$top=200`;
      while (url) {
        const response = await graph(url);
        if (!response.ok) throw await failed(response, 'Die Kampagnen in OneDrive ließen sich nicht auflisten');
        const page = (await response.json()) as { value?: DriveItem[]; '@odata.nextLink'?: string };
        for (const item of page.value ?? []) {
          const match = /^(.+)\.json$/.exec(item.name ?? '');
          if (match && item.eTag) files.push({ key: decodeURIComponent(match[1]!), revision: item.eTag });
        }
        url = page['@odata.nextLink'];
      }
      return files;
    },

    read: (key) => readFile(fileName(key), 'Die Kampagne'),

    async write(key, text, revision) {
      const response = await writeFile(fileName(key), text, revision, 'Die Kampagne');
      if (!response.ok) throw await failed(response, 'Die Kampagne ließ sich nicht in OneDrive speichern');
      return revisionOf((await response.json()) as DriveItem, 'Speichern');
    },

    remove: (key, revision) => removeFile(fileName(key), revision, 'Die Kampagne'),

    async listDeckPlans() {
      const files: DeckFile[] = [];
      let url: string | undefined = `${APP_FOLDER}:/${DECK_FOLDER}:/children?$select=name,eTag&$top=200`;
      while (url) {
        const response = await graph(url);
        // Ohne Unterordner gibt es noch keinen Deckplan in OneDrive.
        if (response.status === 404) return [];
        if (!response.ok) throw await failed(response, 'Die Deckpläne in OneDrive ließen sich nicht auflisten');
        const page = (await response.json()) as { value?: DriveItem[]; '@odata.nextLink'?: string };
        for (const item of page.value ?? []) {
          const match = deckNamePattern.exec(decodeURIComponent(item.name ?? ''));
          if (match && item.eTag) files.push({ design: match[1]!, name: match[2]!, revision: item.eTag });
        }
        url = page['@odata.nextLink'];
      }
      return files;
    },

    readDeckPlan: (design, name) => readFile(deckPath(design, name), 'Der Deckplan'),

    async writeDeckPlan(design, name, text, revision) {
      let response = await writeFile(deckPath(design, name), text, revision, 'Der Deckplan');
      if (response.status === 404) {
        // Den Unterordner gibt es noch nicht: anlegen (gibt es ihn inzwischen, ist es auch gut) und noch einmal.
        const folder = await graph(`${APP_FOLDER}/children`, { method: 'POST', body: JSON.stringify({ name: DECK_FOLDER, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }), headers: { 'Content-Type': 'application/json' } });
        if (!folder.ok && folder.status !== 409) throw await failed(folder, 'Der Ordner für die Deckpläne ließ sich in OneDrive nicht anlegen');
        response = await writeFile(deckPath(design, name), text, revision, 'Der Deckplan');
      }
      if (!response.ok) throw await failed(response, 'Der Deckplan ließ sich nicht in OneDrive speichern');
      return revisionOf((await response.json()) as DriveItem, 'Speichern');
    },

    removeDeckPlan: (design, name, revision) => removeFile(deckPath(design, name), revision, 'Der Deckplan'),
  };
}

/** OneDrive mit der Anmeldung über MSAL, fertig verdrahtet. */
export async function openOneDrive(clientId: string, authority: string, redirectUri: string): Promise<Cloud> {
  return oneDrive(await msalTokens(clientId, authority, redirectUri));
}
