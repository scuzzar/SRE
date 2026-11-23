import {
  candidatesFor,
  computerModelOf,
  computerOf,
  crewOf,
  crewRoleNames,
  crewRoles,
  fitsIn,
  plugBlocker,
  hasProgram,
  holderOf,
  minimumSkill,
  missingPrograms,
  onboard,
  postsHeldBy,
  softwareSlots,
  slotUsed,
  postSkill,
  roleSkill,
  softwareBlocker,
  THRUST_PROGRAM,
  TARGET_PROGRAM,
  worksIn2b,
  type CrewRole,
  type SoftwareSlot,
  dateLabel,
  deckSlotNames,
  FUEL_PRICE,
  fundsOf,
  isPc,
  livingCharacters,
  monthlyPaymentOf,
  ref,
  shipDesignOf,
  shipOf,
  vesselsOf,
  softwareOf,
  type Campaign,
  type DeckPlan,
  type SoftwareKind,
  flightStartBlocker,
  launchWorld,
  armamentBlocker,
  shipyardBlocker,
  retireShipBlocker,
  damagedAtYard,
  turretTypeOf,
  shipWeaponOf,
  turretTypes,
  shipWeapons,
  repairCostOf,
  maneuverAfter,
  jumpAfter,
  craftOf,
  craftPurchaseBlocker,
  holdTonsOf,
  isSmallCraft,
  type Ship,
} from '../model';
import { hitZoneNames } from './time-view';

/** Ein Turret auf einem Hardpoint des eigenen Schiffs (2026-11-21g). */
export interface TurretRow {
  readonly typeId: string;
  readonly typeName: string;
  readonly slots: number;
  readonly weapons: readonly { readonly id: string; readonly name: string }[];
}

/** Eine Turmart oder Schiffswaffe der Werft mit Preis (SE 10). */
export interface ArmamentOffer {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  /** Nur Turmarten: Plätze für Waffen. */
  readonly slots?: number;
  readonly affordable: boolean;
}

/** Die Ablagen des Rechners in der Reihenfolge der Oberfläche, mit ihrem Namen (SR 38). */
export const softwareSlotRows: readonly { readonly slot: SoftwareSlot; readonly label: string }[] = [
  { slot: 'cpu', label: 'CPU · läuft' },
  { slot: 'storage', label: 'Speicher · bereit' },
  { slot: 'archive', label: 'Archiv' },
];
export type { SoftwareSlot };

/** Die Softwarearten, wie der Reiter Schiff sie schreibt (SR 38). */
const softwareKinds: Record<SoftwareKind, string> = { offensive: 'Offensiv', defensive: 'Defensiv', routine: 'Routine' };

/** Ein Posten im Reiter Crew (2026-11-22d): Stelle, Name, Besetzung und was die Fertigkeit wert ist. */
export interface CrewPostRow {
  /** Die Stelle in `Ship.crew`; das Blatt am Posten arbeitet mit ihr. */
  readonly at: number;
  readonly role: CrewRole;
  /** Der Name des Posten, beim Gunner mit Nummer: „Gunner 2“. */
  readonly label: string;
  readonly who: string | undefined;
  readonly whoId: string | undefined;
  /** `/skill`: was die Fertigkeit des Besetzten auf diesem Posten wert ist. */
  readonly skill: number;
  /** Die Mindeststufe aus SR 33 als Hinweis; fehlt, wenn es keine gibt. */
  readonly minimum: number | undefined;
  /** Wie viele Posten der Besetzte hat; ab zwei zählt seine Fertigkeit überall um 1 weniger. */
  readonly posts: number;
}

/** Ein Charakter, der einen Posten bekommen kann, mit seiner Fertigkeit je Postenart. */
export interface CrewPersonRow {
  readonly id: string;
  readonly name: string;
  /** Die Posten, die er schon hat – zwei sind das Maximum. */
  readonly posts: number;
  /** Die Fertigkeit je Postenart, schon mit dem Abschlag für zwei Posten und der Small-Craft-Regel. */
  readonly skill: Record<CrewRole, number>;
}

