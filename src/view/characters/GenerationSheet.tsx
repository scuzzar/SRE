import { useEffect, useRef, useState } from 'react';
import type { CareerLine, GenerationAction, GenerationView } from '../../controller';
import type { ThrowOdds } from '../../model';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { characteristicLabel, credits, hex, signed } from '../format';
import { useGame } from '../game-context';
import { animated, haptic, stopHaptics } from '../haptics';
import { CloseIcon, DiceIcon } from '../icons';

/** Wie lange das Ergebnis nach dem Landen braucht, bis es feststeht und die Knöpfe wieder gehen. */
const SETTLE_MS = 350;

/**
 * Die Charaktererschaffung im Vordergrund: oben die Charakterkarte, die sich Wurf für Wurf füllt,
 * darunter der Lebenslauf. Unten die Würfelbühne mit dem letzten Wurf und die Knöpfe für den
 * nächsten Schritt. Jeder Wert wird einzeln mit der Würfelanimation bestimmt; geloggt ist der Wurf
 * schon, bevor die Würfel rollen. Karte, Lebenslauf und nächster Schritt zeigen aber erst dann den
 * neuen Stand, wenn das Ergebnis unten feststeht; bis dahin bleibt der vorige Snapshot stehen. Ein
 * Tippen auf die Bühne überspringt.
 */
export function GenerationSheet({ generation }: { generation: GenerationView }) {
  const game = useGame();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Was schon da war, als die Erschaffung aufging, rollt nicht noch einmal.
  const [seen] = useState(generation.lines.length);
  const latest = generation.lines.at(-1);
  // Der letzte Wurf, dessen Ergebnis unten feststeht; bis dahin rollt er noch.
  const [settled, setSettled] = useState(-1);
  const animate = latest !== undefined && latest.index >= seen && animated();
  const rolling = animate && settled < latest.index;
  // Was oben steht: der Stand vor dem Wurf, solange er rollt.
  const [shown, setShown] = useState(generation);
  if (!rolling && shown !== generation) setShown(generation);
  const view = rolling ? shown : generation;
  // Der Lebenslauf wächst nach unten; der neueste Wurf soll zu sehen sein.
  const body = useRef<HTMLDivElement>(null);
  const count = view.lines.length;
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [count]);

  return (
    <div className="overlay">
      <section className="sheet generation" role="dialog" aria-modal="true" aria-labelledby="generation-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="generation-title">Charaktererschaffung</h2>
          <span className="header-right">
            {confirmDiscard ? (
              <button type="button" className="ghost danger compact" onClick={() => game.discardGeneration()}>
                Wirklich verwerfen?
              </button>
            ) : (
              <button type="button" className="ghost compact" onClick={() => setConfirmDiscard(true)}>
                Verwerfen
              </button>
            )}
            <button type="button" className="icon-button" aria-label="Später weiter" onClick={() => game.closeGeneration()}>
              <CloseIcon />
            </button>
          </span>
        </div>

        <div className="sheet-body" ref={body}>
          <CharacterSheet generation={view} />
          <CareerList lines={view.lines} />
        </div>

        <div className="generation-dock">
          {latest && <RollStage key={latest.index} line={latest} animate={animate} onSettled={setSettled} />}
          <p className="generation-prompt" aria-live="polite">
            {view.prompt}
          </p>
          {view.error && (
            <p className="error" role="alert">
              {view.error}
            </p>
          )}
          <Actions action={view.action} disabled={rolling} />
        </div>
      </section>
    </div>
  );
}

/** Die Charakterkarte, wie sie gerade steht. */
function CharacterSheet({ generation }: { generation: GenerationView }) {
  const next = generation.step === 'characteristics' ? generation.upp.find((u) => u.value === undefined)?.characteristic : undefined;
  return (
    <article className="pc generation-card" aria-label="Neuer Charakter">
      <div className="pc-head static">
        <span className="pc-name">{generation.step === 'dead' ? '† Neuer Charakter' : 'Neuer Charakter'}</span>
        <span className="pc-sub">{[generation.status, `${generation.age} Jahre`].filter(Boolean).join(' · ')}</span>
      </div>
      <div className="upp" role="group" aria-label="UPP">
        {generation.upp.map((u) => (
          <div key={u.characteristic} className={`upp-cell${u.characteristic === next ? ' next' : ''}`}>
            <span className="upp-label">{characteristicLabel[u.characteristic]}</span>
            <span className="upp-code">{u.value === undefined ? '–' : hex(u.value)}</span>
          </div>
        ))}
      </div>
      {generation.skills.length > 0 && (
        <ul className="chips static" aria-label="Fertigkeiten">
          {generation.skills.map((s) => (
            <li key={s.name}>
              {s.name}-{s.level}
            </li>
          ))}
        </ul>
      )}
      {(generation.possessions.length > 0 || generation.credits > 0 || generation.pension > 0) && (
        <dl className="facts">
          {generation.possessions.length > 0 && (
            <>
              <dt>Besitz</dt>
              <dd>{generation.possessions.map((p) => (p.count > 1 ? `${p.count} × ${p.name}` : p.name)).join(', ')}</dd>
            </>
          )}
          <dt>Credits</dt>
          <dd>{credits(generation.credits)}</dd>
          {generation.pension > 0 && (
            <>
              <dt>Pension</dt>
              <dd>{credits(generation.pension)} im Jahr</dd>
            </>
          )}
        </dl>
      )}
    </article>
  );
}

