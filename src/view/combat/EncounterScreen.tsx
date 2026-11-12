import { useState } from 'react';
import type { ReactNode } from 'react';
import type { CombatView, PatronView, SimView, Snapshot } from '../../controller';
import { patronDetail, patronName, signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { distancesText, EncounterIntro } from './FightScreen';

/**
 * Der Reiter Begegnung: oben, wo die Gruppe ist, darunter eine Liste der Begegnungsarten. Jede Art ist
 * eine Karte mit ihren Einstellungen und ihrem Wurf; weitere Arten kommen als weitere Karten dazu.
 * Bei der Zufallsbegegnung zeigt die Übersicht nach dem Würfeln, wer kommt, und „Weiter“ führt zurück
 * hierher. Läuft eine, zeigt ihre Karte sie knapp, mit Zum Kampf, Übersicht und Beenden: Nicht jede
 * Begegnung wird ein Kampf, man kann sie auch anders lösen und beenden.
 */
export function EncounterScreen({ view }: { view: Snapshot }) {
  const combat = view.combat;
  return (
    <div className="screen">
      <section className="scroll encounter-scroll" aria-label="Begegnung">
        {combat && <LocationPick combat={combat} />}
        <EncounterKind title="Zufallsbegegnung" rule="Personen nach der Random Encounter List (S. 21) · täglich, Test 5+ auf 1W6">
          {!combat ? <p className="log-empty">Ohne lebenden Charakter gibt es keine Begegnung.</p> : combat.sim ? <RunningEncounter sim={combat.sim} /> : <EncounterStart combat={combat} />}
        </EncounterKind>
        {view.patron && (
          <EncounterKind title="Patron" rule="Auftraggeber nach der Patron Encounters Matrix (S. 20) · wöchentlich, Test 5+ auf 1W6, die Liste wählt ein Würfel">
            <PatronBox patron={view.patron} />
          </EncounterKind>
        )}
      </section>
      {combat?.intro && combat.sim && <EncounterIntro sim={combat.sim} />}
    </div>
  );
}

/** Eine Begegnungsart als Karte: Name, woher die Regel kommt, darunter ihre Einstellungen und ihr Wurf. */
function EncounterKind({ title, rule, children }: { title: string; rule: string; children: ReactNode }) {
  return (
    <section className="encounter-kind" aria-label={title}>
      <header className="encounter-kind-head">
        <h2>{title}</h2>
        <span>{rule}</span>
      </header>
      {children}
    </section>
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
 * Die Zufallsbegegnung würfeln oder wählen, mit Gelände für die Entfernung und dem Würfel der Anzahl
 * der Kampagne. Die Einstellungen stehen oben, Würfeln und Wählen darunter; dazwischen steht deutlich,
 * wenn der Wurf keine Begegnung brachte.
 */
function EncounterStart({ combat }: { combat: CombatView }) {
  const game = useGame();
  // Das Gelände gilt erst beim Würfeln; bis dahin hält es nur die View.
  const [terrain, setTerrain] = useState('');
  const ground = terrain || undefined;
  return (
    <>
      <div className="encounter-settings">
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
    </>
  );
}

/**
 * Die Begegnungsart Patron (SE, Charts S. 20): Würfeln testet erst, ob es einen gibt, wählt dann die
 * Liste und würfelt den Patron. Die DMs der lebenden SC stehen dabei, der Wurf kommt in den Log und
 * der letzte steht hier. Unabhängig von der Zufallsbegegnung.
 */
function PatronBox({ patron }: { patron: PatronView }) {
  const game = useGame();
  const last = patron.last;
  const dms = patron.lists.filter((l) => l.parts.length > 0);
  return (
    <>
      <p className="patron-dms">
        {dms.length === 0 ? 'Keine DMs' : dms.map((l) => `Liste ${l.list}: ${l.parts.map((p) => `${p.die === 0 ? '1.' : '2.'} Würfel ${p.label} ${signed(p.dm)}`).join(', ')}`).join(' · ')}
      </p>
      {patron.note && (
        <p className="encounter-note" role="status">
          {patron.note}
        </p>
      )}
      {last && (
        <p className="patron-last">
          Zuletzt: <strong>{patronName(last)}</strong> <span>{patronDetail(last)}</span>
        </p>
      )}
      <button
        type="button"
        className="primary encounter-roll"
        onClick={() => {
          haptic('shake');
          game.rollPatron();
        }}
      >
        Patron würfeln
      </button>
    </>
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
