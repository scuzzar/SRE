import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { CombatView, FighterView, Impact, SimView } from '../../controller';
import type { Range } from '../../model';
import { hex, rangeText, signed, woundStateText } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import type { Patient } from './CombatScreen';
import { FireToggle } from './FireToggle';

/**
 * Die Kampfsimulation einer laufenden Begegnung: oben fest Runde, Reaktion, Überraschung und
 * Entfernung, darunter scrollen die NSC in Zugreihenfolge. Wer am Zug ist, wählt nur ein Ziel und würfelt; Rüstung ist die des
 * Ziels, Reichweite die Entfernung. Nach einem Treffer der Schaden, dann der nächste Zug.
 */
export function FightScreen({ combat, onHeal, quiet }: { combat: CombatView; onHeal: (patient: Patient) => void; quiet: boolean }) {
  const sim = combat.sim!;
  // Solange ein Popup offen ist, warten die Animationen; sonst liefen sie ungesehen dahinter ab.
  const impacts = quiet ? [] : sim.impacts;
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
        <Fighters sim={sim} onHeal={onHeal} selection={selection} impacts={impacts} />
      </section>
      {picked ? <AdoptDock picked={picked} selection={selection} /> : <FightDock combat={combat} sim={sim} />}
    </>
  );
}

const sideName = { pcs: 'SC', npcs: 'NSC' } as const;

/** Die Waffe knapp: „Foil-2“, wenn die Fertigkeit wie die Waffe heißt, sonst „Automatic Pistol (APi-1)“. */
const weaponText = (f: FighterView) => (f.skill.startsWith(`${f.weapon}-`) ? f.skill : `${f.weapon} (${f.skill})`);

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
 * Knapp in einer Zeile, damit die NSC Platz haben: Runde und Begegnung, dahinter das erste Wort der
 * Reaktion und wer zuerst zieht, dann Beenden. Antippen zeigt die Übersicht mit allen Würfen.
 */
function FightHead({ sim }: { sim: SimView }) {
  const game = useGame();
  const count = sim.fighters.filter((f) => f.side === 'npcs').length;
  const reaction = sim.reactionText.split('.')[0];
  const order = sim.pcSurprise && sim.npcSurprise ? (sim.surprise ? `Überraschung ${sideName[sim.surprise]}` : `${sideName[sim.first]} zuerst`) : undefined;
  const surprise = sim.pcSurprise && sim.npcSurprise ? (sim.surprise ? `Überraschung: ${sideName[sim.surprise]}` : `${sideName[sim.first]} ziehen zuerst`) : undefined;
  return (
    <div className="fight-head">
      <div className="encounter-head fight-head-line">
        <button
          type="button"
          className="fight-head-main"
          onClick={() => game.showEncounterIntro()}
          aria-label={`Runde ${sim.round}, ${count} × ${sim.name}, Reaktion ${sim.reaction}: ${sim.reactionText}${surprise ? `, ${surprise}` : ''}. Übersicht zeigen`}
        >
          <span className="fight-head-title">
            Runde {sim.round} · {count} × {sim.name}
          </span>
          <span className="fight-head-tail">
            {reaction}
            {order ? ` · ${order}` : ''}
          </span>
        </button>
        <button type="button" className="ghost compact" onClick={() => game.endEncounter()}>
          Beenden
        </button>
      </div>
      {sim.defeated && <p className="fight-decided">Entschieden: Die {sideName[sim.defeated]} sind außer Gefecht.</p>}
    </div>
  );
}

/** Schritte auf dem Strahl: 0 Berührung, 1 Band 0, 2–21 Band 1–20, 22 entkommen. */
const LAST_STEP = 21;
/** Abstand des Strahls zu seinem Rand in px, damit die Marken an den Enden ganz zu sehen sind (wie `--pad` im CSS). */
const RAY_PAD = 6;
const rangeAbbr: Record<Range, string> = { close: 'C', short: 'C/S', medium: 'M', long: 'L', veryLong: 'VL' };
const stepOf = (sim: SimView) => (sim.close ? 0 : sim.band + 1);
const bandOfStep = (sim: SimView, step: number) => (step === 0 ? sim.bands.find((b) => b.range === 'close')! : step === 1 ? sim.bands.find((b) => b.range === 'short')! : sim.bands.find((b) => b.from > 0 && b.from <= step - 1 && step - 1 <= b.to)!);

