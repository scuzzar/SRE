import { createCampaign, type Campaign } from './campaign';
import type { Clock } from './ports';
import { ref } from './reference';
import { hexId, validateHex, type Hex } from './sector';
import { addShip } from './ship';
import { book, setLocation } from './shop';

/**
 * Die Demo-Kampagne: die allererste Kampagne auf einem Gerät, damit man gleich etwas ausprobieren
 * kann. Sie hat die Beispielcharaktere Kira Vant und Jonas Reyl und die feste Startwelt aus den
 * Referenzdaten; die Gruppe steht dort. In der Gruppenkasse liegt ein Startkapital, damit sich im Shop
 * gleich etwas kaufen lässt, und im Hafen ein schuldenfreier Scout „Kestrel“ für den Systemflug. Jede weitere Kampagne beginnt leer (`createCampaign`).
 */
export function createDemoCampaign(clock: Clock, key = 'key-k1'): Campaign {
  const world: Hex = ref.demoWorld;
  validateHex(world);
  const campaign = createCampaign(ref.examples, 'Demo-Kampagne');
  const there = setLocation({ ...campaign, hexes: [world] }, hexId(world.column, world.row));
  const funded = book(there, 'income', DEMO_FUNDS, clock, 'Startkapital');
  // Ein schuldenfreier Scout mit vollem Tank, damit man den Systemflug gleich ausprobieren kann (2026-11-18).
  const { campaign: withShip, ship } = addShip(funded, DEMO_SHIP_DESIGN, undefined);
  const named = { ...withShip, ships: withShip.ships.map((s) => (s.id === ship.id ? { ...s, name: DEMO_SHIP_NAME } : s)) };
  // Die Änderungszeit ist die der Buchung; die Uhr wird dafür nicht noch einmal gefragt.
  return { ...named, key, changedAt: named.bookings.at(-1)?.at ?? named.changedAt };
}

/** Das Startkapital der Demo-Kampagne in der Gruppenkasse. */
export const DEMO_FUNDS = 5000;

/** Der Scout der Demo-Kampagne (2026-11-18). */
export const DEMO_SHIP_DESIGN = 'S';
export const DEMO_SHIP_NAME = 'Kestrel';
