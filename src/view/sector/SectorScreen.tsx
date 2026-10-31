import type { HexView, Snapshot } from '../../controller';
import { useGame } from '../game-context';

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
      return `${hex.id}, nicht erzeugt: Welt erschaffen`;
    case 'pending':
      return `${hex.id}, in Erschaffung: fortsetzen`;
    case 'empty':
      return `${hex.id}, leer`;
    case 'world':
      return `${hex.id}, ${hex.name}: Weltkarte öffnen`;
  }
}

/** Die Welt in der Mitte: Punkte für einen Asteroidengürtel, gefüllter Kreis mit Wasser, leerer ohne. */
function WorldSymbol({ hex, x, y }: { hex: HexView; x: number; y: number }) {
  if (hex.size === 0) {
    return (
      <g className="hex-belt">
        {[
          [-7, -2],
          [-2, 3],
          [3, -4],
          [7, 2],
          [0, -1],
          [-4, 6],
          [5, 6],
        ].map(([dx, dy], i) => (
          <circle key={i} cx={x + dx!} cy={y + dy!} r={1.6} />
        ))}
      </g>
    );
  }
  return <circle className={hex.hydrographics !== undefined && hex.hydrographics > 0 ? 'hex-world wet' : 'hex-world dry'} cx={x} cy={y} r={7} />;
}

function HexCell({ hex }: { hex: HexView }) {
  const game = useGame();
  const { x, y } = center(hex.column, hex.row);
  const shown = hex.state === 'world' || hex.state === 'pending';
  const interactive = hex.state !== 'empty';
  return (
    <g
      className={`hex hex-${hex.state}`}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label(hex)}
      onClick={interactive ? () => game.openHex(hex.column, hex.row) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              game.openHex(hex.column, hex.row);
            }
          : undefined
      }
    >
      <polygon points={corners(x, y)} />
      <text className="hex-id" x={x} y={y - S * 0.58}>
        {hex.id}
      </text>
      {shown && hex.starport !== undefined && (
        <text className="hex-port" x={x} y={y - S * 0.2}>
          {hex.starport}
        </text>
      )}
      {hex.state === 'world' && <WorldSymbol hex={hex} x={x} y={y + S * 0.12} />}
      {hex.state === 'pending' && (
        <text className="hex-pending" x={x} y={y + S * 0.22}>
          …
        </text>
      )}
      {shown && hex.navalBase && <polygon className="hex-base" points={star(x - S * 0.45, y - S * 0.12, 5.5)} />}
      {shown && hex.scoutBase && <polygon className="hex-base" points={`${x - S * 0.45},${y + S * 0.1} ${x - S * 0.45 - 5},${y + S * 0.1 + 8.5} ${x - S * 0.45 + 5},${y + S * 0.1 + 8.5}`} />}
      {shown && hex.gasGiant && <circle className="hex-giant" cx={x + S * 0.45} cy={y - S * 0.12} r={3.2} />}
      {hex.state === 'world' && hex.name && (
        <text className="hex-name" x={x} y={y + S * 0.62}>
          {shortName(hex.name, (hex.population ?? 0) >= 9)}
        </text>
      )}
    </g>
  );
}

/**
 * Der Subsektor: 8 × 10 Felder wie TAS Form 6. Ein nicht erzeugtes Feld (dunkel) antippen beginnt
 * die Weltenerschaffung, eine Welt antippen öffnet ihre Weltkarte. Darunter die Welten als Liste.
 */
export function SectorScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  return (
    <div className="screen">
      <section className="scroll sector" aria-labelledby="sector-title">
        <h2 id="sector-title" className="section-title">
          Subsektor
        </h2>
        <svg className="sector-map" viewBox={`0 0 ${WIDTH.toFixed(1)} ${HEIGHT.toFixed(1)}`} role="group" aria-label="Karte des Subsektors">
          {view.sector.map((hex) => (
            <HexCell key={hex.id} hex={hex} />
          ))}
        </svg>
        <p className="sector-legend small-label">
          Dunkle Felder sind nicht erzeugt: antippen, um zu würfeln. Helle ohne Zeichen sind leer. ● mit Wasser, ○ ohne, ★ Marinebasis, ▲ Scoutbasis, • rechts oben Gasriese.
        </p>
        {view.worlds.length > 0 && (
          <>
            <h3 className="section-title" style={{ fontSize: 11 }}>
              Welten
            </h3>
            <ul className="world-list">
              {view.worlds.map((w) => (
                <li key={w.id}>
                  <button type="button" onClick={() => game.openHex(w.column, w.row)}>
                    <span className="world-list-name">{w.name}</span>
                    <span className="mono world-list-hex">{w.id}</span>
                    <span className="mono world-list-uwp">{w.uwp}</span>
                    <span className="mono world-list-bases">{w.bases}</span>
                    <span className="world-list-trade">
                      {[...w.trade, ...(w.gasGiant ? ['G'] : [])].join(' ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
