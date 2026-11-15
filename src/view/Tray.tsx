import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useGame } from './game-context';

/** Unter so vielen Pixeln Abstand rastet das Blatt an einer Stufe ein. */
const SNAP = 44;
/** So viel Grundkarte bleibt oben stehen, wenn das Blatt ganz hochgezogen ist (Leiste des Globus). */
const TOP_ROOM = 64;
/** Erst ab so vielen Pixeln wird aus einem Tippen ein Ziehen. */
const DRAG_FROM = 6;

/**
 * Das Ziehblatt auf dem Smartphone, wie in einer Karten-App: liegt unten über der Grundkarte und lässt
 * sich am Kopf (Griff, Hinweise) stufenlos hochziehen. Ganz unten stehen die Reiter (`bar`), darüber,
 * wo der Bereich es braucht, die Reihe Notiz, Würfeln, Karte (`foot`). Beim Loslassen rastet es in der
 * Nähe von eingeklappt (nur Kopf, Fuß und Reiter), halb und voll ein; ein Tippen auf den Griff wechselt zwischen
 * eingeklappt und halb. Wie hoch es steht, merkt sich das Gerät über den Controller (`setTrayHeight`).
 * Die Höhe steht als `--tray-h` am Elternteil, damit Knöpfe der Grundkarte darüber bleiben; was das
 * Blatt immer belegt (Griff und Reiter), als `--tray-floor`, damit sich der Globus darüber zentriert.
 */
export function Tray({ head, body, foot, bar, fraction }: { head: ReactNode; body: ReactNode; foot: ReactNode; bar: ReactNode; fraction: number }) {
  const game = useGame();
  const tray = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  // Wie viel Platz das Elternteil hat und wie hoch Kopf und Fuß zusammen sind (eingeklappt).
  const [room, setRoom] = useState(0);
  const [min, setMin] = useState(0);
  useLayoutEffect(() => {
    const el = tray.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const measure = () => {
      setRoom(parent.clientHeight);
      setMin((top.current?.offsetHeight ?? 0) + (bottom.current?.offsetHeight ?? 0) + 1);
      // Griff und Reiter belegt das Blatt immer: Darüber zentriert sich die Grundkarte (`--tray-floor`).
      parent.style.setProperty('--tray-floor', `${(top.current?.offsetHeight ?? 0) + (tabs.current?.offsetHeight ?? 0)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    if (top.current) observer.observe(top.current);
    if (bottom.current) observer.observe(bottom.current);
    if (tabs.current) observer.observe(tabs.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(min, room - TOP_ROOM);
  const clamp = (h: number) => Math.min(max, Math.max(min, h));
  // Während des Ziehens folgt das Blatt dem Finger; gemerkt wird die Höhe erst beim Loslassen.
  const [dragged, setDragged] = useState<number | undefined>(undefined);
  const height = room === 0 ? undefined : clamp(dragged ?? fraction * room);

  useEffect(() => {
    const parent = tray.current?.parentElement;
    if (parent && height !== undefined) parent.style.setProperty('--tray-h', `${Math.round(height)}px`);
  }, [height]);

  const drag = useRef<{ y: number; start: number; moved: boolean } | undefined>(undefined);
  // Nach dem Ziehen löst das Loslassen über einem Reiter keinen Klick aus.
  const swallowClick = useRef(false);
  const settle = (h: number) => {
    const stops = [min, room / 2, max];
    const near = stops.reduce((best, s) => (Math.abs(s - h) < Math.abs(best - h) ? s : best), stops[0]!);
    const final = Math.abs(near - h) < SNAP ? near : h;
    setDragged(undefined);
    game.setTrayHeight(room > 0 ? clamp(final) / room : 0.5);
  };

  return (
    <section ref={tray} className={dragged === undefined ? 'tray' : 'tray dragging'} style={height === undefined ? undefined : { height }} aria-label="Ziehblatt">
      <div
        ref={top}
        className="tray-head"
        onPointerDown={(e) => {
          if (e.button !== 0 || height === undefined) return;
          drag.current = { y: e.clientY, start: height, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dy = d.y - e.clientY;
          if (!d.moved && Math.abs(dy) < DRAG_FROM) return;
          if (!d.moved) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setDragged(clamp(d.start + dy));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = undefined;
          if (!d?.moved) return;
          swallowClick.current = true;
          window.setTimeout(() => (swallowClick.current = false), 0);
          settle(clamp(d.start + (d.y - e.clientY)));
        }}
        onPointerCancel={() => {
          drag.current = undefined;
          setDragged(undefined);
        }}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          className="tray-grip"
          aria-label={height !== undefined && height > min + SNAP ? 'Blatt einklappen' : 'Blatt hochziehen'}
          onClick={() => settle(height !== undefined && height > min + SNAP ? min : room / 2)}
        >
          <span aria-hidden />
        </button>
        {head}
      </div>
      <div className="tray-body">{body}</div>
      <div ref={bottom} className="tray-foot">
        {foot}
        <div ref={tabs}>{bar}</div>
      </div>
    </section>
  );
}
