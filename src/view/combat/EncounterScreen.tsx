import { useState } from 'react';
import type { CombatView, SimView, Snapshot, TimeView } from '../../controller';
import { signed } from '../format';
import { useGame } from '../game-context';
import { TripBar } from '../sector/TripPanels';
import { distancesText, EncounterIntro } from './FightScreen';

/** Was im Reiter Begegnung eingestellt ist, aber nur in der Ansicht lebt: die Haken und wie viele Tage. */
export interface EncounterOptions {
  /** Wie viele Tage vergehen sollen; der Knopf dazu steht unten in der Reihe. */
  readonly days: number;
  /** „Manuell wählen“: Zufall und Tiere öffnen die Auswahl der Art bzw. Zeile statt des Wurfs. */
  readonly manual: boolean;
  /** „NSC dazunehmen“: Zufall öffnet erst den Reiter NSC zum Auswählen. */
  readonly withNpcs: boolean;
}

/**
 * Der Reiter Begegnung als Blatt: Die Würfe stehen unten in der Reihe (`EncounterDock`) und zeigen ihr
 * Ergebnis im Würfelfenster. Auf dem Blatt bleibt, was gerade läuft (Fahrt, Begegnung mit Zum Kampf,
 * Übersicht und Beenden), das Datum und was man einstellt: Gelände, Würfel der Anzahl, „Manuell wählen“,
 * „NSC dazunehmen“ und wie viele Tage vergehen sollen. Ohne Aufenthaltsort fragt es danach.
 */
