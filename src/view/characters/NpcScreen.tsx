import { useState } from 'react';
import type { NpcItem, NpcScreenView, Snapshot } from '../../controller';
import type { NpcRole } from '../../model';
import { hex, roleText } from '../format';
import { useGame } from '../game-context';
import { CloseIcon, PencilIcon } from '../icons';

/**
 * Der Reiter NSC: die dauerhaften NSC, vorgegeben die des Aufenthaltsorts (und die ohne Ort) nach
 * Rolle; mit „Alle zeigen“ alle nach Welt und darin nach Rolle. Antippen öffnet den Editor.
 */
export function NpcScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const npcs = view.npcs;
  // Ob das Fenster „Neuer NSC“ offen ist, ist reine Darstellung.
  const [adding, setAdding] = useState(false);
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
          <button type="button" className="add-character" onClick={() => setAdding(true)}>
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
      {adding && <NewNpcSheet npcs={npcs} onClose={() => setAdding(false)} />}
    </div>
  );
}

/** „+ Neuer NSC“: erst die Rolle, dann leer anlegen oder aus einer Laufbahn erzeugen (ohne Animation). */
function NewNpcSheet({ npcs, onClose }: { npcs: NpcScreenView; onClose: () => void }) {
  const game = useGame();
  const [role, setRole] = useState<NpcRole>('other');
  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="new-npc-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="new-npc-title">Neuer NSC</h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body form">
          <label className="field">
            <span>Rolle</span>
            <select value={role} onChange={(e) => setRole(e.target.value as NpcRole)}>
              {npcs.roles.map((r) => (
                <option key={r} value={r}>
                  {roleText[r]}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Aus einer Laufbahn erzeugen</legend>
            <p className="small-label">Die Charaktererschaffung läuft zufällig durch; danach lässt er sich im Editor nachbessern.</p>
            {npcs.generateBlocker && <p className="small-label">{npcs.generateBlocker}</p>}
            <div className="npc-services">
              {npcs.services.map((sv) => (
                <button
                  key={sv.id}
                  type="button"
                  className="ghost"
                  disabled={npcs.generateBlocker !== undefined}
                  onClick={() => {
                    onClose();
                    game.generateNpc(sv.id, role);
                  }}
                >
                  {sv.name}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className="add-character"
            onClick={() => {
              onClose();
              game.newCharacter(true, role);
            }}
          >
            Leer anlegen
          </button>
        </div>
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
        <span className="npc-stats">
          STR {hex(npc.upp.str)} DEX {hex(npc.upp.dex)} END {hex(npc.upp.end)} INT {hex(npc.upp.int)} EDU {hex(npc.upp.edu)} SOC {hex(npc.upp.soc)}
          {npc.weapon && ` · ${npc.weapon}`}
        </span>
      </button>
      <button type="button" className="icon-button" aria-label={`${npc.name} bearbeiten`} onClick={() => game.editCharacter(npc.id)}>
        <PencilIcon />
      </button>
    </li>
  );
}
