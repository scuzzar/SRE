import { useState, type ReactNode } from 'react';
import type { ChecksView, CombatView, LegalView, PatronView, RumorView, SimView, Snapshot, TimeView } from '../../controller';
import { checkDetail, patronDetail, patronName, rumorDetail, rumorName, signed } from '../format';
import { HoldButton } from '../HoldButton';
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
        {view.time && <TimeBar time={view.time} />}
        {combat && (
          <div className="encounter-settings">
            <LocationPick combat={combat} />
            <TerrainPick combat={combat} />
            <QuantityPick combat={combat} />
          </div>
        )}
        <EncounterKind title="Zufallsbegegnung" rule="Personen nach der Random Encounter List (S. 21) · täglich, Test 5+ auf 1W6">
          {!combat ? (
            <p className="log-empty">Ohne lebenden Charakter gibt es keine Begegnung.</p>
          ) : combat.sim && !combat.sim.animal ? (
            <RunningEncounter sim={combat.sim} />
          ) : (
            <EncounterStart combat={combat} checks={view.checks} />
          )}
        </EncounterKind>
        {combat && (
          <EncounterKind title="Tiere" rule="Tiertabelle der Welt im Gelände (S. 18–19) · zweimal täglich, Test 5+ auf 1W6">
            {combat.sim?.animal ? <RunningEncounter sim={combat.sim} /> : <AnimalsBox combat={combat} checks={view.checks} />}
          </EncounterKind>
        )}
        {view.patron && (
          <EncounterKind title="Patron" rule="Auftraggeber nach der Patron Encounters Matrix (S. 20) · wöchentlich, Test 5+ auf 1W6, die Liste wählt ein Würfel">
            <PatronBox patron={view.patron} checks={view.checks} />
          </EncounterKind>
        )}
        {view.rumor && (
          <EncounterKind title="Gerücht" rule="Art des Gerüchts nach der Rumors Matrix (S. 21) · wöchentlich, Test 7+ auf 2W6">
            <RumorBox rumor={view.rumor} checks={view.checks} />
          </EncounterKind>
        )}
        {view.legal && combat && (
          <EncounterKind title="Polizei" rule="Legal Encounter (S. 20) · wöchentlich, 2W6 gleich oder über der Gesetzesstufe heißt Ruhe">
            <LegalBox legal={view.legal} checks={view.checks} />
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
function EncounterStart({ combat, checks }: { combat: CombatView; checks: ChecksView | undefined }) {
  const game = useGame();
  const disabled = !combat.canEncounter || combat.sim !== undefined;
  return (
    <>
      {combat.note && (
        <p className="encounter-note" role="status">
          {combat.note}
        </p>
      )}
      <div className="encounter-start">
        <TestButton
          title="Begegnung würfeln"
          check={checks?.random}
          disabled={disabled}
          onPress={() => game.rollEncounter()}
          onHold={() => game.rollEncounter(undefined, undefined, true)}
        />
        <select aria-label="Begegnung wählen" value="" disabled={disabled} onChange={(e) => e.target.value && game.rollEncounter(Number(e.target.value))}>
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
 * Die Begegnungsart Tiere (SE 18–19): Würfeln testet erst, ob Tiere kommen, und würfelt dann auf die
 * Tiertabelle von Welt und Gelände; sie entsteht beim ersten Wurf. Ein Tier wird eine Begegnung mit
 * Übersicht, ein Ereignis steht im Log und hier. Gibt es die Tabelle schon, kann man die Zeile wählen.
 */
function AnimalsBox({ combat, checks }: { combat: CombatView; checks: ChecksView | undefined }) {
  const game = useGame();
  const animals = combat.animals;
  const event = animals.lastEvent;
  return (
    <>
      {animals.blocked && <p className="combat-hint">{animals.blocked}</p>}
      {animals.note && (
        <p className="encounter-note" role="status">
          {animals.note}
        </p>
      )}
      {event && (
        <p className="patron-last">
          Zuletzt: <strong>{event.name}</strong> <span>{event.text}</span>
        </p>
      )}
      {event?.canSave && (
        <button
          type="button"
          className="ghost"
          onClick={() => {
            haptic('shake');
            game.rollEventSaves(event.index);
          }}
        >
          Rettungswürfe würfeln ({/^\d/.test(event.save!) ? event.save : `${event.save} oder weniger`}, sonst {event.damage}W6)
        </button>
      )}
      <div className="encounter-start">
        <TestButton title="Tiere würfeln" check={checks?.animal} disabled={animals.blocked !== undefined} onPress={() => game.rollAnimals()} onHold={() => game.rollAnimals(undefined, true)} />
        <select aria-label="Tiere wählen" value="" disabled={animals.blocked !== undefined || animals.rows.length === 0} onChange={(e) => e.target.value && game.rollAnimals(Number(e.target.value))}>
          <option value="">{animals.rows.length === 0 ? 'Tabelle beim 1. Wurf' : 'oder wählen …'}</option>
          {animals.rows.map((r) => (
            <option key={r.roll} value={r.roll}>
              {r.roll} · {r.quantity === 0 ? '1' : `${r.quantity}W${combat.quantityDie}`} {r.name}
            </option>
          ))}
        </select>
      </div>
    </>
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

/**
 * Die Begegnungsart Patron (SE, Charts S. 20): Würfeln testet erst, ob es einen gibt, wählt dann die
 * Liste und würfelt den Patron. Die DMs der lebenden SC stehen dabei, der Wurf kommt in den Log und
 * der letzte steht hier. Unabhängig von der Zufallsbegegnung.
 */
function PatronBox({ patron, checks }: { patron: PatronView; checks: ChecksView | undefined }) {
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
      {last && !last.rumor && patron.npc && (
        <div className="patron-npc">
          <button type="button" className="ghost" disabled={patron.npc.blocker !== undefined} onClick={() => game.createPatronNpc()}>
            Als NSC
          </button>
          <span className="small-label">{patron.npc.blocker ?? 'Zufälliger NSC in der Laufbahn des Patrons, kommt in den Reiter NSC.'}</span>
        </div>
      )}
      <TestButton className="encounter-roll" title="Patron würfeln" check={checks?.patron} onPress={() => game.rollPatron()} onHold={() => game.rollPatron(true)} />
    </>
  );
}

/** Die Begegnungsart Gerücht (SE, Charts S. 21): Würfeln testet erst, ob es eines gibt, und würfelt dann die Art; sie kommt in den Log. */
function RumorBox({ rumor, checks }: { rumor: RumorView; checks: ChecksView | undefined }) {
  const game = useGame();
  const last = rumor.last;
  return (
    <>
      {rumor.note && (
        <p className="encounter-note" role="status">
          {rumor.note}
        </p>
      )}
      {last && (
        <p className="patron-last">
          Zuletzt: <strong>{rumorName(last)}</strong> <span>{rumorDetail(last)}</span>
        </p>
      )}
      <TestButton className="encounter-roll" title="Gerücht würfeln" check={checks?.rumor} onPress={() => game.rollRumor()} onHold={() => game.rollRumor(true)} />
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

/**
 * Der Knopf eines Tests: sagt, wie oft er in seinem Zeitraum schon gewürfelt ist („heute 1×“). Ist die
 * Regel erfüllt, sagt der Controller beim Tippen, dass es nur lange gedrückt geht; der lange Druck
 * würfelt trotzdem.
 */
function TestButton({ title, check, disabled = false, className = '', onPress, onHold }: { title: string; check: ChecksView[keyof ChecksView] | undefined; disabled?: boolean; className?: string; onPress: () => void; onHold: () => void }) {
  const met = check?.met ?? false;
  return (
    <HoldButton
      className={`${met ? 'ghost' : 'primary'} test-button ${className}`}
      disabled={disabled}
      label={`${title}${check ? `, ${check.label}` : ''}`}
      hint="Lange drücken: noch ein Test, auch wenn die Regel für diesen Zeitraum erfüllt ist"
      onPress={() => {
        haptic('shake');
        onPress();
      }}
      onHold={() => {
        haptic('shake');
        onHold();
      }}
    >
      <span className="test-title">{title}</span>
      {check && <span className="test-count">{met ? `${check.label} · lange drücken` : check.label}</span>}
    </HoldButton>
  );
}

/** Die Polizei (S. 20): einmal je Woche 2W6 gegen die Gesetzesstufe des Aufenthaltsorts; bei Gesetz 0 keine. */
function LegalBox({ legal, checks }: { legal: LegalView; checks: ChecksView | undefined }) {
  const game = useGame();
  const last = legal.last;
  return (
    <>
      <p className="patron-dms">{legal.law === undefined ? 'Erst den Aufenthaltsort wählen.' : legal.available ? `Gesetz ${legal.law}: Ruhe bei ${legal.law}+ auf 2W6` : 'Gesetz 0: keine Polizei-Begegnung.'}</p>
      {legal.note && (
        <p className="encounter-note" role="status">
          {legal.note}
        </p>
      )}
      {last && (
        <p className="patron-last">
          Zuletzt: <strong>{last.passed ? 'Ruhe' : 'Angehalten'}</strong> <span>{checkDetail(last)}</span>
        </p>
      )}
      <TestButton className="encounter-roll" title="Polizei würfeln" check={checks?.legal} disabled={!legal.available} onPress={() => game.rollLegal()} onHold={() => game.rollLegal(true)} />
    </>
  );
}

/**
 * Die Spielzeit: Datum mit Wochentag, Tage vergehen lassen und Woche beenden (bis zum nächsten
 * Sonntag). Fehlen Tests, erinnert der Controller beim Tippen; langes Drücken macht ohne Begegnung weiter.
 */
function TimeBar({ time }: { time: TimeView }) {
  const game = useGame();
  const [days, setDays] = useState(1);
  const [editing, setEditing] = useState(false);
  const [dayOfYear, setDayOfYear] = useState(String(time.dayOfYear));
  const [year, setYear] = useState(String(time.year));
  const disabled = time.blocked !== undefined;
  const weekMissing = time.missingWeek.length > 0;
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
      <div className="time-actions">
        <select aria-label="Wie viele Tage" value={days} disabled={disabled} onChange={(e) => setDays(Number(e.target.value))}>
          {Array.from({ length: time.maxDays }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'Tag' : 'Tage'}
            </option>
          ))}
        </select>
        <button type="button" className="primary" disabled={disabled} onClick={() => game.passDays(days)}>
          vergehen lassen
        </button>
        <HoldButton className={weekMissing ? 'ghost' : 'primary'} disabled={disabled} hint="Lange drücken: die Woche endet ohne die fehlenden Tests" onPress={() => game.endWeek()} onHold={() => game.endWeek(true)}>
          Woche beenden (+{time.toSunday})
        </HoldButton>
      </div>
      {time.blocked && <p className="combat-hint">{time.blocked}</p>}
      {time.note && (
        <p className="encounter-note" role="status">
          {time.note}
        </p>
      )}
    </section>
  );
}