/** Die Entfernung als Text: „Long, Band 4“, „Close, Berührung“ oder „entkommen“. */
export function distanceText(sim: SimView): string {
  if (sim.escaped || !sim.range) return 'entkommen, über 20 Bands';
  return `${rangeText[sim.range]}, ${sim.close ? 'Berührung' : `Band ${sim.band}`}`;
}

/**
 * Die Entfernung für alle Angriffe in einer Zeile: links die Reichweite, daneben der Strahl mit
 * einem Punkt je Band und Strichen an den Grenzen, zwischen zwei Pfeilen. ◀ geht ein Band näher, ▶
 * weiter weg, nach den Regeln für die Partei am Zug (1 Band gehend, 2 laufend). Langes Drücken auf
 * den Strahl setzt das Band frei. Wohin die Waffe am Zug nicht reicht, ist gestrichelt.
 */
function RangeBar({ sim }: { sim: SimView }) {
  const game = useGame();
  const pointer = useRef(0);
  const ray = useRef<HTMLDivElement>(null);
  const free = useLongPress(() => {
    const box = ray.current?.getBoundingClientRect();
    if (!box) return;
    const s = Math.min(LAST_STEP, Math.max(0, Math.round(((pointer.current - box.left - RAY_PAD) / (box.width - 2 * RAY_PAD)) * LAST_STEP)));
    game.setBand(s === 0 ? 0 : s - 1, s === 0);
  });
  const move = sim.move;
  const step = stepOf(sim);
  const reaches = (s: number) => bandOfStep(sim, s).reaches;
  const steps = Array.from({ length: LAST_STEP + 1 }, (_, s) => s);
  const lastReach = steps.filter(reaches).pop() ?? 0;
  const at = (i: number, n?: number) => ({ '--i': String(i), ...(n === undefined ? {} : { '--n': String(n) }) }) as CSSProperties;
  const zones = sim.bands.filter((b) => b.range !== 'close');
  const moveText = move ? `${sideName[move.side]} ${move.ran ? 'gelaufen, kein Angriff' : move.moved === 1 ? (move.can ? 'gegangen · 1 mehr: laufen' : 'gegangen') : '1 Band gehen, 2 laufen'}` : 'keiner am Zug';
  const step1 = (dir: -1 | 1) => {
    haptic('pick');
    game.moveBand(dir);
  };
  return (
    <>
    <div className="ray-range">
      <div className="ray-now" aria-live="polite">
        <b>{sim.escaped || !sim.range ? 'Entkommen' : rangeText[sim.range]}</b>
        <span>{sim.escaped ? 'über 20 Bands' : sim.close ? 'Berührung' : `Band ${sim.band}`}</span>
      </div>
      <button type="button" className="ray-arrow" aria-label="Ein Band näher" disabled={step === 0 || !move?.can} onClick={() => step1(-1)}>
        ◀
      </button>
      <div
        className="ray"
        ref={ray}
        {...free.handlers}
        onPointerDown={(e) => {
          pointer.current = e.clientX;
          free.handlers.onPointerDown(e);
        }}
        onClick={() => free.consumed()}
        role="img"
        aria-label={`Entfernung: ${distanceText(sim)}. Lange drücken: frei setzen`}
      >
        <span className="ray-line" style={at(0, lastReach)} />
        {lastReach < LAST_STEP && <span className="ray-line out" style={at(lastReach, LAST_STEP - lastReach)} />}
        {zones.map((b) => {
          const first = b.range === 'short' ? 0 : b.from + 1;
          const tick = b.range === 'short' ? 0 : b.from + 0.5;
          return (
            <Fragment key={b.range}>
              {tick > 0 && <span className="ray-tick" style={at(tick)} />}
              <span className={b.reaches ? (first === 0 ? 'ray-label first' : 'ray-label') : 'ray-label out'} style={at(tick)}>
                {rangeAbbr[b.range]}
              </span>
            </Fragment>
          );
        })}
        {steps.slice(1).map((s) => (
          <span key={s} className={reaches(s) ? 'ray-dot' : 'ray-dot out'} style={at(s)} />
        ))}
        {!sim.escaped && step > 0 && <span className="ray-line span" style={at(0, step)} />}
        <span className="ray-pc" style={at(0)} />
        {sim.escaped ? (
          <span className="ray-escaped" style={at(LAST_STEP)}>
            entkommen ▲
          </span>
        ) : (
          <span className={sim.close ? 'ray-npc close' : 'ray-npc'} style={at(step)}>
            ▲
          </span>
        )}
      </div>
      <button type="button" className="ray-arrow" aria-label="Ein Band weiter weg" disabled={sim.escaped || !move?.can} onClick={() => step1(1)}>
        ▶
      </button>
    </div>
    <p className={move?.ran ? 'ray-move ran' : 'ray-move'} title={move?.reason}>
      <span>{moveText}</span>
      <span className="muted">halten: frei</span>
    </p>
    </>
  );
}

