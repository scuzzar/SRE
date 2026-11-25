import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FARBTAFEL, mitDeckkraft } from './farbtafel';

// Der Canvas kennt keine Variablen: was er malt, steht in `farbtafel.ts`. Damit die Tafel nicht
// leise von `styles.css` abrutscht, rechnet dieser Test jeden Eintrag gegen `:root` – derselbe Name
// (nur ohne Gedankenstriche) muss denselben Wert haben. Einträge ohne Gegenstück im Stylesheet sind
// Zeichen, die nur der Canvas kennt, und dürfen das bleiben.

/** Die Farben, die `styles.css` in `:root` führt. Ohne `:root` ist die Tafel leer – der Zähltest darunter meldet das. */
function wurzelFarben(): Map<string, string> {
  const quelltext = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
  const [, inhalt = ''] = quelltext.match(/:root\s*\{([\s\S]*?)\n\}/) ?? [];
  const farben = new Map<string, string>();
  for (const fund of inhalt.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    const [, name = '', wert = ''] = fund;
    farben.set(name, wert.toLowerCase());
  }
  return farben;
}

/** `--welt-kontur-weich` heißt in der Tafel `weltKonturWeich`. */
function tafename(cssName: string): string {
  return cssName.replace(/^--/, '').replace(/-([a-z0-9])/g, (_, buchstabe: string) => buchstabe.toUpperCase());
}

describe('Die Farbtafel des Canvas', () => {
  const imStylesheet = wurzelFarben();

  it('steht in `#rrggbb` da, damit `mitDeckkraft` sie zerlegen kann', () => {
    for (const [name, wert] of Object.entries(FARBTAFEL)) {
      expect(wert, `FARBTAFEL.${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('hat in `styles.css` genug Gegenstücke, damit der Vergleich etwas prüft', () => {
    // Gezählt werden nur die hex-Farben in `:root`; Deckkraftstufen als `rgba(…)` vergleicht die Tafel nicht.
    expect(imStylesheet.size).toBeGreaterThan(70);
    const mitGegenstueck = Object.keys(FARBTAFEL).filter((name) => imStylesheet.has(`--${name.replace(/[A-Z]/g, (b) => `-${b.toLowerCase()}`)}`));
    expect(mitGegenstueck.length).toBeGreaterThanOrEqual(15);
  });

  it('führt jede Farbe, die es im Stylesheet gibt, mit demselben Wert', () => {
    for (const [cssName, wert] of imStylesheet) {
      const name = tafename(cssName);
      if (!(name in FARBTAFEL)) continue;
      expect(FARBTAFEL[name as keyof typeof FARBTAFEL], `${cssName} gegen FARBTAFEL.${name}`).toBe(wert);
    }
  });

  it('rechnet eine Grundfarbe zur Deckkraftstufe, ohne den Ton zu ändern', () => {
    expect(mitDeckkraft(FARBTAFEL.weltGlobus, 0.35)).toBe('rgba(79,209,255,0.35)');
    expect(mitDeckkraft(FARBTAFEL.shadowSolid, 0.75)).toBe('rgba(0,0,0,0.75)');
    expect(mitDeckkraft(FARBTAFEL.onFill, 1)).toBe('rgba(255,255,255,1)');
  });
});
