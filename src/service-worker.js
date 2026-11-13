// Service Worker: legt die App im Browser ab, damit sie installiert auch ohne Netz startet.
// Er läuft in einem eigenen Kontext neben der App und importiert nichts aus ihr; die Spielstände
// liegen weiter in IndexedDB, hier liegen nur die Dateien der App.
//
// Der Build (Plugin `serviceWorker` in vite.config.ts) setzt die Dateiliste und die Version ein.
// Ändert sich eine Datei, ändert sich die Version, der Browser installiert den neuen Worker, und
// der alte Ablageort wird gelöscht.

const PRECACHE = __PRECACHE__;
const VERSION = __VERSION__;

const APP_CACHE = `app-${VERSION}`;
const FONT_CACHE = 'fonts';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
// So lange wartet der Start auf eine neue Version, dann nimmt er die abgelegte (schlechtes Netz).
const NAVIGATION_TIMEOUT_MS = 3000;

// Abgelegt wird an der Ablage des Browsers vorbei (`reload`): GitHub Pages erlaubt, Dateien zehn
// Minuten zwischenzuspeichern, und eine alte index.html passt nicht zu den Skripten der neuen Version.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('app-') && key !== APP_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigation(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Start der App: neue Version aus dem Netz, wenn es schnell genug antwortet, sonst die abgelegte.
// `no-cache` fragt immer beim Server nach: Eine alte index.html aus der Ablage des Browsers verwiese
// auf Skripte, die es nach einem Update nicht mehr gibt, und die App bliebe weiß.
async function navigation(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await withTimeout(fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }), NAVIGATION_TIMEOUT_MS);
    if (response.ok) await cache.put('./', response.clone());
    return response;
  } catch {
    const cached = (await cache.match('./', { ignoreVary: true })) ?? (await cache.match('index.html', { ignoreVary: true }));
    if (cached) return cached;
    return fetch(request);
  }
}

// Dateien der App tragen einen Hash im Namen und ändern sich nie: erst die Ablage, dann das Netz.
// `ignoreVary`: Der Browser lädt Skripte mit anderen Kopfzeilen, als `addAll` sie abgelegt hat.
async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// Schriften: sofort die abgelegte, im Hintergrund auffrischen; ohne Netz greift die Ersatzschrift.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached ?? (await fresh) ?? Response.error();
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Zeitüberschreitung')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
