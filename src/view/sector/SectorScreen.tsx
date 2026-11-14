import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent } from 'react';
import type { HexView, SelectedHexView, Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { animated } from '../haptics';
import { HoldButton } from '../HoldButton';
import { CloseIcon, DiceIcon } from '../icons';
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

function HexCell({ hex, selected, disabled, detail, here = false }: { hex: HexView; selected: boolean; disabled: boolean; detail: Detail; here?: boolean }) {
  const game = useGame();
  const { x, y: middle } = center(hex.column, hex.row);
  // Mit UWP rückt alles ein Stück nach oben, damit darunter Platz ist.
  const detailed = detail > 0 && hex.uwp !== undefined;
  const y = detailed ? middle - 9 : middle;
  const shown = hex.state === 'world' || hex.state === 'pending';
  const choose = () => {
    if (!disabled) game.chooseHex(hex.column, hex.row);
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
      <div className="sector-dock-head">
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

/**
 * Der Subsektor: 8 × 10 Felder wie TAS Form 6. Ein nicht erzeugtes Feld (dunkel) antippen wählt es;
 * unten würfelt man dann das Vorkommen. Eine Welt antippen öffnet ihre Weltkarte, auch eine, die
 * noch entsteht. Darunter die Welten als Liste. Während die Würfel rollen, zeigt die Karte noch den
 * Stand davor.
 */
/** Wie weit die Karte sich vergrößern lässt. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.5;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function distance(e: TouchEvent): number {
  const [a, b] = [e.touches[0]!, e.touches[1]!];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Die Karte im Ausschnitt: mit zwei Fingern, dem Mausrad oder mit + und − zoomen, mit einem Finger
 * oder der gehaltenen Maustaste verschieben. Beim Zoomen bleibt der Punkt unter den Fingern bzw.
 * dem Cursor (bei den Knöpfen die Mitte) an seiner Stelle. Reine Darstellung: Der Zoom gehört der Ansicht.
 */
function ZoomableMap({ children }: { children: (pixelsPerUnit: number) => ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  // Wie breit der Ausschnitt ist; daraus und aus dem Zoom folgt, wie groß ein Feld gerade erscheint.
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);
  // Wohin beim nächsten Zeichnen gescrollt wird, damit der Punkt unter den Fingern stehen bleibt.
  const anchor = useRef<{ x: number; y: number; from: number } | undefined>(undefined);
  const pinch = useRef<{ distance: number; zoom: number } | undefined>(undefined);

  function zoomTo(next: number, x?: number, y?: number) {
    const el = viewport.current;
    const target = clampZoom(next);
    if (!el || target === zoom) return;
    anchor.current = { x: x ?? el.clientWidth / 2, y: y ?? el.clientHeight / 2, from: zoom };
    setZoom(target);
  }

  useLayoutEffect(() => {
    const el = viewport.current;
    const a = anchor.current;
    if (!el || !a) return;
    const ratio = zoom / a.from;
    el.scrollLeft = (el.scrollLeft + a.x) * ratio - a.x;
    el.scrollTop = (el.scrollTop + a.y) * ratio - a.y;
    anchor.current = undefined;
  }, [zoom]);

  // Das Mausrad zoomt am Cursor; ein eigener Listener, weil React das Rad passiv registriert und es
  // ohne preventDefault an die Seite durchreichen würde.
  const zoomBy = useRef<(factor: number, x?: number, y?: number) => void>(() => undefined);
  useEffect(() => {
    zoomBy.current = (factor, x, y) => zoomTo(zoom * factor, x, y);
  });
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();
      zoomBy.current(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - box.left, e.clientY - box.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  // Die gehaltene Maustaste verschiebt die Karte; erst nach ein paar Pixeln zählt es als Verschieben,
  // damit ein kurzes Tippen auf ein Feld es weiterhin wählen kann.
  const pan = useRef<{ x: number; y: number; left: number; top: number } | undefined>(undefined);
  const panned = useRef(false);

  return (
    <div className="sector-zoom-frame" style={{ '--map-ratio': (WIDTH / HEIGHT).toFixed(4) } as CSSProperties}>
      <div
        ref={viewport}
        className="sector-viewport"
        style={{ aspectRatio: `${WIDTH.toFixed(1)} / ${HEIGHT.toFixed(1)}` }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) pinch.current = { distance: distance(e), zoom };
        }}
        onTouchMove={(e) => {
          const start = pinch.current;
          const el = viewport.current;
          if (!start || !el || e.touches.length !== 2) return;
          const box = el.getBoundingClientRect();
          const [a, b] = [e.touches[0]!, e.touches[1]!];
          zoomTo(start.zoom * (distance(e) / start.distance), (a.clientX + b.clientX) / 2 - box.left, (a.clientY + b.clientY) / 2 - box.top);
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) pinch.current = undefined;
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const el = viewport.current;
          if (!el) return;
          pan.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
          panned.current = false;
        }}
        onMouseMove={(e) => {
          const p = pan.current;
          const el = viewport.current;
          if (!p || !el) return;
          const dx = e.clientX - p.x;
          const dy = e.clientY - p.y;
          if (!panned.current && Math.hypot(dx, dy) < 4) return;
          panned.current = true;
          el.scrollLeft = p.left - dx;
          el.scrollTop = p.top - dy;
        }}
        onMouseUp={() => {
          pan.current = undefined;
        }}
        onMouseLeave={() => {
          pan.current = undefined;
        }}
        onClickCapture={(e) => {
          if (!panned.current) return;
          panned.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="sector-canvas" style={{ width: `${zoom * 100}%` }}>
          {children((width * zoom) / WIDTH)}
        </div>
      </div>
      <div className="sector-zoom" role="group" aria-label="Zoom">
        <button type="button" className="icon-button" aria-label="Verkleinern" disabled={zoom <= MIN_ZOOM} onClick={() => zoomTo(zoom / ZOOM_STEP)}>
          −
        </button>
        <button type="button" className="icon-button" aria-label="Vergrößern" disabled={zoom >= MAX_ZOOM} onClick={() => zoomTo(zoom * ZOOM_STEP)}>
          +
        </button>
      </div>
    </div>
  );
}

export function SectorScreen({ view, heading = 'Subsektor' }: { view: Snapshot; heading?: string }) {
  const game = useGame();
  // Das Feld, dessen Vorkommen hier gerade gewürfelt wurde, und ob sein Ergebnis schon feststeht.
  const [rolled, setRolled] = useState<string>();
  const [settled, setSettled] = useState<string>();
  const selected = view.selected;
  const rolling = rolled !== undefined && rolled === selected?.id && settled !== rolled && selected.occurrence !== undefined && animated();
  const [shown, setShown] = useState(view.sector);
  if (!rolling && shown !== view.sector) setShown(view.sector);
  const sector = rolling ? shown : view.sector;
  // Ein Tippen irgendwo, solange der Würfel rollt, springt zum Ergebnis; der Zähler sagt es der Bühne.
  const [skips, setSkips] = useState(0);
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
        <h2 id="sector-title" className="section-title">
          {heading}
        </h2>
        <ZoomableMap>
          {(pixelsPerUnit) => (
            <svg className="sector-map" viewBox={`0 0 ${WIDTH.toFixed(1)} ${HEIGHT.toFixed(1)}`} role="group" aria-label="Karte des Subsektors">
              {sector.map((hex) => (
                <HexCell key={hex.id} hex={hex} selected={hex.id === selected?.id} disabled={rolling} detail={detailAt(pixelsPerUnit)} here={hex.id === view.location} />
              ))}
            </svg>
          )}
        </ZoomableMap>
        <p className="sector-legend small-label">
          Dunkle Felder sind nicht erzeugt: antippen, dann unten das Vorkommen würfeln. Helle ohne Zeichen sind leer. Das Bild zeigt die Welt: Größe, Atmosphäre als Leuchten, Wasser und Land, Lichter der Städte, ab TL 8 Umlaufbahnen. ★ Marinebasis, ▲ Scoutbasis, • rechts oben Gasriese.
        </p>
        {view.worlds.length > 0 && (
          <>
            <h3 className="section-title" style={{ fontSize: 11 }}>
              Welten
            </h3>
            <ul className="world-list">
              {view.worlds.map((w) => (
                <li key={w.id}>
                  <button type="button" onClick={() => game.chooseHex(w.column, w.row)}>
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
          </>
        )}
      </section>
      {selected && (
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
      )}
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
