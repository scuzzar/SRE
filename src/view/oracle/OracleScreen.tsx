import { useCallback, useState } from 'react';
import type { Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { CardIcon, DiceIcon } from '../icons';
import { OddsBar } from '../OddsBar';
import { DiceRoll } from './DiceRoll';
import { LogList } from './LogList';

/** Der Text im Fragefeld während des Tippens ist reine Darstellung; übergeben wird er beim Absenden. */
export function OracleScreen({ view, question, onQuestion }: { view: Snapshot; question: string; onQuestion: (q: string) => void }) {
  const game = useGame();
  // Welcher Logeintrag gerade als Wurf im Vordergrund rollt; reine Anzeige, im Log steht er schon.
  const [rolling, setRolling] = useState<number | undefined>(undefined);
  const rolled = rolling === undefined ? undefined : view.log[rolling];
  const done = useCallback(() => setRolling(undefined), []);

  return (
    <div className="screen">
      <LogList log={view.log} />
      <section className="dock" aria-label="Orakel und Aktionen">
        <label htmlFor="question" className="visually-hidden">
          Frage (optional), gilt für Orakel und Karte
        </label>
        <input
          id="question"
          className="question-input"
          type="text"
          value={question}
          onChange={(e) => onQuestion(e.target.value)}
          placeholder="Frage (optional) – für Orakel und Karte"
          autoComplete="off"
          enterKeyHint="send"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              game.askOracle(question);
              onQuestion('');
            }
          }}
        />
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
        </div>
        <div className="odds-row">
          <OddsBar odds={view.odds} variant="oracle" />
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
