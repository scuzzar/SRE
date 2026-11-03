import type { CardItem, DmPart, LogItem, TaskItem } from '../controller';
import type { Characteristic, MapDirection, MapIcon, PathKind, Scatter } from '../model';

// Reine Darstellung: Schreibweisen, die keine Regel sind.

const hexDigits = '0123456789ABCDEFG';

/** Ein Attributwert in der Hex-Schreibweise der UPP (10 → A). */
export function hex(value: number): string {
  return hexDigits[value] ?? String(value);
}

/** Kürzel der Attribute, wie Classic Traveller sie schreibt. */
export const characteristicLabel: Record<Characteristic, string> = {
  STR: 'STR',
  DEX: 'DEX',
  END: 'END',
  INT: 'INT',
  EDU: 'EDU',
  SOC: 'SOC',
};

/** Was ein Feld gezogen hat, in einer Zeile: ein Begriff, beim Paar beide (verraten · Technologie). */
export function pairText(texts: readonly string[]): string {
  return texts.join(' · ');
}

/** Ein Name aus Vor- und Nachname, wie man ihn schreibt: „Vera Tan“. */
export function nameText(texts: readonly string[]): string {
  return texts.join(' ');
}

/** Was ein übernommenes Feld im Log zeigt: ein Name am Stück, sonst Begriff · Begriff. */
export function pickText(name: boolean, texts: readonly string[]): string {
  return name ? nameText(texts) : pairText(texts);
}

/** Der Streuwürfel in Worten: Richtung mit deutschen Kürzeln (Osten ist O), Volltreffer oder Fehlschlag. */
export const scatterText: Record<Scatter, string> = {
  n: 'N',
  ne: 'NO',
  e: 'O',
  se: 'SO',
  s: 'S',
  sw: 'SW',
  w: 'W',
  nw: 'NW',
  hit: 'Volltreffer',
  miss: 'Fehlschlag',
};

export const pathText: Record<PathKind, string> = {
  none: 'kein Weg',
  path: 'Weg',
  deadEnd: 'Sackgasse',
  hidden: 'verborgen',
  obstacle: 'Hindernis',
};

export const directionText: Record<MapDirection, string> = { north: 'N', east: 'O', south: 'S', west: 'W', up: 'oben', down: 'unten' };

/** In dieser Reihenfolge nennt die Anzeige die Richtungen. */
const directionOrder: readonly MapDirection[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/** Das Kartensymbol in Worten: jede Richtung mit Weg, z. B. „N Weg · O verborgen · unten Hindernis“. */
export function mapText(map: MapIcon): string {
  return directionOrder
    .filter((d) => map[d] !== 'none')
    .map((d) => `${directionText[d]} ${pathText[map[d]]}`)
    .join(' · ');
}

/** Das Kartensymbol ganz knapp: nur die Richtungen mit Weg, mit schmalem Abstand, z. B. „N O S ↓“. */
export function mapShort(map: MapIcon): string {
  const short: Record<MapDirection, string> = { north: 'N', east: 'O', south: 'S', west: 'W', up: '↑', down: '↓' };
  return directionOrder
    .filter((d) => map[d] !== 'none')
    .map((d) => short[d])
    .join('\u2009');
}

/** Eine Kartenauswahl in einer Zeile: Wurffelder, dann die Felder. */
export function cardPickText(item: CardItem): string {
  return [
    ...(item.bell === undefined ? [] : [`1–10: ${item.bell}`]),
    ...(item.scatter === undefined ? [] : [`Streuwürfel ${scatterText[item.scatter]}`]),
    ...(item.map === undefined ? [] : [`Kartensymbol ${mapText(item.map)}`]),
    ...item.items.map((i) => pickText(i.name, i.texts)),
  ].join(', ');
}

/** Ein DM mit Vorzeichen: +2, −1, ±0. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '±0';
}

/** Uhrzeit eines Logeintrags, in Ortszeit. */
export function clockTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function credits(amount: number): string {
  return `Cr ${amount.toLocaleString('de-DE')}`;
}

export function quoted(text: string): string {
  return `„${text}“`;
}

/** Eine Fertigkeit mit Stufe („Pilot-2“), ohne, wenn sie keine zeigt („JoT“). */
export function withLevel(name: string, level: number | undefined): string {
  return level === undefined ? name : `${name}-${level}`;
}

export function partLabel(part: DmPart): string {
  switch (part.kind) {
    case 'skill':
      return `${withLevel(part.name, part.level)} ${signed(part.dm)}`;
    case 'unskilled':
      return `ohne Fertigkeit ${signed(part.dm)}`;
    case 'characteristic':
      return `${characteristicLabel[part.characteristic]} ${hex(part.value)} ${signed(part.dm)}`;
  }
}

/** Die Fertigkeit einer Probe, wie sie im Titel steht: „Pilot-2“ oder „ohne Fertigkeit“. */
export function skillTitle(parts: readonly DmPart[]): string {
  const first = parts[0];
  if (first?.kind === 'skill') return withLevel(first.name, first.level);
  return 'ohne Fertigkeit';
}

/** Das Wichtigste einer Probe in Vorbereitung: die Fertigkeit ausgeschrieben und der Zielwert. */
export function taskHeadline(parts: readonly DmPart[], target: number): string {
  const skill = skillTitle(parts);
  return `${skill.charAt(0).toUpperCase()}${skill.slice(1)} · ${target}+`;
}

/** Die gewählten Attribute knapp, als Zusatz zum DM: „ (DEX +1, SOC −1)“, ohne Attribute leer. */
export function taskFigures(parts: readonly DmPart[]): string {
  const counted = parts.flatMap((p) => (p.kind === 'characteristic' ? [`${characteristicLabel[p.characteristic]} ${signed(p.dm)}`] : []));
  return counted.length > 0 ? ` (${counted.join(', ')})` : '';
}

export function taskTitle(item: TaskItem): string {
  return `${item.character} · ${skillTitle(item.parts)} · ${item.target}+`;
}

/** Ein Ergebnis in einer Zeile, für die Zeile über der Schreibzeile: Urteil, dann die Frage. */
export function resultLine(item: LogItem): { head: string; rest: string } {
  switch (item.kind) {
    case 'oracle':
      return { head: item.yes ? 'JA' : 'NEIN', rest: item.question ? quoted(item.question) : item.odds };
    case 'dice':
      return { head: `2W6: ${item.total}`, rest: `${item.dice[0]} + ${item.dice[1]}` };
    case 'card':
      return { head: 'Karte', rest: item.question ? quoted(item.question) : cardPickText(item) };
    case 'task':
      return { head: item.success ? 'ERFOLG' : 'FEHLSCHLAG', rest: taskTitle(item) };
    case 'note':
      return { head: item.interprets === undefined ? 'Notiz' : 'Deutung', rest: item.text };
  }
}

export function taskDetail(item: TaskItem): string {
  const [a, b] = item.dice;
  return `2W6: ${a} + ${b} = ${a + b}, DM ${signed(item.dm)} → ${item.total}`;
}

/** Was auf 2W6 nötig ist, in Worten. */
export function needText(need: number, chance: number): string {
  if (chance >= 100) return 'Gelingt immer';
  if (chance <= 0) return 'Unmöglich';
  return `Braucht ${need}+`;
}
