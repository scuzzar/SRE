import type { GlobeView, TripPlanView, TripView } from '../../controller';
import { useGame } from '../game-context';
import { NpcPinIcon, PinIcon, RouteIcon } from '../icons';

/**
 * Die Reihe unten beim angetippten Feld des Globus, an der Stelle der Reihe Notiz, Deuten, 2W6,
 * Karte und im selben Stil: Hierhin reisen (die Route zum Feld planen, `planTrip`), Gruppe setzen
 * (ohne Fahrt und ohne Zeit, `moveParty`) und NSC platzieren (einen NSC dieser Welt auf das Feld
 * holen, `moveNpc`). Was gerade nicht geht, ist ausgegraut und sagt im Titel, warum. Reine
 * Darstellung: Was die Knöpfe bewirken, entscheidet der Controller.
 */
export function FieldDock({ globe, trip, tripPlan }: { globe: GlobeView; trip: TripView | undefined; tripPlan: TripPlanView | undefined }) {
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
          : tripPlan
            ? 'Die Route ist schon geplant'
            : undefined;
  const moveBlocker = !globe.partyHere ? 'Die Gruppe ist nicht auf dieser Welt' : partyHere ? 'Die Gruppe ist schon hier' : undefined;
  const moveLabel = picked.city === undefined ? 'Gruppe hierher setzen' : 'Gruppe in diese Stadt setzen';
  // Wer schon auf dem Feld steht, muss nicht hergeholt werden.
  const npcs = globe.npcs.filter((n) => n.cell !== picked.cell);
  // Warum man nicht hinreisen kann, steht auf dem Handy (ohne Titel beim Zeigen) über der Reihe, wenn
  // es nicht schon das Feld selbst zeigt (Gruppe hier, Route oder Fahrt im Blatt).
  const hint = !globe.partyHere
    ? 'Die Gruppe ist nicht auf dieser Welt; hinreisen geht nur auf ihrer Welt.'
    : globe.partyCell === undefined
      ? 'Die Gruppe hat noch kein Feld auf dieser Welt. „Gruppe setzen“ gibt ihr eins, dann geht „Hierhin reisen“.'
      : undefined;
  const npcBlocker = globe.npcs.length === 0 ? 'Auf dieser Welt lebt kein NSC' : npcs.length === 0 ? 'Alle NSC dieser Welt sind schon hier' : undefined;
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
        {/* Ein unsichtbares Auswahlfeld liegt über dem Knopf: Ein Tippen öffnet die Liste des Geräts. */}
        <label className="action note field-npc" title={npcBlocker ?? 'Einen NSC dieser Welt hierher holen'}>
          <NpcPinIcon />
          NSC platzieren
          <select
            aria-label="NSC hierher holen"
            value=""
            disabled={npcBlocker !== undefined}
            onChange={(e) => {
              if (e.target.value) game.moveNpc(e.target.value);
            }}
          >
            <option value="">NSC hierher holen …</option>
            {npcs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
