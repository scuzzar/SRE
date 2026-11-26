import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { TrayStop } from '../model';
import { FLING_WINDOW, settleAt, step, type Heights } from './tray-stops';
import { useGame } from './game-context';

/** So viel Grundkarte bleibt oben stehen, wenn das Blatt ganz hochgezogen ist (Leiste des Globus). */
const TOP_ROOM = 64;
/** Erst ab so vielen Pixeln wird aus einem Tippen ein Ziehen. */
const DRAG_FROM = 6;
/** So viel Abstand hält der Griff im Versteck mindestens zum unteren Rand (Wischgesten des Systems). */
const EDGE = 12;
/** Wer im Inhalt länger hält, bevor er zieht, meint den Inhalt (Ziehen eines Gegenstands, langes Drücken), nicht das Blatt. */
const HOLD_IS_CONTENT = 400;

/** Die Oberkante des Ziehblatts auf dem Bildschirm (wie es nach dem Einrasten steht); ohne Ziehblatt der untere Rand des Fensters. */
export function trayTop(el: Element): number {
  const app = el.closest('.app');
  if (!app) return window.innerHeight;
  const covered = parseFloat(getComputedStyle(app).getPropertyValue('--tray-h')) || 0;
  return app.getBoundingClientRect().bottom - covered;
}

