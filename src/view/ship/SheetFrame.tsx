import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../icons';

/**
 * Ein Blatt des Bereichs Schiff, als Feld an der Stelle des Bereichs wie das angetippte Feld des Globus:
 * oben Titel und ✕ (am Kopf lässt sich das Ziehblatt fassen), darunter der Inhalt, unten im Dock die
 * Knöpfe. Esc schließt es wie das ✕. `className` steht für Blätter mit zweispaltigen Tabellen.
 */
export function SheetFrame({ title, aside, onClose, foot, className, children }: { title: string; aside?: string; onClose: () => void; foot?: ReactNode; className?: string; children: ReactNode }) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ein Popup darüber (Ergebnis, Menü) schließt Esc zuerst.
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"], .menu-layer')) return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <section className={`scroll shop-scroll ship-field${className === undefined ? '' : ` ${className}`}`} aria-label={title}>
        <div className="globe-sheet-head" data-tray-peek>
          <h3>{title}</h3>
          <span className="header-right">
            {aside !== undefined && <span className="sheet-aside mono muted">{aside}</span>}
            <button type="button" className="icon-button" aria-label={`${title} schließen`} onClick={onClose}>
              <CloseIcon />
            </button>
          </span>
        </div>
        {children}
      </section>
      {foot !== undefined && (
        <div className="dock">
          <div className="actions">{foot}</div>
        </div>
      )}
    </>
  );
}
