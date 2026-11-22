import type { ReactNode } from 'react';
import type { ChecksView, Snapshot } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { HoldButton } from '../HoldButton';
import type { EncounterOptions } from './EncounterScreen';
import { BadgeIcon, BriefcaseIcon, CalendarIcon, ClockIcon, EncounterIcon, PawIcon, RouteIcon, RumorIcon, ShipIcon } from '../icons';

type Check = ChecksView[keyof ChecksView] | undefined;

/**
 * Die Reihe unten im Reiter Begegnung, im Stil der Orakel-Reihe: oben die Würfe der Begegnungen
 * (Zufall, Tiere, Patron, Gerücht, Polizei), darunter die Zeit (Tage vergehen, Woche beenden) bzw.
 * bei laufender Fahrt „Weiterfahren“. Das ist die einzige Stelle, an der man weiterfährt oder Zeit
 * vergehen lässt. Ein Wurf zeigt sein Ergebnis im Würfelfenster; mit den Haken auf dem Blatt öffnet
 * Zufall erst die NSC-Liste zum Dazunehmen bzw. Zufall und Tiere die Auswahl der Art. Jeder
 * Begegnungsknopf zeigt, wie oft im Zeitraum schon getestet wurde; ist die Regel erfüllt, würfelt nur
 * der lange Druck noch einmal. Reine Darstellung: Was die Knöpfe bewirken, entscheidet der Controller.
 */
export function EncounterDock({ view, options }: { view: Snapshot; /** Auf dem Blatt eingestellt: wie viele Tage, Manuell wählen, NSC dazunehmen. */ options: EncounterOptions }) {
  const game = useGame();
  const combat = view.combat;
  const checks = view.checks;
  const time = view.time;
  const trip = view.trip;
  const blocked = time?.blocked;
  const randomOff = !combat || !combat.canEncounter || combat.sim !== undefined;
  const animalsOff = !combat || combat.animals.blocked !== undefined;
  const legalOff = !combat || !view.legal?.available;
  const passing = Math.min(options.days, time?.maxDays ?? options.days);
  // Zufall: mit „NSC dazunehmen“ erst die Auswahl in der NSC-Liste, mit „Manuell wählen“ die Auswahl der Art.
  const random = () => {
    if (options.withNpcs && combat && combat.joinable.length > 0) game.startNpcJoining(options.manual);
    else if (options.manual) game.chooseEncounter('random');
    else game.rollEncounter();
  };
  const animals = () => (options.manual ? game.chooseEncounter('animal') : game.rollAnimals());
  return (
    <section className="dock encounter-dock" aria-label="Begegnung und Zeit">
      <div className={`actions oracle-actions encounter-tests${view.shipEncounter ? ' with-ship' : ''}`}>
        <Test icon={<EncounterIcon />} title="Zufall" label="Zufallsbegegnung würfeln" check={checks?.random} disabled={randomOff} onPress={random} onHold={() => game.rollEncounter(undefined, undefined, true)} />
        <Test icon={<PawIcon />} title="Tiere" label="Tiere würfeln" check={checks?.animal} disabled={animalsOff} onPress={animals} onHold={() => game.rollAnimals(undefined, true)} />
        <Test icon={<BriefcaseIcon />} title="Patron" label="Patron würfeln" check={checks?.patron} disabled={!view.patron} onPress={() => game.rollPatron()} onHold={() => game.rollPatron(true)} />
        <Test icon={<RumorIcon />} title="Gerücht" label="Gerücht würfeln" check={checks?.rumor} disabled={!view.rumor} onPress={() => game.rollRumor()} onHold={() => game.rollRumor(true)} />
        <Test icon={<BadgeIcon />} title="Polizei" label="Polizei würfeln" check={checks?.legal} disabled={legalOff} onPress={() => game.rollLegal()} onHold={() => game.rollLegal(true)} />
        {view.shipEncounter && (
          // Schiffsbegegnung von Hand (2026-11-22b): öffnet den Dialog mit Zielwert, Würfeln und Abbrechen.
          // Gesperrt bleibt er antippbar: Der Hinweis sagt dann, warum nicht.
          <button type="button" className={`action ${view.shipEncounter.blocker ? 'note met' : 'dice'} encounter-test`} title={view.shipEncounter.blocker ?? 'Schiffsbegegnung würfeln (SE 13)'} aria-label="Schiffsbegegnung würfeln" onClick={() => game.openShipEncounter()}>
            <ShipIcon />
            <span className="test-title">Schiff</span>
          </button>
        )}
      </div>
      {time && (
        <div className="actions oracle-actions encounter-time">
          {trip ? (
            <button type="button" className="action draw" title={blocked ?? `Unterwegs nach ${trip.to}`} disabled={blocked !== undefined} onClick={() => game.driveDay()}>
              <RouteIcon />
              Weiterfahren
            </button>
          ) : (
            <button type="button" className="action draw" title={blocked} disabled={blocked !== undefined} onClick={() => game.passDays(passing)}>
              <ClockIcon />
              {passing === 1 ? '1 Tag vergehen' : `${passing} Tage vergehen`}
            </button>
          )}
          <HoldButton className={time.missingWeek.length > 0 ? 'action note' : 'action dice'} disabled={blocked !== undefined} hint="Lange drücken: die Woche endet ohne die fehlenden Tests" onPress={() => game.endWeek()} onHold={() => game.endWeek(true)}>
            <CalendarIcon />
            <span>Woche beenden (+{time.toSunday})</span>
          </HoldButton>
        </div>
      )}
    </section>
  );
}

/**
 * Ein Test als Knopf der Reihe: Symbol, ein Wort, darunter wie oft schon („heute 1×“). Noch nicht
 * erfüllt ist er hervorgehoben, erfüllt gedämpft; dann würfelt nur der lange Druck.
 */
function Test({ icon, title, label, check, disabled, onPress, onHold }: { icon: ReactNode; title: string; label: string; check: Check; disabled: boolean; onPress: () => void; onHold: () => void }) {
  const met = check?.met ?? false;
  return (
    <HoldButton
      className={`action ${met ? 'note met' : 'dice'} encounter-test`}
      disabled={disabled}
      label={`${label}${check ? `, ${check.label}` : ''}`}
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
      {icon}
      <span className="test-title">{title}</span>
      {/* Knapp, damit es unter das Wort passt: „Woche 1×“ statt „diese Woche 1×“. */}
      {check && <span className="test-count">{check.label.replace(/^diese /, '')}</span>}
    </HoldButton>
  );
}
