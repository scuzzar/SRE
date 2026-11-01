import { useState } from 'react';
import type { HexView, SelectedHexView, Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { animated } from '../haptics';
import { CloseIcon, DiceIcon } from '../icons';
import { RollStage } from './WorldSheet';

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

function HexCell({ hex, selected, disabled }: { hex: HexView; selected: boolean; disabled: boolean }) {
  const game = useGame();
  const { x, y } = center(hex.column, hex.row);
  const shown = hex.state === 'world' || hex.state === 'pending';
  const choose = () => {
    if (!disabled) game.chooseHex(hex.column, hex.row);
  };
  return (
    <g
      className={`hex hex-${hex.state}${selected ? ' hex-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label(hex)}
      aria-pressed={hex.state === 'open' || hex.state === 'empty' ? selected : undefined}
      onClick={choose}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        choose();
      }}
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
 * Unten im Subsektor: das gewählte Feld. Ist es nicht erzeugt, würfelt der Knopf das Vorkommen; die
 * Würfel rollen hier, nicht auf der Weltkarte. Gibt es eine Welt, geht es mit „Welt erschaffen“ auf
 * die Weltkarte.
 */
function SectorDock({ selected, rolled, rolling, onRoll, onSettled }: { selected: SelectedHexView; rolled: boolean; rolling: boolean; onRoll: () => void; onSettled: () => void }) {
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
      {line && <RollStage key={line.index} line={line} animate={rolled && animated()} onSettled={onSettled} skips={0} />}
      {selected.state === 'open' && (
        <button type="button" className="roll generation-main" onClick={onRoll}>
          <DiceIcon />
          <span>
            Vorkommen würfeln
            <span className="small-label">1W6 · Welt bei {selected.target}+</span>
          </span>
        </button>
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
export function SectorScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  // Das Feld, dessen Vorkommen hier gerade gewürfelt wurde, und ob sein Ergebnis schon feststeht.
  const [rolled, setRolled] = useState<string>();
  const [settled, setSettled] = useState<string>();
  const selected = view.selected;
  const rolling = rolled !== undefined && rolled === selected?.id && settled !== rolled && selected.occurrence !== undefined && animated();
  const [shown, setShown] = useState(view.sector);
  if (!rolling && shown !== view.sector) setShown(view.sector);
  const sector = rolling ? shown : view.sector;
  return (
    <div className="screen">
      <section className="scroll sector" aria-labelledby="sector-title">
        <h2 id="sector-title" className="section-title">
          Subsektor
        </h2>
        <svg className="sector-map" viewBox={`0 0 ${WIDTH.toFixed(1)} ${HEIGHT.toFixed(1)}`} role="group" aria-label="Karte des Subsektors">
          {sector.map((hex) => (
            <HexCell key={hex.id} hex={hex} selected={hex.id === selected?.id} disabled={rolling} />
          ))}
        </svg>
        <p className="sector-legend small-label">
          Dunkle Felder sind nicht erzeugt: antippen, dann unten das Vorkommen würfeln. Helle ohne Zeichen sind leer. ● mit Wasser, ○ ohne, ★ Marinebasis, ▲ Scoutbasis, • rechts oben Gasriese.
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
