#!/usr/bin/env node
// Erzeugt die Ausschnitte des Domänenmodells: je Bereich einen (docs/views/) und je offener
// Änderung einen (docs/changes/). Ein Ausschnitt ist ein gefilterter Auszug aus
// domain-model.puml: die Klassen im Fokus vollständig, ihre Nachbarn zugeklappt, und nur die
// Pfeile, die eine Klasse im Fokus berühren. Kopf, Farben, Markierungen und Legende werden
// unverändert übernommen. Nichts wird nachgezeichnet; der Auszug entsteht bei jedem Rendern neu.
//
//   node views.mjs [docs]      schreibt die Ausschnitte und gibt die Dateien zum Rendern aus
//
// Die Bereiche und Änderungen stehen in <docs>/model-views.json. Jede Klasse im Modell trägt genau
// einen Bereich als Tag (`class Encounter $begegnung {`). Offene Änderungen sind im Modell mit
// $new, $gone, $newClass und $newArrow markiert (siehe Kopf von domain-model.puml).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const docs = process.argv[2] ?? 'docs';
const source = readFileSync(join(docs, 'domain-model.puml'), 'utf8');
const config = JSON.parse(readFileSync(join(docs, 'model-views.json'), 'utf8'));
const areaIds = new Set(config.views.map((v) => v.id));
const changeIds = new Set(config.changes.map((c) => c.id));

const declaration = /^\s*(?:abstract\s+class|class|enum)\s+(\w+)(.*)$/;
const relation = /^\s*([A-Z]\w*)\s+(?:"[^"]*"\s+)?(\S*[-.]\S*)\s+(?:"[^"]*"\s+)?([A-Z]\w*)\s*(?::.*)?$/;
const marker = /\$(new|gone|newClass|newArrow)\(\s*"([^"]+)"/g;

