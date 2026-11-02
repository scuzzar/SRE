// Reine Darstellung: Wie man die App auf diesem Gerät installiert. Der Controller entscheidet damit nichts.

/** Das Ereignis, mit dem Chrome und Edge das Installieren anbieten (nicht in den DOM-Typen). */
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

let offer: InstallPrompt | undefined;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listener) => listener());

// Chrome schickt das Angebot nur einmal, früh beim Laden; deshalb hört dieses Modul gleich beim Import zu.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    offer = event as InstallPrompt;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    offer = undefined;
    changed();
  });
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ob der Browser hier einen Knopf „App installieren“ erlaubt. */
export function canPromptInstall(): boolean {
  return offer !== undefined;
}

/** Zeigt den Dialog des Browsers zum Installieren. */
export async function promptInstall(): Promise<void> {
  const current = offer;
  if (!current) return;
  offer = undefined;
  changed();
  await current.prompt().catch(() => undefined);
}

function iOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPads melden sich wie ein Mac, haben aber einen Touchscreen.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function standalone(): boolean {
  const legacy = (navigator as Navigator & { readonly standalone?: boolean }).standalone === true;
  return legacy || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
}

/**
 * Wie es hier ums Installieren steht: schon installiert (auf dem iPhone mit eigenem Speicher), auf
 * dem iPhone noch nicht, als lokal geöffnete Datei gar nicht, sonst über das Menü des Browsers.
 */
export function installKind(): 'installed' | 'installed-ios' | 'ios' | 'file' | 'browser' {
  if (typeof location !== 'undefined' && location.protocol === 'file:') return 'file';
  if (standalone()) return iOS() ? 'installed-ios' : 'installed';
  return iOS() ? 'ios' : 'browser';
}
