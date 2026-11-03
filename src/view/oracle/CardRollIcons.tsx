import type { MapIcon, PathKind, Scatter } from '../../model';
import { mapText, scatterText } from '../format';

// Reine Darstellung der Wurffelder: Glockenkurve, Windrose und Kartensymbol als SVG.

const angles: Partial<Record<Scatter, number>> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
const red = 'var(--accent-text)';

/** Kleine Säulen der Glockenkurve, die gewürfelte Zahl hell. */
export function BellCurve({ value, weights }: { value: number; weights: readonly number[] }) {
  const max = Math.max(...weights);
  return (
    <svg className="bell-curve" viewBox="0 0 70 18" aria-hidden="true">
      {weights.map((w, i) => {
        const h = Math.max(1, (w / max) * 16);
        return <rect key={i} x={i * 7 + 0.5} y={18 - h} width={6} height={h} rx={1} fill={i + 1 === value ? 'var(--gold-bright)' : '#444'} />;
      })}
    </svg>
  );
}

/** Die Windrose: acht Striche, der Pfeil in Gold; Volltreffer als Stern, Fehlschlag als roter Strich. */
export function ScatterRose({ value, letters = false }: { value: Scatter; letters?: boolean }) {
  const angle = angles[value];
  return (
    <svg className="roll-svg" viewBox="0 0 100 100" role="img" aria-label={`Streuwürfel: ${scatterText[value]}`}>
      <circle cx={50} cy={50} r={38} fill="none" stroke="#3a3a3a" strokeWidth={1.5} />
      {Object.entries(angles).map(([key, a]) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const main = a % 90 === 0;
        const inner = main ? 30 : 33;
        return (
          <g key={key}>
            <line
              x1={50 + Math.cos(rad) * inner}
              y1={50 + Math.sin(rad) * inner}
              x2={50 + Math.cos(rad) * 38}
              y2={50 + Math.sin(rad) * 38}
              stroke={value === key ? 'currentColor' : '#555'}
              strokeWidth={main ? 2 : 1.3}
            />
            {letters && main && (
              <text x={50 + Math.cos(rad) * 47} y={50 + Math.sin(rad) * 47 + 3.5} fontSize={10} fontWeight={600} textAnchor="middle" fill={value === key ? 'var(--gold-bright)' : 'var(--dim)'}>
                {scatterText[key as Scatter]}
              </text>
            )}
          </g>
        );
      })}
      {angle !== undefined && (
        <g transform={`rotate(${angle} 50 50)`}>
          <path d="M50 16 L59 34 L53 32 L53 62 L47 62 L47 32 L41 34 Z" fill="currentColor" />
          <circle cx={50} cy={62} r={4.5} fill="var(--gold-deep)" />
        </g>
      )}
      {value === 'hit' && <polygon points={star()} fill="currentColor" />}
      {value === 'miss' && <line x1={32} y1={50} x2={68} y2={50} stroke={red} strokeWidth={6} strokeLinecap="round" />}
    </svg>
  );
}

function star(): string {
  return Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 ? 8 : 22;
    const a = ((i * 22.5 - 90) * Math.PI) / 180;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(' ');
}

/** Ein Weg vom Rand des Raums nach außen, je nach Wegart. */
function Path({ kind, x, y, dx, dy }: { kind: PathKind; x: number; y: number; dx: number; dy: number }) {
  const len = 26;
  const at = (l: number) => [x + dx * l, y + dy * l] as const;
  const [x2, y2] = at(len);
  const line = { stroke: 'currentColor', strokeWidth: 5, strokeLinecap: 'round' as const };
  switch (kind) {
    case 'none':
      return null;
    case 'path':
      return <line x1={x} y1={y} x2={x2} y2={y2} {...line} />;
    case 'hidden':
      return <line x1={x} y1={y} x2={x2} y2={y2} {...line} strokeDasharray="0.1 8" />;
    case 'deadEnd': {
      const [a, b] = at(len * 0.45);
      return (
        <>
          <line x1={x} y1={y} x2={a} y2={b} {...line} />
          <line x1={a - dy * 7} y1={b - dx * 7} x2={a + dy * 7} y2={b + dx * 7} {...line} strokeWidth={3} />
        </>
      );
    }
    case 'obstacle': {
      const [a, b] = at(len * 0.55);
      return (
        <>
          <line x1={x} y1={y} x2={x2} y2={y2} {...line} />
          <line x1={a - dy * 10} y1={b - dx * 10} x2={a + dy * 10} y2={b + dx * 10} {...line} stroke={red} />
        </>
      );
    }
  }
}

/** Ein Pfeil im Raum für oben oder unten, je nach Wegart. */
function Stair({ kind, x, up }: { kind: PathKind; x: number; up: boolean }) {
  if (kind === 'none') return null;
  const from = up ? 62 : 38;
  const to = up ? 38 : 62;
  const head = up ? `M${x - 6} ${to + 7} L${x} ${to} L${x + 6} ${to + 7}` : `M${x - 6} ${to - 7} L${x} ${to} L${x + 6} ${to - 7}`;
  const line = { stroke: 'currentColor', strokeWidth: 3.5, strokeLinecap: 'round' as const };
  const arrow = <path d={head} fill="none" {...line} strokeLinejoin="round" />;
  switch (kind) {
    case 'path':
      return (
        <>
          <line x1={x} y1={from} x2={x} y2={to} {...line} />
          {arrow}
        </>
      );
    case 'hidden':
      return (
        <>
          <line x1={x} y1={from} x2={x} y2={to} {...line} strokeDasharray="0.1 6" />
          {arrow}
        </>
      );
    case 'deadEnd':
      return (
        <>
          <line x1={x} y1={from} x2={x} y2={50} {...line} />
          <line x1={x - 5} y1={50} x2={x + 5} y2={50} {...line} strokeWidth={2.5} />
        </>
      );
    case 'obstacle':
      return (
        <>
          <line x1={x} y1={from} x2={x} y2={to} {...line} />
          {arrow}
          <line x1={x - 7} y1={50} x2={x + 7} y2={50} {...line} stroke={red} />
        </>
      );
  }
}

/** Das Kartensymbol: ein Raum von oben, Wege nach N, O, S, W; oben und unten als Pfeile im Raum. */
export function MapIconSvg({ map }: { map: MapIcon }) {
  return (
    <svg className="roll-svg" viewBox="0 0 100 100" role="img" aria-label={`Kartensymbol: ${mapText(map)}`}>
      <rect x={30} y={30} width={40} height={40} rx={3} fill="#232323" stroke="currentColor" strokeWidth={3} />
      <Path kind={map.north} x={50} y={30} dx={0} dy={-1} />
      <Path kind={map.east} x={70} y={50} dx={1} dy={0} />
      <Path kind={map.south} x={50} y={70} dx={0} dy={1} />
      <Path kind={map.west} x={30} y={50} dx={-1} dy={0} />
      <Stair kind={map.up} x={42} up />
      <Stair kind={map.down} x={58} up={false} />
    </svg>
  );
}
