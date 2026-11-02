/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Schreibt nach dem Build dist/sw.js aus src/service-worker.js: mit der Liste aller Dateien im
// Build zum Ablegen und einer Version aus ihrem Inhalt. Neue Dateien heißen neue Version.
function serviceWorker(): Plugin {
  let root = '.';
  let outDir = 'dist';
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    async writeBundle() {
      const files = (await readdir(outDir, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).split(sep).join('/'))
        .filter((file) => file !== 'sw.js' && !file.endsWith('.map'))
        .sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(await readFile(join(outDir, file)));
      const version = hash.digest('hex').slice(0, 12);

      const template = await readFile(resolve(root, 'src/service-worker.js'), 'utf8');
      if (!template.includes('__PRECACHE__') || !template.includes('__VERSION__')) {
        throw new Error('src/service-worker.js braucht __PRECACHE__ und __VERSION__.');
      }
      const code = template
        .replace('__PRECACHE__', JSON.stringify(['./', ...files]))
        .replace('__VERSION__', JSON.stringify(version));
      await writeFile(join(outDir, 'sw.js'), code);
    },
  };
}

// `--mode single` baut die App als eine einzige HTML-Datei (dist-single/index.html),
// zum Ansehen ohne Server, ohne Service Worker. Der normale Build (dist/) ist für GitHub Pages.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), serviceWorker()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
}));
