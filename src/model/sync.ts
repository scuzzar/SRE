import type { Campaign, Stamp } from './campaign';
import { validName } from './campaign';
import type { Clock, Keys } from './ports';

/**
 * Der Abgleich mit OneDrive (siehe docs/domain-model.md, „Abgleich mit OneDrive“). Hier steht nur,
 * was zu tun ist; getan wird es im Controller über `Cloud` und `CampaignRepository`.
 */

/** Eine Datei in der Wolke: der Schlüssel ihrer Kampagne und ihre Fassung. */
export interface CloudFile {
  readonly key: string;
  readonly revision: string;
}

/**
 * Die Abgleichsmarke: mit welcher Änderungszeit und welcher Fassung in der Wolke dieses Gerät zuletzt
 * gleich war. Das merkt sich das Gerät; zum Spielstand gehört es nicht.
 */
export interface SyncMark {
  readonly key: string;
  readonly changedAt: string;
  readonly revision: string;
  /** Die Kampagne wurde seither hier gelöscht. */
  readonly deleted?: boolean;
}

export type SyncStepKind = 'upload' | 'download' | 'removeRemote' | 'removeLocal' | 'forget' | 'conflict';

/** Was der Abgleich mit einer Kampagne tut. */
export interface SyncStep {
  readonly kind: SyncStepKind;
  readonly key: string;
}

/**
 * Was der Abgleich je Kampagne tut. *Hier geändert*: Die Änderungszeit ist eine andere als in der
 * Marke (oder es gibt keine Marke). *Dort geändert*: Die Wolke hat eine andere Fassung als in der
 * Marke. Kampagnen in `skip` (mit offenem Konflikt) bleiben, wie sie sind.
 *
 * `conflict` heißt: erst den Stand dort lesen. Sind beide Stände gleich alt, ist es keiner (so nach
 * einem erneuten Anmelden, wenn die Marken fehlen).
 */
export function planSync(campaigns: readonly Campaign[], marks: readonly SyncMark[], remote: readonly CloudFile[], skip: readonly string[] = []): readonly SyncStep[] {
  const keys = new Set([...campaigns.map((c) => c.key), ...marks.map((m) => m.key), ...remote.map((r) => r.key)]);
  const steps: SyncStep[] = [];
  for (const key of keys) {
    if (skip.includes(key)) continue;
    const kind = stepFor(
      campaigns.find((c) => c.key === key),
      marks.find((m) => m.key === key),
      remote.find((r) => r.key === key),
    );
    if (kind) steps.push({ kind, key });
  }
  return steps;
}

function stepFor(local: Campaign | undefined, mark: SyncMark | undefined, file: CloudFile | undefined): SyncStepKind | undefined {
  if (!mark) {
    if (local && file) return 'conflict';
    if (local) return 'upload';
    return file ? 'download' : undefined;
  }
  const thereChanged = !file || file.revision !== mark.revision;
  if (!local) {
    // Hier gelöscht. Fehlt die Kampagne hier ohne Löschvermerk, kommt sie einfach wieder herunter.
    if (!file) return 'forget';
    if (!mark.deleted) return 'download';
    return thereChanged ? 'conflict' : 'removeRemote';
  }
  const hereChanged = local.changedAt !== mark.changedAt;
  if (!hereChanged && !thereChanged) return undefined;
  if (hereChanged && thereChanged) return 'conflict';
  if (hereChanged) return 'upload';
  return file ? 'download' : 'removeLocal';
}

/** Die Marke nach einem Abgleich: Gerät und Wolke sind bei diesem Stand und dieser Fassung gleich. */
export function markOf(stamp: Stamp, revision: string): SyncMark {
  return { key: stamp.key, changedAt: stamp.changedAt, revision };
}

/**
 * „Beide behalten“: Der Stand von hier wird eine eigene Kampagne mit neuem Schlüssel und dem Namen
 * „<Name> (Kopie)“. Sie behält ihre Id, bleibt also offen, wenn sie es war.
 */
export function copyOf(campaign: Campaign, keys: Keys, clock: Clock): Campaign {
  return { ...campaign, key: keys.next(), changedAt: clock.now(), name: validName(`${campaign.name} (Kopie)`) };
}
