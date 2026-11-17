import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { HexView, SelectedHexView, Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { animated } from '../haptics';
import { HoldButton } from '../HoldButton';
import { withLoading } from '../loading';
import { CloseIcon, DiceIcon, LocateIcon } from '../icons';
import { trayTop } from '../Tray';
import { RollStage } from './WorldSheet';
import { worldImageUrl } from './world-icon';

// Reine Darstellung: die Karte eines Subsektors wie TAS Form 6, mit den Zeichen, die in Classic
// Traveller üblich sind. Welche Felder es gibt und was in ihnen steht, kommt aus dem Snapshot.

/** Abstand von der Mitte eines Feldes zu seinen Ecken, in Einheiten der Zeichnung. */
const S = 40;
const H = (Math.sqrt(3) / 2) * S;
const PAD = 2;
const COLUMNS = 8;
const ROWS = 10;
const WIDTH = 1.5 * S * (COLUMNS - 1) + 2 * S + 2 * PAD;
const HEIGHT = 2 * H * ROWS + H + 2 * PAD;

/** Die Mitte eines Feldes: Spalten mit gerader Nummer liegen eine halbe Zeile tiefer. */
function center(column: number, row: number): { x: number; y: number } {
  return { x: PAD + S + 1.5 * S * (column - 1), y: PAD + H + 2 * H * (row - 1) + (column % 2 === 0 ? H : 0) };
}

/** Die Ecken eines Feldes mit flacher Oberkante. */
function corners(x: number, y: number): string {
  return [0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return `${(x + S * Math.cos(rad)).toFixed(1)},${(y + S * Math.sin(rad)).toFixed(1)}`;
    })
    .join(' ');
}

