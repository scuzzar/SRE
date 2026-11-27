import { useState } from 'react';
import type { GlobeView, NpcScreenView, TripPlanView, TripView } from '../../controller';
import { NewNpcSheet } from '../characters/NpcScreen';
import { HoldButton } from '../HoldButton';
import { useGame } from '../game-context';
import { BriefcaseIcon, CheckIcon, CloseIcon, FlagIcon, NpcPinIcon, PinIcon, RouteIcon, ShopIcon } from '../icons';

/**
 * Die Aktionsleiste unten beim angetippten Feld des Globus, an der Stelle der Aktionsleiste Notiz, Tag, 2W6,
 * Karte und im selben Stil: Hierhin reisen (die Route zum Feld planen, `planTrip`), Gruppe setzen
 * (ohne Fahrt und ohne Zeit, `moveParty`) und NSC platzieren (öffnet die NSC-Liste zum Auswählen,
 * `startNpcPlacing`; mit „OK“ oder „Abbrechen“ geht es zurück zum Feld; lange gedrückt erzeugt es einen
 * neuen NSC aus einer Laufbahn, der hier lebt) und Einkaufen (nur in einer Stadt auf der Welt der
 * Gruppe: öffnet den Shop an der Stelle des Felds, `openShop`; ✕ führt zurück). Was gerade nicht geht, ist ausgegraut und sagt im Titel, warum. Reine
 * Darstellung: Was die Knöpfe bewirken, entscheidet der Controller. Wird eine Route geplant, stehen
 * stattdessen „Abbrechen“ und „Losfahren“ da; beim Ort wählen einer Mission (`missionPicking`)
 * „Abbrechen“ und „OK“.
 */
export function FieldDock({ globe, trip, tripPlan, npcs, missionPicking, marketBlocker }: { globe: GlobeView; trip: TripView | undefined; tripPlan: TripPlanView | undefined; npcs: NpcScreenView; missionPicking?: { readonly title: string } | undefined; /** Warum hier kein Markt geht (2026-11-27). */ marketBlocker?: string | undefined }) {
  const game = useGame();
  // Ob das Fenster „Neuer NSC“ (langes Drücken auf „NSC platzieren“) offen ist, ist reine Darstellung.
  const [creating, setCreating] = useState(false);
  const npcTotal = npcs.total;
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
  const shopBlocker = !globe.partyHere ? 'Einkaufen geht nur auf der Welt der Gruppe' : picked.city === undefined ? 'Einkaufen geht nur in einer Stadt' : undefined;
  const placeName = picked.cities[0] === undefined ? 'auf diesem Feld' : `in ${picked.cities[0].name}`;
  // Warum man nicht hinreisen kann, steht auf dem Handy (ohne Titel beim Zeigen) über der Aktionsleiste, wenn
  // es nicht schon das Feld selbst zeigt (Gruppe hier, Route oder Fahrt im Blatt).
  const hint = !globe.partyHere
    ? 'Die Gruppe ist nicht auf dieser Welt; hinreisen geht nur auf ihrer Welt.'
    : globe.partyCell === undefined
      ? 'Die Gruppe hat noch kein Feld auf dieser Welt. „Gruppe setzen“ gibt ihr eins, dann geht „Hierhin reisen“.'
      : undefined;
  // Beim Ort wählen einer Mission: „OK“ nimmt dieses Feld (bzw. die Stadt darauf) als Ort.
  if (missionPicking) {
    return (
      <section className="dock" aria-label="Am Feld">
        <p className="npc-placing">
          <FlagIcon /> Missionsort für „{missionPicking.title}“: {placeName}?
        </p>
        <div className="actions oracle-actions field-actions trip-plan-actions">
          <button type="button" className="action note" onClick={() => game.cancelMissionPicking()}>
            <CloseIcon />
            Abbrechen
          </button>
          <button type="button" className="action draw" aria-label={`OK, ${placeName} als Missionsort`} onClick={() => game.confirmMissionPlace()}>
            <CheckIcon />
            OK
          </button>
        </div>
      </section>
    );
  }
  // Wird eine Route geplant, ersetzen „Losfahren“ und „Abbrechen“ die Knöpfe der Aktionsleiste.
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
        <HoldButton
          className="action note"
          label="NSC platzieren"
          hint={`Lange drücken: einen neuen NSC aus einer Laufbahn erzeugen, der ${placeName} lebt`}
          title={`${npcBlocker ?? 'Unter Charaktere › NSC auswählen, wer hierher kommt, auch von anderen Welten'}; lange drücken erzeugt einen neuen NSC hier`}
          onPress={() => npcBlocker === undefined && game.startNpcPlacing()}
          onHold={() => setCreating(true)}
        >
          <NpcPinIcon />
          NSC platzieren
        </HoldButton>
        <button type="button" className="action note" title={shopBlocker ?? 'Im Shop der Stadt kaufen und verkaufen'} disabled={shopBlocker !== undefined} onClick={() => game.openShop()}>
          <ShopIcon />
          Einkaufen
        </button>
        <button type="button" className="action note" title={shopBlocker ?? marketBlocker ?? 'Spekulativer Handel: Ware kaufen und verkaufen'} disabled={(shopBlocker ?? marketBlocker) !== undefined} onClick={() => game.openMarket()}>
          <BriefcaseIcon />
          Markt
        </button>
      </div>
      {creating && <NewNpcSheet npcs={npcs} here={placeName} onClose={() => setCreating(false)} />}
    </section>
  );
}
