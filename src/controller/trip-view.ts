// Fahrt und Reisetag, wie die View sie zeigt (siehe docs/domain-model.md, *Fahrt*).

import {
  daysLeft,
  flies,
  landformAt,
  legHours,
  legRent,
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
  /** Was die Fahrt (bzw. der Rest) an Miete kostet. */
  readonly rent: number;
  /** Wo die Gruppe gerade ist. */
  readonly at: string;
  /** Die Felder der Route in Reihenfolge, zum Zeichnen. */
  readonly cells: readonly number[];
}

/** Die Planung auf dem Globus: Ziel, ob gemietet werden darf, der Vorschlag oder warum es keinen gibt. */
export interface TripPlanView {
  readonly target: string;
  readonly rent: boolean;
  readonly plan: TripView | undefined;
  readonly error: string | undefined;
  /** Wenn die Miete der ganzen Fahrt die Kasse übersteigt: wie viel in der Kasse ist. */
  readonly short: number | undefined;
}

/** Ein Reisetag im Log. */
export interface TripDayItem {
  readonly kind: 'tripDay';
  readonly at: string;
  readonly date: string;
  readonly hours: number;
  readonly rent: number;
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

export function tripView(surface: TripSurface, trip: Trip): TripView {
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
    at: cellLabel(surface, positionAt(surface, trip).cell),
    cells,
  };
}

/** Die laufende Fahrt der Kampagne; ohne Fahrt keine. */
export function activeTripView(campaign: Campaign): TripView | undefined {
  const surface = campaign.trip ? tripSurface(campaign) : undefined;
  return surface && campaign.trip ? tripView(surface, campaign.trip) : undefined;
}

export function tripDayItem(campaign: Campaign, entry: TripDay): TripDayItem {
  const place = entry.place;
  const hex = place ? hexById(campaign.hexes, place.world) : undefined;
  const city = place?.city === undefined ? undefined : hex?.map?.cities?.[place.city]?.name;
  const where = city ?? (place?.cell !== undefined && hex?.map ? `${LANDFORM_NAMES[landformAt(hex.map, place.cell)]} (Feld ${place.cell})` : (hex?.name ?? ''));
  return { kind: 'tripDay', at: entry.at, date: dateLabel(entry.day ?? 0), hours: round1(entry.hours), rent: entry.rent, arrived: entry.arrived, where };
}