/** Ein fünfzackiger Stern für die Marinebasis. */
function star(x: number, y: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const rad = ((i * 36 - 90) * Math.PI) / 180;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${(x + radius * Math.cos(rad)).toFixed(1)},${(y + radius * Math.sin(rad)).toFixed(1)}`;
  }).join(' ');
}

/** Namen werden in der Karte gekürzt; die Liste darunter zeigt sie ganz. */
function shortName(name: string, capitals: boolean): string {
  const text = capitals ? name.toUpperCase() : name;
  return text.length > 10 ? `${text.slice(0, 9)}…` : text;
}

function label(hex: HexView): string {
  switch (hex.state) {
    case 'open':
      return `${hex.id}, nicht erzeugt`;
    case 'pending':
      return `${hex.id}, in Erschaffung: fortsetzen`;
    case 'empty':
      return `${hex.id}, leer`;
    case 'world':
      return `${hex.id}, ${hex.name}: Weltkarte öffnen`;
  }
}

/**
 * Wie viel ein Feld zeigt, je nachdem, wie groß es gerade auf dem Bildschirm ist: 0 nur die Zeichen
 * und der Name, 1 dazu das UWP, 2 dazu die Handelscodes.
 */
type Detail = 0 | 1 | 2;

/** Ab so vielen Bildschirmpixeln je Einheit der Zeichnung ist das UWP bzw. sind die Handelscodes lesbar. */
const UWP_FROM = 1;
const TRADE_FROM = 1.4;

function detailAt(pixelsPerUnit: number): Detail {
  return pixelsPerUnit >= TRADE_FROM ? 2 : pixelsPerUnit >= UWP_FROM ? 1 : 0;
}

/** Kantenlänge des Weltsymbols in Einheiten der Zeichnung, und wie fein es dafür gerechnet wird. */
const ICON = 26;
const ICON_PX = 104;

/** Die Welt in der Mitte: das Weltsymbol (Größe, Atmosphäre, Wasser, Lichter, Umlaufbahnen). */
function WorldSymbol({ hex, x, y, size }: { hex: HexView; x: number; y: number; size: number }) {
  if (!hex.look) return null;
  return <image className="hex-icon" href={worldImageUrl(hex.look, ICON_PX)} x={x - size / 2} y={y - size / 2} width={size} height={size} />;
}

/** So schnell muss das zweite Tippen auf eine Welt kommen, damit es sie öffnet. */
const DOUBLE_TAP_MS = 400;

function HexCell({ hex, selected, disabled, detail, here = false, opens = false }: { hex: HexView; selected: boolean; disabled: boolean; detail: Detail; here?: boolean; /** Ob Doppeltippen eine Welt öffnet (nicht beim Wählen für die Erschaffung). */ opens?: boolean }) {
  const game = useGame();
  const { x, y: middle } = center(hex.column, hex.row);
  // Mit UWP rückt alles ein Stück nach oben, damit darunter Platz ist.
  const detailed = detail > 0 && hex.uwp !== undefined;
  const y = detailed ? middle - 9 : middle;
  const shown = hex.state === 'world' || hex.state === 'pending';
  // Wann dieses Feld zuletzt angetippt wurde; reine Darstellung, wie das Erkennen von langem Drücken.
  // Noch nie: -∞, denn `performance.now()` zählt ab dem Laden, kurz danach wäre 0 sonst „gerade eben“.
  const lastTap = useRef(Number.NEGATIVE_INFINITY);
  const choose = () => {
    if (disabled) return;
    const now = performance.now();
    const twice = now - lastTap.current < DOUBLE_TAP_MS;
    lastTap.current = twice ? Number.NEGATIVE_INFINITY : now;
    // Das erste Tippen öffnet die Weltkarte, das zweite gleich darauf die Welt selbst, wie „Öffnen“.
    if (twice && opens && hex.state === 'world') withLoading('Welt wird aufgebaut …', () => game.openGlobeAt(hex.column, hex.row));
    else game.chooseHex(hex.column, hex.row);
  };
  return (
    <g
      className={`hex hex-${hex.state}${selected ? ' hex-selected' : ''}${here ? ' hex-here' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={here ? `${label(hex)}, die Gruppe ist hier` : label(hex)}
      aria-pressed={hex.state === 'open' || hex.state === 'empty' ? selected : undefined}
      onClick={choose}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        choose();
      }}
    >
      <polygon points={corners(x, middle)} />
      <text className="hex-id" x={x} y={detailed ? middle - 27 : y - S * 0.58}>
        {hex.id}
      </text>
      {shown && hex.starport !== undefined && (
        <text className="hex-port" x={x} y={y - S * 0.2}>
          {hex.starport}
        </text>
      )}
      {hex.state === 'world' && <WorldSymbol hex={hex} x={x} y={detailed ? y + S * 0.06 : y + S * 0.12} size={detailed ? ICON * 0.72 : ICON} />}
      {hex.state === 'pending' && (
        <text className="hex-pending" x={x} y={y + S * 0.22}>
          …
        </text>
      )}
      {shown && hex.navalBase && <polygon className="hex-base" points={star(x - S * 0.45, y - S * 0.12, 5.5)} />}
      {shown && hex.scoutBase && <polygon className="hex-base" points={`${x - S * 0.45},${y + S * 0.1} ${x - S * 0.45 - 5},${y + S * 0.1 + 8.5} ${x - S * 0.45 + 5},${y + S * 0.1 + 8.5}`} />}
      {shown && hex.gasGiant && <circle className="hex-giant" cx={x + S * 0.45} cy={y - S * 0.12} r={3.2} />}
      {hex.marked && <circle className="hex-marked" cx={x + S * 0.45} cy={y + S * 0.18} r={2.8} />}
      {hex.state === 'world' && hex.name && (
        <text className={detailed ? 'hex-name small' : 'hex-name'} x={x} y={detailed ? middle + 9 : y + S * 0.62}>
          {shortName(hex.name, (hex.population ?? 0) >= 9)}
        </text>
      )}
      {detailed && (
        <text className="hex-uwp" x={x} y={middle + 19}>
          {hex.uwp}
        </text>
      )}
      {detailed && detail === 2 && hex.trade.length > 0 && (
        <text className="hex-trade" x={x} y={middle + 27.5}>
          {hex.trade.join(' ')}
        </text>
      )}
    </g>
  );
}

/**
 * Unten im Subsektor: das gewählte Feld. Ist es nicht erzeugt, würfelt der Knopf das Vorkommen; die
 * Würfel rollen hier, nicht auf der Weltkarte. Gibt es eine Welt, geht es mit „Welt erschaffen“ auf
 * die Weltkarte.
 */