/** Die Crew eines Schiffs oder Beiboots: seine Posten und alle, die in Frage kommen. */
export interface VesselCrewRow {
  readonly shipId: string;
  readonly name: string;
  readonly smallCraft: boolean;
  readonly posts: readonly CrewPostRow[];
  readonly people: readonly CrewPersonRow[];
}

/** Ein Programm an Bord im Reiter Computer (2026-11-22d). */
export interface ProgramRow {
  readonly id: string;
  readonly name: string;
  readonly slot: SoftwareSlot;
  readonly space: number;
  readonly kind: string;
  readonly effect: string;
  readonly price: number;
  /** Wirkt es in Stufe 2b? Was es nicht tut, steht ausgegraut da; in der CPU läuft nur, was dort liegt. */
  readonly works: boolean;
  /** Pflichtprogramm: ohne es kein Schub bzw. kein Turretfeuer. */
  readonly mandatory: boolean;
  /** Warum es gerade nicht in die Ablage kann; `undefined`: es passt und die Zeit ist frei. */
  readonly blocked: Readonly<Record<SoftwareSlot, string | undefined>>;
}

/** Der Rechner eines Schiffs mit seinen Ablagen; ein Small Craft hat keinen. */
export interface VesselSoftwareRow {
  readonly shipId: string;
  readonly name: string;
  readonly computer: string;
  readonly cpu: number;
  readonly cpuMax: number;
  readonly storage: number;
  readonly storageMax: number;
  readonly programs: readonly ProgramRow[];
  /** Was von den Pflichtprogrammen in der CPU fehlt. */
  readonly missing: readonly string[];
}

/** Ein Programm, das die Werft verkauft (SE 13). */
export interface SoftwareOfferRow {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly space: number;
  readonly price: number;
  readonly effect: string;
  /** Warum es gerade nicht zu kaufen ist: „an Bord“, „Kasse zu klein“, der Grund der Werft; `undefined`: es geht. */
  readonly blocker: string | undefined;
}
/** Anzahlung bei Bankfinanzierung, als Anteil des Preises (SR 29). */
const DOWN_PAYMENT = 0.2;

/** Ein Standardentwurf in der Werft, mit dem, was er die Kasse kostet. */
export interface ShipYardRow {
  readonly designId: string;
  /** Ein Small Craft (2026-11-21c): steht in der Werft in eigener Liste. */
  readonly smallCraft: boolean;
  /** Was aus einem gekauften Small Craft wird: „Beiboot von Kestrel, im Laderaum“ oder „eigenständig“; bei Schiffen leer. */
  readonly becomes: string;
  /** Warum der Kauf nicht geht, obwohl die Kasse reicht (zu groß für den Laderaum). */
  readonly blocker: string | undefined;
  readonly code: string;
  readonly name: string;
  readonly hull: number;
  readonly jump: number;
  readonly maneuver: number;
  readonly crew: string;
  readonly months: number;
  /** Die Beiboote des Entwurfs, knapp: „Ship's Boat“, „2 × Modular Cutter“; leer ohne. */
  readonly craft: string;
  readonly price: number;
  /** Anzahlung bei Bankfinanzierung: 20 % des Preises (SR 29). */
  readonly down: number;
  /** Was die Kasse wenigstens bar oder als Anzahlung hergibt; sonst ist die Zeile grau. */
  readonly affordable: boolean;
  /** Den Entwurf fährt die Gruppe gerade. */
  readonly owned: boolean;
}

/** Ein Beiboot im Reiter Schiff. */
export interface CraftRow {
  readonly name: string;
  /** Entwurf und Beschleunigung, knapp: „Ship's Boat · 6G“. */
  readonly design: string;
  /** Wo es ist: „an Bord“, „in der Umlaufbahn von …“, „auf …“. */
  readonly where: string;
}

