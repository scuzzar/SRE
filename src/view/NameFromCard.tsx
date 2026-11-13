import { useState } from 'react';
import type { NameChoice } from '../model/draft';
import { useGame, useSnapshot } from './game-context';
import { haptic } from './haptics';
import { CardIcon } from './icons';

/**
 * Name von der Karte: ein Knopf neben einem Namensfeld. Er öffnet die Namenswahl mit Vornamen und
 * Nachnamen getrennt; man tippt aus jedem Raster höchstens einen an, „Übernehmen“ schreibt den Namen
 * ins Feld. Welche Namen gezogen sind, hält der Controller; was angetippt ist und wohin der Name geht,
 * ist reine Darstellung.
 */
export function NameFromCard({ onPick, disabled = false }: { onPick: (name: string) => void; disabled?: boolean }) {
  const game = useGame();
  const { names } = useSnapshot();
  // Nur der Knopf, der die Wahl geöffnet hat, zeigt sie und bekommt den Namen.
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<string | undefined>(undefined);
  const [last, setLast] = useState<string | undefined>(undefined);
  const draw = () => {
    setFirst(undefined);
    setLast(undefined);
    game.drawNames();
  };
  const close = () => {
    setOpen(false);
    game.closeNames();
  };
  const name = [first, last].filter(Boolean).join(' ');

  return (
    <>
      <button
        type="button"
        className="ghost name-from-card"
        aria-disabled={disabled || undefined}
        onClick={() => {
          if (disabled) return;
          haptic('draw');
          setOpen(true);
          draw();
        }}
      >
        <CardIcon />
        Karte
      </button>
      {open && names && (
        <div className="name-picker-overlay" onClick={close}>
          <section className="name-picker" role="dialog" aria-modal="true" aria-labelledby="name-picker-title" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 id="name-picker-title">Name von der Karte</h2>
              <span className="muted" style={{ fontSize: 13 }}>
                Vorname und Nachname antippen
              </span>
            </div>
            <Choices title="Vornamen" choices={names.first} chosen={first} onChoose={setFirst} />
            <Choices title="Nachnamen" choices={names.last} chosen={last} onChoose={setLast} />
            <div className="name-picker-result" aria-live="polite">
              {name || <span className="muted">Noch kein Name gewählt</span>}
            </div>
            <div className="name-picker-foot">
              <button data-escape type="button" className="ghost" onClick={close}>
                Abbrechen
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  haptic('draw');
                  draw();
                }}
              >
                Neu ziehen
              </button>
              <button
                type="button"
                className="primary"
                disabled={!name}
                onClick={() => {
                  haptic('confirm');
                  onPick(name);
                  close();
                }}
              >
                Übernehmen
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

/** Ein Raster zur Wahl: oben die irdischen, unten die spacigen Namen. Noch einmal antippen nimmt die Wahl zurück. */
function Choices({ title, choices, chosen, onChoose }: { title: string; choices: readonly NameChoice[]; chosen: string | undefined; onChoose: (text: string | undefined) => void }) {
  return (
    <div className="name-choices" role="group" aria-label={title}>
      <h3 className="theme-title">{title}</h3>
      <div className="card-grid cols-3">
        {choices.map((choice) => (
          <button
            key={choice.text}
            type="button"
            className={`tile name ${choice.sound}`}
            aria-pressed={chosen === choice.text}
            title={choice.label}
            onClick={() => {
              haptic(chosen === choice.text ? 'unpick' : 'pick');
              onChoose(chosen === choice.text ? undefined : choice.text);
            }}
          >
            <span className="tile-text">
              <span className="tile-line">{choice.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
