import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from './icons';

/**
 * Eine **Detailseite** (GUI-Handbuch): an der Stelle des Bereichs wie das angetippte Feld des
 * Globus, etwa im Bereich Schiff oder der Charakter-Editor, oben Titel und ✕ (am Kopf lässt sich das Ziehblatt fassen), darunter der
 * Inhalt, unten die Aktionsleiste mit der Handlung. Zurück geht es nur mit ✕ oder Esc, ein
 * „Abbrechen“ gibt es nicht (2026-11-26). `className` steht für Detailseiten mit zweispaltigen Tabellen.
 */
export function DetailPage({ title, aside, onClose, foot, className, labelled = true, children }: { title: string; aside?: string; onClose: () => void; foot?: ReactNode; className?: string; /** Benennt der Aufrufer die ganze Seite samt Aktionsleiste, trägt der Inhalt keinen eigenen Namen. */ labelled?: boolean; children: ReactNode }) {
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
      <section className={`scroll shop-scroll ship-field${className === undefined ? '' : ` ${className}`}`} aria-label={labelled ? title : undefined}>
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
