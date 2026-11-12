import { useState } from 'react';
import type { CombatView, PatronView, SimView, Snapshot } from '../../controller';
import { patronDetail, patronName, signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { distancesText, EncounterIntro } from './FightScreen';

/**
 * Der Reiter Begegnung. Ohne laufende Begegnung: wo die Gruppe ist, das Gelände und Begegnung würfeln
 * oder wählen; danach zeigt die Übersicht, wer kommt, und „Weiter“ führt zurück hierher. Läuft eine
 * Begegnung, zeigt er sie knapp, mit Zum Kampf, Übersicht und Beenden: Nicht jede Begegnung wird ein
 * Kampf, man kann sie auch anders lösen und beenden. Darunter steht immer der kleine Bereich Patron.
 */
export function EncounterScreen({ view }: { view: Snapshot }) {
  const combat = view.combat;
  return (
    <div className="screen">
      {combat && !combat.sim ? (
        <EncounterStart combat={combat} patron={view.patron} />
      ) : (
        <section className="scroll encounter-scroll" aria-label="Begegnung">
          {!combat ? <p className="log-empty">Ohne lebenden Charakter gibt es keine Begegnung.</p> : combat.sim && <RunningEncounter sim={combat.sim} />}
          {view.patron && <PatronBox patron={view.patron} />}
        </section>
      )}
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
        Entfernung: {distancesText(sim)} · {standing} von {npcs.length} NSC kampffähig
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

/**
 * Eine Begegnung würfeln oder wählen, mit Gelände für die Entfernung und dem Würfel der Anzahl der
 * Kampagne; danach beginnt die Kampfsimulation. Die Einstellungen stehen oben, Würfeln und Wählen unten
 * im Daumenbereich wie im Orakel; darüber steht deutlich, wenn der Wurf keine Begegnung brachte.
 */
function EncounterStart({ combat, patron }: { combat: CombatView; patron: PatronView | undefined }) {
  const game = useGame();
  // Das Gelände gilt erst beim Würfeln; bis dahin hält es nur die View.
  const [terrain, setTerrain] = useState('');
  const ground = terrain || undefined;
  return (
    <>
      <section className="scroll encounter-scroll" aria-label="Begegnung">
        <div className="encounter">
          <LocationPick combat={combat} />
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
          <label className="field encounter-terrain">
            <span>Anzahl würfeln mit</span>
            <select aria-label="Würfel der Anzahl" value={combat.quantityDie} onChange={(e) => game.setQuantityDie(Number(e.target.value))}>
              <option value={6}>W6 (Regel)</option>
              <option value={4}>W4</option>
              <option value={3}>W3</option>
            </select>
          </label>
        </div>
      </section>
      <div className="dock encounter-dock">
        {combat.note && (
          <p className="encounter-note" role="status">
            {combat.note}
          </p>
        )}
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
                {t.roll} · {t.quantity}W{combat.quantityDie} {t.name}
              </option>
            ))}
          </select>
        </div>
        {patron && <PatronBox patron={patron} />}
      </div>
    </>
  );
}

/**
 * Der Bereich Patron (SE, Charts S. 20): Liste 1 oder 2 wählen und würfeln; die DMs der lebenden SC
 * stehen dabei, der Wurf kommt in den Log und der letzte steht hier. Unabhängig von der Begegnung.
 */
function PatronBox({ patron }: { patron: PatronView }) {
  const game = useGame();
  // Die Liste gilt erst beim Würfeln; bis dahin hält sie nur die View.
  const [list, setList] = useState(1);
  const parts = patron.lists.find((l) => l.list === list)?.parts ?? [];
  const last = patron.last;
  return (
    <section className="patron" aria-label="Patron">
      <span className="kicker">Patron</span>
      <div className="patron-row">
        <div className="segmented patron-lists" role="radiogroup" aria-label="Patron-Liste">
          {patron.lists.map((l) => (
            <button key={l.list} type="button" role="radio" aria-checked={list === l.list} onClick={() => setList(l.list)}>
              Liste {l.list}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            haptic('shake');
            game.rollPatron(list);
          }}
        >
          Patron würfeln
        </button>
      </div>
      <p className="patron-dms">{parts.length === 0 ? 'Keine DMs' : parts.map((p) => `${p.die === 0 ? '1.' : '2.'} Würfel ${p.label} ${signed(p.dm)}`).join(' · ')}</p>
      {last && (
        <p className="patron-last" role="status">
          <strong>{patronName(last)}</strong> <span>{patronDetail(last)}</span>
        </p>
      )}
    </section>
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

