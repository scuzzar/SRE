import { useEffect, useState, type CSSProperties } from 'react';
import type { Dice as DicePair } from '../model';
import { animated } from './haptics';

// Reine Darstellung: zwei W6 als 3D-Würfel, die geworfen werden, aufschlagen und auf dem Ergebnis
// liegen bleiben. Vorbild ist der Würfelwurf aus Baldur's Gate 3: dunkler Grund, goldene Augen,
// ein Aufleuchten beim Landen.

/** Wie lange der Wurf dauert, bis beide Würfel liegen; passt zu `die-throw` in styles.css. */
export const THROW_MS = 850;

/** Welche Augen im 3×3-Raster eines Würfels stehen (1 oben links, 9 unten rechts). */
const pips: Record<number, readonly number[]> = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

/** Wo jede Seite am Würfel sitzt; gegenüber liegende Seiten ergeben zusammen 7. */
const faces: Record<number, string> = {
  1: 'rotateY(0deg)',
  6: 'rotateY(180deg)',
  2: 'rotateY(90deg)',
  5: 'rotateY(-90deg)',
  3: 'rotateX(90deg)',
  4: 'rotateX(-90deg)',
};

/** Wie der Würfel liegen muss, damit eine Seite nach vorn zeigt. */
const rest: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
};

/** Fester Versatz je Wurf, damit kein Wurf wie der vorige aussieht; Zufall braucht es dafür nicht. */
function wobble(seed: number, range: number): number {
  const n = Math.sin(seed * 12.9898) * 43758.5453;
  return Math.round((n - Math.floor(n)) * range * 2 - range);
}

function Die({ value, index, seed }: { value: number; index: number; seed: number }) {
  const end = rest[value] ?? { x: 0, y: 0 };
  const s = seed * 2 + index;
  const tilt = wobble(s + 1, 14);
  const style = {
    '--x': `${end.x}deg`,
    '--y': `${end.y}deg`,
    '--z': `${tilt}deg`,
    // Mehrere volle Drehungen um jede Achse, in wechselnder Richtung.
    '--x0': `${end.x + (index ? -1 : 1) * (720 + wobble(s + 2, 60))}deg`,
    '--y0': `${end.y + (index ? 1 : -1) * (540 + wobble(s + 3, 60))}deg`,
    '--z0': `${tilt + wobble(s + 4, 120)}deg`,
    '--dx': `${(index ? 1 : -1) * (70 + wobble(s + 5, 30))}px`,
  } as CSSProperties;

  return (
    <div className="die" style={style}>
      <div className="die-throw">
        <div className="die-cube">
          {[1, 2, 3, 4, 5, 6].map((face) => (
            <div key={face} className="die-face" style={{ '--face': faces[face] } as CSSProperties}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cell) => (
                <span key={cell} className={pips[face]!.includes(cell) ? 'pip' : undefined} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="die-shadow" />
    </div>
  );
}

/**
 * Zwei geworfene Würfel. `landed` lässt sie sofort liegen (übersprungen) und leuchtet auf; `seed`
 * unterscheidet die Würfe.
 */
export function DicePairView({ dice, seed, landed, size = 'large' }: { dice: DicePair; seed: number; landed: boolean; size?: 'large' | 'small' }) {
  return (
    <div className={`dice-stage ${size}${landed ? ' landed' : ''}`} aria-hidden="true">
      <Die value={dice[0]} index={0} seed={seed} />
      <Die value={dice[1]} index={1} seed={seed} />
      <div className="dice-flash" />
    </div>
  );
}

/**
 * Die Schritte einer Animation: `durations[i]` ist, wie lange Schritt i dauert; nach dem letzten
 * bleibt sie stehen. Bei „Bewegung reduzieren“ steht sie gleich am Ende. `skip` springt zu einem Schritt.
 */
export function useTimeline(durations: readonly number[]): [number, (phase: number) => void] {
  const [phase, setPhase] = useState(() => (animated() ? 0 : durations.length));
  const duration = durations[phase];
  useEffect(() => {
    if (duration === undefined) return;
    const timer = setTimeout(() => setPhase((p) => p + 1), duration);
    return () => clearTimeout(timer);
  }, [phase, duration]);
  return [phase, setPhase];
}
