import { Fragment, useEffect, useRef, useState } from 'react';
import type { WorldDmPart } from '../../model';
import type { WorldAction, WorldLine, WorldView } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { signed } from '../format';
import { useGame } from '../game-context';
import { animated, haptic, stopHaptics } from '../haptics';
import { HoldButton } from '../HoldButton';
import { CloseIcon, DiceIcon } from '../icons';
import { NameFromCard } from '../NameFromCard';
import { Form } from '../Form';

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
 * Handelscodes), darunter die Würfe, seit sie offen ist; wieder geöffnet zeigt sie nur die Werte.
 * Solange sie entsteht, unten die Würfelbühne und der Knopf für den nächsten Wurf, wie in der
 * Charaktererschaffung. Eingetragen ist der Wurf schon, bevor die Würfel rollen; die Karte zeigt den neuen Stand erst, wenn das Ergebnis unten feststeht. Ein Tippen
 * irgendwo beendet die Animation.
 */
export function WorldSheet({ world, here }: { world: WorldView; here: boolean }) {
  const game = useGame();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Was schon da war, als die Weltkarte aufging, rollt nicht noch einmal.
  const [seen, setSeen] = useState(world.lines.length);
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
  // In Erschaffung; eine fertige Welt ohne Temperatur würfelt sie nur nach.
  const running = world.step !== 'done';
  const hasRoll = world.action.kind !== 'done';

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
              (confirmDiscard ? (
                <button type="button" className="ghost danger compact" onClick={() => game.discardWorld()}>
                  Wirklich verwerfen?
                </button>
              ) : (
                <button type="button" className="ghost compact" onClick={() => setConfirmDiscard(true)}>
                  Verwerfen
                </button>
              ))}
            <button data-escape type="button" className="icon-button" aria-label={running ? 'Später weiter' : 'Schließen'} onClick={() => game.closeWorld()}>
              <CloseIcon />
            </button>
          </span>
        </div>

        <div className="sheet-body" ref={body}>
          {!view.empty && <WorldCard world={view} />}
          {view.surface && <SurfaceSection lines={view.surface} />}
          {world.canNote && (
            <button type="button" className={here ? 'primary stay-here' : 'ghost stay-here'} aria-pressed={here} onClick={() => game.stayHere()}>
              {here ? 'Die Gruppe ist hier' : 'Gruppe ist hier'}
            </button>
          )}
          {world.canNote && <NoteSection note={world.note} />}
        </div>

        {(hasRoll || fresh) && (
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
            <Actions
              action={view.action}
              disabled={rolling}
              onRun={() => {
                game.runWorld();
                setSeen(game.snapshot().world?.lines.length ?? 0);
              }}
            />
          </div>
        )}
      </section>
    </div>
  );
}

/** Die Welt, wie sie gerade steht: UWP, jede Stelle im Klartext, Temperatur, Basen, Gasriese, Handelscodes. */
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
          <Fragment key={p.kind}>
            <div className={p.code === undefined ? 'pending' : undefined}>
              <dt lang="de">{p.label}</dt>
              <dd>
                <span className="mono world-digit">{p.code ?? '–'}</span>
                {p.text && <span className="world-text">{p.text}</span>}
              </dd>
            </div>
            {p.kind === 'atmosphere' && <TemperatureRow temperature={world.temperature} />}
          </Fragment>
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

/** Die Temperatur nach Mongoose Traveller, zwischen Atmosphäre und Hydrographie wie in der Erschaffung. */
function TemperatureRow({ temperature }: { temperature: WorldView['temperature'] }) {
  const swings = temperature?.swings ? ' Schwankt stark: glühend am Tag, gefroren in der Nacht.' : '';
  return (
    <div className={temperature === undefined ? 'pending' : 'world-temperature'} lang="de">
      <dt>Temperatur</dt>
      <dd>
        {temperature === undefined ? (
          <span className="mono world-digit">–</span>
        ) : (
          <>
            <span className="world-word">{temperature.name}</span>
            <span className="world-text">
              {temperature.average} · {temperature.text}
              {swings}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

/** Die Oberfläche nach dem World Builder's Handbook, an der Stelle der früheren Liste der Würfe. */
function SurfaceSection({ lines }: { lines: readonly string[] }) {
  return (
    <section className="career world-surface" aria-label="Oberfläche">
      <div className="career-term">
        <h4>Oberfläche</h4>
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Die Notiz zur Welt: freier Text, den man jederzeit ändert. Was getippt wird, ist reine Darstellung;
 * gespeichert wird beim Verlassen des Feldes, also auch, wenn man die Weltkarte schließt.
 */
function NoteSection({ note }: { note: string | undefined }) {
  const game = useGame();
  const [text, setText] = useState(note ?? '');
  return (
    <label className="field world-note">
      <span>Notiz zur Welt</span>
      <textarea
        value={text}
        placeholder="Was man über die Welt weiß: Orte, Leute, Gerüchte …"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== (note ?? '')) game.noteWorld(text);
        }}
      />
    </label>
  );
}

/** Der letzte Wurf auf der Bühne: Würfel rollen, landen, dann steht das Ergebnis da. Auch im Subsektor für das Vorkommen. */
export function RollStage({ line, animate, onSettled, skips }: { line: WorldLine; animate: boolean; onSettled: (index: number) => void; skips: number }) {
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

/** Ein Tippen während des Wurfs überspringt die Animation; lange drücken lässt die Welt bis zum Namen durchlaufen. */
function Actions({ action, disabled, onRun }: { action: WorldAction; disabled: boolean; onRun: () => void }) {
  const game = useGame();
  const [name, setName] = useState('');
  switch (action.kind) {
    case 'roll':
      return (
        <HoldButton className="roll generation-main" busy={disabled} onPress={() => game.rollWorld()} onHold={onRun}>
          <DiceIcon />
          <span>
            {action.label}
            <span className="small-label">
              {action.dice === 1 ? '1W6' : '2W6'}
              {partsText(action.parts)}
              {action.target !== undefined ? ` · ${action.target}+` : ''}
            </span>
          </span>
        </HoldButton>
      );
    case 'surface':
      return (
        <button type="button" className="roll generation-main" aria-disabled={disabled || undefined} onClick={() => game.rollWorld()}>
          <DiceIcon />
          <span>{action.label}</span>
        </button>
      );
    case 'name':
      return (
        <Form
          className="inline-form generation-name"
          onSend={() => {
            game.nameWorld(name);
          }}
        >
          <label className="field">
            <span>Name der Welt</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" readOnly={disabled} />
          </label>
          <NameFromCard onPick={setName} disabled={disabled} />
          <button type="submit" className="primary" aria-disabled={disabled || undefined}>
            Übernehmen
          </button>
        </Form>
      );
    case 'done':
      return (
        <button type="button" className="primary" aria-disabled={disabled || undefined} onClick={() => game.closeWorld()}>
          Schließen
        </button>
      );
  }
}