function SectorDock({
  selected,
  rolled,
  rolling,
  skips,
  onRoll,
  onSettled,
}: {
  selected: SelectedHexView;
  rolled: boolean;
  rolling: boolean;
  skips: number;
  onRoll: () => void;
  onSettled: () => void;
}) {
  const game = useGame();
  const line = selected.occurrence;
  return (
    <div className="generation-dock sector-dock" aria-label={`Feld ${selected.id}`}>
      <div className="sector-dock-head" data-tray-peek>
        <span className="kicker">Feld {selected.id}</span>
        <button type="button" className="icon-button" aria-label="Feld abwählen" onClick={() => game.clearHex()}>
          <CloseIcon />
        </button>
      </div>
      {line && <RollStage key={line.index} line={line} animate={rolled && animated()} onSettled={onSettled} skips={skips} />}
      {selected.state === 'open' && (
        <HoldButton className="roll generation-main" onPress={onRoll} onHold={() => game.runOccurrence()}>
          <DiceIcon />
          <span>
            Vorkommen würfeln
            <span className="small-label">1W6 · Welt bei {selected.target}+</span>
          </span>
        </HoldButton>
      )}
      {!rolling && selected.state === 'empty' && <p className="generation-prompt">Kein System in diesem Feld</p>}
      {!rolling && (selected.state === 'pending' || selected.state === 'world') && (
        <button type="button" className="primary" onClick={() => game.chooseHex(selected.column, selected.row)}>
          Welt erschaffen
        </button>
      )}
      {selected.error && (
        <p className="error" role="alert">
          {selected.error}
        </p>
      )}
    </div>
  );
}

/** Wie weit die Karte sich vergrößern lässt. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;
/** Erst ab so vielen Pixeln wird aus einem Tippen ein Verschieben. */
const PAN_FROM = 4;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Wohin die Karte schaut: die Mitte in Einheiten der Zeichnung und der Zoom (1 = ganz zu sehen). */
interface MapView {
  readonly cx: number;
  readonly cy: number;
  readonly zoom: number;
}

/**
 * Die Karte wie in einer Karten-App: Sie füllt ihre Fläche ohne Bildlaufleisten; bei Zoom 1 ist der
 * ganze Subsektor zu sehen (nach Breite oder Höhe, was knapper ist). Mit zwei Fingern, dem Mausrad
 * oder mit + und − zoomen, mit einem Finger oder der gehaltenen Maustaste verschieben; der Punkt
 * unter Fingern bzw. Cursor (bei den Knöpfen die Mitte) bleibt dabei stehen. Gezeichnet wird über den
 * Ausschnitt der Zeichnung (`viewBox`); als Grundkarte (`fill`) reicht sie über ihre Fläche hinaus
 * unter Leiste und Ziehblatt und lässt sich auch bei Zoom 1 verschieben; das Ziehblatt schiebt sich
 * darüber, ohne dass sie Größe oder Lage ändert. Ein neu gewähltes Feld (`focus`), das danach unter dem
 * Ziehblatt oder unter dem Rand läge, holt sie in die Mitte der sichtbaren Fläche, gleitend.
 * Reine Darstellung: Zoom und Ausschnitt gehören der Ansicht.
 */
