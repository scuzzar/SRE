import { shipDesignOf, sum, type Campaign } from '../model';
import { checkColumn, checkShipOn, type ShipEncounterCheck } from '../model/draft';
import { intentNames } from './time-view';
import { worldName } from './generation-view';

/** Der Dialog der Begegnungsprüfung (2026-11-22b): Anlass, Spalte, DM, Zielwert; nach dem Wurf das Ergebnis. */
export interface ShipCheckView {
  /** Was ins Kleine über den Titel kommt: Tabelle und Anlass. */
  readonly kicker: string;
  readonly title: string;
  readonly column: string;
  readonly dm: number;
  /** Die DMs mit Grund, z. B. „Marinebasis +2“. */
  readonly dmParts: readonly string[];
  /** Der Zielwert: die Summen auf 2W6, bei denen ein Schiff kommt, z. B. „6+“ oder „4, 9+“; „kein Schiff möglich“. */
  readonly target: string;
  /** Vor dem Wurf, nach dem Wurf (mit oder ohne Schiff) oder bei einer Sichtung, die fragt. */
  readonly phase: 'ready' | 'rolled' | 'sighting';
  readonly dice: readonly number[] | undefined;
  readonly total: number | undefined;
  /** Was herauskam, z. B. „Kein Schiff.“ oder „Free Trader (Pirat) greift an.“ */
  readonly text: string | undefined;
  /** Was nach „Weiter“ kommt, z. B. „Zur Raumkarte“. */
  readonly next: string;
  /** Was „Abbrechen“ (lang gedrückt) tut. */
  readonly skip: string;
}

/** Fasst Summen zusammen: 4, 9, 10, 11, 12 wird „4, 9+“; 6–8 wird „6–8“. */
export function sumsText(sums: readonly number[]): string {
  if (sums.length === 0) return 'kein Schiff möglich';
  const parts: string[] = [];
  let i = 0;
  while (i < sums.length) {
    let j = i;
    while (j + 1 < sums.length && sums[j + 1] === sums[j]! + 1) j++;
    const a = sums[i]!;
    const b = sums[j]!;
    parts.push(b === 12 && a < 12 ? `${a}+` : a === b ? `${a}` : `${a}–${b}`);
    i = j + 1;
  }
  return parts.join(', ');
}

export function shipCheckView(campaign: Campaign, check: ShipEncounterCheck): ShipCheckView {
  const column = checkColumn(campaign, check);
  const name = worldName(campaign.hexes, check.world);
  const dmParts = [...(column.navalBase ? ['Marinebasis +2'] : []), ...(column.scoutBase ? ['Scoutbasis +1'] : [])];
  const occasion = check.occasion === 'departure' ? `Start von ${name}` : check.occasion === 'arrival' ? `Ankunft in ${name}` : `${name}, von Hand`;
  const result = check.result;
  let text: string | undefined;
  if (result !== undefined) {
    if (result.code === undefined) text = 'Kein Schiff.';
    else {
      const ship = shipDesignOf(result.design!).name;
      const pirate = result.code.includes('P');
      const reaction = result.reaction === undefined ? '' : ` Reaktion ${sum(result.reaction)}${result.attack === undefined ? '' : `, Angriffswurf ${sum(result.attack)}`}.`;
      text = `${ship}${pirate ? ' (Pirat)' : ''} ${intentNames[result.intent!]}.${reaction}`;
    }
  }
  const phase = result === undefined ? 'ready' : check.sighting !== undefined ? 'sighting' : 'rolled';
  const attacked = result?.code !== undefined && check.sighting === undefined;
  const next = attacked ? 'Zur Raumkarte' : check.occasion === 'departure' ? 'Weiterreisen' : 'Weiter';
  const skip = check.occasion === 'departure' ? 'Lange drücken: ohne Wurf abreisen' : check.occasion === 'arrival' ? 'Lange drücken: ohne Wurf ankommen' : 'Lange drücken: nicht würfeln';
  return {
    kicker: `Starship Encounter Table (SE 13) · ${occasion}`,
    title: 'Schiffsbegegnung',
    column: column.column,
    dm: column.dm,
    dmParts,
    target: sumsText(checkShipOn(campaign, check)),
    phase,
    dice: result?.encounter,
    total: result?.total,
    text,
    next,
    skip,
  };
}
