import { createCampaign, type Campaign } from './campaign';
import type { Clock } from './ports';
import { ref } from './reference';
import { hexFromFlat, hexId, validateHex, type FlatHex, type Hex } from './sector';
import { addShip, shipById } from './ship';
import { crewOf, seat, type CrewRole } from './crew';
import { book, setLocation } from './shop';
import { withStarSystems } from './star-system';

/**
 * Die Demo-Kampagne: die allererste Kampagne auf einem Gerät, damit man gleich etwas ausprobieren
 * kann. Sie hat die Beispielcharaktere Kira Vant und Jonas Reyl und die feste Startwelt aus den
 * Referenzdaten; die Gruppe steht dort. In der Gruppenkasse liegt ein Startkapital, damit sich im Shop
 * gleich etwas kaufen lässt, und im Hafen eine schuldenfreie Yacht „Kestrel“ mit ihrem Ship's Boat für Systemflug und Small Craft (2026-11-21b). Jede weitere Kampagne beginnt leer (`createCampaign`).
 */
export function createDemoCampaign(clock: Clock, key = 'key-k1'): Campaign {
  // Die Startwelt steht in den Referenzdaten noch flach (Werte am Feld); sie wird die Hauptwelt.
  const world: Hex = hexFromFlat(ref.demoWorld as FlatHex);
  validateHex(world);
  const campaign = createCampaign(ref.examples, 'Demo-Kampagne');
  const there = setLocation({ ...campaign, hexes: [world] }, hexId(world.column, world.row));
  const funded = book(there, 'income', DEMO_FUNDS, clock, 'Startkapital');
  // Eine schuldenfreie Yacht mit vollem Tank und ihrem Beiboot, damit man Systemflug und Small Craft gleich ausprobieren kann (2026-11-18c, 2026-11-21b).
  const { campaign: withShip, ship } = addShip(funded, DEMO_SHIP_DESIGN, undefined);
  // Mit einem Beam Laser im Doppelturm, damit man auch den Raumkampf gleich ausprobieren kann (2026-11-21h).
  const named = { ...withShip, ships: withShip.ships.map((s) => (s.id === ship.id ? { ...s, name: DEMO_SHIP_NAME, turrets: [{ type: 'double', weapons: ['beam-laser'] }] } : s)) };
  // Die Demo besetzt gleich zwei Posten: Kira Vant als Pilot, Jonas Reyl als Gunner des Turrets (2026-11-22d).
  const besetzt = (campaign: Campaign, post: CrewRole, name: string): Campaign => {
    const at = crewOf(shipById(campaign, ship.id)).findIndex((p) => p.post === post);
    const who = campaign.characters.find((person) => person.name === name)?.id;
    return who === undefined || at < 0 ? campaign : seat(campaign, ship.id, at, who);
  };
  const crewed = besetzt(besetzt(named, 'pilot', 'Kira Vant'), 'gunner', 'Jonas Reyl');
  // Die Änderungszeit ist die der Buchung; die Uhr wird dafür nicht noch einmal gefragt.
  // Kessra hat immer dasselbe Sternsystem, gleich mit welchem Schlüssel (2026-11-20).
  const withSystem = withStarSystems({ ...crewed, key }, 'Demo-Kampagne');
  return { ...withSystem, changedAt: named.bookings.at(-1)?.at ?? named.changedAt };
}

/** Das Startkapital der Demo-Kampagne in der Gruppenkasse. */
export const DEMO_FUNDS = 5000;

/** Das Schiff der Demo-Kampagne: eine Yacht mit Ship's Boat (Owner, 21. November 2026; vorher ein Scout, 2026-11-18c). */
export const DEMO_SHIP_DESIGN = 'Y';
export const DEMO_SHIP_NAME = 'Kestrel';
