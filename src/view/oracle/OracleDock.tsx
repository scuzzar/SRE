import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Snapshot } from '../../controller';
import { needText, signed, taskFigures, taskHeadline } from '../format';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { CardIcon, ClockIcon, CloseIcon, DiceIcon, PencilIcon, RouteIcon } from '../icons';
import { useShortcuts } from '../keyboard';
import { OddsBar } from '../OddsBar';
import { DiceRoll } from './DiceRoll';
import { NoteSheet } from './NoteSheet';

/**
 * Die Aktionsleiste unter dem Log: Notiz, Tag, Würfeln, Karte; ist eine Fertigkeit gewählt, steht die Probe
 * mit der Stufe darüber, und aus „2W6“ wird „Probe“. Der Tag (2026-11-22c, statt „Deuten“, das am
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
  const task = view.task?.ready ? view.task : undefined;

  const draw = () => {
    haptic('draw');
    game.drawCard();
  };
  const roll = () => {
    if (task) {
      haptic('land');
      game.rollTask();
      return;
    }
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
      {task && (
        <div className="task-bar" aria-live="polite">
          <div className="task-top">
            <div className="task-info">
              <strong className="task-headline">{taskHeadline(task.parts, task.target)}</strong>
              <span className="task-figures">
                2W6 {signed(task.dm)}
                {taskFigures(task.parts)} · {needText(task.need, task.chance)}
              </span>
            </div>
            <button type="button" className="icon-button" aria-label="Probe abbrechen" onClick={() => game.endTask()}>
              <CloseIcon />
            </button>
          </div>
          <OddsBar odds={view.odds} />
        </div>
      )}
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
        {task ? (
          <button type="button" className="action task-roll" title={shortcuts ? 'Probe würfeln (W)' : 'Probe würfeln'} aria-keyshortcuts={shortcuts ? 'W' : undefined} aria-label="Probe würfeln" onClick={roll}>
            <DiceIcon />
            Probe
          </button>
        ) : (
          <button type="button" className="action dice" title={shortcuts ? '2W6 würfeln (W)' : '2W6 würfeln'} aria-keyshortcuts={shortcuts ? 'W' : undefined} aria-label="2W6" onClick={roll}>
            <DiceIcon />
            2W6
          </button>
        )}
        <button type="button" className="action draw" title={shortcuts ? 'Karte ziehen (K)' : 'Karte ziehen'} aria-keyshortcuts={shortcuts ? 'K' : undefined} aria-label="Karte ziehen" onClick={draw}>
          <CardIcon />
          Karte
        </button>
      </div>
      {host ? createPortal(layers, host) : layers}
    </section>
  );
}