/**
 * Die NSC der Begegnung; die SC stehen oben in der Leiste. Wer zum Ziel eines SC am Zug taugt, lässt
 * sich antippen. Langes Drücken auf einen NSC öffnet die Auswahl zum Übernehmen; dann hakt Antippen an.
 */
function Fighters({ sim, onHeal, selection, impacts }: { sim: SimView; onHeal: (patient: Patient) => void; selection: Selection; impacts: readonly Impact[] }) {
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
          <FighterRow key={f.id} fighter={f} onHeal={onHeal} selection={selection} impacts={impacts.filter((i) => i.id === f.id)} />
        ))}
      </ol>
    </div>
  );
}

function FighterRow({ fighter: f, onHeal, selection, impacts }: { fighter: FighterView; onHeal: (patient: Patient) => void; selection: Selection; impacts: readonly Impact[] }) {
  const game = useGame();
  const adoptable = canAdopt(f);
  const choosing = selection.picked !== undefined;
  const checked = selection.picked?.includes(f.id) ?? false;
  const press = useLongPress(() => (choosing ? selection.toggle(f.id) : selection.start(f.id)));
  const physical = (['str', 'dex', 'end'] as const).map((k) => ({ k, value: f.current[k], hurt: f.current[k] < f.upp[k] }));
  const classes = ['fighter', f.turn ? 'turn' : '', f.targeted && !choosing ? 'targeted' : '', f.neighbour && !choosing ? 'neighbour' : '', checked ? 'chosen' : '', f.acted ? 'acted' : '', f.state === 'dead' ? 'out' : ''].filter(Boolean).join(' ');
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
          {f.name}
          {f.leader && <span className="npc-leader"> · Anführer</span>}
          {!choosing && <RoleBadge fighter={f} />}
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
            {weaponText(f)}
            {f.armor ? ` · ${f.armor}` : ''}
          </span>
        </span>
      </button>
      <ImpactMarks impacts={impacts} />
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

/** Am Zug, Ziel oder Nachbar als Abzeichen hinter dem Namen; auch in der Leiste der SC. */
export function RoleBadge({ fighter: f }: { fighter: Pick<FighterView, 'turn' | 'targeted' | 'neighbour'> }) {
  if (f.turn) return <span className="role-badge turn">▶ am Zug</span>;
  if (f.targeted) return <span className="role-badge target">⌖ Ziel</span>;
  if (f.neighbour) return <span className="role-badge neighbour">Nachbar</span>;
  return null;
}

/** Bereits gespielte Animationen; auch wenn der Screen neu aufgebaut wird, läuft jede nur einmal. */
const played = new Set<string>();

/**
 * Kurze Animationen für Treffer, Fehlschüsse und Schaden: ein Aufblitzen über der Karte und eine
 * aufsteigende Zahl oder ein Wort. Nur Anzeige; jede läuft einmal.
 */
export function ImpactMarks({ impacts }: { impacts: readonly Impact[] }) {
  // Erst wenn eine Animation durch ist, gilt sie als gespielt; ein Neuzeichnen mittendrin bricht sie nicht ab.
  const fresh = impacts.filter((i) => !played.has(i.key));
  if (fresh.length === 0) return null;
  return (
    <>
      {fresh.map((i, n) => (
        <Fragment key={i.key}>
          <span className={`impact-flash ${i.kind}`} aria-hidden="true" />
          <span className={`impact-float ${i.kind}`} style={{ '--n': String(n) } as CSSProperties} aria-hidden="true" onAnimationEnd={() => played.add(i.key)}>
            {i.kind === 'damage' ? `−${i.damage}` : i.kind === 'hit' ? 'Treffer' : 'daneben'}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** Unten in zwei Zeilen: wer gegen wen, darunter Waffe mit Magazin und was er braucht; darunter Angreifen, Schaden, Nachladen, Aussetzen. */
function FightDock({ combat, sim }: { combat: CombatView; sim: SimView }) {
  const game = useGame();
  const turn = sim.turn;
  const target = turn?.target === undefined ? undefined : sim.fighters.find((f) => f.id === turn.target);
  const empty = turn?.ammo !== undefined && turn.ammo.rounds < (turn.fire?.rounds ?? 1);
  return (
    <section className="dock" aria-label="Zug">
      {turn ? (
        <div className="fight-turn fight-turn-two" aria-live="polite">
          <span className="fight-who">
            <span className="who-chip turn" title="am Zug">
              ▶ {turn.name}
            </span>
            <span className="who-arrow" aria-hidden="true">
              →
            </span>
            {target ? (
              <span className="who-chip target" title="Ziel">
                ⌖ {target.name}
              </span>
            ) : (
              <span className="muted">Ziel antippen</span>
            )}
          </span>
          <span className="fight-weapon">
            <span className="muted">
              {turn.weapon}
              {turn.ammo ? ` ${turn.ammo.rounds}/${turn.ammo.capacity}` : ''}
            </span>
            <strong className="fight-need">{!turn.reaches ? 'reicht nicht' : turn.odds ? (turn.odds.chance <= 0 ? 'unmöglich' : `${Math.max(2, turn.odds.need)}+`) : ''}</strong>
          </span>
          {turn.fire && <FireToggle fire={turn.fire} compact />}
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
            {combat.damage.victim ? `Schaden ${combat.damage.victim.split(' ')[0]}` : 'Schaden'} ({combat.damage.wounds}W6){combat.damage.left > 1 ? ` · noch ${combat.damage.left}` : ''}
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
              disabled={!turn || !target || !turn.reaches || empty || turn.ran}
              onClick={() => {
                haptic('land');
                game.fightAttack();
              }}
            >
              <CombatIcon />
              {turn?.ran ? 'Gelaufen' : 'Angreifen'}
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
          <span className="muted">
            {' '}
            ({sim.quantity}W{sim.quantityDie})
          </span>
        </h2>
        <div className="intro-reaction">
          <span className="small-label">Reaktion (2W6{sim.reactionDm ? `, DM ${signed(sim.reactionDm)}` : ''})</span>
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
          Entfernung: <b>{distanceText(sim)}</b>
          {sim.rangeDice
            ? ` (2W6: ${sim.rangeDice[0]} + ${sim.rangeDice[1]}${sim.terrain ? `, ${sim.terrain.name} ${signed(sim.terrain.dm)}` : ''}${sim.bandDie ? `; 1W${sim.bandDie.sides}: ${sim.bandDie.die}` : ''})`
            : ''}
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
          Weiter
        </button>
      </section>
    </div>
  );
}
