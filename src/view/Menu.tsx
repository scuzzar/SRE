import { useEffect, useRef } from 'react';
import type { Snapshot } from '../controller';
import { useGame } from './game-context';
import { CloseIcon } from './icons';

/**
 * Das Menü hinter ☰: unter „Kampagne“ die Kampagnenwahl (wechseln, neu, umbenennen, löschen,
 * importieren) und der Export der offenen Kampagne, unter „App“ der Bildschirm „Über“ mit
 * Installieren, Vibration und Quellen. Ob es offen ist, hält die View; jede Wahl geht an den Controller.
 */
export function Menu({ view, onClose }: { view: Snapshot; onClose: () => void }) {
  const game = useGame();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const choose = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <div className="menu-layer" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <button type="button" className="menu-backdrop" aria-label="Menü schließen" tabIndex={-1} onClick={onClose} />
      <nav className="menu" aria-label="Menü">
        <div className="menu-head">
          <span className="menu-title">Menü</span>
          <button ref={close} type="button" className="icon-button" aria-label="Menü schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <h2 className="section-title menu-section">Kampagne</h2>
        <p className="menu-campaign">{view.campaign.name}</p>
        <button type="button" className="menu-item" onClick={choose(() => game.showCampaigns())}>
          Kampagnen wechseln und verwalten
        </button>
        <button type="button" className="menu-item" onClick={choose(() => game.exportCampaign(view.campaign.id))}>
          Diese Kampagne exportieren
        </button>
        <h2 className="section-title menu-section">App</h2>
        <button type="button" className="menu-item" aria-current={view.screen === 'about' ? 'page' : undefined} onClick={choose(() => game.showScreen('about'))}>
          Über die App
        </button>
        <span className="menu-note">Installieren, Vibration, Quellen</span>
      </nav>
    </div>
  );
}
