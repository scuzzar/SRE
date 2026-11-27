import type { Snapshot } from '../../controller';
import { SkillChips, UppRow } from '../characters/CharacterCard';
import { DetailPage } from '../DetailPage';
import { hex, woundStateText } from '../format';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';
import { UppLine } from './CharacterStrip';

/**
 * Die Detailseite **Probe** (2026-11-27): Sie tritt an die Stelle des Logs bzw. des offenen Bereichs.
 * Alle lebenden Charaktere stehen untereinander, kompakt wie früher die Charakterleiste. Eine
 * Fertigkeit antippen beginnt die Probe (bei einem anderen Charakter holt es ihn nach oben), danach
 * lassen sich Attribute dazuwählen. Gewürfelt wird unten in der Aktionsleiste (`OracleDock`): 2W6
 * oder eine der drei Stufen; danach schließt sich die Seite.
 */
export function TaskPage({ view }: { view: Snapshot }) {
  const game = useGame();
  const characters = view.characters;
  return (
    <DetailPage title="Probe" onClose={() => game.closeTaskPage()}>
      {characters.length === 0 ? (
        <div className="strip-empty task-empty">
          <button type="button" className="add-character" onClick={() => game.newCharacter()}>
            + Charakter anlegen
          </button>
          <button type="button" className="add-character" onClick={() => game.openGeneration()}>
            {view.generationRunning ? 'Erschaffung fortsetzen' : '+ Nach Regeln erschaffen'}
          </button>
        </div>
      ) : (
        <div className="task-cards strip">
          {characters.map((character) => {
            const chosen = character.focus && (character.unskilled?.chosen === true || character.skills.some((s) => s.chosen));
            return (
              <article key={character.id} className={['strip-card', chosen ? 'chosen' : ''].filter(Boolean).join(' ')} aria-label={character.name}>
                <div className="strip-head">
                  <span className="strip-title">
                    <span className="strip-name">{character.name}</span>
                    {character.background && <span className="pc-sub">{character.background}</span>}
                  </span>
                  <button type="button" className="icon-button" aria-label={`${character.name} bearbeiten`} onClick={() => game.editCharacter(character.id)}>
                    <PencilIcon />
                  </button>
                </div>
                {character.state !== 'unhurt' && (
                  <p className={`strip-state state-${character.state}`}>
                    {woundStateText[character.state]} · STR {hex(Math.max(0, character.current.str))} · DEX {hex(Math.max(0, character.current.dex))} · END {hex(Math.max(0, character.current.end))}
                  </p>
                )}
                {/* Die Attribute als Zeile; Kästchen zum Dazuwählen erst, wenn für die Probe eine Fertigkeit gewählt ist. */}
                {chosen ? <UppRow character={character} interactive /> : <UppLine character={character} />}
                <SkillChips character={character} interactive />
              </article>
            );
          })}
        </div>
      )}
    </DetailPage>
  );
}
