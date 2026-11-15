// Fahrt und Reisetag, wie die View sie zeigt (siehe docs/domain-model.md, *Fahrt*).

import {
  daysLeft,
  flies,
  landformAt,
  legHours,
  legRent,
  legFare,
  totalFare,
  farePayers,
  positionAt,
  totalHours,
  totalRent,
  tripDays,
  tripSurface,
  vehicleOf,
  dateLabel,
  hexById,
  type Campaign,
  type Trip,
  type TripDay,
  type TripSurface,
} from '../model';
import { LANDFORM_NAMES } from './globe-view';

/** Ein Abschnitt in Worten. */
export interface LegView {
  readonly vehicle: string;
  readonly rented: boolean;
  readonly flight: boolean;
  readonly from: string;
  readonly to: string;
  /** Fahrstunden, gerundet auf eine Stelle. */
  readonly hours: number;
  /** Miete je Tag; 0 bei eigenen Fahrzeugen und zu Fuß. */
  readonly rentPerDay: number;
  /** Fahrpreis im Linienverkehr für alle SC; sonst 0. */
  readonly fare: number;
  /** Schon ganz gefahren. */
  readonly done: boolean;
}

/** Eine Fahrt, geplant oder unterwegs. */
export interface TripView {
  readonly legs: readonly LegView[];
  readonly to: string;
  /** Fahrstunden der ganzen Fahrt und schon gefahren, gerundet. */
  readonly totalHours: number;
  readonly hoursDone: number;
  /** Reisetage der ganzen Fahrt und die, die noch fehlen. */
  readonly days: number;
  readonly daysLeft: number;
  /** Was die Fahrt (bzw. der Rest) an Miete und Fahrpreis kostet. */
  readonly rent: number;
  readonly fare: number;
  /** Miete und Fahrpreis zusammen. */
  readonly cost: number;
  /** Wo die Gruppe gerade ist. */
  readonly at: string;
  /** Die Felder der Route in Reihenfolge, zum Zeichnen. */
  readonly cells: readonly number[];
}

/** Eine Variante der Route, wie eine Karten-App sie zeigt. */
export interface TripOptionView {
  /** „Zu Fuß“, „Ground Car mieten“, „Eigener Ground Car“. */
  readonly title: string;
  /** Das Fahrzeug, das die Variante prägt (das mit den meisten Fahrstunden außer zu Fuß), für das Symbol. */
  readonly vehicle: string;
  /** Die Fahrzeuge der Abschnitte in Reihenfolge, z. B. Zu Fuß › Ground Car › Zu Fuß. */
  readonly chain: readonly { readonly vehicle: string; readonly name: string; readonly rented: boolean }[];
  /** „Schnellste“, „Günstigste“. */
  readonly tags: readonly string[];
  readonly trip: TripView;
  /** Wenn die Miete der ganzen Fahrt die Kasse übersteigt: wie viel in der Kasse ist. */
  readonly short: number | undefined;
}

/** Die Planung auf dem Globus: Ziel, die Varianten, die gewählte oder warum es keine gibt. */
export interface TripPlanView {
  readonly target: string;
  readonly options: readonly TripOptionView[];
  readonly chosen: number;
  readonly error: string | undefined;
}

/** Ein Reisetag im Log. */
export interface TripDayItem {
  readonly kind: 'tripDay';
  readonly at: string;
  readonly date: string;
  readonly hours: number;
  readonly rent: number;
  readonly fare: number;
  readonly arrived: boolean;
  /** Wo die Gruppe am Abend ist. */
  readonly where: string;
}

const round1 = (h: number) => Math.round(h * 10) / 10;

/** Ein Feld in Worten: die Stadt darauf, sonst die Geländeart. */
export function cellLabel(surface: TripSurface, cell: number): string {
  const city = surface.ways.cityAt.get(cell);
  if (city !== undefined) return surface.map.cities![city]!.name;
  return `${LANDFORM_NAMES[landformAt(surface.map, cell)]} (Feld ${cell})`;
}

