import { useState } from 'react';
import type { CampaignChoice, CampaignSheetView, ConflictView, StandView, SyncView } from '../controller';
import { clockTime, dayTime } from './format';
import { useGame } from './game-context';
import { CloseIcon, DownloadIcon, TrashIcon, UploadIcon } from './icons';
import { Form } from './Form';

/**
 * Die Kampagnenwahl: wechseln, umbenennen, anlegen, löschen, exportieren und importieren. Die Texte
 * während des Tippens und welches Löschen gerade bestätigt werden will, hält die View; prüfen und
 * speichern tut der Controller.
 */
export function CampaignSheet({
  sheet,
  campaigns,
  open,
  sync,
  conflicts,
}: {
  sheet: CampaignSheetView;
  campaigns: readonly CampaignChoice[];
  open: { id: string; name: string };
  sync: SyncView;
  conflicts: readonly ConflictView[];
}) {
  const game = useGame();
  const [name, setName] = useState(open.name);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | undefined>(undefined);

  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="campaigns-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="campaigns-title">Kampagnen</h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={() => game.closeCampaigns()}>
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body form">
          {sheet.error && (
            <p className="error" role="alert">
              {sheet.error}
            </p>
          )}

          {conflicts.map((c) => (
            <ConflictCard key={c.key} conflict={c} />
          ))}

          <Form
            className="inline-form"
            onSend={() => {
              game.renameCampaign(name);
            }}
          >
            <label className="field">
              <span>Name der offenen Kampagne</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </label>
            <button type="submit" className="ghost" disabled={name.trim() === open.name}>
              Umbenennen
            </button>
          </Form>

          <ul className="campaigns" aria-label="Alle Kampagnen">
            {campaigns.map((c) => (
              <li key={c.id} className={c.open ? 'open' : undefined}>
                <button
                  type="button"
                  className="campaign-pick"
                  aria-current={c.open ? 'true' : undefined}
                  onClick={() => (c.open ? game.closeCampaigns() : game.openCampaign(c.id))}
                >
                  <span className="campaign-title">{c.name}</span>
                  <span className="small-label">
                    {c.open ? 'Offen · ' : ''}
                    {c.characters === 1 ? '1 Charakter' : `${c.characters} Charaktere`} · {c.entries === 1 ? '1 Logeintrag' : `${c.entries} Logeinträge`}
                  </span>
                </button>
                <button type="button" className="ghost square" aria-label={`${c.name} exportieren`} onClick={() => game.exportCampaign(c.id)}>
                  <DownloadIcon />
                </button>
                {confirmDelete === c.id ? (
                  <button type="button" className="ghost danger" onClick={() => game.deleteCampaign(c.id)}>
                    Löschen?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ghost square danger"
                    aria-label={`${c.name} löschen`}
                    disabled={!sheet.canDelete}
                    onClick={() => setConfirmDelete(c.id)}
                  >
                    <TrashIcon />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <span className="small-label">
            {sheet.canDelete
              ? 'Löschen ist endgültig: Charaktere und Log der Kampagne sind dann weg. Vorher exportieren sichert sie als Datei.'
              : 'Die letzte Kampagne lässt sich nicht löschen.'}
          </span>

          <Form
            className="inline-form"
            onSend={() => {
              game.createCampaign(newName);
            }}
          >
            <label className="field">
              <span>Neue Kampagne</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name, z. B. Spinward Run" autoComplete="off" />
            </label>
            <button type="submit" className="ghost">
              Anlegen
            </button>
          </Form>

          <label className="ghost import">
            <UploadIcon />
            Kampagne importieren
            <input
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void file.text().then((text) => game.importCampaign(text));
              }}
            />
          </label>
          <span className="small-label">Der Import legt immer eine neue Kampagne an und überschreibt keine.</span>

          <SyncPanel sync={sync} />
        </div>
      </section>
    </div>
  );
}

/** Ein Stand im Konflikt in Worten: wann zuletzt geändert und wie viele Logeinträge, oder dass er gelöscht ist. */
function standText(stand: StandView | undefined): string {
  if (!stand) return 'gelöscht';
  return `geändert ${dayTime(stand.changedAt)} · ${stand.entries === 1 ? '1 Logeintrag' : `${stand.entries} Logeinträge`}`;
}

/** Ein Konflikt des Abgleichs: beide Stände nebeneinander, darunter die Wahl. Was sie bewirkt, entscheidet der Controller. */
function ConflictCard({ conflict }: { conflict: ConflictView }) {
  const game = useGame();
  const choose = (choice: ConflictView['choices'][number]) => void game.resolveConflict(conflict.key, choice);
  return (
    <section className="conflict" role="group" aria-label={`Konflikt: ${conflict.name}`}>
      <strong>„{conflict.name}“ wurde hier und in OneDrive geändert</strong>
      <dl className="conflict-stands">
        <dt>Dieses Gerät</dt>
        <dd>{standText(conflict.local)}</dd>
        <dt>OneDrive</dt>
        <dd>{standText(conflict.remote)}</dd>
      </dl>
      <span className="small-label">Welcher Stand soll gelten? Bis du wählst, wird diese Kampagne nicht abgeglichen.</span>
      <div className="conflict-choices">
        <button type="button" className="ghost" onClick={() => choose('local')}>
          Dieses Gerät
        </button>
        <button type="button" className="ghost" onClick={() => choose('remote')}>
          OneDrive
        </button>
        {conflict.choices.includes('both') && (
          <button type="button" className="ghost" onClick={() => choose('both')}>
            Beide behalten
          </button>
        )}
      </div>
    </section>
  );
}

/** Wie der Abgleich steht, in einem Satz. */
function syncText(sync: SyncView): string {
  switch (sync.status) {
    case 'off':
      return 'Der Abgleich ist in dieser Fassung der App nicht eingerichtet. Die Kampagnen liegen nur auf diesem Gerät.';
    case 'signedOut':
      return 'Nicht angemeldet. Die Kampagnen liegen nur auf diesem Gerät.';
    case 'syncing':
      return 'Gleicht ab …';
    case 'synced':
      return sync.at ? `Abgeglichen um ${clockTime(sync.at)}.` : 'Angemeldet.';
    case 'offline':
      return 'Kein Netz. Du spielst weiter, der nächste Abgleich holt nach.';
    case 'expired':
      return 'Die Anmeldung ist abgelaufen. Melde dich neu an, damit wieder abgeglichen wird.';
    case 'error':
      return sync.error ?? 'Der Abgleich ist gescheitert.';
  }
}

/** Der Abgleich mit OneDrive in der Kampagnenwahl: anmelden, abmelden und wie es steht. */
function SyncPanel({ sync }: { sync: SyncView }) {
  const game = useGame();
  const signedIn = sync.account !== undefined;
  return (
    <section className="sync" aria-label="Abgleich mit OneDrive">
      <strong>Abgleich mit OneDrive</strong>
      {signedIn && <span className="small-label">Angemeldet als {sync.account}</span>}
      <span className={sync.status === 'error' || sync.status === 'expired' ? 'small-label error' : 'small-label'} role="status">
        {syncText(sync)}
      </span>
      {sync.status !== 'off' && (
        <div className="conflict-choices">
          {(!signedIn || sync.status === 'expired') && (
            <button type="button" className="ghost" onClick={() => void game.signIn()}>
              {signedIn ? 'Neu anmelden' : 'Bei OneDrive anmelden'}
            </button>
          )}
          {signedIn && (sync.status === 'error' || sync.status === 'offline') && (
            <button type="button" className="ghost" onClick={() => void game.sync()}>
              Noch einmal versuchen
            </button>
          )}
          {signedIn && (
            <button type="button" className="ghost" onClick={() => void game.signOut()}>
              Abmelden
            </button>
          )}
        </div>
      )}
      {!signedIn && sync.status !== 'off' && (
        <span className="small-label">Angemeldet hast du deine Kampagnen auf jedem Gerät, auf dem du dich auch anmeldest. Sie liegen im Ordner „Apps“ deines OneDrive.</span>
      )}
    </section>
  );
}