export function EncounterScreen({ view, options, onOptions }: { view: Snapshot; options: EncounterOptions; onOptions: (options: EncounterOptions) => void }) {
  const game = useGame();
  const combat = view.combat;
  // Schon dazugenommen (etwa mit „In Begegnung“ im Reiter NSC): Sie kommen beim nächsten Zufall mit, ohne Test.
  const joined = (combat?.joining ?? []).map((id, i) => `${combat?.joinable.find((n) => n.id === id)?.name ?? id}${i === 0 ? ' · Anführer' : ''}`);
  const joinable = combat?.joinable.length ?? 0;
  return (
    <div className="screen">
      <section className="scroll encounter-scroll" aria-label="Begegnung">
        {view.time && <TimeBar time={view.time} days={options.days} onDays={(days) => onOptions({ ...options, days })} trip={view.trip !== undefined} />}
        {view.trip && <TripBar trip={view.trip} note={view.tripNote} />}
        {!combat && <p className="log-empty">Ohne lebenden Charakter gibt es keine Begegnung.</p>}
        {combat?.sim && <RunningEncounter sim={combat.sim} />}
        {combat && (
          <section className="encounter-settings" aria-label="Einstellungen der Begegnungen">
            {(!combat.location || combat.worlds.length === 0) && <LocationPick combat={combat} />}
            <TerrainPick combat={combat} />
            <QuantityPick combat={combat} />
            {combat.animals.blocked && <p className="combat-hint encounter-settings-wide">Tiere: {combat.animals.blocked}</p>}
            <label className="npc-all encounter-settings-wide">
              <input type="checkbox" checked={options.manual} onChange={(e) => onOptions({ ...options, manual: e.target.checked })} />
              Manuell wählen (Art bzw. Zeile statt Wurf, ohne Test)
            </label>
            <label className="npc-all encounter-settings-wide">
              <input type="checkbox" checked={options.withNpcs && joinable > 0} disabled={joinable === 0} onChange={(e) => onOptions({ ...options, withNpcs: e.target.checked })} />
              {joinable === 0 ? 'NSC dazunehmen (kein NSC am Aufenthaltsort)' : 'NSC dazunehmen (Zufall wählt erst im Reiter NSC, ohne Test)'}
            </label>
            {joined.length > 0 && !combat.sim && (
              <p className="encounter-note encounter-settings-wide" role="status" aria-label="Kommen dazu">
                Kommen beim nächsten Zufall dazu, ohne Test: {joined.join(', ')}{' '}
                <button type="button" className="ghost compact" onClick={() => combat.joining.forEach((id) => game.toggleJoining(id))}>
                  lösen
                </button>
              </p>
            )}
            {combat.note && !combat.sim && (
              <p className="encounter-note encounter-settings-wide" role="status">
                {combat.note}
              </p>
            )}
          </section>
        )}
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
      <span className="kicker">Laufende Begegnung{sim.roll === undefined ? ' · nur NSC' : ` · Wurf ${sim.roll}`}</span>
      <h2 className="encounter-running-title">{sim.title}</h2>
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

/** Das Gelände der Kampagne, für alle Begegnungsarten: DM auf die Entfernung, und ob es dort Tiere gibt. */
function TerrainPick({ combat }: { combat: CombatView }) {
  const game = useGame();
  return (
    <label className="field">
      <span>Gelände</span>
      <select aria-label="Gelände" value={combat.terrain ?? ''} onChange={(e) => game.setTerrain(e.target.value || undefined)}>
        <option value="">ohne (±0)</option>
        {combat.terrains.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({signed(t.dm)}){t.animals ? '' : ', keine Tiere'}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Der Würfel der Anzahl der Kampagne, für alle Begegnungen mit Personen und Tieren: W6 nach den Regeln, W4 oder W3 zum Ausgleichen. */
function QuantityPick({ combat }: { combat: CombatView }) {
  const game = useGame();
  return (
    <label className="field">
      <span>Anzahl würfeln mit</span>
      <select aria-label="Würfel der Anzahl" value={combat.quantityDie} onChange={(e) => game.setQuantityDie(Number(e.target.value))}>
        <option value={6}>W6 (Regel)</option>
        <option value={4}>W4</option>
        <option value={3}>W3</option>
      </select>
    </label>
  );
}

/**
 * Die Spielzeit: Datum mit Wochentag (änderbar, solange es geht) und wie viele Tage vergehen sollen.
 * Die Knöpfe dazu (Tage vergehen, Woche beenden, bei einer Fahrt Weiterfahren) stehen unten in der
 * Reihe `EncounterDock`; Hinweise des Controllers stehen hier.
 */
function TimeBar({ time, days, onDays, trip }: { time: TimeView; days: number; onDays: (days: number) => void; trip: boolean }) {
  const game = useGame();
  const [editing, setEditing] = useState(false);
  const [dayOfYear, setDayOfYear] = useState(String(time.dayOfYear));
  const [year, setYear] = useState(String(time.year));
  return (
    <section className="time-bar" aria-label="Spielzeit">
      <div className="time-date">
        <span className="kicker">Spielzeit</span>
        <strong>{time.label}</strong>
        {time.canSetStart && !editing && (
          <button type="button" className="ghost compact" onClick={() => setEditing(true)}>
            Datum ändern
          </button>
        )}
      </div>
      {editing && (
        <form
          className="time-start"
          onSubmit={(e) => {
            e.preventDefault();
            game.setStartDate(Number(dayOfYear), Number(year));
            setEditing(false);
          }}
        >
          <label className="field">
            <span>Tag (1–365)</span>
            <input inputMode="numeric" value={dayOfYear} onChange={(e) => setDayOfYear(e.target.value)} />
          </label>
          <label className="field">
            <span>Jahr</span>
            <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
          <button type="submit" className="primary compact">
            Setzen
          </button>
          <button type="button" className="ghost compact" onClick={() => setEditing(false)}>
            Abbrechen
          </button>
        </form>
      )}
      {!trip && (
        <label className="field time-days">
          <span>Unten vergehen lassen</span>
          <select aria-label="Wie viele Tage" value={Math.min(days, time.maxDays)} disabled={time.blocked !== undefined} onChange={(e) => onDays(Number(e.target.value))}>
            {Array.from({ length: time.maxDays }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'Tag' : 'Tage'}
              </option>
            ))}
          </select>
        </label>
      )}
      {time.blocked && <p className="combat-hint">{time.blocked}</p>}
      {time.note && (
        <p className="encounter-note" role="status">
          {time.note}
        </p>
      )}
    </section>
  );
}