/** Was der Reiter Schiff zeigt: Stände des aktiven Schiffs, Deckpläne und die Werft. */
export interface ShipView {
  readonly funds: number;
  /** Cr je Tonne raffinierten Treibstoff (SR 30). */
  readonly fuelPrice: number;
  /** Das aktive Schiff; fehlt, wenn die Gruppe keins hat. */
  readonly ship:
    | {
        readonly name: string;
        readonly designId: string;
        readonly designCode: string;
        readonly designName: string;
        /** Treibstoff im Tank und Tankgröße, in Tonnen. */
        readonly fuel: number;
        readonly fuelMax: number;
        /** Davon unraffiniert, aus einem Gasriesen geschöpft (2026-11-21f). */
        readonly unrefined: number;
        /** Fracht im Laderaum und Laderaumgröße ohne die Beiboote im Laderaum, in Tonnen (2026-11-21c). */
        readonly cargo: number;
        readonly cargoMax: number;
        /** Belegte Kabinen: immer die Gruppe zuerst; Passagiere kommen mit dem Handel. */
        readonly cabins: number;
        readonly cabinsMax: number;
        readonly lowBerthsUsed: number;
        readonly lowBerthsMax: number;
        /** Sprungzahl und Beschleunigung, knapp: „Jump-1 · 1G“. */
        readonly thruster: string;
        readonly jump: number;
        readonly hardpoints: number;
        readonly computerName: string;
        readonly crew: string;
        readonly basePrice: number;
        /** Die Beiboote (2026-11-21b): Name, Entwurf mit G und wo es ist. */
        readonly craft: readonly CraftRow[];
        /** Der tatsächlich gezahlte Preis. */
        readonly price: number;
        /** Kreditsumme beim Abschluss; fehlt bei einem schuldenfreien Schiff. */
        readonly initialLoan: number | undefined;
        /** Restschuld; fehlt, wenn bezahlt – die Kreditsumme bleibt als Erinnerung stehen. */
        readonly loanBalance: number | undefined;
        readonly monthlyPayment: number | undefined;
        /** Der Tag, an dem die nächste Rate fällig ist, als kalendarisches Datum; fehlt ohne Kredit. */
        readonly nextPayment: string | undefined;
        /** Die Posten der Crew und wer sie besetzen kann, je eigenes Schiff und Beiboot (2026-11-22d). */
        readonly crews: readonly VesselCrewRow[];
        /** Die Rechner mit CPU, Speicher und Archiv, je eigenes Schiff und Beiboot (2026-11-22d). */
        readonly computers: readonly VesselSoftwareRow[];
        /** Die Turrets in der Reihenfolge der Hardpoints; warum gerade nicht umgerüstet werden kann (`undefined`: es geht). */
        readonly turrets: readonly TurretRow[];
        readonly armamentBlocker: string | undefined;
        /** Warum das Schiff gerade nicht ausgeblendet werden kann (`undefined`: es geht). */
        readonly retireBlocker: string | undefined;
        /** Warum die Werft gerade nicht reparieren kann (`undefined`: es geht). */
        readonly repairBlocker: string | undefined;
        /** Die Bewaffnung eines Small Craft in einer Zeile, z. B. „2 × Beam Laser“; fehlt bei Schiffen (2026-11-22). */
        readonly craftWeapons: string | undefined;
        /** Schaden aus dem Raumkampf als Trefferzonen, ausgefallene Turrets (Hardpoint ab 1), Kosten der Reparatur (2026-11-21h); Beiboote an Bord mit ihrem Namen davor (2026-11-22). */
        readonly damage: readonly string[];
        readonly turretsOut: readonly number[];
        readonly repairCost: number;
        /** Höchstschub und Sprung nach dem Schaden. */
        readonly maneuverNow: number;
        readonly maneuver: number;
        readonly jumpNow: number;
      }
    | undefined;
  /** Was die Werft an Turmarten und Schiffswaffen anbietet (2026-11-21g). */
  readonly turretTypes: readonly ArmamentOffer[];
  readonly shipWeapons: readonly ArmamentOffer[];
  /** Was die Werft an Software verkauft (SE 13), in der Reihenfolge der Liste (2026-11-22d). */
  readonly softwareOffer: readonly SoftwareOfferRow[];
  /** Warum sich gerade keine Software kaufen lässt (`undefined`: es geht). */
  readonly softwareBlocker: string | undefined;
  /** Die Deckpläne des aktiven Entwurfs, in der Reihenfolge Deck A, B, C. */
  readonly deckPlans: readonly { readonly name: string; readonly image: string }[];
  /** Wie viele der drei Deckplan-Plätze des aktiven Entwurfs noch frei sind. */
  readonly freeDeckSlots: number;
  readonly yard: readonly ShipYardRow[];
  readonly error: string | undefined;
  /** Der Systemflug aus dem Reiter Schiff: warum „Starten“ nicht geht (`undefined`: es geht) und ob gerade einer läuft. */
  readonly launchBlocker: string | undefined;
  readonly flying: boolean;
}

