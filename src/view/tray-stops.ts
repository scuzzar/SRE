import { TRAY_STOPS } from '../controller';
import type { TrayStop } from '../model';

// Wo das Ziehblatt einrastet, als reine Rechnung: Die Höhen der Stufen kommen aus dem Blatt.

/** Ab dieser Geschwindigkeit (Pixel je Millisekunde) ist das Loslassen ein Wisch: eine Stufe weiter in seine Richtung. */
const FLING = 0.3;
/** Über so viele Millisekunden vor dem Loslassen zählt die Geschwindigkeit. */
export const FLING_WINDOW = 90;

/** Wie hoch das Blatt auf jeder Stufe steht, aus Platz und Inhalt gerechnet. */
export type Heights = Readonly<Record<TrayStop, number>>;

/** Die Stufe, an der das Blatt beim Loslassen auf Höhe `h` einrastet: beim Wisch die nächste in seiner Richtung, sonst die nächste. */
export function settleAt(heights: Heights, h: number, velocity: number): TrayStop {
  const stops = TRAY_STOPS.map((stop) => ({ stop, h: heights[stop] }));
  if (Math.abs(velocity) >= FLING) {
    const ahead = velocity > 0 ? stops.find((s) => s.h > h + 1) : [...stops].reverse().find((s) => s.h < h - 1);
    if (ahead) return ahead.stop;
    return velocity > 0 ? 'full' : 'hidden';
  }
  return stops.reduce((best, s) => (Math.abs(s.h - h) < Math.abs(best.h - h) ? s : best), stops[0]!).stop;
}

/** Die Stufe über bzw. unter `stop`, auf denen das Blatt anders steht (fallen zwei zusammen, zählt eine). */
export function step(heights: Heights, stop: TrayStop, dir: 1 | -1): TrayStop {
  const order = dir > 0 ? TRAY_STOPS : [...TRAY_STOPS].reverse();
  return order.slice(order.indexOf(stop) + 1).find((s) => Math.abs(heights[s] - heights[stop]) > 1) ?? stop;
}
