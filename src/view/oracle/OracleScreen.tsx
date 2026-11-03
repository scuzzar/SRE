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
 * Tippens und welches Ergebnis angetippt ist, sind reine Darstellung; übergeben wird beim Absenden.
 */
export function OracleScreen({ view, question, onQuestion }: { view: Snapshot; question: string; onQuestion: (q: string) => void }) {
  const game = useGame();
  // Welcher Logeintrag gerade als Wurf im Vordergrund rollt; reine Anzeige, im Log steht er schon.
  const [rolling, setRolling] = useState<number | undefined>(undefined);
  const rolled = rolling === undefined ? undefined : view.log[rolling];
  const done = useCallback(() => setRolling(undefined), []);

  const task = view.task?.ready ? view.task : undefined;

  // Das Ziel einer Deutung: das angetippte Ergebnis, solange der Log gleich lang ist, sonst das neueste.
  const [chosen, setChosen] = useState<{ index: number; length: number } | undefined>(undefined);
  const picked = chosen?.length === view.log.length && view.log[chosen.index]?.kind !== 'note' ? chosen.index : undefined;
  const newest = view.log.findLastIndex((item) => item.kind !== 'note');
  const target = picked ?? (newest < 0 ? undefined : newest);
  const text = question.trim();
  const targetLine = target === undefined ? undefined : resultLine(view.log[target]!);
  const write = (interprets: number | undefined) => {
    haptic('pick');
    game.writeNote(text, interprets);
    onQuestion('');
    setChosen(undefined);
  };

  return (
    <div className="screen">
      <CharacterStrip view={view} />
      <LogList log={view.log} target={target} marked={text !== ''} onPick={(index) => setChosen({ index, length: view.log.length })} />
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
              <button type="button" className="icon-button" aria-label="Zurück zum neuesten Ergebnis" onClick={() => setChosen(undefined)}>
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