/** Der Postenname, beim Gunner mit der Stelle des Turrets (SR 33). */
function postLabel(ship: Ship, at: number): string {
  const post = crewOf(ship)[at]!;
  return post.post === 'gunner' ? `${crewRoleNames.gunner} ${(post.turret ?? 0) + 1}` : crewRoleNames[post.post];
}

/** Die Crew eines Schiffs: jeder Posten mit Besetzung und Fertigkeit, dazu jeder Charakter, der in Frage kommt. */
function crewRow(campaign: Campaign, ship: Ship): VesselCrewRow {
  const posts = crewOf(ship).map((p, at): CrewPostRow => {
    const person = holderOf(campaign, ship, at);
    return {
      at,
      role: p.post,
      label: postLabel(ship, at),
      who: person?.name,
      whoId: person?.id,
      skill: postSkill(campaign, ship, at),
      minimum: minimumSkill[p.post],
      posts: person === undefined ? 0 : postsHeldBy(campaign, person.id).length,
    };
  });
  const people = candidatesFor(campaign).map((person): CrewPersonRow => {
    const held = postsHeldBy(campaign, person.id).length;
    const penalty = held >= 2 ? 1 : 0;
    const skill = Object.fromEntries(crewRoles.map((role) => [role, Math.max(0, roleSkill(person, role, ship) - penalty)])) as Record<CrewRole, number>;
    return { id: person.id, name: person.name, posts: held, skill };
  });
  return { shipId: ship.id, name: ship.name, smallCraft: isSmallCraft(ship), posts, people };
}

/** Der Rechner eines Schiffs mit CPU, Speicher und Archiv (SE 10, SE 13). */
function computerRow(campaign: Campaign, ship: Ship): VesselSoftwareRow {
  const computer = computerOf(ship);
  return {
    shipId: ship.id,
    name: ship.name,
    computer: computer === undefined ? 'kein Rechner' : computer.name,
    cpu: slotUsed(ship, 'cpu'),
    cpuMax: computer?.cpu ?? 0,
    storage: slotUsed(ship, 'storage'),
    storageMax: computer?.storage ?? 0,
    programs: onboard(ship).map((s): ProgramRow => {
      const program = softwareOf(s.program);
      const blocked = Object.fromEntries(
        softwareSlots.map((slot) => [
          slot,
          slot === s.slot ? undefined : plugBlocker(campaign, ship.id, program.id, slot) ?? (fitsIn(ship, program.id, slot) ? undefined : 'zu wenig Platz'),
        ]),
      ) as Record<SoftwareSlot, string | undefined>;
      return { id: program.id, name: program.name, slot: s.slot, space: program.space, kind: softwareKinds[program.kind], effect: program.effect, price: program.price, works: worksIn2b(program.id), mandatory: s.program === THRUST_PROGRAM || s.program === TARGET_PROGRAM, blocked };
    }),
    missing: missingPrograms(ship),
  };
}