function ZoomableMap({ fill, focus, children }: { fill: boolean; /** Das gewählte Feld und seine Mitte in Einheiten der Zeichnung. */ focus?: { readonly id: string; readonly x: number; readonly y: number } | undefined; children: (pixelsPerUnit: number) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);
  const [view, setView] = useState<MapView>({ cx: WIDTH / 2, cy: HEIGHT / 2, zoom: 1 });
  // Einheiten der Zeichnung je Bildschirmpixel bei Zoom 1: Der ganze Subsektor passt hinein.
  const ready = size.w > 0 && size.h > 0;
  const fit = ready ? Math.max(WIDTH / size.w, HEIGHT / size.h) : 1;
  /** Hält die Karte im Bild: Ist der Ausschnitt breiter (höher) als die Karte, steht sie in der Mitte. */
  const bounded = (v: MapView): MapView => {
    const zoom = clampZoom(v.zoom);
    const upp = fit / zoom;
    // Als Grundkarte frei verschiebbar, auch bei Zoom 1, solange die Mitte des Ausschnitts auf der Karte
    // liegt: So holt man Reihen unter dem Ziehblatt hervor, wie auf dem Globus.
    if (fill) return { zoom, cx: Math.min(WIDTH, Math.max(0, v.cx)), cy: Math.min(HEIGHT, Math.max(0, v.cy)) };
    const half = (span: number, full: number, c: number) => (span >= full ? full / 2 : Math.min(full - span / 2, Math.max(span / 2, c)));
    return { zoom, cx: half(size.w * upp, WIDTH, v.cx), cy: half(size.h * upp, HEIGHT, v.cy) };
  };
  const shown = bounded(view);
  const upp = fit / shown.zoom;
  const viewBox = ready ? `${(shown.cx - (size.w * upp) / 2).toFixed(2)} ${(shown.cy - (size.h * upp) / 2).toFixed(2)} ${(size.w * upp).toFixed(2)} ${(size.h * upp).toFixed(2)}` : `0 0 ${WIDTH.toFixed(1)} ${HEIGHT.toFixed(1)}`;

  /** Zoomt um einen Faktor; der Punkt (px, py) im Ausschnitt bleibt stehen. */
  const zoomAt = (from: MapView, zoom: number, px: number, py: number): MapView => {
    const base = bounded(from);
    const before = fit / base.zoom;
    const after = fit / clampZoom(zoom);
    const ox = px - size.w / 2;
    const oy = py - size.h / 2;
    return bounded({ zoom, cx: base.cx + ox * before - ox * after, cy: base.cy + oy * before - oy * after });
  };

  // Die neuesten Werte für die Fenster-Listener während einer Geste und für das Mausrad.
  const latest = useRef({ view: shown, zoomAt, bounded, upp });
  useEffect(() => {
    latest.current = { view: shown, zoomAt, bounded, upp };
  });

  // Ein neu gewähltes Feld sichtbar halten. Das Ziehblatt fährt dafür erst hoch (der Controller stellt
  // die Stufe, das Blatt rechnet seine Höhe); danach steht seine Oberkante in `--tray-h`.
  const glide = useRef(0);
  const focusId = focus?.id;
  useEffect(() => {
    if (!focus) return;
    const timer = window.setTimeout(() => {
      const el = box.current;
      if (!el) return;
      const { view: v, bounded: bound, upp: perPixel } = latest.current;
      const r = el.getBoundingClientRect();
      const above = r.top;
      const below = Math.min(r.bottom, trayTop(el));
      // Steht das Blatt ganz oben, ist von der Karte kaum etwas zu sehen; dann bleibt sie, wie sie ist.
      if (below - above < 120) return;
      const margin = H / perPixel + 12;
      const x = r.left + r.width / 2 + (focus.x - v.cx) / perPixel;
      const y = r.top + r.height / 2 + (focus.y - v.cy) / perPixel;
      if (y >= above + margin && y <= below - margin && x >= r.left + margin && x <= r.right - margin) return;
      const goal = bound({ zoom: v.zoom, cx: x < r.left + margin || x > r.right - margin ? focus.x : v.cx, cy: focus.y - ((above + below) / 2 - (r.top + r.height / 2)) * perPixel });
      const from = v;
      const begun = performance.now();
      cancelAnimationFrame(glide.current);
      const frame = (now: number) => {
        const t = Math.min(1, (now - begun) / 320);
        const e = 1 - (1 - t) ** 3;
        setView({ zoom: from.zoom, cx: from.cx + (goal.cx - from.cx) * e, cy: from.cy + (goal.cy - from.cy) * e });
        if (t < 1) glide.current = requestAnimationFrame(frame);
      };
      glide.current = requestAnimationFrame(frame);
    }, 90);
    return () => window.clearTimeout(timer);
    // Nur ein neu gewähltes Feld zählt, nicht jede neue Zeichnung desselben.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);
  useEffect(() => () => cancelAnimationFrame(glide.current), []);

  // Verschieben und Kneifen: verfolgt am Fenster, damit die Geste weiterläuft, wenn der Finger die Fläche verlässt.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const swallowClick = useRef(false);
  const gesture = useRef<{ start: MapView; x: number; y: number; dist?: number; moved: boolean }>({ start: shown, x: 0, y: 0, moved: false });
  const local = (x: number, y: number) => {
    const r = box.current!.getBoundingClientRect();
    return { x: x - r.left, y: y - r.top };
  };
  const begin = () => {
    const pts = [...pointers.current.values()];
    const moved = gesture.current.moved;
    if (pts.length >= 2) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      gesture.current = { start: latest.current.view, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), moved };
    } else if (pts.length === 1) gesture.current = { start: latest.current.view, x: pts[0]!.x, y: pts[0]!.y, moved };
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    const { upp: perPixel } = latest.current;
    if (pts.length >= 2 && g.dist) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = g.start.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist);
      const at = local(g.x, g.y);
      const zoomed = latest.current.zoomAt(g.start, zoom, at.x, at.y);
      const after = fit / clampZoom(zoom);
      g.moved = true;
      setView(latest.current.bounded({ ...zoomed, cx: zoomed.cx - (mid.x - g.x) * after, cy: zoomed.cy - (mid.y - g.y) * after }));
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < PAN_FROM) return;
    g.moved = true;
    setView(latest.current.bounded({ ...g.start, cx: g.start.cx - dx * perPixel, cy: g.start.cy - dy * perPixel }));
  };
  const onUp = (e: PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size > 0) return begin();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    if (!gesture.current.moved) return;
    swallowClick.current = true;
    window.setTimeout(() => (swallowClick.current = false), 0);
  };
  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    },
    // Die Listener hängen nur während einer Geste; beim Abbau der Karte gehen sie mit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Das Mausrad zoomt am Cursor; ein eigener Listener, weil React das Rad passiv registriert und es
  // ohne preventDefault an die Seite durchreichen würde.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const { view: v, zoomAt: at } = latest.current;
      setView(at(v, v.zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX - r.left, e.clientY - r.top));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomButton = (factor: number) => setView(zoomAt(shown, shown.zoom * factor, size.w / 2, size.h / 2));

  return (
    <div className="sector-zoom-frame">
      <div
        ref={box}
        className="sector-viewport"
        style={fill ? undefined : { aspectRatio: `${WIDTH.toFixed(1)} / ${HEIGHT.toFixed(1)}` }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          cancelAnimationFrame(glide.current);
          const first = pointers.current.size === 0;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (first) gesture.current.moved = false;
          begin();
          if (!first) return;
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('pointercancel', onUp);
        }}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <svg className="sector-map" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Karte des Subsektors">
          {children(1 / upp)}
        </svg>
      </div>
      <div className="sector-zoom" role="group" aria-label="Zoom">
        <button type="button" className="icon-button" aria-label="Verkleinern" disabled={shown.zoom <= MIN_ZOOM} onClick={() => zoomButton(1 / ZOOM_STEP)}>
          −
        </button>
        <button type="button" className="icon-button" aria-label="Vergrößern" disabled={shown.zoom >= MAX_ZOOM} onClick={() => zoomButton(ZOOM_STEP)}>
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Der Subsektor: 8 × 10 Felder wie TAS Form 6. Ein nicht erzeugtes Feld (dunkel) antippen wählt es;
 * unten würfelt man dann das Vorkommen. Eine Welt antippen öffnet ihre Weltkarte, auch eine, die
 * noch entsteht. Die Karte füllt ihre Fläche; Welten und Legende klappen oben über ihr auf. Während
 * die Würfel rollen, zeigt die Karte noch den Stand davor. Als Grundkarte (`fill`) reicht sie über die
 * ganze Fläche, die Leiste schwebt darüber, und das gewählte Feld steht im Ziehblatt bzw. im Panel neben
 * dem Log.
 */
