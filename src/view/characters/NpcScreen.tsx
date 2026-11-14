import type { NpcItem, Snapshot } from '../../controller';
import { roleText } from '../format';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';

/**
 * Der Reiter NSC: die dauerhaften NSC, vorgegeben die des Aufenthaltsorts (und die ohne Ort) nach
 * Rolle; mit „Alle zeigen“ alle nach Welt und darin nach Rolle. Antippen öffnet den Editor.
 */
export function NpcScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const npcs = view.npcs;
  const filtered = !npcs.all && npcs.here !== undefined;
  const shown = npcs.worlds.reduce((sum, w) => sum + w.roles.reduce((n, r) => n + r.npcs.length, 0), 0);

  return (
    <div className="screen">
      <section className="scroll characters npc-screen" aria-labelledby="npcs-title">
        <div className="npc-head">
          <h2 id="npcs-title" className="section-title">
            {filtered ? `NSC auf ${npcs.here}` : 'Alle NSC'}
          </h2>
          {npcs.here !== undefined && (
            <label className="npc-all">
              <input type="checkbox" checked={npcs.all} onChange={(e) => game.showAllNpcs(e.target.checked)} />
              Alle zeigen
            </label>
          )}
        </div>
        {shown === 0 && (
          <p className="npc-empty">
            {npcs.total === 0
              ? 'Noch keine NSC. Sie entstehen beim Patron im Reiter Begegnung („Als NSC“), beim Übernehmen aus einer Begegnung oder mit „+ Neuer NSC“.'
              : `Hier lebt noch kein NSC. Auf anderen Welten: ${npcs.total}; „Alle zeigen“ zeigt sie.`}
          </p>
        )}
        {npcs.worlds.map((world) => (
          <div key={world.key} className="npc-world">
            {!filtered && <h3 className="npc-world-name">{world.name ?? 'Ohne Ort (reisen mit)'}</h3>}
            {world.roles.map((group) => (
              <div key={group.role} className="fallen npcs">
                <h4 className="section-title npc-role">{roleText[group.role]}</h4>
                <ul>
                  {group.npcs.map((npc) => (
                    <NpcRow key={npc.id} npc={npc} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
        <div className="add-characters">
          <button type="button" className="add-character" onClick={() => game.newCharacter(true)}>
            + Neuer NSC
          </button>
        </div>
        {npcs.dead.length > 0 && (
          <details className="fallen npc-dead">
            <summary className="section-title">Verstorben ({npcs.dead.length})</summary>
            <ul>
              {npcs.dead.map((npc) => (
                <NpcRow key={npc.id} npc={npc} dead />
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function NpcRow({ npc, dead = false }: { npc: NpcItem; dead?: boolean }) {
  const game = useGame();
  return (
    <li aria-label={dead ? `${npc.name}, ${roleText[npc.role]}, tot` : `${npc.name}, ${roleText[npc.role]}`}>
      <button type="button" className="npc-open" onClick={() => game.editCharacter(npc.id)}>
        <span className="fallen-name">
          {dead && <span aria-hidden="true">† </span>}
          {npc.name}
          {npc.background && <span className="pc-sub"> {npc.background}</span>}
        </span>
      </button>
      <button type="button" className="icon-button" aria-label={`${npc.name} bearbeiten`} onClick={() => game.editCharacter(npc.id)}>
        <PencilIcon />
      </button>
    </li>
  );
}
