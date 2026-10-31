import { useEffect, useRef, useState } from 'react';
import type { WorldDmPart } from '../../model';
import type { WorldAction, WorldLine, WorldView } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { signed } from '../format';
import { useGame } from '../game-context';
import { animated, haptic, stopHaptics } from '../haptics';
import { CloseIcon, DiceIcon } from '../icons';

/** Wie lange das Ergebnis nach dem Landen braucht, bis es feststeht und die Knöpfe wieder gehen. */
const SETTLE_MS = 350;

/** Der DM in Teilen: der feste Teil der Formel ohne Namen („−7“), dann die Stellen mit Namen („Größe 7 +7“). */
function partsText(parts: readonly WorldDmPart[]): string {
  return parts.map((p) => (p.label ? ` ${p.label} ${signed(p.dm)}` : ` ${signed(p.dm)}`)).join('');
}

/** Der DM eines Wurfs; passen die Teile nicht zur festgehaltenen Summe, nur die Summe. */
function dmText(line: WorldLine): string {
  if (line.parts.length === 0 && line.dm === 0) return '';
  const fits = line.parts.reduce((sum, p) => sum + p.dm, 0) === line.dm;
  return fits ? partsText(line.parts) : ` ${signed(line.dm)}`;
}

/**
 * Die Weltkarte im Vordergrund: oben die Welt, wie sie gerade steht (UWP im Klartext, Basen,
 * Handelscodes), darunter ihre Würfe. Solange sie entsteht, unten die Würfelbühne und der Knopf für
 * den nächsten Wurf, wie in der Charaktererschaffung. Geloggt ist der Wurf schon, bevor die Würfel
 * rollen; die Karte zeigt den neuen Stand erst, wenn das Ergebnis unten feststeht. Ein Tippen
 * irgendwo beendet die Animation.
 */
export function WorldSheet({ world }: { world: WorldView }) {
  const game = useGame();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Was schon da war, als die Weltkarte aufging, rollt nicht noch einmal.
  const [seen] = useState(world.lines.length);
  const latest = world.lines.at(-1);
  const [settled, setSettled] = useState(-1);
  // Ein Wurf aus dieser Sitzung der Weltkarte; ältere rollen nicht noch einmal.
  const fresh = latest !== undefined && latest.index >= seen;
  const animate = fresh && animated();
  const rolling = animate && settled < latest.index;
  const [shown, setShown] = useState(world);
  if (!rolling && shown !== world) setShown(world);
  const view = rolling ? shown : world;
  const [skips, setSkips] = useState(0);
  const running = world.action.kind !== 'done';

  const body = useRef<HTMLDivElement>(null);
  const count = view.lines.length;
  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [count]);

  return (
    <div
      className="overlay"
      onClickCapture={(e) => {
        if (!rolling) return;
        e.stopPropagation();
        e.preventDefault();
        stopHaptics();
        setSkips((n) => n + 1);
      }}
    >
      <section className="sheet generation world-sheet" role="dialog" aria-modal="true" aria-labelledby="world-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="world-title">{running ? `Weltenerschaffung ${world.id}` : `${world.name ?? 'Leer'} · ${world.id}`}</h2>
          <span className="header-right">
            {running &&
              world.lines.length > 0 &&
              (confirmDiscard ? (
                <button type="button" className="ghost danger compact" onClick={() => game.discardWorld()}>
                  Wirklich verwerfen?
                </button>
              ) : (
                <button type="button" className="ghost compact" onClick={() => setConfirmDiscard(true)}>
                  Verwerfen
                </button>
              ))}
            <button type="button" className="icon-button" aria-label={running ? 'Später weiter' : 'Schließen'} onClick={() => game.closeWorld()}>
              <CloseIcon />
            </button>
          </span>
        </div>

        <div className="sheet-body" ref={body}>
          {!view.empty && <WorldCard world={view} />}
          <WorldLines lines={view.lines} />
        </div>

        {(running || fresh) && (
          <div className="generation-dock">
            {latest && <RollStage key={latest.index} line={latest} animate={animate} onSettled={setSettled} skips={skips} />}
            {view.prompt && (
              <p className="generation-prompt" aria-live="polite">
                {view.prompt}
              </p>
            )}
            {view.error && (
              <p className="error" role="alert">
                {view.error}
              </p>
            )}
            <Actions action={view.action} disabled={rolling} />
          </div>
        )}
      </section>
    </div>
  );
}

