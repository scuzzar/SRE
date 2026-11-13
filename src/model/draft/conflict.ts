import type { Campaign } from '../campaign';

/**
 * Ein Konflikt: Dieselbe Kampagne wurde seit dem letzten Abgleich hier und in der Wolke geändert.
 * Er hält den Stand von dort, bis der Spieler wählt; der Stand von hier (`local` im Modell) ist die
 * Kampagne des Geräts mit demselben Schlüssel, in der man weiterspielen kann. Einer von beiden
 * fehlt, wenn die Kampagne auf der Seite gelöscht ist. Flüchtig: Nach einem Neustart findet ihn der
 * Abgleich wieder.
 */
export interface Conflict {
  readonly key: string;
  readonly remote?: Campaign;
  /** Die Fassung des Stands dort, als er gelesen wurde; fehlt mit `remote`. */
  readonly revision?: string;
}

/** Was der Spieler im Konflikt wählen kann: den Stand dieses Geräts, den aus der Wolke oder beide. */
export type ConflictChoice = 'local' | 'remote' | 'both';

/** Der Stand von hier: die Kampagne des Geräts mit dem Schlüssel des Konflikts. */
export function localOf(conflict: Conflict, campaigns: readonly Campaign[]): Campaign | undefined {
  return campaigns.find((c) => c.key === conflict.key);
}

/** „Beide behalten“ gibt es nur, wenn beide Stände da sind. */
export function choicesOf(conflict: Conflict, campaigns: readonly Campaign[]): readonly ConflictChoice[] {
  return localOf(conflict, campaigns) && conflict.remote ? ['local', 'remote', 'both'] : ['local', 'remote'];
}
