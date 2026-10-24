import type { Snapshot } from '../../controller';
import { needText, signed, taskFigures, taskHeadline } from '../format';
import { useGame } from '../game-context';
import { DiceIcon } from '../icons';
import { OddsBar } from '../OddsBar';
import { CharacterCard } from './CharacterCard';

export function CharactersScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const task = view.task;

  return (
    <div className="screen">
      <section className="scroll characters" aria-labelledby="characters-title">
        <h2 id="characters-title" className="section-title">
          Spielercharaktere
        </h2>
        {view.characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
        <button type="button" className="add-character" onClick={() => game.newCharacter()}>
          + Neuer Charakter
        </button>
        {view.retired.length > 0 && (
          <div className="retired">
            <h3 className="section-title" style={{ fontSize: 11 }}>
              Ausgeblendet
            </h3>
            <ul>
              {view.retired.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <button type="button" className="ghost" onClick={() => game.restoreCharacter(c.id)}>
                    Einblenden
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="dock" aria-label="Probe">
        <div className="task-info" aria-live="polite">
          {!task?.ready ? (
            <span className="task-hint">{task ? 'Fertigkeit wählen' : 'Fertigkeit antippen, um eine Probe zu starten'}</span>
          ) : (
            <>
              <strong className="task-headline">{taskHeadline(task.parts, task.target)}</strong>
              <span className="task-figures">
                2W6 {signed(task.dm)}
                {taskFigures(task.parts)} · {needText(task.need, task.chance)}
              </span>
            </>
          )}
        </div>
        <div className="odds-row">
          <OddsBar odds={view.odds} variant="task" />
          <button type="button" className="roll" disabled={!task?.ready} onClick={() => game.rollTask()}>
            <DiceIcon />
            Probe würfeln
          </button>
        </div>
      </section>
    </div>
  );
}
