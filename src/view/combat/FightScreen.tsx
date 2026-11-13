import { Fragment, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { AnimalSimView, AttackOption, CombatView, FighterView, Impact, SimView } from '../../controller';
import type { Range } from '../../model';
import { hex, rangeText, signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { DiceIcon } from '../icons';
import { DicePairView, DiceView, THROW_MS, useTimeline } from '../Dice';
import type { Patient } from './CombatScreen';
import { Arena, canAdopt, type Selection } from './Arena';
import { FireToggle } from './FireToggle';
import { StrikeToggle } from './StrikeToggle';

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
      </header>
      <section className="scroll combat-scroll fight" aria-label="Kampfsimulation">
        {combat.note && (
          <p className="error" role="alert">
            {combat.note}
          </p>
        )}
        <Arena sim={sim} impacts={impacts} selection={selection} onHeal={onHeal} quiet={quiet} />
      </section>
      {picked ? <AdoptDock picked={picked} selection={selection} /> : <FightDock combat={combat} sim={sim} />}
    </>
  );
}

const sideName = { pcs: 'SC', npcs: 'NSC' } as const;


/** So lange muss man auf einen NSC drücken, bis die Auswahl zum Übernehmen aufgeht. */
const LONG_PRESS_MS = 550;
/** So weit darf sich der Finger bewegen (Scrollen), ohne dass der lange Druck abbricht. */
const SLOP_PX = 10;

/**
 * Langes Drücken (oder ein Rechtsklick) löst `onHold` aus; das Loslassen danach ist kein Tippen.
 * Gibt die Handler für das Element und `consumed()` für dessen Klick zurück.
 */
