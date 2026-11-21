import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { shipDesignOf, shipWeaponOf, turretTypeOf } from './reference';
import { worldById } from './sector';
import { activeShip, type Ship, type Turret } from './ship';
import { bookShip, fundsOf } from './shop';
import { starportLetter } from './surface-map';
import { shipDepartureBlocker } from './landing';

// Bewaffnung in der Werft (Domänenmodell 2026-11-21g): Auf jedem Hardpoint des eigenen Schiffs kann ein
// Turret sitzen, bestückt mit so vielen Waffen, wie die Turmart Plätze hat (SE 10, SR 32). Eingebaut und
// ausgebaut wird nur an einem Raumhafen A oder B (SR 29: dort gibt es Werften), mit der Gruppe beim
// Schiff. Jeder Einbau kostet den Preis aus der Kasse; Ausbauen bringt nichts zurück (Owner).

/** Die Häfen mit Werft (SR 29). */
const SHIPYARD_PORTS = ['A', 'B'];

/** Der Hafen, an dem das Schiff steht: der Hafen seiner Stadt; auf einer Welt ohne Globus der Raumhafen des UWP. */
export function shipPortOf(campaign: Campaign, ship: Ship): string | undefined {
  const place = ship.place ?? campaign.location;
  if (place === undefined) return undefined;
  const world = worldById(campaign.hexes, place.world);
  if (world?.map !== undefined) return place.city === undefined ? undefined : world.map.cities?.[place.city]?.port;
  const starport = world?.uwp.starport;
  return starport === undefined ? undefined : starportLetter(starport);
}

/** Warum das eigene Schiff jetzt nicht umgerüstet werden kann; `undefined`, wenn es geht. */
export function armamentBlocker(campaign: Campaign): string | undefined {
  const ship = activeShip(campaign);
  if (campaign.flight !== undefined) return 'Während eines Systemflugs wird nicht umgerüstet.';
  const away = shipDepartureBlocker(campaign);
  if (away) return away;
  const port = shipPortOf(campaign, ship);
  if (port === undefined || !SHIPYARD_PORTS.includes(port)) return `Umrüsten geht nur an einer Werft: ${ship.name} muss in einer Stadt mit Raumhafen A oder B stehen.`;
  return undefined;
}

function withTurrets(campaign: Campaign, ship: Ship, turrets: readonly Turret[]): Campaign {
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, turrets } : s)) };
}

function ready(campaign: Campaign): Ship {
  const blocker = armamentBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  return activeShip(campaign);
}

function pay(campaign: Campaign, ship: Ship, price: number, text: string, clock: Clock): Campaign {
  if (price > fundsOf(campaign)) throw new DomainError(`${text} kostet Cr ${price.toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`);
  return bookShip(campaign, -price, ship.id, 'armament', clock, text);
}

/** Baut auf dem nächsten freien Hardpoint ein Turret der Turmart `type` ein. */
export function installTurret(campaign: Campaign, type: string, clock: Clock): Campaign {
  const ship = ready(campaign);
  const kind = turretTypeOf(type);
  const hardpoints = shipDesignOf(ship.design).hardpoints;
  if (ship.turrets.length >= hardpoints) throw new DomainError(`${ship.name} hat keinen freien Hardpoint (${hardpoints}).`);
  const paid = pay(campaign, ship, kind.price, `${kind.name} auf Hardpoint ${ship.turrets.length + 1}`, clock);
  return withTurrets(paid, ship, [...ship.turrets, { type: kind.id, weapons: [] }]);
}

/** Ersetzt das Turret `index` durch eines der Turmart `type`; seine Waffen ziehen mit um, soweit Plätze da sind. */
export function replaceTurret(campaign: Campaign, index: number, type: string, clock: Clock): Campaign {
  const ship = ready(campaign);
  const turret = turretAt(ship, index);
  const kind = turretTypeOf(type);
  if (kind.id === turret.type) throw new DomainError(`Turret ${index + 1} ist schon ein ${kind.name}.`);
  const paid = pay(campaign, ship, kind.price, `${kind.name} statt ${turretTypeOf(turret.type).name} auf Hardpoint ${index + 1}`, clock);
  return withTurrets(paid, ship, ship.turrets.map((t, i) => (i === index ? { type: kind.id, weapons: t.weapons.slice(0, kind.slots) } : t)));
}

/** Bestückt einen freien Platz des Turrets `index` mit der Schiffswaffe `weapon`. */
export function installWeapon(campaign: Campaign, index: number, weapon: string, clock: Clock): Campaign {
  const ship = ready(campaign);
  const turret = turretAt(ship, index);
  const kind = turretTypeOf(turret.type);
  const arm = shipWeaponOf(weapon);
  if (turret.weapons.length >= kind.slots) throw new DomainError(`Turret ${index + 1} (${kind.name}) hat keinen freien Platz.`);
  const paid = pay(campaign, ship, arm.price, `${arm.name} in Turret ${index + 1}`, clock);
  return withTurrets(paid, ship, ship.turrets.map((t, i) => (i === index ? { ...t, weapons: [...t.weapons, arm.id] } : t)));
}

/** Baut die Waffe an Platz `slot` des Turrets `index` aus; Geld gibt es dafür nicht zurück (Owner). */
export function removeWeapon(campaign: Campaign, index: number, slot: number): Campaign {
  const ship = ready(campaign);
  const turret = turretAt(ship, index);
  if (turret.weapons[slot] === undefined) throw new DomainError('Dort ist keine Waffe.');
  return withTurrets(campaign, ship, ship.turrets.map((t, i) => (i === index ? { ...t, weapons: t.weapons.filter((_, k) => k !== slot) } : t)));
}

/** Baut das Turret `index` samt seinen Waffen aus; die übrigen rücken auf (Owner: ohne Erlös). */
export function removeTurret(campaign: Campaign, index: number): Campaign {
  const ship = ready(campaign);
  turretAt(ship, index);
  return withTurrets(campaign, ship, ship.turrets.filter((_, i) => i !== index));
}

function turretAt(ship: Ship, index: number): Turret {
  const turret = ship.turrets[index];
  if (turret === undefined) throw new DomainError(`Turret ${index + 1} gibt es nicht.`);
  return turret;
}

/** Prüft die Bewaffnung eines geladenen Schiffs: höchstens ein Turret je Hardpoint, Waffen nur auf freien Plätzen. */
export function checkTurrets(ship: Ship): void {
  const hardpoints = shipDesignOf(ship.design).hardpoints;
  if (ship.turrets.length > hardpoints) throw new DomainError(`${ship.name} hat mehr Turrets als Hardpoints.`);
  for (const turret of ship.turrets) {
    const kind = turretTypeOf(turret.type);
    if (turret.weapons.length > kind.slots) throw new DomainError(`${ship.name}: Ein ${kind.name} hat mehr Waffen als Plätze.`);
    for (const w of turret.weapons) shipWeaponOf(w);
  }
}
