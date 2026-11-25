import type { CSSProperties } from 'react';

/** Wie lange die Landeanimation dauert (ms); danach steht wieder das Zeichen „S“ am Feld. */
export const TOUCHDOWN_MS = 3800;

/** Staubwolken beim Aufsetzen: Winkel (Grad) und Weite (px), fest, damit jede Landung gleich aussieht. */
const PUFFS: readonly (readonly [number, number])[] = [
  [8, 34],
  [52, 26],
  [96, 38],
  [140, 30],
  [188, 36],
  [232, 27],
  [276, 39],
  [320, 31],
];

/**
 * Die Landeanimation (2026-11-21) über dem Globus, am Bildschirmpunkt des Landeplatzes: Das Schiff
 * kommt schräg von oben herein, wird kleiner, je tiefer es sinkt, sein Schatten wandert unter es, das
 * Triebwerk bremst zuletzt hell, beim Aufsetzen wirbelt Staub auf, und darunter steht, wo die Gruppe
 * gelandet ist. Reine Darstellung, nur mit CSS-Animationen.
 */
export function Touchdown({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div className="touchdown" style={{ '--land-x': `${x}px`, '--land-y': `${y}px` } as CSSProperties} aria-hidden>
      <div className="td-dust">
        <span className="td-ring" />
        <span className="td-ring td-ring-2" />
        {PUFFS.map(([angle, reach]) => (
          <span key={angle} className="td-puff" style={{ '--a': `${angle}deg`, '--r': `${reach}px` } as CSSProperties} />
        ))}
      </div>
      <div className="td-shadow" />
      <div className="td-craft">
        <span className="td-flame" />
        <svg className="td-ship" viewBox="-20 -20 40 40" width="34" height="34">
          {/* Ein Keil von oben gesehen, die Nase in Flugrichtung (nach rechts unten gedreht). */}
          <g transform="rotate(53)">
            <path d="M17 0 L-11 -12 L-6 0 L-11 12 Z" fill="#e9e4d4" stroke="#14140f" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8 0 L-4 -5 L-2 0 L-4 5 Z" fill="#7fb6e0" stroke="#14140f" strokeWidth="1" strokeLinejoin="round" />
            <rect x="-12.5" y="-9" width="3" height="5" rx="1" fill="#ffcf6a" />
            <rect x="-12.5" y="4" width="3" height="5" rx="1" fill="#ffcf6a" />
          </g>
        </svg>
      </div>
      <p className="td-label">{label}</p>
    </div>
  );
}
