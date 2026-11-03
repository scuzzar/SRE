import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { CombatView, FighterView, SimView } from '../../controller';
import { damageDetail, hex, rangeText, signed, woundStateText } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import type { Patient } from './CombatScreen';

/**
 * Die Kampfsimulation einer laufenden Begegnung: oben fest Runde, Reaktion, Überraschung und
 * Entfernung, darunter scrollen die NSC in Zugreihenfolge. Wer am Zug ist, wählt nur ein Ziel und würfelt; Rüstung ist die des
 * Ziels, Reichweite die Entfernung. Nach einem Treffer der Schaden, dann der nächste Zug.
 */
export function FightScreen({ combat, onHeal }: { combat: CombatView; onHeal: (patient: Patient) => void }) {
  const sim = combat.sim!;
  // Welche NSC zum Übernehmen angehakt sind; undefined heißt: keine Auswahl offen. Reine Anzeige,
  // übernehmen tut der Controller. Wer nicht mehr übernommen werden kann, fällt heraus.
  const [chosen, setChosen] = useState<readonly string[] | undefined>(undefined);
  const adoptable = sim.fighters.filter(canAdopt).map((f) => f.id);
  const picked = chosen?.filter((id) => adoptable.includes(id));
  const selection: Selection = {
    picked,
    start: (id) => setChosen([id]),
    toggle: (id) => setChosen((now) => (now === undefined ? [id] : now.includes(id) ? now.filter((n) => n !== id) : [...now, id])),
    end: () => setChosen(undefined),
  };
  return (
    <>
      <header className="fight-top">
        <FightHead sim={sim} />
        <RangeBar sim={sim} />
      </header>
      <section className="scroll combat-scroll fight" aria-label="Kampfsimulation">
        {combat.note && (
          <p className="error" role="alert">
            {combat.note}
          </p>
        )}
        <PcHeal sim={sim} character={combat.character} onHeal={onHeal} />
        <Fighters sim={sim} onHeal={onHeal} selection={selection} />
        <Recent combat={combat} />
      </section>
      {picked ? <AdoptDock picked={picked} selection={selection} /> : <FightDock combat={combat} sim={sim} />}
    </>
  );
}

const sideName = { pcs: 'SC', npcs: 'NSC' } as const;

/** Übernehmen lässt sich jeder NSC, der noch lebt; Übernommene stehen nicht mehr in der Liste. */
const canAdopt = (f: FighterView) => f.side === 'npcs' && f.state !== 'dead';

/** Die Auswahl der NSC zum Übernehmen: `picked` ist offen, solange es sie gibt. */
interface Selection {
  readonly picked: readonly string[] | undefined;
  start(id: string): void;
  toggle(id: string): void;
  end(): void;
}

/** So lange muss man auf einen NSC drücken, bis die Auswahl zum Übernehmen aufgeht. */
const LONG_PRESS_MS = 550;
/** So weit darf sich der Finger bewegen (Scrollen), ohne dass der lange Druck abbricht. */
const SLOP_PX = 10;

/**
 * Langes Drücken (oder ein Rechtsklick) löst `onHold` aus; das Loslassen danach ist kein Tippen.
 * Gibt die Handler für das Element und `consumed()` für dessen Klick zurück.
 */
function useLongPress(onHold: () => void) {
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | undefined>(undefined);
  const held = useRef(false);
  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = undefined;
  };
  useEffect(() => cancel, []);
  const hold = () => {
    cancel();
    held.current = true;
    haptic('confirm');
    onHold();
  };
  return {
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        held.current = false;
        if (e.button !== 0) return;
        cancel();
        press.current = { timer: setTimeout(hold, LONG_PRESS_MS), x: e.clientX, y: e.clientY };
      },
      onPointerMove: (e: PointerEvent) => {
        if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > SLOP_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      // Auf dem Handy folgt dem langen Druck oft noch das Kontextmenü; das ist derselbe Druck.
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        if (!held.current) hold();
      },
    },
    /** Ob der Klick nur das Ende eines langen Drucks ist; dann zählt er nicht. */
    consumed: () => {
      const was = held.current;
      held.current = false;
      return was;
    },
  };
}

/**
 * Knapp, damit die NSC Platz haben: Runde und Beenden, darunter in einer Zeile Reaktion und wer
 * zuerst zieht. Antippen zeigt die Übersicht mit allen Würfen.
 */
