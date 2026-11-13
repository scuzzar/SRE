import { useCallback, useState } from 'react';
import type { Snapshot } from '../../controller';
import { needText, resultLine, signed, taskFigures, taskHeadline } from '../format';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { CardIcon, CloseIcon, DiceIcon, LightbulbIcon, PencilIcon } from '../icons';
import { OddsBar } from '../OddsBar';
import { CharacterStrip } from './CharacterStrip';
import { DiceRoll } from './DiceRoll';
import { LogList } from './LogList';

/**
 * Orakel und Proben auf einem Screen: oben der Charakter oben, darunter der Log, unten die Knöpfe.
 * Ist eine Fertigkeit gewählt, steht die Probe über den Knöpfen, und aus „2W6“ wird „Probe würfeln“.
 * Die Schreibzeile hat einen Text; was er wird, entscheidet der Knopf: Ja/Nein und Karte nehmen ihn
 * als Frage, „Deuten“ als Deutung zum markierten Ergebnis, „Notiz“ als Notiz. Der Text während des
 * Tippens ist reine Darstellung; übergeben wird beim Absenden.
 * Das Ziel der Deutung (welches Ergebnis angetippt ist) hält die App, damit im Desktop-Modus auch
 * der Log links ein Ergebnis als Ziel wählen kann; der Screen zeigt es in der Zielzeile an.
 */
export function OracleScreen({
  view,
  question,
  onQuestion,
  inlineLog,
  target,
  picked,
  marked,
  onPick,
  onClearTarget,
}: {
  view: Snapshot;
  question: string;
  onQuestion: (q: string) => void;
  /** Im Desktop-Modus steht der Log links in der App, nicht hier im Screen. */
  inlineLog: boolean;
  /** Das Ergebnis, auf das sich eine Deutung bezieht: das angetippte, sonst das neueste. */
  target: number | undefined;
  /** Das angetippte Ergebnis, falls eines; die Zielzeile bietet an, zu dem neuesten zurückzugehen. */
  picked: number | undefined;
  marked: boolean;
  onPick: (index: number) => void;
  onClearTarget: () => void;
}) {
  const game = useGame();
  // Welcher Logeintrag gerade als Wurf im Vordergrund rollt; reine Anzeige, im Log steht er schon.
  const [rolling, setRolling] = useState<number | undefined>(undefined);
  const rolled = rolling === undefined ? undefined : view.log[rolling];
  const done = useCallback(() => setRolling(undefined), []);

  const task = view.task?.ready ? view.task : undefined;
  const text = question.trim();
  const targetLine = target === undefined ? undefined : resultLine(view.log[target]!);
  const write = (interprets: number | undefined) => {
    haptic('pick');
    game.writeNote(text, interprets);
    onQuestion('');
    onClearTarget();
  };

  return (
    <div className="screen">
      <CharacterStrip view={view} />
      {inlineLog && <LogList log={view.log} target={target} marked={marked} onPick={onPick} />}
      <section className="dock" aria-label="Orakel und Proben">
        {task && (
          <div className="task-bar" aria-live="polite">
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
        )}
        {text && targetLine && (
          <div className="target-line">
            <span className="target-text">
              Deutung zu <b>{targetLine.head}</b> · {targetLine.rest}
            </span>
            {picked !== undefined && (
              <button type="button" className="icon-button" aria-label="Zurück zum neuesten Ergebnis" onClick={onClearTarget}>
                <CloseIcon />
              </button>
            )}
          </div>
        )}
        <div className="write-row">
          <label htmlFor="question" className="visually-hidden">
            Frage, Deutung oder Notiz
          </label>
          <input
            id="question"
            className="question-input"
            type="text"
            value={question}
            onChange={(e) => onQuestion(e.target.value)}
            placeholder="Frage, Deutung, Notiz"
            autoComplete="off"
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                game.askOracle(question);
                onQuestion('');
              }
            }}
          />
          <button type="button" className="write-button interpret" disabled={!text || target === undefined} onClick={() => write(target)}>
            <LightbulbIcon />
            Deuten
          </button>
          <button type="button" className="write-button" disabled={!text} onClick={() => write(undefined)}>
            <PencilIcon />
            Notiz
          </button>
        </div>
        <div className="actions">
          <button
            type="button"
            className="action draw"
            onClick={() => {
              haptic('draw');
              game.drawCard(question);
            }}
          >
            <CardIcon />
            Karte ziehen
          </button>
          {task ? (
            <button
              type="button"
              className="action task-roll"
              onClick={() => {
                haptic('land');
                game.rollTask();
              }}
            >
              <DiceIcon />
              Probe würfeln
            </button>
          ) : (
            <button
              type="button"
              className="action dice"
              onClick={() => {
                haptic('shake');
                game.rollDice();
                if (animated()) setRolling(view.log.length);
              }}
            >
              <DiceIcon />
              2W6
            </button>
          )}
        </div>
        <div className="odds-row">
          <OddsBar odds={view.odds} />
          <button
            type="button"
            className="action oracle"
            onClick={() => {
              game.askOracle(question);
              onQuestion('');
            }}
          >
            Ja/Nein
          </button>
        </div>
      </section>
      {rolled?.kind === 'dice' && <DiceRoll key={rolling} item={rolled} seed={rolling ?? 0} onDone={done} />}
    </div>
  );
}
