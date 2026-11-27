import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Snapshot } from '../../controller';
import { signed, skillTitle, taskFigures } from '../format';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { HoldButton } from '../HoldButton';
import { CardIcon, ClockIcon, DiceIcon, PencilIcon, RouteIcon } from '../icons';
import { useShortcuts } from '../keyboard';
import { DiceRoll } from './DiceRoll';
import { NoteSheet } from './NoteSheet';

/**
 * Die Aktionsleiste unter dem Log: Notiz, Tag, 2W6, Karte. „2W6“ öffnet die Detailseite Probe, lange
 * gedrückt würfelt es gleich 2W6 (2026-11-27). Ist die Detailseite offen, steht hier ihre Aktionsleiste:
 * links 2W6, daneben die drei Stufen, darüber die Probe mit nötigem Wurf und Chance je Stufe; jeder Knopf
 * würfelt und schließt die Seite. Der Tag (2026-11-22c, statt „Deuten“, das am
 * Ergebnis selbst sitzt) lässt einen Tag vergehen: während einer Fahrt „Weiterfahren“, unterwegs
 * „Weiterreisen“, sonst „1 Tag“; was er tut, entscheidet der Controller. Steht im Orakel und im Feld des Globus, damit man dort
 * nicht erst wechseln muss. Wurf und Notizblatt gehen über der ganzen App auf (auch über dem Globus);
 * welcher Wurf gerade rollt und ob das Blatt offen ist, ist reine Darstellung.
 */
export function OracleDock({
  view,
  onNote,
  shortcuts = false,
  className = 'dock',
}: {
  view: Snapshot;
  /** Öffnet das Notizblatt des Aufrufers; ohne öffnet die Aktionsleiste ihr eigenes. */
  onNote?: () => void;
  /** Ob K, W und N die Knöpfe auslösen (nur einmal in der App, im Orakel). */
  shortcuts?: boolean;
  className?: string;
}) {
  const game = useGame();
  // Welcher Logeintrag gerade als Wurf im Vordergrund rollt; reine Anzeige, im Log steht er schon.
  const [rolling, setRolling] = useState<number | undefined>(undefined);
  const rolled = rolling === undefined ? undefined : view.log[rolling];
  const done = useCallback(() => setRolling(undefined), []);
  // Ob die Aktionsleiste selbst das Notizblatt geöffnet hat.
  const [sheet, setSheet] = useState<'note' | undefined>(undefined);
  const day = view.time?.oneDay;
  const task = view.task;

  const draw = () => {
    haptic('draw');
    game.drawCard();
  };
  const roll = () => {
    haptic('shake');
    game.rollDice();
    if (animated()) setRolling(view.log.length);
  };
  const note = onNote ?? (() => setSheet('note'));
  const passDay = () => {
    if (day === undefined || day.blocker !== undefined) return;
    haptic('shake');
    game.oneDay();
  };
  useShortcuts(shortcuts ? { k: draw, w: roll, n: note, t: passDay } : {});

  // Über der ganzen App, damit Wurf und Blatt nicht im Feld des Globus eingesperrt sind.
  const host = typeof document === 'undefined' ? null : document.querySelector('.app');
  const layers = (
    <>
      {rolled?.kind === 'dice' && <DiceRoll key={rolling} item={rolled} seed={rolling ?? 0} onDone={done} />}
      {sheet && <NoteSheet target={undefined} onClose={() => setSheet(undefined)} />}
    </>
  );

  return (
    <section className={className} aria-label="Orakel und Proben">
      {view.taskPage ? (
        <>
          <div className="task-bar" aria-live="polite">
            {task?.ready ? (
              <div className="task-info">
                <strong className="task-headline">
                  {task.character} · {capitalized(skillTitle(task.parts))}
                </strong>
                <span className="task-figures">
                  2W6 {signed(task.dm)}
                  {taskFigures(task.parts)} · {task.steps.map((s) => `${s.name} ${stepNeed(s.need, s.chance)}`).join(' · ')}
                </span>
              </div>
            ) : (
              <p className="task-hint">Erst eine Fertigkeit wählen, dann die Stufe.</p>
            )}
          </div>
          <div className="actions oracle-actions">
            <button type="button" className="action dice" title={shortcuts ? '2W6 würfeln (W)' : '2W6 würfeln'} aria-keyshortcuts={shortcuts ? 'W' : undefined} aria-label="2W6" onClick={roll}>
              <DiceIcon />
              2W6
            </button>
            {(task?.steps ?? []).length > 0
              ? task!.steps.map((s) => (
                  <button
                    key={s.odds}
                    type="button"
                    className="action task-roll"
                    disabled={!task!.ready}
                    title={task!.ready ? `Probe mit ${s.name} würfeln (${s.target}+)` : 'Erst eine Fertigkeit wählen'}
                    aria-label={`Probe ${s.name}`}
                    onClick={() => {
                      haptic('land');
                      game.rollTask(s.odds);
                    }}
                  >
                    {s.name}
                  </button>
                ))
              : view.oddsNames.map((name) => (
                  <button key={name} type="button" className="action task-roll" disabled title="Erst eine Fertigkeit wählen" aria-label={`Probe ${name}`}>
                    {name}
                  </button>
                ))}
          </div>
        </>
      ) : (
      <div className="actions oracle-actions">
        <button type="button" className="action note" title={shortcuts ? 'Notiz (N)' : 'Notiz'} aria-keyshortcuts={shortcuts ? 'N' : undefined} onClick={note}>
          <PencilIcon />
          Notiz
        </button>
        <button
          type="button"
          className="action note one-day"
          title={day?.blocker ?? `${day?.kind === 'day' ? 'Einen Tag vergehen lassen' : day?.label ?? ''}${shortcuts ? ' (T)' : ''}`}
          aria-keyshortcuts={shortcuts ? 'T' : undefined}
          aria-label={day?.kind === 'day' ? '1 Tag vergehen lassen' : day?.label}
          disabled={day === undefined || day.blocker !== undefined}
          onClick={passDay}
        >
          {day?.kind === 'day' ? <ClockIcon /> : <RouteIcon />}
          {day?.label ?? '1 Tag'}
        </button>
        <HoldButton
          className="action dice"
          title={shortcuts ? 'Probe (lange drücken oder W: 2W6 würfeln)' : 'Probe (lange drücken: 2W6 würfeln)'}
          label="2W6"
          hint="Tippen: Probe. Lange drücken: gleich 2W6 würfeln"
          onPress={() => game.openTaskPage()}
          onHold={roll}
        >
          <DiceIcon />
          2W6
        </HoldButton>
        <button type="button" className="action draw" title={shortcuts ? 'Karte ziehen (K)' : 'Karte ziehen'} aria-keyshortcuts={shortcuts ? 'K' : undefined} aria-label="Karte ziehen" onClick={draw}>
          <CardIcon />
          Karte
        </button>
      </div>
      )}
      {host ? createPortal(layers, host) : layers}
    </section>
  );
}

function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Der nötige Wurf einer Stufe mit Chance: „8+ 42 %“; bis 2 sicher, über 12 unmöglich. */
function stepNeed(need: number, chance: number): string {
  if (chance >= 100) return 'sicher';
  if (chance <= 0) return 'unmöglich';
  return `${need}+ ${Math.round(chance)} %`;
}