/** Der Lebenslauf, nach Terms gegliedert. Auch die Details der Charakterkarte zeigen ihn. */
export function CareerList({ lines, heading = true }: { lines: readonly CareerLine[]; heading?: boolean }) {
  if (lines.length === 0) return null;
  const terms = [...new Set(lines.map((l) => l.term))];
  return (
    <section className="career" aria-label="Lebenslauf">
      {heading && (
        <h3 className="section-title" style={{ fontSize: 11 }}>
          Lebenslauf
        </h3>
      )}
      {terms.map((term) => (
        <div key={term} className="career-term">
          <h4>{term === 0 ? 'Vor dem Dienst' : `Term ${term}`}</h4>
          <ol>
            {lines
              .filter((l) => l.term === term)
              .map((l) => (
                <li key={l.index} className={l.success === false ? 'failed' : undefined}>
                  <span className="career-label">{l.label}</span>
                  <span className="career-roll mono">
                    {l.dice.join('+')}
                    {dmText(l)}
                    {l.target !== undefined ? ` / ${l.target}+` : ''}
                  </span>
                  <span className="career-result">{l.result}</span>
                </li>
              ))}
          </ol>
        </div>
      ))}
    </section>
  );
}

/**
 * Der letzte Wurf auf der Bühne: Würfel rollen, landen, dann steht das Ergebnis da und wird gemeldet
 * (`onSettled`); erst dann ziehen Karte und Knöpfe nach. Ein Tippen springt zum Ergebnis.
 */
function RollStage({ line, animate, onSettled }: { line: CareerLine; animate: boolean; onSettled: (index: number) => void }) {
  const [phase, skip] = useTimeline(animate ? [THROW_MS, SETTLE_MS] : []);
  const LANDED = animate ? 1 : 0;
  const DONE = animate ? 2 : 0;

  useEffect(() => {
    if (phase >= DONE) onSettled(line.index);
    if (!animate) return;
    if (phase === 0) haptic(line.dice.length === 1 ? 'land' : 'shake');
    if (phase === DONE) haptic(line.success === undefined ? 'add' : line.success ? 'success' : 'failure');
  }, [phase, DONE, animate, line.index, line.dice.length, line.success, onSettled]);

  const verdict = line.success === undefined ? '' : line.success ? ' success' : ' failure';
  return (
    <div
      className={`generation-roll${phase >= DONE ? ` judged${verdict}` : ''}`}
      onClick={() => {
        if (phase >= DONE) return;
        stopHaptics();
        skip(DONE);
      }}
    >
      <div className="generation-roll-head">
        <span className="kicker">{line.label}</span>
        {line.target !== undefined && <span className="generation-target mono">{line.target}+</span>}
      </div>
      <DiceView dice={line.dice} seed={line.index + 1} landed={phase >= LANDED} size="small" />
      <div className="generation-roll-result" aria-live="polite">
        {phase >= LANDED && String(line.total) !== line.result && (
          <span className="mono generation-total">
            {line.dm !== 0 ? `${line.dice.reduce((a, b) => a + b, 0)}${dmText(line)} = ${line.total}` : line.total}
          </span>
        )}
        {phase >= DONE && <strong>{line.result}</strong>}
      </div>
    </div>
  );
}

/** Der DM eines Wurfs mit Namen („ INT +1 EDU +2“); passen die Teile nicht zur Summe, nur die Summe. */
function dmText(line: CareerLine): string {
  if (line.dm === 0) return '';
  const fits = line.parts.reduce((sum, p) => sum + p.dm, 0) === line.dm;
  return fits ? line.parts.map((p) => ` ${p.label} ${signed(p.dm)}`).join('') : ` ${signed(line.dm)}`;
}

function needText(odds: ThrowOdds): string {
  return odds.chance >= 100 ? 'gelingt immer' : odds.chance <= 0 ? 'unmöglich' : `braucht ${odds.need}+`;
}

