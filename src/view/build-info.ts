// Die Versionsnummer der App und woraus sie gebaut ist; Vite setzt die Werte beim Bauen
// (siehe vite.config.ts, `define`).

declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILT__: string;

/** Die Versionsnummer aus package.json, z. B. „0.2.0“. */
export const appVersion: string = __APP_VERSION__;
/** Der kurze Commit, aus dem gebaut wurde. */
export const appCommit: string = __APP_COMMIT__;
/** Der Tag des Builds als Datum, z. B. „28.11.2026“. */
export const appBuilt: string = __APP_BUILT__.split('-').reverse().join('.');

/** Die Zeile für Menü und „Über“: „Version 0.2.0 · 1a5b75e · 28.11.2026“. */
export const versionLine = `Version ${appVersion} · ${appCommit} · ${appBuilt}`;
