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
 * wo der Bereich es braucht, die Reihe Notiz, Würfeln, Karte (`foot`). Unter „eingeklappt“ lässt es sich
 * weiter hinunterschieben, bis nur der Griff stehen bleibt: Reihe und Reiter rutschen mit hinaus, die
 * Karte hat den ganzen Bildschirm. Beim Loslassen rastet es in der Nähe von versteckt (nur der Griff),
 * eingeklappt (Kopf, Fuß und Reiter), halb und voll ein; ein Tippen auf den Griff holt es aus dem
 * Versteck auf eingeklappt und wechselt sonst zwischen eingeklappt und halb. Wie hoch es steht, merkt
 * sich das Gerät über den Controller (`setTrayHeight`). Die Höhe steht als `--tray-h` am Elternteil,
 * damit Knöpfe der Grundkarte darüber bleiben; was das Blatt sonst immer belegt (Griff und Reiter), als
 * `--tray-floor`, damit sich der Globus darüber zentriert (versteckt: nur der Griff).
 */
export function Tray({ head, body, foot, bar, fraction, raise }: { head: ReactNode; body: ReactNode; foot: ReactNode; bar: ReactNode; fraction: number; /** Wechselt der Wert (ein Feld ist angetippt), fährt das Blatt mindestens auf halbe Höhe, damit man es sieht. */ raise?: string | number | undefined }) {
  const game = useGame();
  const tray = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLButtonElement>(null);
  // Wie viel Platz das Elternteil hat, wie hoch Kopf und Fuß zusammen sind (eingeklappt), wie hoch der
  // Griff allein ist (versteckt) und was ohne Versteck immer belegt ist (Griff und Reiter).
  const [room, setRoom] = useState(0);
  const [min, setMin] = useState(0);
  const [low, setLow] = useState(0);
  const [floor, setFloor] = useState(0);
  useLayoutEffect(() => {
    const el = tray.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const measure = () => {
      setRoom(parent.clientHeight);
      setMin((top.current?.offsetHeight ?? 0) + (bottom.current?.offsetHeight ?? 0) + 1);
      setLow(grip.current?.offsetHeight ?? 0);
      setFloor((top.current?.offsetHeight ?? 0) + (tabs.current?.offsetHeight ?? 0));
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
  const clamp = (h: number) => Math.min(max, Math.max(low, h));
  // Während des Ziehens folgt das Blatt dem Finger; gemerkt wird die Höhe erst beim Loslassen.
  const [dragged, setDragged] = useState<number | undefined>(undefined);
  const height = room === 0 ? undefined : clamp(dragged ?? fraction * room);

  useEffect(() => {
    const parent = tray.current?.parentElement;
    if (!parent || height === undefined) return;
    parent.style.setProperty('--tray-h', `${Math.round(height)}px`);
    // Griff und Reiter belegt das Blatt immer, außer es ist (teils) versteckt: Darüber zentriert sich der Globus.
    parent.style.setProperty('--tray-floor', `${Math.round(Math.min(floor, height))}px`);
  }, [height, floor]);
  const hidden = height !== undefined && height < min - 1;
  // Ein neu angetipptes Feld steht im Blatt: Steht es tiefer als halb, fährt es auf halbe Höhe.
  const raised = useRef(raise);
  useEffect(() => {
    if (raise === raised.current) return;
    raised.current = raise;
    if (raise === undefined || room === 0 || height === undefined || height >= room / 2 - SNAP) return;
    game.setTrayHeight(0.5);
  }, [raise, room, height, game]);

  // Nach dem Ziehen löst das Loslassen über einem Reiter keinen Klick aus.
  const swallowClick = useRef(false);
  const settle = (h: number) => {
    const stops = [low, min, room / 2, max];
    const near = stops.reduce((best, s) => (Math.abs(s - h) < Math.abs(best - h) ? s : best), stops[0]!);
    const final = Math.abs(near - h) < SNAP ? near : h;
    setDragged(undefined);
    game.setTrayHeight(room > 0 ? clamp(final) / room : 0.5);
  };

  return (
    <section ref={tray} className={`tray${dragged === undefined ? '' : ' dragging'}${hidden ? ' hidden' : ''}`} style={height === undefined ? undefined : { height }} aria-label="Ziehblatt">
      <div
        ref={top}
        className="tray-head"
        onPointerDown={(e) => {
          if (e.button !== 0 || height === undefined) return;
          // Die Bewegung verfolgt das Fenster: Der Kopf ist kaum höher als der Griff, der Finger verlässt ihn sofort.
          const d = { y: e.clientY, start: height, moved: false };
          const move = (ev: PointerEvent) => {
            const dy = d.y - ev.clientY;
            if (!d.moved && Math.abs(dy) < DRAG_FROM) return;
            d.moved = true;
            setDragged(clamp(d.start + dy));
          };
          const end = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            if (!d.moved) return;
            if (ev.type === 'pointercancel') return setDragged(undefined);
            swallowClick.current = true;
            window.setTimeout(() => (swallowClick.current = false), 0);
            settle(clamp(d.start + (d.y - ev.clientY)));
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', end);
          window.addEventListener('pointercancel', end);
        }}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          ref={grip}
          type="button"
          className="tray-grip"
          aria-label={hidden ? 'Blatt hervorholen' : height !== undefined && height > min + SNAP ? 'Blatt einklappen' : 'Blatt hochziehen'}
          onClick={() => settle(hidden || (height !== undefined && height > min + SNAP) ? min : room / 2)}
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
