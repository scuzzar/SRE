import { useState } from 'react';
import type { CombatView, SimView, Snapshot } from '../../controller';
import { signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { distanceText, EncounterIntro } from './FightScreen';

/**
 * Der Reiter Begegnung. Ohne laufende Begegnung: wo die Gruppe ist, das Gelände und Begegnung würfeln
 * oder wählen; danach zeigt die Übersicht, wer kommt, und „Weiter“ führt zurück hierher. Läuft eine
 * Begegnung, zeigt er sie knapp, mit Zum Kampf, Übersicht und Beenden: Nicht jede Begegnung wird ein
 * Kampf, man kann sie auch anders lösen und beenden.
 */
export function EncounterScreen({ view }: { view: Snapshot }) {
  const combat = view.combat;
  return (
    <div className="screen">
      <section className="scroll encounter-scroll" aria-label="Begegnung">
        {!combat ? <p className="log-empty">Ohne lebenden Charakter gibt es keine Begegnung.</p> : combat.sim ? <RunningEncounter sim={combat.sim} /> : <EncounterStart combat={combat} />}
      </section>
      {combat?.intro && combat.sim && <EncounterIntro sim={combat.sim} />}
    </div>
  );
}

/** Die laufende Begegnung knapp: wer, wo, welche Runde, wie weit; dazu Zum Kampf, Übersicht und Beenden. */
function RunningEncounter({ sim }: { sim: SimView }) {
  const game = useGame();
  const npcs = sim.fighters.filter((f) => f.side === 'npcs');
  const standing = npcs.filter((f) => f.state === 'unhurt' || f.state === 'wounded').length;
  return (
    <div className="encounter encounter-running">
      <span className="kicker">Laufende Begegnung · Wurf {sim.roll}</span>
      <h2 className="encounter-running-title">
        {npcs.length} × {sim.name}
      </h2>
      <p className="encounter-running-facts">
        Runde {sim.round} · Reaktion {sim.reaction}: {sim.reactionText}
        <br />
        Entfernung: {distanceText(sim)} · {standing} von {npcs.length} NSC kampffähig
        {sim.defeated ? ` · entschieden, die ${sim.defeated === 'pcs' ? 'SC' : 'NSC'} sind außer Gefecht` : ''}
      </p>
      <div className="encounter-running-actions">
        <button type="button" className="primary" onClick={() => game.showScreen('combat')}>
          Zum Kampf
        </button>
        <button type="button" className="ghost" onClick={() => game.showEncounterIntro()}>
          Übersicht
        </button>
        <button type="button" className="ghost" onClick={() => game.endEncounter()}>
          Beenden
        </button>
      </div>
    </div>
  );
}

/** Eine Begegnung würfeln oder wählen, mit Gelände für die Entfernung; danach beginnt die Kampfsimulation. */
function EncounterStart({ combat }: { combat: CombatView }) {
  const game = useGame();
  // Das Gelände gilt erst beim Würfeln; bis dahin hält es nur die View.
  const [terrain, setTerrain] = useState('');
  const ground = terrain || undefined;
  return (
    <div className="encounter">
      <LocationPick combat={combat} />
      <div className="encounter-start">
        <button
          type="button"
          className="primary"
          disabled={!combat.canEncounter}
          onClick={() => {
            haptic('shake');
            game.rollEncounter(undefined, ground);
          }}
        >
          Begegnung würfeln
        </button>
        <select aria-label="Begegnung wählen" value="" disabled={!combat.canEncounter} onChange={(e) => e.target.value && game.rollEncounter(Number(e.target.value), ground)}>
          <option value="">oder wählen …</option>
          {combat.encounterTypes.map((t) => (
            <option key={t.roll} value={t.roll}>
              {t.roll} · {t.quantity}W6 {t.name}
            </option>
          ))}
        </select>
      </div>
      <label className="field encounter-terrain">
        <span>Gelände (DM auf die Entfernung)</span>
        <select value={terrain} disabled={!combat.canEncounter} onChange={(e) => setTerrain(e.target.value)}>
          <option value="">ohne (±0)</option>
          {combat.terrains.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({signed(t.dm)})
            </option>
          ))}
        </select>
      </label>
      {combat.note && <p className="combat-hint">{combat.note}</p>}
    </div>
  );
}

/** Wo die Gruppe ist; ohne Aufenthaltsort gibt es keine Begegnung. Gibt es keine fertige Welt, geht es zum Sektor. */
function LocationPick({ combat }: { combat: CombatView }) {
  const game = useGame();
  if (combat.worlds.length === 0) {
    return (
      <div className="location-pick">
        <p className="combat-hint">Eine Begegnung findet auf einer Welt statt. Erst im Sektor eine Welt erschaffen.</p>
        <button type="button" className="ghost" onClick={() => game.showScreen('sector')}>
          Zum Sektor
        </button>
      </div>
    );
  }
  return (
    <label className="field location-pick">
      <span>{combat.location ? 'Die Gruppe ist auf' : 'Wo ist die Gruppe? (für Begegnungen nötig)'}</span>
      <select value={combat.location ?? ''} onChange={(e) => e.target.value && game.stayAt(e.target.value)}>
        {!combat.location && <option value="">Welt wählen …</option>}
        {combat.worlds.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.id} · {w.uwp})
          </option>
        ))}
      </select>
    </label>
  );
}

