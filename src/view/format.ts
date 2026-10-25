import type { DmPart, TaskItem } from '../controller';
import type { Characteristic } from '../model';

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

export function partLabel(part: DmPart): string {
  switch (part.kind) {
    case 'skill':
      return `${part.name}-${part.level} ${signed(part.dm)}`;
    case 'unskilled':
      return `ohne Fertigkeit ${signed(part.dm)}`;
    case 'characteristic':
      return `${characteristicLabel[part.characteristic]} ${hex(part.value)} ${signed(part.dm)}`;
  }
}

/** Die Fertigkeit einer Probe, wie sie im Titel steht: „Pilot-2“ oder „ohne Fertigkeit“. */
export function skillTitle(parts: readonly DmPart[]): string {
  const first = parts[0];
  if (first?.kind === 'skill') return `${first.name}-${first.level}`;
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
