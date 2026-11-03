import type { AttackItem, CardItem, DamageItem, DmPart, LogItem, TaskItem } from '../controller';
import type { ArmorClass, AttackKind, BookingKind, Characteristic, ItemKind, MapDirection, MapIcon, PathKind, Range, Scatter } from '../model';

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

/** Die Arten der Gegenstände, wie Editor und Shop sie gruppieren. */
export const kindNames: Record<ItemKind, string> = {
  weapon: 'Waffen',
  ammunition: 'Munition',
  armor: 'Rüstungen',
  equipment: 'Ausrüstung',
  vehicle: 'Fahrzeuge',
  ship: 'Schiffe und Small Craft',
  passage: 'Passagen',
  membership: 'Mitgliedschaften',
};

export const bookingText: Record<BookingKind, string> = {
  income: 'Einnahme',
  expense: 'Ausgabe',
  deposit: 'Einzahlung',
  payout: 'Auszahlung',
  purchase: 'Kauf',
  sale: 'Verkauf',
};

/** Die Rüstungsklassen, wie die Matrix sie schreibt. */
export const armorText: Record<ArmorClass, string> = {
  nothing: 'Nothing',
  jack: 'Jack',
  mesh: 'Mesh',
  cloth: 'Cloth',
  reflec: 'Reflec',
  ablat: 'Ablat',
  combat: 'Combat',
};

/** Die Reichweiten, wie die Matrix sie schreibt. */
export const rangeText: Record<Range, string> = {
  close: 'Close',
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  veryLong: 'Very Long',
};

/** Knapp, für die Köpfe der Tabelle. */
export const rangeShort: Record<Range, string> = {
  close: 'Close',
  short: 'Short',
  medium: 'Med.',
  long: 'Long',
  veryLong: 'V. Long',
};

/** Die Reichweiten in Metern (S. 7). */
export const rangeMeters: Record<Range, string> = {
  close: 'Berührung',
  short: '1–5 m',
  medium: '6–50 m',
  long: '51–250 m',
  veryLong: '251–500 m',
};

export const attackText: Record<AttackKind, string> = {
  blow: 'Schlag',
  swing: 'Hieb',
  shot: 'Schuss',
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
    case 'armor':
      return `gegen ${armorText[part.armor]} ${signed(part.dm)}`;
    case 'range':
      return `auf ${rangeText[part.range]} ${signed(part.dm)}`;
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

/** Ein Angriff in einer Zeile: „Kira Vant · Automatic Pistol · Jack, Short“. */
export function attackTitle(item: AttackItem): string {
  return `${item.character} · ${item.weapon} · ${armorText[item.armor]}, ${rangeText[item.range]}`;
}

/** Der Titel im Popup: Probe oder Angriff. */
export function rollTitle(item: TaskItem | AttackItem): string {
  return item.kind === 'attack' ? attackTitle(item) : taskTitle(item);
}

/** Ein Schadenswurf: „3W6: 4 + 2 + 6 = 12“. */
export function damageDetail(item: DamageItem): string {
  return `${item.dice.length}W6: ${item.dice.join(' + ')} = ${item.damage}`;
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
    case 'attack':
      return { head: item.success ? 'TREFFER' : 'DANEBEN', rest: attackTitle(item) };
    case 'damage':
      return { head: `Schaden ${item.damage}`, rest: `${item.weapon} · ${item.dice.join(' + ')}` };
    case 'note':
      return { head: item.interprets === undefined ? 'Notiz' : 'Deutung', rest: item.text };
  }
}

export function taskDetail(item: TaskItem | AttackItem): string {
  const [a, b] = item.dice;
  return `2W6: ${a} + ${b} = ${a + b}, DM ${signed(item.dm)} → ${item.total}`;
}

/** Was auf 2W6 nötig ist, in Worten. */
export function needText(need: number, chance: number): string {
  if (chance >= 100) return 'Gelingt immer';
  if (chance <= 0) return 'Unmöglich';
  return `Braucht ${need}+`;
}