/** Die Scrollfläche unter dem Finger, die den Inhalt nach oben schieben könnte (bis zum Blatt hinauf). */
function scrollerAt(target: EventTarget | null, stop: Element): Element | undefined {
  for (let el = target instanceof Element ? target : null; el && el !== stop; el = el.parentElement) {
    const style = getComputedStyle(el);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return undefined;
}

/** Ob die Scrollfläche ganz oben steht (auch eine, die von unten wächst wie der Log). */
function atTop(el: Element): boolean {
  const reversed = getComputedStyle(el).flexDirection === 'column-reverse';
  return reversed ? Math.abs(el.scrollTop) >= el.scrollHeight - el.clientHeight - 1 : el.scrollTop <= 1;
}

/**
 * Das Ziehblatt auf dem Smartphone, wie in einer Karten-App: liegt unten über der Grundkarte und
 * rastet auf vier Stufen ein (`TrayStop`): versteckt (nur der Griff, mit Abstand zum Rand), eingeklappt
 * (Kopf, Aktionsleiste und Navigationsleiste; ist ein Feld offen, auch dessen Feldkopf), halb und voll. Ziehen lässt es
 * sich am Kopf und am Fuß (Aktionsleiste Notiz, Würfeln, Karte und Navigationsleiste), und im Inhalt nach unten, wenn
 * der schon ganz oben steht. Beim Loslassen rastet es immer ein: nach einem Wisch eine Stufe weiter in
 * seine Richtung, sonst an der nächsten. Ein Tippen auf den Griff holt es aus dem Versteck auf
 * eingeklappt, wechselt zwischen eingeklappt und halb und geht von voll auf halb; mit dem Fokus auf dem
 * Griff wechseln Pfeil hoch und runter die Stufe. Die Stufe merkt sich das Gerät über den Controller
 * (`setTrayStop`), die Höhe dazu rechnet das Blatt jedes Mal aus Platz und Inhalt.
 *
 * Die Höhe steht als `--tray-h` am Elternteil, damit Knöpfe der Grundkarte darüber bleiben; was das
 * Blatt sonst immer belegt (Griff und Navigationsleiste), als `--tray-floor`, damit sich der Globus darüber
 * zentriert. Steht es über halb, trägt das Elternteil `data-tray-high` (die Zoom-Knöpfe gehen weg),
 * solange gezogen wird `tray-dragging` (nichts gleitet hinterher). Während des Ziehens schreibt das
 * Blatt seine Höhe unmittelbar ins DOM, ohne React.
 */
export function Tray({ head, body, foot, bar, stop, raise, expand }: { head: ReactNode; body: ReactNode; foot: ReactNode; bar: ReactNode; stop: TrayStop; /** Wechselt der Wert (ein Feld ist angetippt), fährt das Blatt mindestens auf halbe Höhe, damit man es sieht. */ raise?: string | number | undefined; /** Wechselt der Wert (ein Editor geht auf), fährt das Blatt ganz hoch (2026-11-26). */ expand?: string | undefined }) {
  const game = useGame();
  const tray = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const middle = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const grip = useRef<HTMLButtonElement>(null);
  // Platz des Elternteils, Kopf, Fuß (mit Navigationsleiste), Navigationsleiste allein, Griff, der Feldkopf eines offenen
  // Felds im Inhalt und der Rand unten (Home-Leiste).
  const [size, setSize] = useState({ room: 0, head: 0, foot: 0, tabs: 0, grip: 0, peek: 0, safe: 0 });
  useLayoutEffect(() => {
    const el = tray.current;
    const parent = el?.parentElement;
    const content = middle.current;
    if (!el || !parent || !content) return;
    const measure = () => {
      const nav = tabs.current?.firstElementChild;
      const peekEl = content.querySelector('[data-tray-peek]');
      let peek = 0;
      if (peekEl) {
        // Wie weit der Feldkopf unter dem Anfang des Inhalts endet, auch wenn der gerade gescrollt ist.
        let scrolled = 0;
        for (let p = peekEl.parentElement; p && p !== content; p = p.parentElement) scrolled += p.scrollTop;
        peek = Math.max(0, Math.round(peekEl.getBoundingClientRect().bottom - content.getBoundingClientRect().top + scrolled));
      }
      const next = {
        room: parent.clientHeight,
        head: top.current?.offsetHeight ?? 0,
        foot: bottom.current?.offsetHeight ?? 0,
        tabs: tabs.current?.offsetHeight ?? 0,
        grip: grip.current?.offsetHeight ?? 0,
        peek,
        safe: nav ? parseFloat(getComputedStyle(nav).paddingBottom) || 0 : 0,
      };
      setSize((was) => (Object.keys(next).every((k) => was[k as keyof typeof next] === next[k as keyof typeof next]) ? was : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    if (top.current) observer.observe(top.current);
    if (bottom.current) observer.observe(bottom.current);
    if (tabs.current) observer.observe(tabs.current);
    // Öffnet oder schließt sich ein Feld im Inhalt, ändert sich die Höhe „eingeklappt“.
    const mutations = new MutationObserver(measure);
    mutations.observe(content, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  const collapsed = size.head + size.peek + size.foot + 1;
  const full = Math.max(collapsed, size.room - TOP_ROOM);
  const heights: Heights = {
    hidden: Math.min(collapsed, size.grip + Math.max(EDGE, size.safe)),
    collapsed,
    half: Math.min(full, Math.max(collapsed, size.room / 2)),
    full,
  };
  const clamp = (h: number) => Math.min(heights.full, Math.max(heights.hidden, h));
  const ready = size.room > 0;

  // Schreibt eine Höhe ins DOM: das Blatt selbst, die Variablen am Elternteil, versteckt oder nicht,
  // wie weit Fuß und Navigationsleiste noch zu sehen sind.
  const apply = (h: number) => {
    const el = tray.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    el.style.height = `${h}px`;
    const below = h < heights.collapsed - 1;
    el.classList.toggle('hidden', below);
    const shown = heights.collapsed - heights.hidden > 1 ? (h - heights.hidden) / (heights.collapsed - heights.hidden) : 1;
    el.style.setProperty('--tray-foot', String(Math.min(1, Math.max(0, shown))));
    parent.style.setProperty('--tray-h', `${Math.round(h)}px`);
    // Griff und Navigationsleiste belegt das Blatt immer, außer es ist (teils) versteckt: Darüber zentriert sich der Globus.
    parent.style.setProperty('--tray-floor', `${Math.round(Math.min(size.head + size.tabs, h))}px`);
    parent.toggleAttribute('data-tray-high', h > heights.half + 8);
  };

  // Ein Zug, solange er läuft: wo er begann, die letzten Fingerpositionen für die Geschwindigkeit.
  const drag = useRef<{ y: number; start: number; moved: boolean; samples: { t: number; y: number }[] } | undefined>(undefined);
  const latest = useRef({ heights, clamp, apply, stop });
  useLayoutEffect(() => {
    latest.current = { heights, clamp, apply, stop };
  });
  // Ohne Zug steht das Blatt auf seiner Stufe; ändert sich Platz oder Inhalt, rechnet es die Höhe neu.
  useLayoutEffect(() => {
    if (!ready || drag.current?.moved) return;
    apply(heights[stop]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stop, heights.hidden, heights.collapsed, heights.half, heights.full, size.head, size.tabs]);

  // Ein neu angetipptes Feld steht im Blatt: Steht es tiefer als halb, fährt es auf halbe Höhe.
  const raised = useRef(raise);
  useEffect(() => {
    if (raise === raised.current) return;
    raised.current = raise;
    if (raise === undefined || stop === 'half' || stop === 'full') return;
    game.setTrayStop('half');
  }, [raise, stop, game]);

  // Ein Editor braucht den ganzen Platz: Geht er auf, fährt das Blatt ganz hoch.
  const expandedFor = useRef(expand);
  useEffect(() => {
    if (expand === expandedFor.current) return;
    expandedFor.current = expand;
    if (expand === undefined || stop === 'full') return;
    game.setTrayStop('full');
  }, [expand, stop, game]);

  // Nach dem Ziehen löst das Loslassen über einem Knopf keinen Klick aus.
  const swallowClick = useRef(false);
  const begin = (y: number) => {
    const h = tray.current?.getBoundingClientRect().height ?? latest.current.heights[latest.current.stop];
    drag.current = { y, start: h, moved: false, samples: [{ t: performance.now(), y }] };
  };
  /** Folgt dem Finger; gibt zurück, ob aus dem Tippen schon ein Ziehen geworden ist. */
  const follow = (y: number): boolean => {
    const d = drag.current;
    if (!d) return false;
    const dy = d.y - y;
    if (!d.moved && Math.abs(dy) < DRAG_FROM) return false;
    if (!d.moved) {
      d.moved = true;
      tray.current?.classList.add('dragging');
      tray.current?.parentElement?.classList.add('tray-dragging');
    }
    const now = performance.now();
    d.samples.push({ t: now, y });
    while (d.samples.length > 2 && now - d.samples[0]!.t > FLING_WINDOW) d.samples.shift();
    latest.current.apply(latest.current.clamp(d.start + dy));
    return true;
  };
  const finish = (y: number | undefined) => {
    const d = drag.current;
    drag.current = undefined;
    if (!d?.moved) return;
    tray.current?.classList.remove('dragging');
    tray.current?.parentElement?.classList.remove('tray-dragging');
    const { heights: hs, clamp: c, apply: put, stop: was } = latest.current;
    // Abgebrochen (das System hat den Finger übernommen): zurück auf die Stufe.
    if (y === undefined) return put(hs[was]);
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
    const first = d.samples[0]!;
    const dt = Math.max(1, performance.now() - first.t);
    const velocity = (first.y - y) / dt;
    const next = settleAt(hs, c(d.start + (d.y - y)), velocity);
    put(hs[next]);
    game.setTrayStop(next);
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !ready) return;
    // Die Bewegung verfolgt das Fenster: Der Finger verlässt Kopf oder Fuß, sobald das Blatt nachgibt.
    begin(e.clientY);
    const move = (ev: PointerEvent) => void follow(ev.clientY);
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      finish(ev.type === 'pointercancel' ? undefined : ev.clientY);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  // Im Inhalt: Steht er ganz oben, zieht ein Wisch nach unten das Blatt mit. Das geht nur über
  // Touch-Ereignisse, weil der Browser sonst das Scrollen übernimmt.
  useEffect(() => {
    const content = middle.current;
    if (!content) return;
    let touch: { id: number; x: number; y: number; t: number; target: EventTarget | null; decided: 'tray' | 'content' | undefined } | undefined;
    const start = (e: TouchEvent) => {
      const t = e.touches.length === 1 ? e.touches[0] : undefined;
      touch = t ? { id: t.identifier, x: t.clientX, y: t.clientY, t: e.timeStamp, target: e.target, decided: undefined } : undefined;
    };
    const move = (e: TouchEvent) => {
      const t = touch && [...e.changedTouches].find((c) => c.identifier === touch!.id);
      if (!touch || !t || touch.decided === 'content') return;
      if (!touch.decided) {
        const dx = t.clientX - touch.x;
        const dy = t.clientY - touch.y;
        if (Math.hypot(dx, dy) < DRAG_FROM) return;
        const scroller = scrollerAt(touch.target, content);
        const pull = dy > 0 && Math.abs(dy) > Math.abs(dx) && e.cancelable && e.timeStamp - touch.t < HOLD_IS_CONTENT && latest.current.stop !== 'hidden' && (!scroller || atTop(scroller));
        if (!pull) {
          touch.decided = 'content';
          return;
        }
        touch.decided = 'tray';
        begin(touch.y);
      }
      e.preventDefault();
      follow(t.clientY);
    };
    const end = (e: TouchEvent) => {
      const t = touch && [...e.changedTouches].find((c) => c.identifier === touch!.id);
      if (!touch || !t) return;
      const was = touch.decided;
      touch = undefined;
      if (was === 'tray') finish(e.type === 'touchcancel' ? undefined : t.clientY);
    };
    content.addEventListener('touchstart', start, { passive: true });
    content.addEventListener('touchmove', move, { passive: false });
    content.addEventListener('touchend', end);
    content.addEventListener('touchcancel', end);
    return () => {
      content.removeEventListener('touchstart', start);
      content.removeEventListener('touchmove', move);
      content.removeEventListener('touchend', end);
      content.removeEventListener('touchcancel', end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expanded = stop === 'half' || stop === 'full';
  const tapTo: TrayStop = stop === 'hidden' ? 'collapsed' : stop === 'collapsed' ? 'half' : stop === 'full' ? 'half' : 'collapsed';
  const label = stop === 'hidden' ? 'Blatt hervorholen' : stop === 'collapsed' ? 'Blatt hochziehen' : stop === 'full' ? 'Blatt verkleinern' : 'Blatt einklappen';

  return (
    <section
      ref={tray}
      className="tray"
      aria-label="Ziehblatt"
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div ref={top} className="tray-head" onPointerDown={onPointerDown}>
        <button
          ref={grip}
          type="button"
          className="tray-grip"
          aria-label={label}
          aria-expanded={expanded}
          aria-keyshortcuts="ArrowUp ArrowDown"
          onClick={() => game.setTrayStop(tapTo)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            game.setTrayStop(step(heights, stop, e.key === 'ArrowUp' ? 1 : -1));
          }}
        >
          <span aria-hidden />
        </button>
        {head}
      </div>
      <div ref={middle} className="tray-body">
        {body}
      </div>
      <div ref={bottom} className="tray-foot" onPointerDown={onPointerDown}>
        {foot}
        <div ref={tabs}>{bar}</div>
      </div>
    </section>
  );
}