/**
 * Was ein Wurf braucht: Zielwert, je Attribut die Schwelle mit ihrem DM (hervorgehoben, wenn sie
 * greift) und der nötige Wurf.
 */
function OddsLines({ odds }: { odds: ThrowOdds }) {
  return (
    <span className="odds-lines">
      <span>Zielwert {odds.target}+</span>
      {odds.conditions.map((c) => (
        <span key={c.characteristic} className={c.applies ? 'met' : 'unmet'}>
          {c.characteristic} {c.atLeast}+ → {signed(c.dm)}
          {c.applies ? ' ✓' : ''}
        </span>
      ))}
      <span>{needText(odds)}</span>
    </span>
  );
}

/** Die Knöpfe für den nächsten Schritt. */
function Actions({ action, disabled }: { action: GenerationAction; disabled: boolean }) {
  const game = useGame();
  const [name, setName] = useState('');

  switch (action.kind) {
    case 'roll':
      return (
        <button type="button" className="roll generation-main" disabled={disabled} onClick={() => game.rollGeneration()}>
          <DiceIcon />
          <span>
            {action.label}
            {action.odds ? <OddsLines odds={action.odds} /> : <span className="small-label">{action.dice === 1 ? '1W6' : '2W6'}</span>}
          </span>
        </button>
      );
    case 'service':
      return (
        <div className="choice-grid services" role="group" aria-label="Laufbahn">
          {action.options.map((o) => (
            <button key={o.id} type="button" disabled={disabled} onClick={() => game.chooseService(o.id)}>
              <strong>{o.name}</strong>
              <OddsLines odds={o} />
            </button>
          ))}
        </div>
      );
    case 'skill':
      return (
        <div className="choice-grid" role="group" aria-label="Fertigkeitstabelle">
          {action.options.map((o) => (
            <button key={o.id} type="button" disabled={disabled || !o.available} onClick={() => game.chooseSkillTable(o.id)}>
              <strong>{o.name}</strong>
              <span className="small-label">1W6</span>
            </button>
          ))}
        </div>
      );
    case 'cascade':
      return (
        <div className="choice-grid three scroll-choices" role="group" aria-label={action.name}>
          {action.options.map((o) => (
            <button key={o.skill} type="button" disabled={disabled} onClick={() => game.chooseCascade(o.skill)}>
              <strong>{o.item ?? o.name}</strong>
              <span className="small-label">{o.item ? 'Waffe' : '+1'}</span>
            </button>
          ))}
        </div>
      );
    case 'reenlist':
      return action.last ? (
        <button type="button" className="roll generation-main" disabled={disabled} onClick={() => game.reenlist(false)}>
          <DiceIcon />
          <span>
            Weiterverpflichtung würfeln
            <span className="small-label">nur eine 12 verlängert</span>
          </span>
        </button>
      ) : (
        <div className="choice-grid" role="group" aria-label="Weiterverpflichtung">
          <button type="button" disabled={disabled} onClick={() => game.reenlist(false)}>
            <strong>Abmustern</strong>
            <span className="small-label">eine 12 heißt trotzdem bleiben</span>
          </button>
          <button type="button" className="preferred" disabled={disabled} onClick={() => game.reenlist(true)}>
            <strong>Weiterverpflichten</strong>
            <OddsLines odds={action.odds} />
          </button>
        </div>
      );
    case 'muster':
      return (
        <div className="choice-grid" role="group" aria-label="Abmusterung">
          <button type="button" disabled={disabled || action.cashLeft === 0} onClick={() => game.musterOut('cash')}>
            <strong>Geld</strong>
            <span className="small-label">
              noch {action.cashLeft}×{action.cashDm.map((s) => ` · ${s.label} ${signed(s.dm)}`).join('')}
            </span>
          </button>
          <button type="button" disabled={disabled} onClick={() => game.musterOut('benefit')}>
            <strong>Sachwerte</strong>
            <span className="small-label">1W6{action.benefitDm.map((s) => ` · ${s.label} ${signed(s.dm)}`).join('')}</span>
          </button>
        </div>
      );
    case 'name':
      return (
        <form
          className="inline-form generation-name"
          onSubmit={(e) => {
            e.preventDefault();
            game.finishGeneration(name);
          }}
        >
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" disabled={disabled} />
          </label>
          <button type="submit" className="primary" disabled={disabled}>
            Übernehmen
          </button>
        </form>
      );
    case 'dead':
      return (
        <div className="choice-grid" role="group" aria-label="Nach dem Tod">
          <button type="button" disabled={disabled} onClick={() => game.discardGeneration()}>
            <strong>Verwerfen</strong>
          </button>
          <button type="button" className="preferred" disabled={disabled} onClick={() => game.restartGeneration()}>
            <strong>Neu beginnen</strong>
          </button>
        </div>
      );
  }
}
