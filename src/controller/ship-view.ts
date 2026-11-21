import {
  computerModelOf,
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
  softwareOf,
  type Campaign,
  type DeckPlan,
  type SoftwareKind,
  flightStartBlocker,
  launchWorld,
  craftOf,
  craftPurchaseBlocker,
  holdTonsOf,
  isSmallCraft,
  type Ship,
} from '../model';

/** Die Softwarearten, wie der Reiter Schiff sie schreibt (SR 38). */
const softwareKinds: Record<SoftwareKind, string> = { offensive: 'Offensiv', defensive: 'Defensiv', routine: 'Routine' };
/** Anzahlung bei Bankfinanzierung, als Anteil des Preises (SR 29). */
const DOWN_PAYMENT = 0.2;

/** Ein Programm an Bord: Name, Art und was es wirkt. */
export interface ShipSoftwareRow {
  readonly name: string;
  readonly kind: string;
  readonly effect: string;
}

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
        readonly months: number;
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
        /** Die Bordsoftware, in der Reihenfolge des Bords. */
        readonly software: readonly ShipSoftwareRow[];
      }
    | undefined;
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
            months: plan.months ?? 0,
            basePrice: plan.basePrice,
            craft: craftOf(campaign, ship.id).map((c) => craftRow(campaign, c)),
            price: ship.price,
            initialLoan: ship.initialLoan,
            loanBalance: ship.loanBalance,
            monthlyPayment: monthlyPaymentOf(ship),
            nextPayment: ship.nextPaymentDay === undefined ? undefined : dateLabel(ship.nextPaymentDay),
            software: ship.software.map((s) => {
              const program = softwareOf(s.program);
              return { name: program.name, kind: softwareKinds[program.kind], effect: program.effect };
            }),
          },
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
  return { name: craft.name, design: `${plan.name} · ${plan.maneuver}G`, where };
}