/** Der Reiter Schiff, aus dem Spielstand und den Geräte-Deckplänen des aktiven Entwurfs. */
export function buildShipView(campaign: Campaign, deckPlans: readonly DeckPlan[], error: string | undefined): ShipView {
  const funds = fundsOf(campaign);
  const ship = shipOf(campaign);
  const plan = ship === undefined ? undefined : shipDesignOf(ship.design);
  return {
    funds,
    fuelPrice: FUEL_PRICE,
    ship:
      ship === undefined || plan === undefined
        ? undefined
        : {
            name: ship.name,
            designId: plan.id,
            designCode: plan.code,
            designName: plan.name,
            fuel: ship.fuel,
            fuelMax: plan.fuel,
            unrefined: ship.unrefined,
            cargo: ship.cargo,
            cargoMax: plan.cargo - holdTonsOf(campaign, ship),
            cabins: livingCharacters(campaign).filter(isPc).length,
            cabinsMax: plan.staterooms,
            lowBerthsUsed: 0,
            lowBerthsMax: plan.lowBerths,
            thruster: plan.jump === 0 ? `Small Craft · ${plan.maneuver}G` : `Jump-${plan.jump} · ${plan.maneuver}G`,
            jump: plan.jump,
            hardpoints: plan.hardpoints,
            computerName: plan.computer === undefined ? 'keiner' : computerModelOf(plan.computer).name,
            crew: plan.crew,
            basePrice: plan.basePrice,
            craft: craftOf(campaign, ship.id).map((c) => craftRow(campaign, c)),
            price: ship.price,
            initialLoan: ship.initialLoan,
            loanBalance: ship.loanBalance,
            monthlyPayment: monthlyPaymentOf(ship),
            nextPayment: ship.nextPaymentDay === undefined ? undefined : dateLabel(ship.nextPaymentDay),
            crews: vesselsOf(campaign).map((v) => crewRow(campaign, v)),
            computers: vesselsOf(campaign).map((v) => computerRow(campaign, v)),
            turrets: ship.turrets.map((t) => {
              const kind = turretTypeOf(t.type);
              return { typeId: kind.id, typeName: kind.name, slots: kind.slots, weapons: t.weapons.map((w) => ({ id: w, name: shipWeaponOf(w).name })) };
            }),
            armamentBlocker: armamentBlocker(campaign),
            retireBlocker: retireShipBlocker(campaign),
            repairBlocker: shipyardBlocker(campaign)?.replace('umgerüstet', 'repariert').replace('Umrüsten', 'Reparieren'),
            craftWeapons: isSmallCraft(ship) ? weaponsLine(ship) : undefined,
            damage: damagedAtYard(campaign, ship).flatMap((s) => (s.damage?.hits ?? []).map((h) => (s.id === ship.id ? hitZoneNames[h] : `${s.name}: ${hitZoneNames[h]}`))),
            turretsOut: (ship.damage?.turretsOut ?? []).map((i) => i + 1),
            repairCost: repairCostOf(campaign, ship),
            maneuverNow: maneuverAfter(ship.design, ship.damage),
            maneuver: plan.maneuver,
            jumpNow: jumpAfter(ship.design, ship.damage),
          },
    softwareOffer: ref.software.map((p) => {
      const aboard = ship === undefined ? false : hasProgram(ship, p.id);
      return { id: p.id, name: p.name, kind: softwareKinds[p.kind], space: p.space, price: p.price, effect: p.effect, blocker: ship === undefined ? 'kein Schiff' : aboard ? 'an Bord' : softwareBlocker(campaign) ?? (p.price > funds ? 'Kasse zu klein' : undefined) };
    }),
    softwareBlocker: ship === undefined ? 'kein Schiff' : softwareBlocker(campaign),
    turretTypes: turretTypes().filter((t) => !t.smallCraft).map((t) => ({ id: t.id, name: t.name, price: t.price, slots: t.slots, affordable: funds >= t.price })),
    shipWeapons: shipWeapons().map((w) => ({ id: w.id, name: w.name, price: w.price, affordable: funds >= w.price })),
    deckPlans: [...deckPlans].sort((a, b) => a.name.localeCompare(b.name)),
    freeDeckSlots: Math.max(0, deckSlotNames.length - deckPlans.length),
    // Die Standardentwürfe in der Reihenfolge der SR-Tabelle; bezahlbar heißt: bar oder als Anzahlung.
    // Dazu die Small Craft, einzeln zu kaufen (2026-11-21c): mit Schiff als Beiboot im Laderaum, ohne eigenständig.
    yard: ref.ships.map((plan) => {
      const down = Math.round(plan.basePrice * DOWN_PAYMENT);
      const small = plan.kind === 'smallCraft';
      const mother = ship !== undefined && !isSmallCraft(ship) ? ship : undefined;
      const blocker = craftPurchaseBlocker(campaign, plan.id);
      return {
        designId: plan.id,
        smallCraft: small,
        becomes: !small ? '' : mother ? `Beiboot von ${mother.name}, im Laderaum (${plan.hull} t)` : ship ? `ersetzt ${ship.name}` : 'eigenständig, ohne Mutterschiff',
        blocker,
        code: plan.code,
        name: plan.name,
        hull: plan.hull,
        jump: plan.jump,
        maneuver: plan.maneuver,
        crew: plan.crew,
        months: plan.months ?? 0,
        craft: craftLabel(plan.craft),
        price: plan.basePrice,
        down,
        affordable: funds >= down && blocker === undefined,
        owned: ship !== undefined && ship.design === plan.id,
      };
    }),
    error,
    launchBlocker: (() => {
      const world = launchWorld(campaign);
      if (world === undefined) return ship === undefined ? 'Die Gruppe hat kein Schiff.' : 'Die Gruppe ist auf keiner Welt.';
      return flightStartBlocker(campaign, world);
    })(),
    flying: campaign.flight !== undefined,
  };
}