export function SectorScreen({ view, heading = 'Subsektor', fill = false, dockTo = null }: { view: Snapshot; heading?: string; fill?: boolean; /** Wohin das gewählte Feld gehört, wenn der Subsektor die Grundkarte ist. */ dockTo?: Element | null }) {
  // Als Grundkarte führt ein Knopf zum Globus des Aufenthaltsorts (nicht beim Wählen für die Erschaffung).
  const here = view.picking ? undefined : view.worlds.find((w) => w.id === view.location);
  const game = useGame();
  // Das Feld, dessen Vorkommen hier gerade gewürfelt wurde, und ob sein Ergebnis schon feststeht.
  const [rolled, setRolled] = useState<string>();
  const [settled, setSettled] = useState<string>();
  const selected = view.selected;
  // Markiert ist das gewählte Feld oder die Welt, deren Weltkarte im Ziehblatt steht, wie das
  // angetippte Feld auf dem Globus; die Karte holt es über das Blatt.
  const worldId = view.world?.id;
  const marked = selected ?? (worldId === undefined ? undefined : view.sector.find((h) => h.id === worldId));
  const rolling = rolled !== undefined && rolled === selected?.id && settled !== rolled && selected.occurrence !== undefined && animated();
  const [shown, setShown] = useState(view.sector);
  if (!rolling && shown !== view.sector) setShown(view.sector);
  const sector = rolling ? shown : view.sector;
  // Ein Tippen irgendwo, solange der Würfel rollt, springt zum Ergebnis; der Zähler sagt es der Bühne.
  const [skips, setSkips] = useState(0);
  const dock = selected && (
    <SectorDock
      key={selected.id}
      selected={selected}
      rolled={rolled === selected.id}
      rolling={rolling}
      skips={skips}
      onRoll={() => {
        setRolled(selected.id);
        setSettled(undefined);
        game.rollOccurrence();
      }}
      onSettled={() => setSettled(selected.id)}
    />
  );
  // Welche Liste oben über der Karte aufgeklappt ist, wie im Globus; reine Darstellung.
  const [panel, setPanel] = useState<'worlds' | 'legend' | undefined>(undefined);
  const toggle = (p: 'worlds' | 'legend') => setPanel(panel === p ? undefined : p);
  return (
    <div
      className="screen"
      onClickCapture={(e) => {
        if (!rolling) return;
        e.stopPropagation();
        e.preventDefault();
        setSkips((n) => n + 1);
      }}
    >
      <section className="scroll sector" aria-labelledby="sector-title">
        <div className="sector-bar">
          <h2 id="sector-title" className="section-title">
            {heading}
          </h2>
          {view.worlds.length > 0 && (
            <button type="button" className={panel === 'worlds' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'worlds'} onClick={() => toggle('worlds')}>
              Welten {view.worlds.length} ▾
            </button>
          )}
          <button type="button" className={panel === 'legend' ? 'globe-chip on' : 'globe-chip'} aria-expanded={panel === 'legend'} onClick={() => toggle('legend')}>
            Legende ▾
          </button>
          {here && (
            <button type="button" className="globe-round globe-locate sector-locate" aria-label={`Aufenthaltsort ${here.name}, Globus öffnen`} title={`Zur Gruppe: ${here.name}`} onClick={() => withLoading('Welt wird aufgebaut …', () => game.openGlobeAt(here.column, here.row))}>
              <LocateIcon />
            </button>
          )}
        </div>
        <div className="sector-body">
          <ZoomableMap fill={fill} focus={fill && marked ? { id: marked.id, ...center(marked.column, marked.row) } : undefined}>
            {(pixelsPerUnit) =>
              sector.map((hex) => <HexCell key={hex.id} hex={hex} selected={hex.id === marked?.id} disabled={rolling} detail={detailAt(pixelsPerUnit)} here={hex.id === view.location} opens={!view.picking} />)
            }
          </ZoomableMap>
          {panel === 'legend' && (
            <div className="sector-panel" role="region" aria-label="Legende">
              <p className="sector-legend small-label">
                Dunkle Felder sind nicht erzeugt: antippen, dann unten das Vorkommen würfeln. Helle ohne Zeichen sind leer. Eine Welt antippen zeigt ihre Werte, doppelt antippen öffnet sie. Das Bild zeigt die Welt: Größe, Atmosphäre als Leuchten, Wasser und Land, Lichter der Städte, ab TL 8 Umlaufbahnen. ★ Marinebasis, ▲ Scoutbasis, • rechts oben Gasriese.
              </p>
            </div>
          )}
          {panel === 'worlds' && view.worlds.length > 0 && (
            <div className="sector-panel" role="region" aria-label="Welten">
              <ul className="world-list">
                {view.worlds.map((w) => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPanel(undefined);
                        game.chooseHex(w.column, w.row);
                      }}
                    >
                      <span className="world-list-name">{w.name}</span>
                      <span className="mono world-list-hex">{w.id}</span>
                      <span className="mono world-list-uwp">{w.uwp}</span>
                      <span className="mono world-list-bases">{w.bases}</span>
                      <span className="world-list-trade">
                        {[...w.trade, ...(w.gasGiant ? ['G'] : [])].join(' ')}
                      </span>
                      {w.id === view.location && <span className="world-list-here">Die Gruppe ist hier</span>}
                      {w.note && <span className="world-list-note">{w.note}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
      {/* Als Grundkarte steht das gewählte Feld im Ziehblatt bzw. in der Seitenspalte, an der Stelle,
          die die App dafür freihält (`dockTo`); Würfel und Zustand bleiben hier. */}
      {dock && (fill ? dockTo && createPortal(dock, dockTo) : dock)}
    </div>
  );
}

/**
 * Die Karte über der Charaktererschaffung, um die Heimatwelt oder die Welt eines Terms zu wählen:
 * Eine fertige Welt antippen wählt sie; ein freies Feld antippen, Vorkommen würfeln und die Welt
 * erschaffen wählt die neue Welt, sobald sie ihren Namen hat.
 */
export function SectorPicker({ view, title }: { view: Snapshot; title: string }) {
  const game = useGame();
  return (
    <div className="overlay">
      <section className="sheet sector-picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="picker-title">{title}</h2>
          <button data-escape type="button" className="icon-button" aria-label="Zurück zur Erschaffung" onClick={() => game.closePicker()}>
            <CloseIcon />
          </button>
        </div>
        <SectorScreen view={view} heading="Welt antippen oder freies Feld wählen" />
      </section>
    </div>
  );
}
