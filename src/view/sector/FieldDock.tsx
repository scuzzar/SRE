import type { GlobeView, TripPlanView, TripView } from '../../controller';
import { useGame } from '../game-context';
import { CloseIcon, NpcPinIcon, PinIcon, RouteIcon, ShopIcon } from '../icons';

/**
 * Die Reihe unten beim angetippten Feld des Globus, an der Stelle der Reihe Notiz, Deuten, 2W6,
 * Karte und im selben Stil: Hierhin reisen (die Route zum Feld planen, `planTrip`), Gruppe setzen
 * (ohne Fahrt und ohne Zeit, `moveParty`) und NSC platzieren (öffnet die NSC-Liste zum Auswählen,
 * `startNpcPlacing`; mit „OK“ oder „Abbrechen“ geht es zurück zum Feld) und Einkaufen (öffnet auf der
 * Welt der Gruppe den Shop an der Stelle des Felds, `openShop`; ✕ führt zurück). Was gerade nicht geht, ist ausgegraut und sagt im Titel, warum. Reine
 * Darstellung: Was die Knöpfe bewirken, entscheidet der Controller. Wird eine Route geplant, stehen
 * stattdessen „Abbrechen“ und „Losfahren“ da.
 */
export function FieldDock({ globe, trip, tripPlan, npcTotal }: { globe: GlobeView; trip: TripView | undefined; tripPlan: TripPlanView | undefined; /** Wie viele lebende NSC es gibt, auf allen Welten. */ npcTotal: number }) {
  const game = useGame();
  const picked = globe.picked;
  if (!picked) return null;
  const partyHere = globe.partyHere && globe.partyCell === picked.cell;
  const travelBlocker = !globe.partyHere
    ? 'Die Gruppe ist nicht auf dieser Welt'
    : globe.partyCell === undefined
      ? 'Die Gruppe hat noch kein Feld auf dieser Welt'
      : partyHere
        ? 'Die Gruppe ist schon hier'
        : trip
          ? 'Eine Fahrt läuft schon'
          : undefined;
  const moveBlocker = !globe.partyHere ? 'Die Gruppe ist nicht auf dieser Welt' : partyHere ? 'Die Gruppe ist schon hier' : undefined;
  const moveLabel = picked.city === undefined ? 'Gruppe hierher setzen' : 'Gruppe in diese Stadt setzen';
  // Wer schon auf dem Feld steht, muss nicht hergeholt werden; geholt wird von jeder Welt.
  const npcBlocker = npcTotal === 0 ? 'Noch keine NSC' : npcTotal <= picked.npcs.length ? 'Alle NSC sind schon hier' : undefined;
  // Warum man nicht hinreisen kann, steht auf dem Handy (ohne Titel beim Zeigen) über der Reihe, wenn
  // es nicht schon das Feld selbst zeigt (Gruppe hier, Route oder Fahrt im Blatt).
  const hint = !globe.partyHere
    ? 'Die Gruppe ist nicht auf dieser Welt; hinreisen geht nur auf ihrer Welt.'
    : globe.partyCell === undefined
      ? 'Die Gruppe hat noch kein Feld auf dieser Welt. „Gruppe setzen“ gibt ihr eins, dann geht „Hierhin reisen“.'
      : undefined;
  // Wird eine Route geplant, ersetzen „Losfahren“ und „Abbrechen“ die Knöpfe der Reihe.
  if (tripPlan) {
    const ready = tripPlan.options[tripPlan.chosen] !== undefined;
    return (
      <section className="dock" aria-label="Am Feld">
        <div className="actions oracle-actions field-actions trip-plan-actions">
          <button type="button" className="action note" onClick={() => game.closeTripPlan()}>
            <CloseIcon />
            Abbrechen
          </button>
          <button type="button" className="action draw" title={ready ? 'Mit der gewählten Variante losfahren' : 'Keine Variante, mit der es geht'} disabled={!ready} onClick={() => game.startTrip()}>
            <RouteIcon />
            Losfahren
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="dock" aria-label="Am Feld">
      {hint && <p className="combat-hint">{hint}</p>}
      <div className="actions oracle-actions field-actions">
        <button type="button" className="action draw" aria-label="Hierhin reisen" title={travelBlocker ?? 'Die Route hierher planen'} disabled={travelBlocker !== undefined} onClick={() => game.planTrip()}>
          <RouteIcon />
          Hierhin reisen
        </button>
        <button type="button" className="action note" aria-label={moveLabel} title={moveBlocker ?? `${moveLabel}, ohne Fahrt und ohne Zeit`} disabled={moveBlocker !== undefined} onClick={() => game.moveParty()}>
          <PinIcon />
          Gruppe setzen
        </button>
        <button type="button" className="action note" title={npcBlocker ?? 'Unter Charaktere › NSC auswählen, wer hierher kommt, auch von anderen Welten'} disabled={npcBlocker !== undefined} onClick={() => game.startNpcPlacing()}>
          <NpcPinIcon />
          NSC platzieren
        </button>
        <button type="button" className="action note" title={globe.partyHere ? 'Im Shop der Welt kaufen und verkaufen' : 'Einkaufen geht nur auf der Welt der Gruppe'} disabled={!globe.partyHere} onClick={() => game.openShop()}>
          <ShopIcon />
          Einkaufen
        </button>
      </div>
    </section>
  );
}