function FightHead({ sim }: { sim: SimView }) {
  const game = useGame();
  const surprise = sim.pcSurprise && sim.npcSurprise ? (sim.surprise ? `Überraschung: ${sideName[sim.surprise]}` : `${sideName[sim.first]} ziehen zuerst`) : undefined;
  return (
    <div className="fight-head">
      <div className="encounter-head">
        <h2 className="section-title">
          Runde {sim.round} · {sim.fighters.filter((f) => f.side === 'npcs').length} × {sim.name}
        </h2>
        <button type="button" className="ghost compact" onClick={() => game.endEncounter()}>
          Beenden
        </button>
      </div>
      <button type="button" className="encounter-reaction link" onClick={() => game.showEncounterIntro()}>
        Reaktion {sim.reaction}: {sim.reactionText}
        {surprise ? ` · ${surprise}` : ''}
      </button>
      {sim.defeated && <p className="fight-decided">Entschieden: Die {sideName[sim.defeated]} sind außer Gefecht.</p>}
    </div>
  );
}

/** Die Entfernung für alle Angriffe; gewürfelt, jederzeit änderbar. */
function RangeBar({ sim }: { sim: SimView }) {
  const game = useGame();
  return (
    <div className="fight-range">
      <span className="small-label">
        Entfernung
        {sim.rangeDice ? ` (2W6: ${sim.rangeDice[0]} + ${sim.rangeDice[1]}${sim.terrain ? `, ${sim.terrain.name} ${signed(sim.terrain.dm)}` : ''})` : ''}
      </span>
      <div className="segmented fight-ranges" role="radiogroup" aria-label="Entfernung">
        {sim.ranges.map((r) => (
          <button key={r.range} type="button" role="radio" aria-checked={sim.range === r.range} className={r.reaches ? undefined : 'out'} onClick={() => game.setRange(r.range)}>
            {rangeText[r.range]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Ist der SC oben verwundet, lässt er sich heilen; sein Zustand steht schon in der Leiste. */
function PcHeal({ sim, character, onHeal }: { sim: SimView; character: string; onHeal: (patient: Patient) => void }) {
  const pc = sim.fighters.find((f) => f.side === 'pcs' && f.name === character);
  if (!pc || !(pc.healing.wake || pc.healing.treatable)) return null;
  return (
    <button type="button" className="ghost compact pc-heal" onClick={() => onHeal({ npc: undefined, pc: pc.id, name: pc.name })}>
      {pc.name} heilen
    </button>
  );
}

/**
 * Die NSC der Begegnung; die SC stehen oben in der Leiste. Wer zum Ziel eines SC am Zug taugt, lässt
 * sich antippen. Langes Drücken auf einen NSC öffnet die Auswahl zum Übernehmen; dann hakt Antippen an.
 */
function Fighters({ sim, onHeal, selection }: { sim: SimView; onHeal: (patient: Patient) => void; selection: Selection }) {
  const fighters = sim.fighters.filter((f) => f.side === 'npcs');
  if (fighters.length === 0) return null;
  return (
    <div className="fighters">
      <div className="fighters-head">
        <h3 className="section-title" style={{ fontSize: 11 }}>
          NSC
        </h3>
        {!selection.picked && fighters.some(canAdopt) && <span className="log-hint">lange drücken zum Übernehmen</span>}
      </div>
      <ol className="fighter-list">
        {fighters.map((f) => (
          <FighterRow key={f.id} fighter={f} onHeal={onHeal} selection={selection} />
        ))}
      </ol>
    </div>
  );
}

function FighterRow({ fighter: f, onHeal, selection }: { fighter: FighterView; onHeal: (patient: Patient) => void; selection: Selection }) {
  const game = useGame();
  const adoptable = canAdopt(f);
  const choosing = selection.picked !== undefined;
  const checked = selection.picked?.includes(f.id) ?? false;
  const press = useLongPress(() => (choosing ? selection.toggle(f.id) : selection.start(f.id)));
  const physical = (['str', 'dex', 'end'] as const).map((k) => ({ k, value: f.current[k], hurt: f.current[k] < f.upp[k] }));
  const classes = ['fighter', f.turn ? 'turn' : '', f.targeted && !choosing ? 'targeted' : '', checked ? 'chosen' : '', f.acted ? 'acted' : '', f.state === 'dead' ? 'out' : ''].filter(Boolean).join(' ');
  // In der Auswahl hakt Antippen an; sonst wählt es das Ziel, wenn der NSC dazu taugt.
  const enabled = choosing ? adoptable : f.targetable;
  const tap = () => {
    if (press.consumed() || !enabled) return;
    haptic('pick');
    if (choosing) selection.toggle(f.id);
    else game.chooseFightTarget(f.id);
  };
  const role = choosing ? { role: 'checkbox', 'aria-checked': checked } : { 'aria-pressed': f.targetable ? f.targeted : undefined };
  return (
    <li className={classes}>
      <button
        type="button"
        className="fighter-main"
        {...role}
        aria-disabled={!enabled || undefined}
        {...(adoptable ? press.handlers : {})}
        onClick={tap}
        aria-label={`${f.name}${f.turn ? ', am Zug' : ''}${choosing ? (adoptable ? ', zum Übernehmen wählen' : '') : f.targetable ? ', als Ziel wählen' : ''}`}
        aria-description={adoptable && !choosing ? 'Lange drücken: übernehmen' : undefined}
      >
        <span className="fighter-name">
          {choosing && adoptable && <span className={checked ? 'fighter-check checked' : 'fighter-check'} aria-hidden="true">
              {checked ? '✓' : ''}
            </span>}
          {f.turn && <span className="fighter-turn">▶ </span>}
          {f.name}
          {f.leader && <span className="npc-leader"> · Anführer</span>}
        </span>
        <span className={`npc-state state-${f.state}`}>
          {woundStateText[f.state]}
          {f.acted ? ' · war dran' : ''}
        </span>
        <span className="npc-stats mono">
          {physical.map((p) => (
            <span key={p.k} className={p.hurt ? 'hurt' : undefined}>
              {p.k.toUpperCase()} {hex(Math.max(0, p.value))}
            </span>
          ))}
          <span className="muted">
            {f.weapon} ({f.skill}) · {f.armor ?? 'keine Rüstung'}
          </span>
        </span>
      </button>
      {!choosing && (f.healing.wake || f.healing.treatable) && (
        <div className="npc-actions">
          <button type="button" className="ghost compact" onClick={() => onHeal(f.side === 'npcs' ? { npc: f.id, name: f.name } : { npc: undefined, pc: f.id, name: f.name })}>
            Heilen
          </button>
        </div>
      )}
    </li>
  );
}

/** Die letzten Angriffe mit ihrem Schaden. */
function Recent({ combat }: { combat: CombatView }) {
  if (combat.recent.length === 0) return null;
  return (
    <div className="combat-recent">
      <h2 className="section-title">Letzte Angriffe</h2>
      <ol>
        {[...combat.recent].reverse().map(({ index, item, damage }) => (
          <li key={index} className="combat-recent-item">
            <span className={item.success ? 'verdict' : 'verdict negative'}>{item.success ? 'TREFFER' : 'DANEBEN'}</span>
            <span>
              {item.character}
              {item.victim ? ` → ${item.victim}` : ''} · {item.weapon}
            </span>
            <span className="muted mono">
              {item.dice[0]} + {item.dice[1]} {signed(item.dm)} = {item.total}
              {damage ? ` · Schaden ${damageDetail(damage)}` : item.damagePending ? ' · Schaden offen' : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Unten in einer Zeile: wer gegen wen (Waffe, Magazin) und was er braucht; darunter Angreifen, Schaden, Nachladen, Aussetzen. */
function FightDock({ combat, sim }: { combat: CombatView; sim: SimView }) {
  const game = useGame();
  const turn = sim.turn;
  const target = turn?.target === undefined ? undefined : sim.fighters.find((f) => f.id === turn.target);
  const empty = turn?.ammo?.rounds === 0;
  return (
    <section className="dock" aria-label="Zug">
      {turn ? (
        <div className="fight-turn" aria-live="polite">
          <span className="fight-who">
            {turn.name} {target ? `→ ${target.name}` : '– Ziel antippen'}{' '}
            <span className="muted">
              ({turn.weapon}
              {turn.ammo ? ` ${turn.ammo.rounds}/${turn.ammo.capacity}` : ''})
            </span>
          </span>
          <strong className="fight-need">{!turn.reaches ? 'reicht nicht' : turn.odds ? (turn.odds.chance <= 0 ? 'unmöglich' : `${Math.max(2, turn.odds.need)}+`) : ''}</strong>
        </div>
      ) : (
        <p className="combat-pick">{sim.defeated ? 'Der Kampf ist entschieden. Heilen, übernehmen (lange drücken) oder die Begegnung beenden.' : 'Keiner ist am Zug.'}</p>
      )}
      <div className="actions fight-actions">
        {combat.damage ? (
          <button
            type="button"
            className="action draw"
            onClick={() => {
              haptic('shake');
              game.rollDamage();
            }}
          >
            <DiceIcon />
            Schaden ({combat.damage.wounds}W6)
          </button>
        ) : (
          <>
            {turn && (
              <button type="button" className="action dice" onClick={() => game.skipTurn()}>
                Aussetzen
              </button>
            )}
            {turn?.ammo && turn.ammo.rounds < turn.ammo.capacity && (
              <button type="button" className="action dice" disabled={turn.ammo.magazines === 0} onClick={() => game.fightReload()}>
                Nachladen ({turn.ammo.magazines})
              </button>
            )}
            <button
              type="button"
              className="action task-roll"
              disabled={!turn || !target || !turn.reaches || empty}
              onClick={() => {
                haptic('land');
                game.fightAttack();
              }}
            >
              <CombatIcon />
              Angreifen
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Unten statt der Zugknöpfe, solange NSC zum Übernehmen gewählt werden: als SC, als NSC oder abbrechen. */
function AdoptDock({ picked, selection }: { picked: readonly string[]; selection: Selection }) {
  const game = useGame();
  const adopt = (asNpc: boolean) => {
    haptic('confirm');
    game.adoptNpcs(picked, asNpc);
    selection.end();
  };
  return (
    <section className="dock" aria-label="Übernehmen">
      <div className="fight-turn" aria-live="polite">
        <span className="fight-who">{picked.length === 0 ? 'NSC antippen zum Übernehmen' : `${picked.length} NSC übernehmen`}</span>
      </div>
      <div className="actions fight-actions">
        <button type="button" className="action dice" onClick={selection.end}>
          Abbrechen
        </button>
        <button type="button" className="action dice" disabled={picked.length === 0} onClick={() => adopt(true)}>
          Als NSC
        </button>
        <button type="button" className="action task-roll" disabled={picked.length === 0} onClick={() => adopt(false)}>
          Als SC
        </button>
      </div>
    </section>
  );
}

/**
 * Die Übersicht einer eben gewürfelten Begegnung: wer kommt, und die Würfe für Reaktion, Entfernung
 * und Überraschung. Die Reaktion rollt; ein Tippen überspringt. Gespeichert ist schon alles.
 */
export function EncounterIntro({ sim }: { sim: SimView }) {
  const game = useGame();
  const [phase, skip] = useTimeline([300, THROW_MS, 250]);
  const landed = phase >= 2;
  const npcs = sim.fighters.filter((f) => f.side === 'npcs');
  return (
    <div className="modal">
      <section className="result encounter-intro" role="dialog" aria-modal="true" aria-labelledby="intro-title" onClick={() => phase < 3 && skip(3)}>
        <span className="kicker">Begegnung · Wurf {sim.roll}</span>
        <h2 id="intro-title" className="shop-buy-title">
          {npcs.length} × {sim.name}
          <span className="muted"> ({sim.quantity}W6)</span>
        </h2>
        <div className="intro-reaction">
          <span className="small-label">Reaktion (2W6{sim.reactionDm ? `, Bevölkerung 9+ ${signed(sim.reactionDm)}` : ''})</span>
          {sim.reactionDice && phase >= 1 ? (
            <DicePairView dice={[sim.reactionDice[0]!, sim.reactionDice[1]!]} seed={sim.reactionDice[0]! * 7 + sim.reactionDice[1]!} landed={landed} size="small" />
          ) : (
            <div className="dice-stage small" aria-hidden="true" />
          )}
          <p className={landed || !sim.reactionDice ? 'intro-verdict shown' : 'intro-verdict'}>
            <strong>{sim.reaction}</strong> {sim.reactionText}
          </p>
        </div>
        <p className="intro-line">
          Entfernung: <b>{rangeText[sim.range]}</b>
          {sim.rangeDice ? ` (2W6: ${sim.rangeDice[0]} + ${sim.rangeDice[1]}${sim.terrain ? `, ${sim.terrain.name} ${signed(sim.terrain.dm)}` : ''})` : ''}
        </p>
        {sim.pcSurprise && sim.npcSurprise && (
          <p className="intro-line">
            Überraschung: SC {sim.pcSurprise.die} {signed(sim.pcSurprise.dm)} gegen NSC {sim.npcSurprise.die} {signed(sim.npcSurprise.dm)}
            {sim.surprise ? ` – die ${sideName[sim.surprise]} haben Überraschung.` : ` – keine; die ${sideName[sim.first]} ziehen zuerst.`}
          </p>
        )}
        <ol className="intro-npcs">
          {npcs.map((n) => (
            <li key={n.id}>
              <b>{n.name}</b>
              {n.leader && <span className="npc-leader"> · Anführer</span>}
              <span className="muted mono">
                {' '}
                STR {hex(n.upp.str)} DEX {hex(n.upp.dex)} END {hex(n.upp.end)} · {n.weapon} ({n.skill}) · {n.armor ?? 'keine Rüstung'}
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="primary" onClick={() => game.closeEncounterIntro()}>
          Zum Kampf
        </button>
      </section>
    </div>
  );
}
