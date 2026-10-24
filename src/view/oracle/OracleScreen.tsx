import type { Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { CardIcon, DiceIcon } from '../icons';
import { OddsBar } from '../OddsBar';
import { LogList } from './LogList';

/** Der Text im Fragefeld während des Tippens ist reine Darstellung; übergeben wird er beim Absenden. */
export function OracleScreen({ view, question, onQuestion }: { view: Snapshot; question: string; onQuestion: (q: string) => void }) {
  const game = useGame();

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
          <button type="button" className="action draw" onClick={() => game.drawCard(question)}>
            <CardIcon />
            Karte ziehen
          </button>
          <button type="button" className="action dice" onClick={() => game.rollDice()}>
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
    </div>
  );
}
