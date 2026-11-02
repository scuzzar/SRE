import type { Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';
import { CharacterCard } from './CharacterCard';

/**
 * Der Charakter-Screen zum Verwalten: anlegen, nach Regeln erschaffen, bearbeiten, Details mit
 * Lebenslauf, Verstorbene und Ausgeblendete. Proben würfelt man oben im Orakel-Screen.
 */
export function CharactersScreen({ view }: { view: Snapshot }) {
  const game = useGame();

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
    </div>
  );
}
