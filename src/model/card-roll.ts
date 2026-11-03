import type { Random } from './ports';

/**
 * Die Wurffelder der Karte: Glockenzahl, Streuwürfel und Kartensymbol. Sie ziehen keinen Eintrag aus
 * einer Liste, sondern würfeln einen Wert; die Kartenauswahl hält diesen Wert selbst. Die Gewichte sind
 * eigene, nicht die der GMA2e-Karten (siehe Domänenmodell, *Wurffelder der Karte*).
 */
export const cardRolls = ['bell', 'scatter', 'map'] as const;
export type CardRoll = (typeof cardRolls)[number];

/** Der Streuwürfel: acht Richtungen (Norden oben), Volltreffer und Fehlschlag. */
export const scatters = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'hit', 'miss'] as const;
export type Scatter = (typeof scatters)[number];

/** Was in eine Richtung des Kartensymbols führt. */
export const pathKinds = ['none', 'path', 'deadEnd', 'hidden', 'obstacle'] as const;
export type PathKind = (typeof pathKinds)[number];

/** Die sechs Richtungen des Kartensymbols: vier auf der Ebene, dazu oben und unten. */
export const mapDirections = ['north', 'east', 'south', 'west', 'up', 'down'] as const;
export type MapDirection = (typeof mapDirections)[number];

/** Das Kartensymbol: ein Raum, von oben gesehen, mit einer Wegart je Richtung. */
export type MapIcon = Readonly<Record<MapDirection, PathKind>>;

/** Gewichte der Glockenzahl 1 bis 10 (von 200): meist 4–7, 1 und 10 je 0,5 %. */
export const bellWeights: readonly number[] = [1, 6, 16, 30, 47, 47, 30, 16, 6, 1];

/** Gewichte der Wegarten (von 20): auf der Ebene (N, O, S, W) und für oben und unten. */
export const flatPathWeights: readonly (readonly [PathKind, number])[] = [
  ['path', 7],
  ['none', 7],
  ['deadEnd', 2],
  ['hidden', 2],
  ['obstacle', 2],
];
export const verticalPathWeights: readonly (readonly [PathKind, number])[] = [
  ['path', 2],
  ['none', 15],
  ['deadEnd', 1],
  ['hidden', 1],
  ['obstacle', 1],
];

/** So viele Richtungen hat ein Kartensymbol mindestens mit einem Weg (jede Wegart außer *kein Weg*). */
export const minMapPaths = 2;

/** Ein Index nach Gewichten, mit einem Wurf von 1 bis zur Summe. */
function weighted(weights: readonly number[], random: Random): number {
  let roll = random.int(1, weights.reduce((a, b) => a + b, 0));
  for (const [i, weight] of weights.entries()) {
    roll -= weight;
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

export function rollBell(random: Random): number {
  return weighted(bellWeights, random) + 1;
}

export function rollScatter(random: Random): Scatter {
  return scatters[random.int(0, scatters.length - 1)]!;
}

export function pathCount(map: MapIcon): number {
  return mapDirections.filter((d) => map[d] !== 'none').length;
}

/** Würfelt je Richtung eine Wegart; hat das Symbol weniger als zwei Wege, wird es ganz neu gewürfelt. */
export function rollMap(random: Random): MapIcon {
  for (;;) {
    const map = Object.fromEntries(
      mapDirections.map((d) => {
        const table = d === 'up' || d === 'down' ? verticalPathWeights : flatPathWeights;
        return [d, table[weighted(table.map(([, w]) => w), random)]![0]];
      }),
    ) as MapIcon;
    if (pathCount(map) >= minMapPaths) return map;
  }
}

export function isScatter(value: unknown): value is Scatter {
  return typeof value === 'string' && (scatters as readonly string[]).includes(value);
}
