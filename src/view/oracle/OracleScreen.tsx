import { useCallback, useState } from 'react';
import type { Snapshot } from '../../controller';
import { needText, resultLine, signed, taskFigures, taskHeadline } from '../format';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { CardIcon, CloseIcon, DiceIcon, PencilIcon } from '../icons';
import { OddsBar } from '../OddsBar';
import { CharacterStrip } from './CharacterStrip';
import { DiceRoll } from './DiceRoll';
import { LogList } from './LogList';
import { NoteSheet } from './NoteSheet';
import { useShortcuts } from '../keyboard';

/**
 * Orakel und Proben auf einem Screen: oben der Charakter oben, darunter der Log, unten eine Reihe mit
 * drei Knöpfen: Notiz, Würfeln, Karte. Das Orakel steht auf der Karte; die Frage schreibt man dort.
 * Ist eine Fertigkeit gewählt, steht die Probe mit der Stufe (6+, 8+, 10+) über den Knöpfen, und aus
 * „2W6“ wird „Probe“. Notiz und Deutung schreibt man in einem eigenen Blatt; welches Blatt offen ist,
 * ist reine Darstellung. Im Desktop-Modus steht dieser Screen ohne die Leiste als Orakel-Spalte links.
 */
export function OracleScreen({ view, strip = true }: { view: Snapshot; /** Im Desktop-Modus stehen die Charaktere in der eigenen Charakterspalte, nicht hier. */ strip?: boolean }) {
  const game = useGame();
  // Welcher Logeintrag gerade als Wurf im Vordergrund rollt; reine Anzeige, im Log steht er schon.
  const [rolling, setRolling] = useState<number | undefined>(undefined);
  const rolled = rolling === undefined ? undefined : view.log[rolling];
  const done = useCallback(() => setRolling(undefined), []);
  // Das offene Blatt: Notiz, Deutung zum Ergebnis an dieser Stelle des Logs, oder den Text der Notiz
  // bzw. Deutung an dieser Stelle ändern.
  const [sheet, setSheet] = useState<{ readonly reading?: number; readonly edit?: number } | undefined>(undefined);
  const reading = sheet?.reading === undefined ? undefined : view.log[sheet.reading];
  const edited = sheet?.edit === undefined ? undefined : view.log[sheet.edit];

  const task = view.task?.ready ? view.task : undefined;

  // Knöpfe und Kürzel lösen dasselbe aus: K zieht eine Karte, W würfelt 2W6 (oder die vorbereitete
  // Probe), N öffnet die Notiz.
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
  const note = () => setSheet({});
  // Gleichbleibende Handler, damit der Log (memo) beim Öffnen eines Blatts nicht neu zeichnet.
  const interpret = useCallback((index: number) => setSheet({ reading: index }), []);
  const edit = useCallback((index: number) => setSheet({ edit: index }), []);
  useShortcuts({ k: draw, w: roll, n: note });

  return (
    <div className="screen">
      {strip && <CharacterStrip view={view} />}
      <LogList log={view.log} days={view.logDays} onInterpret={interpret} onEdit={edit} />
      <section className="dock" aria-label="Orakel und Proben">
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
          <button type="button" className="action note" title="Notiz (N)" aria-keyshortcuts="N" onClick={note}>
            <PencilIcon />
            Notiz
          </button>
          {task ? (
            <button type="button" className="action task-roll" title="Probe würfeln (W)" aria-keyshortcuts="W" aria-label="Probe würfeln" onClick={roll}>
              <DiceIcon />
              Probe
            </button>
          ) : (
            <button type="button" className="action dice" title="2W6 würfeln (W)" aria-keyshortcuts="W" aria-label="2W6" onClick={roll}>
              <DiceIcon />
              2W6
            </button>
          )}
          <button type="button" className="action draw" title="Karte ziehen (K)" aria-keyshortcuts="K" aria-label="Karte ziehen" onClick={draw}>
            <CardIcon />
            Karte
          </button>
        </div>
      </section>
      {rolled?.kind === 'dice' && <DiceRoll key={rolling} item={rolled} seed={rolling ?? 0} onDone={done} />}
      {sheet && (
        <NoteSheet
          target={sheet.reading !== undefined && reading ? { index: sheet.reading, ...resultLine(reading) } : undefined}
          edit={sheet.edit !== undefined && edited?.kind === 'note' ? { index: sheet.edit, text: edited.text } : undefined}
          onClose={() => setSheet(undefined)}
        />
      )}
    </div>
  );
}
