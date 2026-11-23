import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Ziehen mit Finger oder Maus für Listen und Ablagen (2026-11-22d).
 *
 * Eine Karte bekommt `drag.props(payload)`; ein Ziel, das etwas annehmen kann, bekommt
 * `drag.target(id)` und meldet über `blocker`, warum es das Payload gerade nicht nimmt. Ab 10
 * Weg Abstand wird die Karte gezogen: `drag.dragging` sagt, was wo gezogen wird und über welchem
 * Ziel, `drop`-Klassen an Ziel und Karte zeigt es. Loslassen über einem Ziel ruft `onDrop`, ein
 * Tippen ruft `onTap` – beides hier, damit kein zusätzliches `onClick` nötig ist.
 */
export function useDrag<P>(options: {
  /** Was beim Loslassen über einem Ziel geschehen soll. */
  readonly onDrop: (payload: P, target: string) => void;
  /** Warum ein Ziel das Payload nicht annimmt; `undefined` heißt: es nimmt es. */
  readonly blocker?: (payload: P, target: string) => string | undefined;
}): {
  readonly props: (payload: P, onTap?: () => void) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void; onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void; onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void; onPointerCancel: () => void };
  readonly target: (id: string) => { 'data-drag-target': string };
  readonly dragging: { readonly payload: P; readonly x: number; readonly y: number; readonly over: string | undefined; readonly refused: boolean } | undefined;
} {
  const [dragging, setDragging] = useState<{ payload: P; x: number; y: number; over: string | undefined; refused: boolean } | undefined>(undefined);
  const started = useRef<{ payload: P; x: number; y: number; moved: boolean } | undefined>(undefined);
  const now = useRef<{ payload: P; x: number; y: number; over: string | undefined; refused: boolean } | undefined>(undefined);
  // Was beim Ziehen gilt, wechselt mit jeder Ansicht; gemerkt wird es erst nach dem Zeichnen.
  const block = useRef(options.blocker);
  const fall = useRef(options.onDrop);
  useEffect(() => {
    block.current = options.blocker;
    fall.current = options.onDrop;
  });

  const unter = (x: number, y: number): string | undefined => {
    const el = document.elementFromPoint(x, y);
    return el?.closest('[data-drag-target]')?.getAttribute('data-drag-target') ?? undefined;
  };

  return {
    dragging,
    target: (id: string) => ({ 'data-drag-target': id }),
    props: (payload: P, onTap?: () => void) => ({
      onPointerDown: (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target instanceof HTMLElement && e.target.closest('button') !== null) return;
        // Der Finger darf die Karte verlassen: ohne Fang endeten Zug und Loslassen anderswo.
        e.currentTarget.setPointerCapture(e.pointerId);
        started.current = { payload, x: e.clientX, y: e.clientY, moved: false };
      },
      onPointerMove: (e) => {
        const s = started.current;
        if (s === undefined) return;
        if (!s.moved && Math.abs(e.clientX - s.x) + Math.abs(e.clientY - s.y) < 10) return;
        s.moved = true;
        const over = unter(e.clientX, e.clientY);
        const refused = over !== undefined && block.current?.(s.payload, over) !== undefined;
        now.current = { payload: s.payload, x: e.clientX, y: e.clientY, over, refused };
        setDragging(now.current);
      },
      onPointerUp: (e) => {
        const s = started.current;
        started.current = undefined;
        setDragging(undefined);
        if (s === undefined) return;
        if (!s.moved) {
          if (onTap !== undefined && !(e.target instanceof HTMLElement && e.target.closest('button') !== null)) onTap();
          return;
        }
        const over = unter(e.clientX, e.clientY);
        if (over !== undefined && block.current?.(s.payload, over) === undefined) fall.current(s.payload, over);
      },
      onPointerCancel: () => {
        started.current = undefined;
        setDragging(undefined);
      },
    }),
  };
}
