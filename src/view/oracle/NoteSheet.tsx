import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/**
 * Das Blatt für eine Notiz oder eine Deutung. Mit `target` (Stelle eines Ergebnisses im Log und seine
 * Zeile) wird der Text eine Deutung zu diesem Ergebnis, sonst eine Notiz. Der Text während des Tippens
 * ist reine Darstellung; übergeben wird beim Absenden.
 */
export function NoteSheet({ target, onClose }: { target?: { readonly index: number; readonly head: string; readonly rest: string } | undefined; onClose: () => void }) {
  const game = useGame();
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus(), []);
  const reading = target !== undefined;
  const save = () => {
    if (!text.trim()) return;
    haptic('pick');
    game.writeNote(text, target?.index);
    onClose();
  };
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="sheet note-sheet" role="dialog" aria-modal="true" aria-labelledby="note-sheet-title">
        <div className="sheet-head">
          <h2 id="note-sheet-title">{reading ? 'Deutung' : 'Notiz'}</h2>
        </div>
        {target && (
          <p className="target-line note-target">
            <span className="target-text">
              zu <b>{target.head}</b> · {target.rest}
            </span>
          </p>
        )}
        <label htmlFor="note-text" className="visually-hidden">
          {reading ? 'Was bedeutet das für die Geschichte?' : 'Was passiert?'}
        </label>
        <textarea
          id="note-text"
          ref={field}
          className="note-input"
          value={text}
          placeholder={reading ? 'Was bedeutet das für die Geschichte?' : 'Was passiert?'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Strg/Cmd+Enter schickt ab; Enter allein macht eine neue Zeile.
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
          }}
        />
        <div className="sheet-foot">
          <button type="button" className="ghost" data-escape onClick={onClose}>
            Abbrechen
          </button>
          <span className="grow" />
          <button type="button" className="primary" disabled={!text.trim()} onClick={save}>
            {reading ? 'Deuten' : 'Notieren'}
          </button>
        </div>
      </section>
    </div>
  );
}