/** Die Welt, wie sie gerade steht: UWP, jede Stelle im Klartext, Basen, Gasriese, Handelscodes. */
function WorldCard({ world }: { world: WorldView }) {
  const yes = (value: boolean | undefined) => (value === undefined ? '–' : value ? 'ja' : 'nein');
  return (
    <article className="pc generation-card world-card" aria-label="Welt">
      <div className="pc-head static">
        <span className="pc-name">{world.name ?? 'Neue Welt'}</span>
        <span className="pc-sub mono">
          {world.id} · {world.uwp}
        </span>
      </div>
      <dl className="facts world-profile" lang="en">
        {world.profile.map((p) => (
          <div key={p.kind} className={p.code === undefined ? 'pending' : undefined}>
            <dt lang="de">{p.label}</dt>
            <dd>
              <span className="mono world-digit">{p.code ?? '–'}</span>
              {p.text && <span className="world-text">{p.text}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="world-extras">
        <span>Marinebasis {yes(world.navalBase)}</span>
        <span>Scoutbasis {yes(world.scoutBase)}</span>
        <span>Gasriese {yes(world.gasGiant)}</span>
      </p>
      {world.trade.length > 0 && (
        <ul className="chips static" aria-label="Handelscodes" lang="en">
          {world.trade.map((t) => (
            <li key={t.code} title={t.name}>
              {t.code} · {t.name}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function WorldLines({ lines }: { lines: readonly WorldLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="career" aria-label="Würfe">
      <div className="career-term">
        <h4>Würfe</h4>
        <ol>
          {lines.map((l) => (
            <li key={l.index} className={l.success === false ? 'failed' : undefined}>
              <span className="career-label">{l.label}</span>
              <span className="career-roll mono">
                {l.dice.join('+')}
                {dmText(l)}
                {l.target !== undefined ? ` / ${l.target}+` : ''}
              </span>
              <span className="career-result" lang="en">
                {l.result}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Der letzte Wurf auf der Bühne: Würfel rollen, landen, dann steht das Ergebnis da. */
function RollStage({ line, animate, onSettled, skips }: { line: WorldLine; animate: boolean; onSettled: (index: number) => void; skips: number }) {
  const [phase, skip] = useTimeline(animate ? [THROW_MS, SETTLE_MS] : []);
  const LANDED = animate ? 1 : 0;
  const DONE = animate ? 2 : 0;

  const [skipsAtStart] = useState(skips);
  useEffect(() => {
    if (skips > skipsAtStart) skip(DONE);
  }, [skips, skipsAtStart, skip, DONE]);

  useEffect(() => {
    if (!animate) return;
    if (phase >= DONE) onSettled(line.index);
    if (phase === 0) haptic(line.dice.length === 1 ? 'land' : 'shake');
    if (phase === DONE) haptic(line.success === undefined ? 'add' : line.success ? 'success' : 'failure');
  }, [phase, DONE, animate, line.index, line.dice.length, line.success, onSettled]);

  const verdict = line.success === undefined ? '' : line.success ? ' success' : ' failure';
  const sum = line.dice.reduce((a, b) => a + b, 0);
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
        {phase >= LANDED && line.dm !== 0 && (
          <span className="mono generation-total">
            {sum}
            {dmText(line)} = {line.total}
          </span>
        )}
        {phase >= DONE && <strong lang="en">{line.result}</strong>}
      </div>
    </div>
  );
}

function Actions({ action, disabled }: { action: WorldAction; disabled: boolean }) {
  const game = useGame();
  const [name, setName] = useState('');
  switch (action.kind) {
    case 'roll':
      return (
        <button type="button" className="roll generation-main" disabled={disabled} onClick={() => game.rollWorld()}>
          <DiceIcon />
          <span>
            {action.label}
            <span className="small-label">
              {action.dice === 1 ? '1W6' : '2W6'}
              {partsText(action.parts)}
              {action.target !== undefined ? ` · ${action.target}+` : ''}
            </span>
          </span>
        </button>
      );
    case 'name':
      return (
        <form
          className="inline-form generation-name"
          onSubmit={(e) => {
            e.preventDefault();
            game.nameWorld(name);
          }}
        >
          <label className="field">
            <span>Name der Welt</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" disabled={disabled} />
          </label>
          <button type="submit" className="primary" disabled={disabled}>
            Übernehmen
          </button>
        </form>
      );
    case 'done':
      return (
        <button type="button" className="primary" disabled={disabled} onClick={() => game.closeWorld()}>
          Schließen
        </button>
      );
  }
}
