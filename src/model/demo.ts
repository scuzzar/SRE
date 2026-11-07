import { createCampaign, type Campaign } from './campaign';
import { ref } from './reference';
import { hexId, validateHex, type Hex } from './sector';
import { setLocation } from './shop';

/**
 * Die Demo-Kampagne: die allererste Kampagne auf einem Gerät, damit man gleich etwas ausprobieren
 * kann. Sie hat die Beispielcharaktere Kira Vant und Jonas Reyl und die feste Startwelt aus den
 * Referenzdaten; die Gruppe steht dort. Jede weitere Kampagne beginnt leer (`createCampaign`).
 */
export function createDemoCampaign(): Campaign {
  const world: Hex = ref.demoWorld;
  validateHex(world);
  const campaign = createCampaign(ref.examples, 'Demo-Kampagne');
  return setLocation({ ...campaign, hexes: [world] }, hexId(world.column, world.row));
}