// Die Quelle in Stücke: Klassen (mit ihrem Block), Pfeile und alles andere.
const parts = [];
const classes = new Map();
const errors = [];
let open;
for (const [index, line] of source.split('\n').entries()) {
  const text = line.trimStart();
  if (open) {
    open.lines.push(line);
    if (text.trim() === '}') open = undefined;
    else for (const m of line.matchAll(marker)) open.changes.add(m[2]);
    continue;
  }
  const decl = !text.startsWith("'") && !text.startsWith('!') ? line.match(declaration) : null;
  if (decl) {
    const [, name, rest] = decl;
    const areas = [...rest.matchAll(/\$([A-Za-z_]\w*)(?!\s*\()/g)].map((m) => m[1]).filter((t) => areaIds.has(t));
    if (areas.length !== 1) errors.push(`Zeile ${index + 1}: ${name} braucht genau einen Bereich (${[...areaIds].join(', ')}), hat ${areas.join(', ') || 'keinen'}.`);
    const part = { kind: 'class', name, area: areas[0], lines: [line], changes: new Set(), newClass: new Set([...rest.matchAll(marker)].map((m) => m[2])) };
    classes.set(name, part);
    parts.push(part);
    if (rest.trimEnd().endsWith('{')) open = part;
    continue;
  }
  const rel = !text.startsWith("'") && !text.startsWith('!') ? line.match(relation) : null;
  if (rel) {
    parts.push({ kind: 'relation', from: rel[1], to: rel[3], hidden: rel[2].includes('hidden'), line, changes: new Set([...rel[2].matchAll(marker)].map((m) => m[2])) });
    continue;
  }
  parts.push({ kind: 'other', line });
}
const relations = parts.filter((p) => p.kind === 'relation');
for (const r of relations) for (const end of [r.from, r.to]) if (!classes.has(end)) errors.push(`Pfeil ${r.from} → ${r.to}: ${end} gibt es nicht.`);

const marked = new Set([...[...classes.values()].flatMap((c) => [...c.changes, ...c.newClass]), ...relations.flatMap((r) => [...r.changes])]);
for (const id of marked) if (!changeIds.has(id)) errors.push(`Das Kennzeichen „${id}“ steht im Modell, aber nicht unter "changes" in model-views.json.`);
for (const change of config.changes) {
  if (change.approved && marked.has(change.id)) errors.push(`Die Änderung ${change.id} ist freigegeben, ihre Kennzeichen stehen aber noch im Modell.`);
  if (!change.approved && !marked.has(change.id)) errors.push(`Die offene Änderung ${change.id} markiert nichts im Modell.`);
  for (const name of change.show ?? []) if (!classes.has(name)) errors.push(`Änderung ${change.id}: ${name} unter "show" gibt es nicht.`);
}
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

/** Die Nachbarn der Klassen im Fokus; mit `near` nur die, die `near(Klasse, Nachbar)` zulässt. */
function neighborsOf(focus, near = () => true) {
  const around = new Set();
  for (const { from, to, hidden } of relations) {
    if (hidden) continue;
    if (focus.has(from) && !focus.has(to) && near(from, to)) around.add(to);
    if (focus.has(to) && !focus.has(from) && near(to, from)) around.add(from);
  }
  return around;
}

/** Ein Ausschnitt als PlantUML: Fokus voll, Nachbarn zugeklappt, Pfeile nur am Fokus, geänderte Klassen rot gerahmt. */
function view({ title, change, focus, neighbors, framed }) {
  const shown = (name) => focus.has(name) || neighbors.has(name);
  const out = [`' Erzeugt von .claude/skills/domain-model/scripts/views.mjs aus domain-model.puml; nicht von Hand ändern.`];
  for (const part of parts) {
    if (part.kind === 'other') {
      if (/^\s*title\s/.test(part.line)) out.push(`title ${title}`);
      else if (/^'/.test(part.line) && out.length < 3) continue; // Kopfkommentar der Quelle
      else {
        out.push(part.line);
        if (change && part.line.trim() === '@startuml') out.push(`!$change = "${change}"`);
      }
    } else if (part.kind === 'class') {
      if (focus.has(part.name)) out.push(...part.lines);
      else if (neighbors.has(part.name)) out.push(part.lines[0].replace(/\s*\{\s*$/, ''));
    } else if (part.hidden ? shown(part.from) && shown(part.to) : focus.has(part.from) || focus.has(part.to)) {
      if (shown(part.from) && shown(part.to)) out.push(part.line);
    }
  }
  const frames = [...framed].filter(shown).map((n) => `class ${n} #line:d0021b;line.bold`);
  out.splice(out.lastIndexOf('@enduml'), 0, ...frames);
  return out.join('\n');
}

const written = [];
function write(dir, file, text) {
  mkdirSync(join(docs, dir), { recursive: true });
  const path = join(docs, dir, `${file}.puml`);
  writeFileSync(path, text);
  written.push(path);
}

// Bereiche: rot ist alles, was noch offen ist.
const openChanged = new Set([...classes.values()].filter((c) => c.changes.size > 0).map((c) => c.name));
for (const { id, title } of config.views) {
  const focus = new Set([...classes.values()].filter((c) => c.area === id).map((c) => c.name));
  write('views', id, view({ title: `Ausschnitt: ${title}`, focus, neighbors: neighborsOf(focus), framed: openChanged }));
}

// Offene Änderungen: nur diese Änderung rot; im Fokus, was sie markiert, und die Enden ihrer Pfeile.
// Nachbarn nur aus dem eigenen Bereich, sonst bringt z. B. Campaign das halbe Modell mit; was
// darüber hinaus zu sehen sein soll, nennt "show" in model-views.json.
for (const change of config.changes.filter((c) => !c.approved)) {
  const changed = new Set([...classes.values()].filter((c) => c.changes.has(change.id)).map((c) => c.name));
  const focus = new Set([...classes.values()].filter((c) => c.changes.has(change.id) || c.newClass.has(change.id)).map((c) => c.name));
  for (const r of relations.filter((r) => r.changes.has(change.id))) focus.add(r.from).add(r.to);
  const neighbors = new Set([...neighborsOf(focus, (inside, outside) => classes.get(inside).area === classes.get(outside).area), ...(change.show ?? [])]);
  write('changes', change.file, view({ title: `Änderung ${change.id}: ${change.title}`, change: change.id, focus, neighbors, framed: changed }));
}

console.log(written.join('\n'));
