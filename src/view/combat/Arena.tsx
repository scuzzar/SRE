import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { AttackArrow, FighterView, Impact, SimView } from '../../controller';
import type { Range, WoundState } from '../../model';
import { hex, rangeText, woundStateText } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import type { Patient } from './CombatScreen';
import { ImpactMarks, LossFloat, useLongPress } from './FightScreen';

/**
 * Die Kampfsimulation in zwei Spalten: links die SC, rechts die NSC, dazwischen die Entfernung als
 * senkrechte Leiste. Pfeile (rechtwinklig: auf der Seite des Angreifers bis zur Höhe des Ziels, dann
 * hinüber) zeigen, wer wen angreift: gold gestrichelt das gewählte Ziel, rot ein
 * Treffer, grau ein Fehlschuss; der letzte Angriff bleibt blass stehen. Nur Anzeige; gerechnet wird im Model.
 */

/** Die Auswahl der NSC zum Übernehmen: `picked` ist offen, solange es sie gibt. */
export interface Selection {
  readonly picked: readonly string[] | undefined;
  start(id: string): void;
  toggle(id: string): void;
  end(): void;
}

/** Übernehmen lässt sich jeder NSC, der noch lebt; Übernommene stehen nicht mehr in der Liste. */
export const canAdopt = (f: FighterView) => f.side === 'npcs' && f.state !== 'dead';

/** Bereits gezeichnete Pfeile eines Angriffs; jeder fliegt nur einmal. */
const flown = new Set<string>();

export function Arena({ sim, impacts, selection, onHeal, quiet }: { sim: SimView; impacts: readonly Impact[]; selection: Selection; onHeal: (patient: Patient) => void; quiet: boolean }) {
  const arena = useRef<HTMLDivElement>(null);
  const pcs = sim.fighters.filter((f) => f.side === 'pcs');
  const npcs = sim.fighters.filter((f) => f.side === 'npcs');
  return (
    <div className="arena" ref={arena}>
      <div className="arena-side pcs" aria-label="SC">
        <span className="arena-label">SC</span>
        {pcs.map((f) => (
          <FighterCard key={f.id} fighter={f} selection={selection} onHeal={onHeal} impacts={impacts.filter((i) => i.id === f.id)} />
        ))}
      </div>
      <RangeRail sim={sim} />
      <div className="arena-side npcs" aria-label="NSC">
        <span className="arena-label">{selection.picked ? 'Übernehmen' : 'NSC'}</span>
        {npcs.map((f) => (
          <FighterCard key={f.id} fighter={f} selection={selection} onHeal={onHeal} impacts={impacts.filter((i) => i.id === f.id)} />
        ))}
      </div>
      <Arrows sim={sim} arena={arena} quiet={quiet} />
    </div>
  );
}

