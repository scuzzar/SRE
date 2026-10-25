import { useState } from 'react';
import type { CampaignChoice, CampaignSheetView } from '../controller';
import { useGame } from './game-context';
import { CloseIcon, DownloadIcon, TrashIcon, UploadIcon } from './icons';

/**
 * Die Kampagnenwahl: wechseln, umbenennen, anlegen, löschen, exportieren und importieren. Die Texte
 * während des Tippens und welches Löschen gerade bestätigt werden will, hält die View; prüfen und
 * speichern tut der Controller.
 */
export function CampaignSheet({ sheet, campaigns, open }: { sheet: CampaignSheetView; campaigns: readonly CampaignChoice[]; open: { id: string; name: string } }) {
  const game = useGame();
  const [name, setName] = useState(open.name);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | undefined>(undefined);

  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="campaigns-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="campaigns-title">Kampagnen</h2>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={() => game.closeCampaigns()}>
            <CloseIcon />
          </button>
        </div>
        <div className="sheet-body form">
          {sheet.error && (
            <p className="error" role="alert">
              {sheet.error}
            </p>
          )}

          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
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
          </form>

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

          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
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
          </form>

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
        </div>
      </section>
    </div>
  );
}
