import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';

// Die Schichten aus ARCHITECTURE.md, Regel 1: Imports zeigen nur nach unten.
// Je Zeile der Tabelle eine Zone: `target` sind die Dateien der Schicht, `from` was sie nicht importieren darf.
const layers = {
  data: './src/data',
  model: './src/model',
  draft: './src/model/draft',
  platform: './src/platform',
  controller: './src/controller',
  view: './src/view',
  main: './src/main.tsx',
};

const zones = [
  {
    target: layers.data,
    from: [layers.model, layers.platform, layers.controller, layers.view, layers.main],
    message: 'data/ ist die unterste Schicht und importiert nichts aus der App.',
  },
  {
    target: layers.model,
    from: [layers.platform, layers.controller, layers.view, layers.main],
    message: 'model/ (mit draft/) darf nur aus data/ und model/ importieren.',
  },
  {
    // Alles in model/ außer draft/
    target: ['./src/model/*', './src/model/!(draft)/**'],
    from: [layers.draft],
    message: 'Der gespeicherte Stand weiß nichts von seinen Entwürfen: model/ importiert nicht aus model/draft/.',
  },
  {
    target: layers.platform,
    from: [layers.data, layers.draft, layers.controller, layers.view, layers.main],
    message: 'platform/ darf nur aus model/ ohne draft/ importieren.',
  },
  {
    target: layers.controller,
    from: [layers.data, layers.platform, layers.view, layers.main],
    message: 'controller/ darf nur aus model/ (mit draft/) importieren.',
  },
  {
    target: layers.view,
    from: [layers.data, layers.platform, layers.main],
    message: 'view/ darf nur aus controller/ und (nur Typen) aus model/ importieren.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'dist-single', 'node_modules', 'playwright-report', 'test-results', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' }, node: true },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'import/no-restricted-paths': ['error', { zones }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Regel 1 und 2: Die View sieht das Model nur über Typen; Werte und Abläufe kommen vom Controller.
    files: ['src/view/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/model', '**/model/**'],
              allowTypeImports: true,
              message: 'Die View importiert aus model/ nur Typen (import type).',
            },
          ],
        },
      ],
    },
  },
);