export function tripView(surface: TripSurface, trip: Trip, persons: number): TripView {
  let t = 0;
  const legs = trip.legs.map((leg): LegView => {
    const hours = legHours(surface, leg);
    t += hours;
    const vehicle = vehicleOf(leg.by);
    return {
      vehicle: vehicle.name,
      rented: leg.rented,
      flight: flies(vehicle),
      from: cellLabel(surface, leg.cells[0]!),
      to: cellLabel(surface, leg.cells.at(-1)!),
      hours: round1(hours),
      rentPerDay: legRent(leg),
      fare: legFare(surface, leg, persons),
      done: t <= trip.hours + 1e-9,
    };
  });
  const cells = trip.legs.flatMap((leg, i) => (i === 0 ? leg.cells : leg.cells.slice(1)));
  return {
    legs,
    to: cellLabel(surface, trip.legs.at(-1)!.cells.at(-1)!),
    totalHours: round1(totalHours(surface, trip)),
    hoursDone: round1(trip.hours),
    days: tripDays(surface, trip),
    daysLeft: daysLeft(surface, trip),
    rent: totalRent(surface, trip),
    fare: totalFare(surface, trip, persons),
    cost: totalRent(surface, trip) + totalFare(surface, trip, persons),
    at: cellLabel(surface, positionAt(surface, trip).cell),
    cells,
  };
}

/** Die laufende Fahrt der Kampagne; ohne Fahrt keine. */
export function activeTripView(campaign: Campaign): TripView | undefined {
  const surface = campaign.trip ? tripSurface(campaign) : undefined;
  return surface && campaign.trip ? tripView(surface, campaign.trip, farePayers(campaign)) : undefined;
}

export function tripDayItem(campaign: Campaign, entry: TripDay): TripDayItem {
  const place = entry.place;
  const hex = place ? hexById(campaign.hexes, place.world) : undefined;
  const city = place?.city === undefined ? undefined : hex?.map?.cities?.[place.city]?.name;
  const where = city ?? (place?.cell !== undefined && hex?.map ? `${LANDFORM_NAMES[landformAt(hex.map, place.cell)]} (Feld ${place.cell})` : (hex?.name ?? ''));
  return { kind: 'tripDay', at: entry.at, date: dateLabel(entry.day ?? 0), hours: round1(entry.hours), rent: entry.rent, fare: entry.fare ?? 0, arrived: entry.arrived, where };
}

/** Die Planung mit ihren Varianten in Worten. */
export function tripPlanOf(surface: TripSurface, draft: { readonly target: number; readonly options: readonly Trip[]; readonly chosen: number; readonly error: string | undefined }, funds: number, persons: number): TripPlanView {
  const views = draft.options.map((trip) => tripView(surface, trip, persons));
  const fastest = views.length > 0 ? Math.min(...views.map((v) => v.totalHours)) : 0;
  const cheapest = views.length > 0 ? Math.min(...views.map((v) => v.cost)) : 0;
  const options = draft.options.map((trip, i): TripOptionView => {
    const view = views[i]!;
    const hours = new Map<string, number>();
    trip.legs.forEach((leg) => {
      if (leg.by !== 'walk') hours.set(leg.by, (hours.get(leg.by) ?? 0) + legHours(surface, leg));
    });
    const main = [...hours].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'walk';
    const chain = trip.legs
      .map((l) => ({ vehicle: l.by, name: vehicleOf(l.by).name, rented: l.rented }))
      .filter((c, k, all) => k === 0 || all[k - 1]!.vehicle !== c.vehicle || all[k - 1]!.rented !== c.rented);
    const names = (pick: (l: Trip['legs'][number]) => boolean) => [...new Set(trip.legs.filter((l) => l.by !== 'walk' && pick(l)).map((l) => vehicleOf(l.by).name))];
    const lines = names((l) => vehicleOf(l.by).fare !== undefined);
    const own = names((l) => !l.rented && vehicleOf(l.by).fare === undefined);
    const hired = names((l) => l.rented);
    const title = [...own.map((n) => `Eigener ${n}`), ...(hired.length > 0 ? [`${hired.join(' + ')} mieten`] : []), ...lines].join(', ') || 'Zu Fuß';
    const tags = [...(view.totalHours === fastest ? ['Schnellste'] : []), ...(view.cost === cheapest && views.length > 1 ? ['Günstigste'] : [])];
    return { title, vehicle: main, chain, tags, trip: view, short: view.cost > funds ? funds : undefined };
  });
  return { target: cellLabel(surface, draft.target), options, chosen: draft.chosen, error: draft.error };
}
