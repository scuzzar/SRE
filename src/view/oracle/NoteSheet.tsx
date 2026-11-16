import { useEffect, useRef, useState } from 'react';
import { useGame, useSnapshot } from '../game-context';
import { haptic } from '../haptics';
import { CardSheet } from './CardSheet';

/**
 * Das Blatt für eine Notiz oder eine Deutung. Mit `target` (Stelle eines Ergebnisses im Log und seine
 * Zeile) wird der Text eine Deutung zu diesem Ergebnis, sonst eine Notiz. Mit `edit` (Stelle der
 * Notiz oder Deutung und ihr Text) ändert es deren Text. Der Text während des Tippens ist reine
 * Darstellung; übergeben wird beim Absenden.
 *
 * „Karte ziehen“ zieht eine Inspirationskarte wie im Orakel, legt sich aber über das Notizblatt statt
 * über den Log: Bestätigen hängt die Auswahl als Text an die Notiz an (neue Zeile, falls schon etwas
 * steht), statt einen eigenen Logeintrag anzulegen; die Karte zählt dafür als für die Notiz gezogen
 * (`card.forNote`), damit sie nicht zusätzlich im Vordergrund der App aufgeht.
 */
export function NoteSheet({
  target,
  edit,
  onClose,
}: {
  target?: { readonly index: number; readonly head: string; readonly rest: string } | undefined;
  edit?: { readonly index: number; readonly text: string } | undefined;
  onClose: () => void;
}) {
  const game = useGame();
  const view = useSnapshot();
  const [text, setText] = useState(edit?.text ?? '');
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => field.current?.focus(), []);
  const reading = target !== undefined;
  const noteCard = view.card?.forNote ? view.card : undefined;
  const save = () => {
    if (!text.trim()) return;
    haptic('pick');
    if (edit) game.editNote(edit.index, text);
    else game.writeNote(text, target?.index);
    onClose();
  };
  const close = () => {
    // Eine für die Notiz gezogene Karte bricht mit dem Notizblatt ab, sonst bliebe sie offen und
    // unerreichbar stehen: Die App zeigt sie, solange die Notiz läuft, extra nicht im Vordergrund.
    if (noteCard) game.discardCard();
    onClose();
  };
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <section className="sheet note-sheet" role="dialog" aria-modal="true" aria-labelledby="note-sheet-title">
        <div className="sheet-head">
          <h2 id="note-sheet-title">{reading ? 'Deutung' : 'Notiz'}{edit ? ' ändern' : ''}</h2>
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
          <button type="button" className="ghost" data-escape onClick={close}>
            Abbrechen
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              haptic('draw');
              game.drawCard(undefined, true);
            }}
          >
            Karte ziehen
          </button>
          <span className="grow" />
          <button type="button" className="primary" disabled={!text.trim()} onClick={save}>
            {edit ? 'Speichern' : reading ? 'Deuten' : 'Notieren'}
          </button>
        </div>
      </section>
      {noteCard && (
        <CardSheet
          card={noteCard}
          onConfirm={(picked) => {
            if (!picked) return;
            setText((was) => (was.trim() ? `${was}\n${picked}` : picked));
          }}
        />
      )}
    </div>
  );
}
