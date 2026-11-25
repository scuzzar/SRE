import { useState } from 'react';
import type { NpcItem, NpcScreenView, Snapshot } from '../../controller';
import type { NpcRole } from '../../model';
import { hex, roleText } from '../format';
import { useGame } from '../game-context';
import { CheckIcon, CloseIcon, CombatIcon, PencilIcon } from '../icons';
import { SubTabs, peopleParts } from '../SubTabs';

/**
 * NSC im Reiter Charaktere: die dauerhaften NSC, vorgegeben die des Aufenthaltsorts (und die ohne Ort) nach
 * Rolle; mit „Alle zeigen“ alle nach Welt und darin nach Rolle. Antippen öffnet den Editor.
 *
 * Beim NSC platzieren (`npcs.placing`) hat jeder NSC ein Kästchen zum Auswählen, wer schon auf dem
 * Feld ist, ist angehakt und gesperrt; unten stehen „Abbrechen“ und „OK“. Filter wie „Alle zeigen“
 * gelten weiter, die Auswahl bleibt dabei stehen. Welche angehakt sind, ist reine Darstellung, bis
 * „OK“ sie dem Controller gibt; solange steht der Umschalter SC, NSC, Kasse oben nicht da.
 */
export function NpcScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const npcs = view.npcs;
  // Ob das Fenster „Neuer NSC“ offen ist, ist reine Darstellung.
  const [adding, setAdding] = useState(false);
  const filtered = !npcs.all && npcs.here !== undefined;
  const shown = npcs.worlds.reduce((sum, w) => sum + w.roles.reduce((n, r) => n + r.npcs.length, 0), 0);
  // „In Begegnung“ gibt es für NSC vom Aufenthaltsort, solange keine Begegnung läuft (2026-11-14g).
  const joinable = new Set(view.combat && !view.combat.sim ? view.combat.joinable.map((j) => j.id) : []);
  const placing = npcs.placing;
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const toggle = (id: string) => setChosen((was) => (was.includes(id) ? was.filter((c) => c !== id) : [...was, id]));

  return (
    <div className="screen">
      {!placing && <SubTabs label="Charaktere" parts={peopleParts} screen="npcs" />}
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
        {placing && <p className="npc-placing">{placing.question}</p>}
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
                    <NpcRow
                      key={npc.id}
                      npc={npc}
                      joinable={joinable.has(npc.id)}
                      pick={placing && { here: placing.here.includes(npc.id), blocked: placing.allowed && !placing.allowed.includes(npc.id) ? placing.notAllowed : undefined, chosen: chosen.includes(npc.id), onToggle: () => toggle(npc.id) }}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
        {!placing && (
          <div className="add-characters">
            <button type="button" className="add-character" onClick={() => setAdding(true)}>
              + Neuer NSC
            </button>
          </div>
        )}
        {!placing && npcs.dead.length > 0 && (
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
      {placing && (
        <section className="dock" aria-label="NSC auswählen">
          <div className="actions oracle-actions">
            <button type="button" className="action note" onClick={() => game.cancelNpcPlacing()}>
              <CloseIcon />
              Abbrechen
            </button>
            <button type="button" className="action draw" aria-label={`OK, ${chosen.length} NSC ${placing.ok}`} disabled={chosen.length === 0} onClick={() => game.placeNpcs(chosen)}>
              <CheckIcon />
              {chosen.length === 0 ? 'OK' : `OK (${chosen.length})`}
            </button>
          </div>
        </section>
      )}
      {adding && <NewNpcSheet npcs={npcs} onClose={() => setAdding(false)} />}
    </div>
  );
}

/**
 * „+ Neuer NSC“: erst die Rolle, dann leer anlegen oder aus einer Laufbahn erzeugen (ohne Animation).
 * Mit `here` (langes Drücken auf „NSC platzieren“ am Feld) nur aus einer Laufbahn; der neue NSC lebt
 * dann auf diesem Feld bzw. in dieser Stadt.
 */
export function NewNpcSheet({ npcs, onClose, here }: { npcs: NpcScreenView; onClose: () => void; /** Wo er leben wird, etwa „in Tarvik“. */ here?: string | undefined }) {
  const blocker = here === undefined ? npcs.generateBlocker : undefined;
  const game = useGame();
  const [role, setRole] = useState<NpcRole>('other');
  // Das **Dienstalter** (2026-11-24f): so viele Terms der Lauf würfeln soll; leer = so lange er kann.
  const [terms, setTerms] = useState<number | undefined>(undefined);
  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="new-npc-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="new-npc-title">{here === undefined ? 'Neuer NSC' : `Neuer NSC ${here}`}</h2>
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
          <label className="field">
            <span>Dienstalter</span>
            <select value={terms ?? ''} onChange={(e) => setTerms(e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">So lange er kann</option>
              {npcs.termsGoal.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Term' : 'Terms'}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>Aus einer Laufbahn erzeugen</legend>
            <p className="small-label">
              Die Charaktererschaffung läuft zufällig durch; danach lässt er sich im Editor nachbessern. Mit Dienstalter dient er genau so lange und kann dabei nicht sterben.
            </p>
            {blocker && <p className="small-label">{blocker}</p>}
            <div className="npc-services">
              {npcs.services.map((sv) => (
                <button
                  key={sv.id}
                  type="button"
                  className="ghost"
                  disabled={blocker !== undefined}
                  onClick={() => {
                    onClose();
                    void game.generateNpc(sv.id, role, here !== undefined, terms);
                  }}
                >
                  {sv.name}
                </button>
              ))}
            </div>
          </fieldset>
          {here === undefined && (
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
          )}
        </div>
      </section>
    </div>
  );
}

/** Beim NSC platzieren: ob er schon auf dem Feld ist, ob er angehakt ist, und das Umschalten. */
interface Pick {
  readonly here: boolean;
  /** Warum er sich nicht wählen lässt (etwa nicht am Aufenthaltsort); sonst `undefined`. */
  readonly blocked: string | undefined;
  readonly chosen: boolean;
  readonly onToggle: () => void;
}

function NpcRow({ npc, dead = false, joinable = false, pick }: { npc: NpcItem; dead?: boolean; joinable?: boolean; pick?: Pick | undefined }) {
  const game = useGame();
  const stats = (
    <span className="npc-stats">
      STR {hex(npc.upp.str)} DEX {hex(npc.upp.dex)} END {hex(npc.upp.end)} INT {hex(npc.upp.int)} EDU {hex(npc.upp.edu)} SOC {hex(npc.upp.soc)}
      {npc.weapon && ` · ${npc.weapon}`}
    </span>
  );
  if (pick) {
    // Die ganze Zeile hakt an; wer schon dort ist, bleibt angehakt.
    return (
      <li aria-label={`${npc.name}, ${roleText[npc.role]}`} className={pick.here || pick.blocked ? 'npc-pick here' : 'npc-pick'}>
        <label className="npc-open">
          <input type="checkbox" checked={pick.here || pick.chosen} disabled={pick.here || pick.blocked !== undefined} onChange={pick.onToggle} aria-label={pick.here ? `${npc.name} ist schon hier` : pick.blocked ? `${npc.name}, ${pick.blocked}` : `${npc.name} wählen`} />
          <span className="npc-pick-text">
            <span className="fallen-name">
              {npc.name}
              {npc.background && <span className="pc-sub"> {npc.background}</span>}
              {pick.here && <span className="pc-sub"> · schon hier</span>}
              {pick.blocked && <span className="pc-sub"> · {pick.blocked}</span>}
            </span>
            {stats}
          </span>
        </label>
      </li>
    );
  }
  return (
    <li aria-label={dead ? `${npc.name}, ${roleText[npc.role]}, tot` : `${npc.name}, ${roleText[npc.role]}`}>
      <button type="button" className="npc-open" onClick={() => game.editCharacter(npc.id)}>
        <span className="fallen-name">
          {dead && <span aria-hidden="true">† </span>}
          {npc.name}
          {npc.background && <span className="pc-sub"> {npc.background}</span>}
        </span>
        {stats}
      </button>
      {joinable && (
        <button type="button" className="icon-button" aria-label={`${npc.name} in Begegnung`} title="In Begegnung" onClick={() => game.joinEncounter(npc.id)}>
          <CombatIcon />
        </button>
      )}
      <button type="button" className="icon-button" aria-label={`${npc.name} bearbeiten`} onClick={() => game.editCharacter(npc.id)}>
        <PencilIcon />
      </button>
    </li>
  );
}
