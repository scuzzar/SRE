import type { Snapshot } from '../../controller';
import { needText, signed, taskFigures, taskHeadline } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { DiceIcon, PencilIcon } from '../icons';
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
        <div className="add-characters">
          <button type="button" className="add-character" onClick={() => game.newCharacter()}>
            + Neuer Charakter
          </button>
          <button type="button" className="add-character" onClick={() => game.openGeneration()}>
            {view.generationRunning ? 'Erschaffung fortsetzen' : '+ Nach Regeln erschaffen'}
          </button>
        </div>
        {view.dead.length > 0 && (
          <div className="fallen">
            <h3 className="section-title" style={{ fontSize: 11 }}>
              Verstorben
            </h3>
            <ul>
              {view.dead.map((c) => (
                <li key={c.id} aria-label={`${c.name}, tot`}>
                  <span className="fallen-name">
                    <span aria-hidden="true">† </span>
                    {c.name}
                    {c.background && <span className="pc-sub"> {c.background}</span>}
                  </span>
                  <button type="button" className="icon-button" aria-label="Bearbeiten" onClick={() => game.editCharacter(c.id)}>
                    <PencilIcon />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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
          <button
            type="button"
            className="roll"
            disabled={!task?.ready}
            onClick={() => {
              haptic('land');
              game.rollTask();
            }}
          >
            <DiceIcon />
            Probe würfeln
          </button>
        </div>
      </section>
    </div>
  );
}
