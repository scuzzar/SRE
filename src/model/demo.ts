import { createCampaign, type Campaign } from './campaign';
import type { Clock } from './ports';
import { ref } from './reference';
import { hexId, validateHex, type Hex } from './sector';
import { book, setLocation } from './shop';

/**
 * Die Demo-Kampagne: die allererste Kampagne auf einem Gerät, damit man gleich etwas ausprobieren
 * kann. Sie hat die Beispielcharaktere Kira Vant und Jonas Reyl und die feste Startwelt aus den
 * Referenzdaten; die Gruppe steht dort. In der Gruppenkasse liegt ein Startkapital, damit sich im Shop
 * gleich etwas kaufen lässt. Jede weitere Kampagne beginnt leer (`createCampaign`).
 */
export function createDemoCampaign(clock: Clock, key = 'key-k1'): Campaign {
  const world: Hex = ref.demoWorld;
  validateHex(world);
  const campaign = createCampaign(ref.examples, 'Demo-Kampagne');
  const there = setLocation({ ...campaign, hexes: [world] }, hexId(world.column, world.row));
  const funded = book(there, 'income', DEMO_FUNDS, clock, 'Startkapital');
  // Die Änderungszeit ist die der Buchung; die Uhr wird dafür nicht noch einmal gefragt.
  return { ...funded, key, changedAt: funded.bookings.at(-1)?.at ?? funded.changedAt };
}

/** Das Startkapital der Demo-Kampagne in der Gruppenkasse. */
export const DEMO_FUNDS = 5000;