export function useLongPress(onHold: () => void) {
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
  // Die Überraschung hält bis zum Alarm (SR 20); danach zieht die Partei mit dem höheren Wurf zuerst.
  const known = sim.pcSurprise !== undefined && sim.npcSurprise !== undefined;
  const alarm = sim.surprise && sim.alarm !== undefined && !sim.surprising ? `Alarm in Runde ${sim.alarm} · ` : '';
  const order = known ? (sim.surprising ? `Überraschung ${sideName[sim.surprising]}` : `${alarm}${sideName[sim.first]} zuerst`) : sim.needsSurprise ? 'Überraschung würfeln' : undefined;
  const surprise = known ? (sim.surprising ? `Überraschung: ${sideName[sim.surprising]}, bis zum Alarm` : `${alarm}${sideName[sim.first]} ziehen zuerst`) : undefined;
  return (
    <div className="fight-head">
      <div className="encounter-head fight-head-line">
        <button
          type="button"
          className="fight-head-main"
          onClick={() => game.showEncounterIntro()}
          aria-label={`Runde ${sim.round}, ${count} × ${sim.name}, ${sim.reaction === undefined ? 'Verhalten' : `Reaktion ${sim.reaction}`}: ${sim.reactionText}${surprise ? `, ${surprise}` : ''}. Übersicht zeigen`}
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

/** Die Entfernung des vorgewählten SC als Text: „Long, Band 4“, „Close, Berührung“ oder „entkommen“. */
export function distanceText(sim: SimView): string {
  if (sim.escaped || !sim.range) return 'entkommen, über 20 Bands';
  return `${rangeText[sim.range]}, ${sim.close ? 'Berührung' : `Band ${sim.band}`}`;
}

/** Die Entfernungen aller SC knapp: stehen alle gleich, wie `distanceText`, sonst je SC das Band. */
export function distancesText(sim: SimView): string {
  const first = sim.positions[0];
  if (!first || sim.positions.every((p) => p.band === first.band && p.close === first.close)) return first ? positionText(sim, first) : startText(sim);
  return sim.positions.map((p) => `${p.name.split(' ')[0]} ${p.escaped ? 'weg' : p.close ? 'Berührung' : `Band ${p.band}`}`).join(', ');
}

function positionText(sim: SimView, p: SimView['positions'][number]): string {
  if (p.escaped) return 'entkommen, über 20 Bands';
  if (p.close) return 'Close, Berührung';
  const range = sim.bands.find((b) => b.range !== 'close' && b.from <= p.band && p.band <= b.to)!.range;
  return `${rangeText[range]}, Band ${p.band}`;
}

/** Das Startband als Text, für die Übersicht der Begegnung. */
export function startText(sim: SimView): string {
  const { range, band, close } = sim.start;
  return range ? `${rangeText[range]}, ${close ? 'Berührung' : `Band ${band}`}` : 'über 20 Bands';
}

/** Schritte auf der Leiste, von rechts nach links: 0 Berührung, 1 Band 0, 2–21 Band 1–20, 22 entkommen. */
const LAST_STEP = 22;
/** Abstand der Leiste zu ihrem Rand in px, damit die Marken an den Enden ganz zu sehen sind (wie `--pad` im CSS). */
const RAY_PAD = 10;
/** Marken, die näher als so viele Schritte beieinander stehen, kommen übereinander. */
const STACK_STEPS = 1.5;
const rangeAbbr: Record<Range, string> = { close: 'C', short: 'C/S', medium: 'M', long: 'L', veryLong: 'VL' };
const stepOfBand = (band: number, close: boolean) => (close ? 0 : Math.min(band + 1, LAST_STEP));
const bandOfStep = (sim: SimView, step: number) => (step <= 1 ? sim.bands.find((b) => b.range === (step === 0 ? 'close' : 'short'))! : sim.bands.find((b) => b.from > 0 && b.from <= step - 1 && step - 1 <= b.to));

/**
 * Die Entfernung unten im Zug, über den Angriffsknöpfen: eine Leiste für alle. Rechts fest die NSC
 * (▲) auf Band 0, links davon jeder SC mit seiner Marke, je weiter weg, desto weiter links; ganz links
 * Band 20, dahinter „weg“ (entkommen). Gold gefüllt ist der vorgewählte SC (am Zug, beim NSC-Zug das
 * Ziel); über der Leiste seine Reichweite. Am SC-Zug geht der SC mit ▶ ein Band näher, mit ◀ weiter
 * weg; am NSC-Zug gehen die NSC mit ◀ näher, mit ▶ weiter weg, und alle SC rücken. Langes Drücken setzt das Band des vorgewählten SC frei. Wohin die Waffe am
 * Zug nicht reicht, ist die Leiste gestrichelt.
 */
function RangeBar({ sim }: { sim: SimView }) {
  const game = useGame();
  const pointer = useRef(0);
  const ray = useRef<HTMLDivElement>(null);
  const free = useLongPress(() => {
    const box = ray.current?.getBoundingClientRect();
    if (!box || sim.focus === undefined) return;
    const share = (pointer.current - box.left - RAY_PAD) / (box.width - 2 * RAY_PAD);
    const s = Math.min(LAST_STEP, Math.max(0, Math.round((1 - share) * LAST_STEP)));
    game.setBand(sim.focus, s === 0 ? 0 : s - 1, s === 0);
  });
  const move = sim.move;
  const at = (i: number, n?: number) => ({ '--i': String(i), ...(n === undefined ? {} : { '--n': String(n) }) }) as CSSProperties;
  const reaches = (s: number) => bandOfStep(sim, s)?.reaches ?? false;
  const steps = Array.from({ length: LAST_STEP }, (_, s) => s);
  const lastReach = steps.filter(reaches).pop() ?? 0;
  const zones = sim.bands.filter((b) => b.range !== 'close');
  const focusStep = stepOfBand(sim.band, sim.close);
  // Wer sich bewegt: am SC-Zug der SC, am NSC-Zug alle SC; danach richten sich die Pfeile.
  const moving = move?.pc !== undefined ? sim.positions.filter((p) => p.id === move.pc) : sim.positions;
  const canCloser = move?.can === true && moving.some((p) => !p.close);
  const canFarther = move?.can === true && moving.some((p) => !p.escaped);
  const mover = move === undefined ? undefined : move.pc === undefined ? 'NSC' : (sim.positions.find((p) => p.id === move.pc)?.name.split(' ')[0] ?? 'SC');
  const moveText = move ? `${mover} ${move.ran ? 'gelaufen, kein Angriff' : move.moved === 1 ? (move.can ? 'gegangen · 1 mehr: laufen' : 'gegangen') : '1 Band gehen, 2 laufen'}` : 'keiner am Zug';
  const focusName = sim.positions.find((p) => p.focus)?.name.split(' ')[0];
  // Marken übereinander, wenn sie zu nah beieinander stehen; die vorgewählte zuunterst.
  const placed: { x: number; level: number }[] = [];
  const marks = [...sim.positions]
    .sort((a, b) => Number(b.focus) - Number(a.focus))
    .map((p) => {
      const x = stepOfBand(p.band, p.close);
      let level = 0;
      while (placed.some((q) => q.level === level && Math.abs(q.x - x) < STACK_STEPS)) level++;
      placed.push({ x, level });
      return { p, x, level };
    });
  const step1 = (dir: -1 | 1) => {
    haptic('pick');
    game.moveBand(dir);
  };
  // Die Pfeile zeigen, wohin sich bewegt, wer am Zug ist: ein SC von links auf die NSC zu (▶ näher),
  // die NSC von rechts auf die SC zu (◀ näher).
  const npcsMove = move !== undefined && move.pc === undefined;
  const left = npcsMove ? { label: 'Die NSC gehen ein Band näher', can: canCloser, step: -1 as const } : { label: 'Ein Band weiter weg', can: canFarther, step: 1 as const };
  const right = npcsMove ? { label: 'Die NSC gehen ein Band weiter weg', can: canFarther, step: 1 as const } : { label: 'Ein Band näher', can: canCloser, step: -1 as const };
  return (
    <>
      <p className="ray-now" aria-live="polite">
        <span>
          <b>{sim.escaped || !sim.range ? 'Entkommen' : rangeText[sim.range]}</b>
          {focusName ? `${focusName} · ` : ''}
          {sim.escaped ? 'über 20 Bands' : sim.close ? 'Berührung' : `Band ${sim.band}`}
        </span>
        <span className="muted">halten: frei</span>
      </p>
      <div className="ray-range">
        <button type="button" className="ray-arrow" aria-label={left.label} disabled={!left.can} onClick={() => step1(left.step)}>
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
          aria-label={`Entfernung: ${sim.positions.map((p) => `${p.name} ${p.escaped ? 'entkommen' : p.close ? 'in Berührung' : `Band ${p.band}`}`).join(', ')}. Lange drücken: ${focusName ?? 'SC'} frei setzen`}
        >
          <span className="ray-line" style={at(lastReach, lastReach)} />
          {lastReach < LAST_STEP - 1 && <span className="ray-line out" style={at(LAST_STEP - 1, LAST_STEP - 1 - lastReach)} />}
          <span className="ray-line gone" style={at(LAST_STEP, 1)} />
          {zones.map((b) => {
            const out = !b.reaches;
            const center = b.range === 'short' ? 0.4 : (b.from + b.to) / 2 + 1;
            return (
              <Fragment key={b.range}>
                {b.range !== 'short' && <span className="ray-tick" style={at(b.from + 0.5)} />}
                <span className={out ? 'ray-label out' : 'ray-label'} style={at(center)}>
                  {rangeAbbr[b.range]}
                </span>
              </Fragment>
            );
          })}
          <span className="ray-tick" style={at(LAST_STEP - 0.5)} />
          <span className="ray-gone-label" style={at(LAST_STEP - 0.1)}>
            weg
          </span>
          {steps.slice(1).map((s) => (
            <span key={s} className={reaches(s) ? 'ray-dot' : 'ray-dot out'} style={at(s)} />
          ))}
          {!sim.escaped && focusStep > 0 && sim.focus !== undefined && <span className="ray-line span" style={at(focusStep, focusStep)} />}
          <span className="ray-npc" style={at(0)}>
            ▲
          </span>
          {marks.map(({ p, x, level }) => (
            <span key={p.id} className={p.focus ? 'ray-pc focus' : 'ray-pc'} style={{ ...at(x), '--level': String(level) } as CSSProperties} title={p.name}>
              {p.initial}
            </span>
          ))}
        </div>
        <button type="button" className="ray-arrow" aria-label={right.label} disabled={!right.can} onClick={() => step1(right.step)}>
          ▶
        </button>
      </div>
      <p className={move?.ran ? 'ray-move ran' : 'ray-move'} title={move?.reason}>
        <span>{moveText}</span>
      </p>
    </>
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
/**
 * Das Aufblitzen der Karte und die Zahl dazu. Mit `atStats` stehen die Attribute auf der Karte: Dann
 * zeigt `LossFloat` den Schaden an STR, DEX und END, und hier blitzt die Karte nur.
 */
export function ImpactMarks({ impacts, atStats = false }: { impacts: readonly Impact[]; atStats?: boolean }) {
  // Erst wenn eine Animation durch ist, gilt sie als gespielt; ein Neuzeichnen mittendrin bricht sie nicht ab.
  const fresh = impacts.filter((i) => !played.has(i.key));
  if (fresh.length === 0) return null;
  return (
    <>
      {fresh.map((i, n) => (
        <Fragment key={i.key}>
          {atStats && i.kind === 'damage' && i.lost ? (
            <span className={`impact-flash ${i.kind}`} aria-hidden="true" onAnimationEnd={() => played.add(i.key)} />
          ) : (
            <>
              <span className={`impact-flash ${i.kind}`} aria-hidden="true" />
              <span className={`impact-float ${i.kind}`} style={{ '--n': String(n) } as CSSProperties} aria-hidden="true" onAnimationEnd={() => played.add(i.key)}>
                {i.kind === 'damage' ? `−${i.damage}` : i.kind === 'hit' ? 'Treffer' : 'daneben'}
              </span>
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

/** Der Schaden an einem Attribut (STR, DEX oder END): die verlorenen Punkte steigen über dem Wert auf. */
export function LossFloat({ impacts, attr }: { impacts: readonly Impact[]; attr: 'str' | 'dex' | 'end' }) {
  const fresh = impacts.filter((i) => i.kind === 'damage' && (i.lost?.[attr] ?? 0) > 0 && !played.has(`${i.key}:${attr}`));
  if (fresh.length === 0) return null;
  return (
    <>
      {fresh.map((i) => (
        <span key={i.key} className="loss-float" aria-hidden="true" onAnimationEnd={() => played.add(`${i.key}:${attr}`)}>
          −{i.lost![attr]}
        </span>
      ))}
    </>
  );
}

/** Was auf dem Knopf über der Waffe steht: Primär, Sekundär oder Hände. */
function slotLabel(attack: AttackOption): string {
  return attack.slot === 'primary' ? 'Primär' : attack.slot === 'secondary' ? 'Sekundär' : 'Hände';
}

/**
 * Unten kompakt: in einer Zeile wer gegen wen, mit Ausweichen und Aussetzen rechts; darunter je Waffe ein Knopf
 * (Primär gefüllt, Sekundär umrandet) mit dem nötigen Wurf, der die Waffe nimmt und angreift. Ist
 * eine Schusswaffe leer, lädt ihr Knopf nach. Nach einem Treffer steht dort der Schaden.
 */
function FightDock({ combat, sim }: { combat: CombatView; sim: SimView }) {
  const game = useGame();
  const turn = sim.turn;
  const target = turn?.target === undefined ? undefined : sim.fighters.find((f) => f.id === turn.target);
  // Feuerstoß oder Einzelschuss wählt man nur bei einer Waffe, die beides kann (Automatic Rifle).
  const fire = turn?.attacks.find((a) => a.fire?.choosable)?.fire;
  return (
    <section className="dock fight-dock" aria-label="Zug">
      <RangeBar sim={sim} />
      {sim.needsSurprise ? (
        <>
          <p className="combat-pick">Der erste Wurf im Kampf: Hat eine Partei Überraschung?</p>
          <button
            type="button"
            className="action task-roll"
            onClick={() => {
              haptic('shake');
              game.rollSurprise();
            }}
          >
            <DiceIcon />
            Überraschung würfeln
          </button>
        </>
      ) : combat.damage ? (
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
      ) : turn ? (
        <>
          <div className="fight-who-row" aria-live="polite">
            <span className={`who-chip turn ${turn.side}`} title="am Zug">
              ▶ {turn.name.split(' ')[0]}
            </span>
            <span className="who-arrow" aria-hidden="true">
              →
            </span>
            {target ? (
              <span className={`who-chip target ${target.side}`} title="Ziel">
                ⌖ {target.name.split(' ')[0]}
              </span>
            ) : (
              <span className="muted">Ziel antippen</span>
            )}
            <button
              type="button"
              className="ghost compact fight-skip"
              title="Kein Angriff; bis zum nächsten Zug DM −1/−2/−4 auf Angriffe gegen ihn"
              disabled={turn.ran}
              onClick={() => {
                haptic('pick');
                game.evade();
              }}
            >
              Ausweichen
            </button>
            <button type="button" className="ghost compact fight-skip" onClick={() => game.skipTurn()}>
              Aussetzen
            </button>
          </div>
          <div className={turn.attacks.length > 1 ? 'attack-buttons' : 'attack-buttons single'}>
            {turn.attacks.map((a, i) => (
              <AttackButton key={a.weapon} attack={a} first={i === 0} label={slotLabel(a)} hasTarget={target !== undefined} ran={turn.ran} />
            ))}
          </div>
          {fire && <FireToggle fire={fire} compact />}
          {/* Voll oder geschwächt nur, wenn ein Schlag oder Hieb auch reicht. */}
          {turn.melee && turn.side === 'pcs' && turn.attacks.some((a) => a.reaches && a.melee) && <StrikeToggle melee={turn.melee} />}
        </>
      ) : (
        <p className="combat-pick">{sim.defeated ? 'Der Kampf ist entschieden. Heilen, übernehmen (lange drücken) oder die Begegnung beenden.' : 'Keiner ist am Zug.'}</p>
      )}
    </section>
  );
}

/** Ein Angriff mit einer Waffe: Platz (Primär …), Waffe, nötiger Wurf. Leer lädt er nach. */
function AttackButton({ attack: a, first, label, hasTarget, ran }: { attack: AttackOption; first: boolean; label: string; hasTarget: boolean; ran: boolean }) {
  const game = useGame();
  const ammo = a.ammo ? ` · ${a.ammo.rounds}/${a.ammo.capacity}` : '';
  if (a.empty) {
    const can = (a.ammo?.magazines ?? 0) > 0;
    return (
      <button
        type="button"
        className={first ? 'atk primary reload' : 'atk secondary reload'}
        disabled={!can}
        onClick={() => {
          haptic('pick');
          game.fightReloadWith(a.weapon);
        }}
      >
        <span className="atk-slot">{label}{ammo}</span>
        <span className="atk-name">{a.name}</span>
        <span className="atk-need small">{can ? `nachladen (${a.ammo!.magazines})` : 'leer'}</span>
      </button>
    );
  }
  const need = ran ? 'gelaufen' : !a.reaches ? 'reicht nicht' : a.odds ? (a.odds.chance <= 0 ? 'unmöglich' : `${Math.max(2, a.odds.need)}+`) : '–';
  const small = ran || !a.reaches || (a.odds !== undefined && a.odds.chance <= 0);
  return (
    <button
      type="button"
      className={first ? 'atk primary' : 'atk secondary'}
      disabled={!hasTarget || !a.reaches || ran}
      aria-label={`Mit ${a.name} angreifen${a.odds ? `, braucht ${Math.max(2, a.odds.need)}+` : ''}`}
      onClick={() => {
        haptic('land');
        game.fightAttackWith(a.weapon);
      }}
    >
      <span className="atk-slot">{label}{ammo}</span>
      <span className="atk-name">{a.name}</span>
      <span className={small ? 'atk-need small' : 'atk-need'}>{need}</span>
    </button>
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

/** Die DMs einer Partei in einer Zeile: „Leader +1 · Army/Marines +1“, ohne: „keine DMs“. */
function partsText(parts: SimView['surpriseParts']['pcs']): string {
  return parts.length === 0 ? 'keine DMs' : parts.map((p) => `${p.label} ${signed(p.dm)}`).join(' · ');
}

/**
 * Der erste Wurf im Kampf: die Überraschung (S. 5). Zwei Würfel, der der SC weiß, der der NSC
 * schwarz; darunter je Partei die DMs und die Summe, dann wer Überraschung hat. Ein Tippen überspringt.
 */
export function SurpriseDialog({ sim }: { sim: SimView }) {
  const game = useGame();
  const [phase, skip] = useTimeline([200, THROW_MS, 250]);
  const landed = phase >= 2;
  const pc = sim.pcSurprise!;
  const npc = sim.npcSurprise!;
  const pcTotal = pc.die + pc.dm;
  const npcTotal = npc.die + npc.dm;
  const side = (label: string, roll: { die: number; dm: number }, total: number, parts: SimView['surpriseParts']['pcs'], won: boolean) => (
    <div className={won && landed ? 'surprise-side won' : 'surprise-side'}>
      <span className="small-label">{label}</span>
      <span className="surprise-total">{landed ? total : '–'}</span>
      <span className="surprise-parts">
        1W6 {landed ? roll.die : '?'} {signed(roll.dm)}
        <br />
        {partsText(parts)}
      </span>
    </div>
  );
  return (
    <div className="modal">
      <section className="result surprise-roll" role="dialog" aria-modal="true" aria-labelledby="surprise-title" onClick={() => phase < 3 && skip(3)}>
        <span className="kicker">Erster Wurf im Kampf · S. 5</span>
        <h2 id="surprise-title" className="shop-buy-title">
          Überraschung
        </h2>
        {phase >= 1 ? (
          <DiceView dice={[pc.die, npc.die]} seed={pc.die * 7 + npc.die} landed={landed} tones={['white', 'black']} />
        ) : (
          <div className="dice-stage large" aria-hidden="true" />
        )}
        <div className="surprise-sides">
          {side('SC · weiß', pc, pcTotal, sim.surpriseParts.pcs, sim.surprise === 'pcs')}
          {side('NSC · schwarz', npc, npcTotal, sim.surpriseParts.npcs, sim.surprise === 'npcs')}
        </div>
        <p className={landed ? 'surprise-verdict shown' : 'surprise-verdict'} aria-live="polite">
          {sim.surprise
            ? `Überraschung: die ${sideName[sim.surprise]}! Sie ziehen allein, bis zum Alarm.`
            : `Keine Überraschung (3 oder mehr Unterschied nötig) – die ${sideName[sim.first]} ziehen zuerst.`}
        </p>
        <button type="button" className="primary" onClick={() => game.closeSurprise()}>
          Kampf beginnen
        </button>
      </section>
    </div>
  );
}

/** Ein Wurf gegen A oder F: „8 gegen A6“, oder das Wort der Tierart. */
function checkText(label: string, check: AnimalSimView['attack']): string {
  const total = check.dice[0] + check.dice[1];
  return check.need === undefined ? `${label}: ${wordText[check.word ?? ''] ?? check.word}` : `${label} 2W6: ${check.dice[0]} + ${check.dice[1]} = ${total} gegen ${label[0]}${check.need}`;
}

const wordText: Record<string, string> = { possible: 'wenn es kann', surprise: 'mit Überraschung', surprised: 'wenn überrascht', more: 'wenn mehr als Beute' };

/** In der Übersicht einer Tierbegegnung: die Werte der Tiere, die Würfe gegen A und F und was sie tun. */
function AnimalIntro({ animal, text, landed }: { animal: AnimalSimView; text: string; landed: boolean }) {
  const armor = animal.armor === 'nothing' ? 'keine Rüstung' : `${animal.armor}${animal.armorDm ? ` ${signed(animal.armorDm)}` : ''}`;
  const checks = animal.fleesFirst ? [checkText('Flucht', animal.flee), checkText('Angriff', animal.attack)] : [checkText('Angriff', animal.attack), checkText('Flucht', animal.flee)];
  return (
    <div className="intro-reaction">
      <span className="small-label">
        {animal.weight} kg · Hits {animal.hits[0]}/{animal.hits[1]} · {armor} · {animal.attacks.map((a) => `${a.damage} ${a.name}${a.dm ? ` ${signed(a.dm)}` : ''}`).join(', ')} · S{animal.speed}
      </span>
      <p className="intro-line">{checks.join(' · ')}</p>
      {animal.lure && <p className="intro-line">Köder 2W6: {animal.lure.dice[0]} + {animal.lure.dice[1]} {animal.lure.works ? '– wirkt auf Menschen: Die Begegnung beginnt in Berührung.' : '– wirkt nicht auf Menschen.'}</p>}
      <p className={landed ? 'intro-verdict shown' : 'intro-verdict'}>
        <strong>{text}</strong>
      </p>
    </div>
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
        <span className="kicker">
          {sim.animal ? `Tiere · ${sim.animal.terrain.split(',')[0]} · Wurf ${sim.roll}${sim.animal.tableDice ? ` (${sim.animal.tableDice[0]} + ${sim.animal.tableDice[1]})` : ''}` : `Begegnung · Wurf ${sim.roll}`}
        </span>
        <h2 id="intro-title" className="shop-buy-title">
          {npcs.length} × {sim.name}
          <span className="muted">
            {' '}
            ({sim.quantity === 0 ? 'ein Tier' : `${sim.quantity}W${sim.quantityDie}`})
          </span>
        </h2>
        {sim.animal ? (
          <AnimalIntro animal={sim.animal} text={sim.reactionText} landed={landed} />
        ) : (
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
        )}
        <p className="intro-line">
          Entfernung: <b>{startText(sim)}</b>
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
              {!sim.animal && (
                <span className="muted mono">
                  {' '}
                  STR {hex(n.upp.str)} DEX {hex(n.upp.dex)} END {hex(n.upp.end)} · {n.weapon} ({n.skill}) · {n.armor ?? 'keine Rüstung'}
                </span>
              )}
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