/** Der Zustand als ein Zeichen hinter dem Namen: Blutstropfen, Gesicht mit X-Augen (schwer verwundet rot gefüllt), Kreuz. */
function StateIcon({ state }: { state: WoundState }) {
  const label = woundStateText[state];
  switch (state) {
    case 'wounded':
      return (
        <svg className="state-icon wounded" viewBox="0 0 12 14" role="img" aria-label={label}>
          <path d="M6 1 C6 1 1.5 6.5 1.5 9 a4.5 4.5 0 0 0 9 0 C10.5 6.5 6 1 6 1 z" />
        </svg>
      );
    case 'unconscious':
    case 'serious':
      return (
        <svg className={`state-icon ${state}`} viewBox="0 0 14 14" role="img" aria-label={label}>
          <circle cx="7" cy="7" r="6" />
          <path d="M3.6 4.4 l2 2 m0 -2 l-2 2 M8.4 4.4 l2 2 m0 -2 l-2 2 M4.5 10 h5" />
        </svg>
      );
    case 'dead':
      return (
        <svg className="state-icon dead" viewBox="0 0 10 14" role="img" aria-label={label}>
          <path d="M5 1 V13 M1.5 4.5 H8.5" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Ein Kämpfer in drei Zeilen: Name mit Zeichen (am Zug, Ziel, Zustand, Anführer), STR/DEX/END und
 * Waffe mit Rüstung. Antippen wählt das Ziel; langes Drücken auf einen NSC öffnet das Übernehmen.
 */
function FighterCard({ fighter: f, selection, onHeal, impacts }: { fighter: FighterView; selection: Selection; onHeal: (patient: Patient) => void; impacts: readonly Impact[] }) {
  const game = useGame();
  const adoptable = canAdopt(f);
  const choosing = selection.picked !== undefined;
  const checked = selection.picked?.includes(f.id) ?? false;
  const press = useLongPress(() => (choosing ? selection.toggle(f.id) : selection.start(f.id)));
  const classes = ['fcard', f.side, f.turn ? 'turn' : '', f.targeted && !choosing ? 'targeted' : '', f.neighbour && !choosing ? 'neighbour' : '', checked ? 'chosen' : '', f.acted ? 'acted' : '', f.state === 'dead' ? 'out' : ''].filter(Boolean).join(' ');
  const enabled = choosing ? adoptable : f.targetable;
  const tap = () => {
    if (press.consumed() || !enabled) return;
    haptic('pick');
    if (choosing) selection.toggle(f.id);
    else game.chooseFightTarget(f.id);
  };
  const role = choosing ? { role: 'checkbox', 'aria-checked': checked } : { 'aria-pressed': f.targetable ? f.targeted : undefined };
  const healable = !choosing && (f.healing.wake || f.healing.treatable);
  return (
    <div className={classes} data-fighter={f.id}>
      <button
        type="button"
        className="fcard-main"
        {...role}
        aria-disabled={!enabled || undefined}
        {...(adoptable ? press.handlers : {})}
        onClick={tap}
        aria-label={`${f.name}${f.leader ? ', Anführer' : ''}, ${woundStateText[f.state]}${f.turn ? ', am Zug' : f.targeted ? ', Ziel' : ''}${choosing ? (adoptable ? ', zum Übernehmen wählen' : '') : f.targetable ? ', als Ziel wählen' : ''}`}
        aria-description={adoptable && !choosing ? 'Lange drücken: übernehmen' : undefined}
      >
        <span className="fcard-name">
          {choosing && adoptable && (
            <span className={checked ? 'fighter-check checked' : 'fighter-check'} aria-hidden="true">
              {checked ? '✓' : ''}
            </span>
          )}
          {!choosing && f.turn && (
            <span className="fcard-marker turn" aria-hidden="true">
              ▶
            </span>
          )}
          {!choosing && !f.turn && f.targeted && (
            <span className="fcard-marker target" aria-hidden="true">
              ⌖
            </span>
          )}
          <span className="fcard-title">{f.name}</span>
          <StateIcon state={f.state} />
          {f.leader && (
            <span className="fcard-leader" aria-hidden="true">
              ★
            </span>
          )}
        </span>
        <span className="fcard-stats mono">
          {(['str', 'dex', 'end'] as const).map((k) => (
            <span key={k} className={f.current[k] < f.upp[k] ? 'stat hurt' : 'stat'}>
              {k.toUpperCase()} {hex(Math.max(0, f.current[k]))}
              <LossFloat impacts={impacts} attr={k} />
            </span>
          ))}
        </span>
        <span className="fcard-gear">
          {f.weapon}
          {f.armor ? ` · ${f.armor}` : ''}
          {f.blows !== undefined ? ` · ${f.blows} ${f.blows === 1 ? 'Schlag' : 'Schläge'}` : ''}
        </span>
      </button>
      <ImpactMarks impacts={impacts} atStats />
      {healable && (
        <button type="button" className="fcard-heal" onClick={() => onHeal(f.side === 'npcs' ? { npc: f.id, name: f.name } : { npc: undefined, pc: f.id, name: f.name })}>
          Heilen
        </button>
      )}
    </div>
  );
}

/** Schritte auf der Leiste: 0 Berührung, 1 Band 0, 2–21 Band 1–20; 22 heißt entkommen. */
const LAST_STEP = 21;
const rangeAbbr: Record<Range, string> = { close: 'C', short: 'C/S', medium: 'M', long: 'L', veryLong: 'VL' };
const stepOf = (sim: SimView) => (sim.close ? 0 : sim.band + 1);

/**
 * Die Entfernung als senkrechte Leiste: oben ● die SC, ▲ die NSC so weit unten, wie sie weg sind.
 * ▲ geht ein Band näher, ▼ weiter weg, nach den Regeln für die Partei am Zug; langes Drücken auf
 * die Leiste setzt das Band frei. Wohin die Waffe am Zug nicht reicht, ist sie gestrichelt.
 */
function RangeRail({ sim }: { sim: SimView }) {
  const game = useGame();
  const track = useRef<HTMLDivElement>(null);
  const pointer = useRef(0);
  const free = useLongPress(() => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    const s = Math.min(LAST_STEP, Math.max(0, Math.round(((pointer.current - box.top) / box.height) * LAST_STEP)));
    game.setBand(s === 0 ? 0 : s - 1, s === 0);
  });
  const move = sim.move;
  const step = stepOf(sim);
  const at = (s: number) => ({ '--y': String(s / LAST_STEP) }) as CSSProperties;
  const span = (from: number, to: number) => ({ '--y': String(from / LAST_STEP), '--h': String((to - from) / LAST_STEP) }) as CSSProperties;
  const reachTo = Math.max(0, ...sim.bands.filter((b) => b.reaches).map((b) => (b.range === 'close' ? 0 : b.to + 1)));
  const go = (dir: -1 | 1) => {
    haptic('pick');
    game.moveBand(dir);
  };
  const where = sim.escaped || !sim.range ? 'entkommen' : `${rangeText[sim.range]}, ${sim.close ? 'Berührung' : `Band ${sim.band}`}`;
  return (
    <div className="rail" aria-label="Entfernung">
      <span className="rail-now" aria-live="polite">
        <b>{sim.escaped || !sim.range ? 'Entk.' : rangeAbbr[sim.range]}</b>
        <span>{sim.escaped ? '>20' : sim.close ? 'Berühr.' : `Band ${sim.band}`}</span>
      </span>
      <button type="button" className="rail-step" aria-label="Ein Band näher" title={move?.reason} disabled={step === 0 || !move?.can} onClick={() => go(-1)}>
        ▲
      </button>
      <div
        className="rail-track"
        ref={track}
        role="img"
        aria-label={`Entfernung: ${where}. Lange drücken: frei setzen`}
        {...free.handlers}
        onPointerDown={(e) => {
          pointer.current = e.clientY;
          free.handlers.onPointerDown(e);
        }}
        onClick={() => free.consumed()}
      >
        <span className="rail-line" style={span(0, Math.min(LAST_STEP, reachTo))} />
        {reachTo < LAST_STEP && <span className="rail-line out" style={span(reachTo, LAST_STEP)} />}
        {sim.bands
          .filter((b) => b.range !== 'close')
          .map((b) => (
            <span key={b.range} className={b.reaches ? 'rail-tick' : 'rail-tick out'} style={at(b.range === 'short' ? 0 : b.from + 0.5)}>
              {rangeAbbr[b.range]}
            </span>
          ))}
        {!sim.escaped && step > 0 && <span className="rail-span" style={span(0, step)} />}
        <span className="rail-pc" style={at(0)} />
        <span className={sim.escaped ? 'rail-npc escaped' : sim.close ? 'rail-npc close' : 'rail-npc'} style={at(sim.escaped ? LAST_STEP : step)}>
          ▲
        </span>
      </div>
      <button type="button" className="rail-step" aria-label="Ein Band weiter weg" title={move?.reason} disabled={sim.escaped || !move?.can} onClick={() => go(1)}>
        ▼
      </button>
    </div>
  );
}

interface Drawn {
  readonly key: string;
  readonly d: string;
  readonly kind: 'plan' | 'neighbour' | 'hit' | 'miss';
  readonly fresh: boolean;
}

/** Die Mitte der Innenkante einer Karte: bei den SC rechts, bei den NSC links. */
function anchor(root: HTMLElement, id: string, base: DOMRect): { x: number; y: number; side: 'pcs' | 'npcs' } | undefined {
  const card = root.querySelector<HTMLElement>(`[data-fighter="${id}"]`);
  if (!card) return undefined;
  const r = card.getBoundingClientRect();
  const side = card.classList.contains('pcs') ? 'pcs' : 'npcs';
  return { x: (side === 'pcs' ? r.right : r.left) - base.left, y: r.top + r.height / 2 - base.top, side };
}

function route(root: HTMLElement, from: string, to: string, base: DOMRect): string | undefined {
  const p = anchor(root, from, base);
  const q = anchor(root, to, base);
  if (!p || !q || p.side === q.side) return undefined;
  // Rechtwinklig: auf der eigenen Seite der Lücke senkrecht bis auf die Höhe des Gegners, dann waagrecht
  // hinüber. So läuft der Pfeil neben der Leiste und kreuzt sie nur einmal, quer.
  const dir = p.side === 'pcs' ? 1 : -1;
  const lane = p.x + dir * LANE_PX;
  const end = q.x - dir * 3;
  const dy = q.y - p.y;
  const f = (n: number) => n.toFixed(1);
  if (Math.abs(dy) < 2) return `M${f(p.x)},${f(p.y)} H${f(end)}`;
  const sy = Math.sign(dy);
  const r = Math.min(CORNER_PX, Math.abs(dy) / 2, LANE_PX);
  return [
    `M${f(p.x)},${f(p.y)}`,
    `H${f(lane - dir * r)}`,
    `Q${f(lane)},${f(p.y)} ${f(lane)},${f(p.y + sy * r)}`,
    `V${f(q.y - sy * r)}`,
    `Q${f(lane)},${f(q.y)} ${f(lane + dir * r)},${f(q.y)}`,
    `H${f(end)}`,
  ].join(' ');
}

/** Wie weit der senkrechte Teil eines Pfeils von der Kante des Angreifers in der Lücke läuft. */
const LANE_PX = 9;
/** Rundung der Ecken eines Pfeils. */
const CORNER_PX = 5;

/**
 * Die Pfeile über der Arena. Die Lage kommt aus den Karten selbst; sie wird nach jedem Zeichnen und
 * bei jeder Größenänderung neu gemessen, aber nur übernommen, wenn sich etwas geändert hat.
 */
function Arrows({ sim, arena, quiet }: { sim: SimView; arena: React.RefObject<HTMLDivElement | null>; quiet: boolean }) {
  const [drawn, setDrawn] = useState<readonly Drawn[]>([]);
  const turn = sim.turn;
  const plan = turn && turn.target && !sim.needsSurprise && !turn.ran && turn.attacks.some((a) => a.reaches) ? { from: turn.id, to: turn.target } : undefined;
  const neighbours = turn ? sim.fighters.filter((f) => f.neighbour).map((f) => f.id) : [];
  const shots: readonly AttackArrow[] = sim.arrows;
  const signature = JSON.stringify([plan, neighbours, shots.map((s) => [s.key, s.from, s.to, s.hit]), quiet, sim.fighters.map((f) => f.id)]);
  useLayoutEffect(() => {
    const root = arena.current;
    if (!root) return;
    const measure = () => {
      const base = root.getBoundingClientRect();
      const next: Drawn[] = [];
      for (const s of shots) {
        const fresh = !flown.has(s.key);
        // Solange ein Popup offen ist, wartet ein neuer Pfeil; sonst flöge er ungesehen dahinter.
        if (fresh && quiet) continue;
        const d = route(root, s.from, s.to, base);
        if (d) next.push({ key: s.key, d, kind: s.hit ? 'hit' : 'miss', fresh });
      }
      if (plan) {
        const d = route(root, plan.from, plan.to, base);
        if (d) next.push({ key: `plan-${plan.from}-${plan.to}`, d, kind: 'plan', fresh: false });
        for (const n of neighbours) {
          const nd = route(root, plan.from, n, base);
          if (nd) next.push({ key: `n-${n}`, d: nd, kind: 'neighbour', fresh: false });
        }
      }
      setDrawn((now) => (JSON.stringify(now) === JSON.stringify(next) ? now : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
    // `signature` fasst zusammen, was die Pfeile bestimmt; die Lage misst `measure` selbst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return (
    <svg className="arena-arrows" aria-hidden="true">
      <defs>
        {(['plan', 'hit', 'miss'] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} className={`arrow-head ${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" />
          </marker>
        ))}
      </defs>
      {drawn.map((a) => (
        <path
          key={`halo-${a.key}`}
          d={a.d}
          {...(a.fresh ? { pathLength: 100 } : {})}
          className={`arrow-halo${a.kind === 'neighbour' ? ' thin' : ''}${a.fresh ? ' fresh' : a.kind === 'hit' || a.kind === 'miss' ? ' past' : ''}`}
        />
      ))}
      {drawn.map((a) => (
        <path
          key={a.key}
          d={a.d}
          {...(a.fresh ? { pathLength: 100 } : {})}
          className={`arrow ${a.kind}${a.fresh ? ' fresh' : a.kind === 'hit' || a.kind === 'miss' ? ' past' : ''}`}
          markerEnd={a.kind === 'neighbour' ? undefined : `url(#arrow-${a.kind})`}
          onAnimationEnd={() => {
            if (!a.fresh) return;
            flown.add(a.key);
            setDrawn((now) => now.map((x) => (x.key === a.key ? { ...x, fresh: false } : x)));
          }}
        />
      ))}
    </svg>
  );
}
