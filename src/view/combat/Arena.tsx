import { useLayoutEffect, useRef, useState } from 'react';
import type { AttackArrow, FighterView, Impact, SimView } from '../../controller';
import type { WoundState } from '../../model';
import { hex, woundStateText } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import type { Patient } from './CombatScreen';
import { ImpactMarks, LossFloat, useLongPress } from './FightScreen';

/**
 * Die Kampfsimulation in zwei Spalten: links die SC, rechts die NSC, dazwischen eine schmale Lücke
 * für die Pfeile; die Entfernung steht unten im Zug. Pfeile (rechtwinklig: auf der Seite des Angreifers bis zur Höhe des Ziels, dann
 * hinüber) zeigen, wer wen angreift, in der Farbe des Angreifers (SC gold, NSC rot): gestrichelt das gewählte
 * Ziel, durchgezogen ein Treffer, grau ein Fehlschuss; ein Angriff fliegt, steht kurz und blendet aus. Jede Seite
 * hat ihre Farbe, gleich ob am Zug oder Ziel. Nur Anzeige; gerechnet wird im Model.
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
      <div className="arena-gap" aria-hidden="true" />
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
          {f.evading && (
            <span className="fcard-evade" title="weicht aus" aria-label="weicht aus">
              ↯
            </span>
          )}
          {f.escaped && (
            <span className="fcard-escaped" title="entkommen, über 20 Bands">
              weg
            </span>
          )}
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

interface Drawn {
  readonly key: string;
  readonly d: string;
  readonly kind: 'plan' | 'neighbour' | 'hit' | 'miss';
  /** Die Seite des Angreifers; sie gibt dem Pfeil die Farbe. */
  readonly side: 'pcs' | 'npcs';
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

function route(root: HTMLElement, from: string, to: string, base: DOMRect): { d: string; side: 'pcs' | 'npcs' } | undefined {
  const p = anchor(root, from, base);
  const q = anchor(root, to, base);
  if (!p || !q || p.side === q.side) return undefined;
  return { d: path(p, q), side: p.side };
}

/** Der Weg eines Pfeils von der Innenkante des Angreifers zu der des Ziels. */
function path(p: { x: number; y: number; side: 'pcs' | 'npcs' }, q: { x: number; y: number }): string {
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
        // Ein Angriff fliegt einmal, steht kurz und blendet aus; danach bleibt kein Pfeil hängen.
        if (flown.has(s.key)) continue;
        const fresh = true;
        // Solange ein Popup offen ist, wartet ein neuer Pfeil; sonst flöge er ungesehen dahinter.
        if (quiet) continue;
        const r = route(root, s.from, s.to, base);
        if (r) next.push({ key: s.key, ...r, kind: s.hit ? 'hit' : 'miss', fresh });
      }
      if (plan) {
        const r = route(root, plan.from, plan.to, base);
        if (r) next.push({ key: `plan-${plan.from}-${plan.to}`, ...r, kind: 'plan', fresh: false });
        for (const n of neighbours) {
          const nr = route(root, plan.from, n, base);
          if (nr) next.push({ key: `n-${n}`, ...nr, kind: 'neighbour', fresh: false });
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
        {(['pcs', 'npcs', 'miss'] as const).map((k) => (
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
          className={`arrow ${a.kind}${a.kind === 'miss' ? '' : ` ${a.side}`}${a.fresh ? ' fresh' : a.kind === 'hit' || a.kind === 'miss' ? ' past' : ''}`}
          markerEnd={a.kind === 'neighbour' ? undefined : `url(#arrow-${a.kind === 'miss' ? 'miss' : a.side})`}
          onAnimationEnd={(e) => {
            // Erst wenn er ausgeblendet ist, ist der Pfeil geflogen; dann fällt er weg.
            if (!a.fresh || e.animationName !== 'arrow-fade') return;
            flown.add(a.key);
            setDrawn((now) => now.filter((x) => x.key !== a.key));
          }}
        />
      ))}
    </svg>
  );
}