/** Die Beiboote eines Entwurfs, knapp: gleiche zusammengefasst („2 × Modular Cutter“). */
function craftLabel(craft: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const c of craft) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].map(([id, n]) => `${n > 1 ? `${n} × ` : ''}${shipDesignOf(id).name}`).join(', ');
}

/** Ein Beiboot mit Entwurf und Ort. */
function craftRow(campaign: Campaign, craft: Ship): CraftRow {
  const plan = shipDesignOf(craft.design);
  const worldName = (id: string) => campaign.hexes.flatMap((h) => h.worlds).find((w) => w.id === id)?.name ?? id;
  const where = craft.aboard
    ? craft.inHold
      ? 'im Laderaum'
      : 'an Bord'
    : craft.place === undefined
      ? 'bei der Gruppe'
      : craft.inOrbit
        ? `in der Umlaufbahn von ${worldName(craft.place.world)}`
        : `auf ${worldName(craft.place.world)}`;
  return { name: craft.name, design: `${plan.name} · ${plan.maneuver}G · ${weaponsLine(craft)}`, where };
}

/** Die Waffen eines Small Craft in einer Zeile (2026-11-22): „2 × Beam Laser“, „unbewaffnet“, mit „ausgefallen“ nach einem Treffer. */
function weaponsLine(craft: Ship): string {
  const weapons = craft.turrets.flatMap((t) => t.weapons);
  if (weapons.length === 0) return 'unbewaffnet';
  const counts = new Map<string, number>();
  for (const w of weapons) counts.set(w, (counts.get(w) ?? 0) + 1);
  const line = [...counts].map(([w, n]) => `${n > 1 ? `${n} × ` : ''}${shipWeaponOf(w).name}`).join(', ');
  return (craft.damage?.turretsOut.length ?? 0) > 0 ? `${line} (ausgefallen)` : line;
}
