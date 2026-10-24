import type { Snapshot } from '../../controller';
import { needText, partLabel, percent, signed } from '../format';
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
          {!task ? (
            <span className="task-title">Fertigkeit antippen, um eine Probe zu starten</span>
          ) : !task.ready ? (
            <span className="task-title">{task.character} · Fertigkeit wählen</span>
          ) : (
            <>
              <span className="task-title">{task.character}</span>
              <div className="task-need">
                <strong>{needText(task.need, task.chance)}</strong>
                <span className="mono muted" style={{ fontSize: 14 }}>
                  {percent(task.chance)} · 2W6 {signed(task.dm)} ≥ {task.target}
                </span>
              </div>
              <span className="muted" style={{ fontSize: 12 }}>
                {task.parts.map(partLabel).join(' · ')}
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
