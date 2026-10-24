import { useState } from 'react';
import type { CardSectionView, CardView } from '../../controller';
import { pairText, quoted } from '../format';
import { useGame } from '../game-context';
import { CheckIcon, CloseIcon, SenseIcon } from '../icons';

type SlotView = CardSectionView['slots'][number];

/** Die offene Inspirationskarte im Vordergrund. Aufbau nach der GMA2e-Karte, darunter die Themen-Reiter. Ein Paar steht in einem Feld. */
export function CardSheet({ card, onConfirmed }: { card: CardView; onConfirmed: () => void }) {
  const game = useGame();
  const cardSections = card.sections.filter((s) => s.kind === 'card');
  const themes = card.sections.filter((s) => s.kind === 'theme');
  const section = (id: string) => cardSections.find((s) => s.id === id);
  const known = ['event', 'senses', 'scene', 'belongings', 'situation', 'names', 'traits', 'flavor'];

  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="card-title">
        <div className="sheet-head">
          <h2 id="card-title">Inspirationskarte</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Antippen, was du nutzen willst
          </span>
        </div>
        {card.question && (
          <div className="card-question">
            <span className="kicker">Deine Frage</span>
            <span style={{ fontWeight: 600 }}>{quoted(card.question)}</span>
          </div>
        )}
        <div className="sheet-body">
          <article className="card" aria-label="Karte">
            <Stack section={section('event')} />
            <Senses section={section('senses')} />
            <Stack section={section('scene')} />
            <div className="card-columns">
              <div className="card-stack">
                <Banded section={section('belongings')} hideLabels />
                <Banded section={section('situation')} />
              </div>
              <div className="card-stack">
                <Banded section={section('names')} variant="name" hideLabels />
                <Banded section={section('traits')} />
              </div>
            </div>
            <Stack section={section('flavor')} variant="flavor" hideLabels />
            {cardSections
              .filter((s) => !known.includes(s.id))
              .map((s) => (
                <Banded key={s.id} section={s} />
              ))}
          </article>
          {themes.length > 0 && <Themes themes={themes} />}
        </div>
        <div className="sheet-foot">
          <button type="button" className="ghost square" aria-label="Karte verwerfen" onClick={() => game.discardCard()}>
            <CloseIcon />
          </button>
          <button type="button" className="ghost" onClick={() => game.redrawCard()}>
            Neu ziehen
          </button>
          <span className="count" aria-live="polite">
            {card.pickedCount === 0 ? 'Nichts ausgewählt' : `${card.pickedCount} ausgewählt`}
          </span>
          <button
            type="button"
            className="confirm"
            disabled={!card.canConfirm}
            aria-label={`${card.pickedCount} ${card.pickedCount === 1 ? 'Eintrag' : 'Einträge'} in den Log übernehmen`}
            onClick={() => {
              game.confirmCard();
              onConfirmed();
            }}
          >
            <CheckIcon />
          </button>
        </div>
      </section>
    </div>
  );
}

function Tile({ slot, variant, hideLabel }: { slot: SlotView; variant?: 'sense' | 'name' | 'flavor'; hideLabel?: boolean }) {
  const game = useGame();
  const sense = slot.id.split('.').pop() ?? '';
  return (
    <button
      type="button"
      className={variant ? `tile ${variant}` : 'tile'}
      aria-pressed={slot.picked}
      aria-label={hideLabel || variant === 'sense' ? `${slot.label}: ${pairText(slot.texts)}` : undefined}
      onClick={() => game.togglePick(slot.id)}
    >
      {variant === 'sense' && <SenseIcon sense={sense} />}
      {!hideLabel && variant !== 'sense' && <span className="tile-label">{slot.label}</span>}
      <span className="tile-text">{pairText(slot.texts)}</span>
    </button>
  );
}

function Senses({ section }: { section: CardSectionView | undefined }) {
  if (!section) return null;
  return (
    <div className="card-stack" role="group" aria-label={section.name}>
      {section.slots.map((slot) => (
        <Tile key={slot.id} slot={slot} variant="sense" />
      ))}
    </div>
  );
}

function Stack({ section, variant, hideLabels }: { section: CardSectionView | undefined; variant?: 'flavor'; hideLabels?: boolean }) {
  if (!section) return null;
  return (
    <div className="card-stack" role="group" aria-label={section.name}>
      {section.slots.map((slot) => (
        <Tile key={slot.id} slot={slot} {...(variant ? { variant } : {})} hideLabel={hideLabels ?? false} />
      ))}
    </div>
  );
}

function Banded({ section, variant, hideLabels }: { section: CardSectionView | undefined; variant?: 'name'; hideLabels?: boolean }) {
  if (!section) return null;
  return (
    <div className="card-stack" role="group" aria-label={section.name}>
      <div className="card-band" aria-hidden="true">
        {section.name}
      </div>
      {section.slots.map((slot) => (
        <Tile key={slot.id} slot={slot} {...(variant ? { variant } : {})} hideLabel={hideLabels ?? false} />
      ))}
    </div>
  );
}

/** Die Themen-Reiter (vorläufig). Welcher Reiter gewählt ist, ist reine Darstellung. */
function Themes({ themes }: { themes: readonly CardSectionView[] }) {
  const [tab, setTab] = useState(themes[0]!.id);
  const current = themes.find((t) => t.id === tab) ?? themes[0]!;
  return (
    <div className="themes">
      <span className="section-title" style={{ fontSize: 11 }}>
        Themen (vorläufig)
      </span>
      <div className="tabs" role="tablist" aria-label="Thema">
        {themes.map((theme) => {
          const picked = theme.slots.filter((s) => s.picked).length;
          return (
            <button
              key={theme.id}
              type="button"
              role="tab"
              id={`tab-${theme.id}`}
              aria-selected={theme.id === current.id}
              aria-controls="theme-panel"
              onClick={() => setTab(theme.id)}
            >
              {picked ? `${theme.name} · ${picked}` : theme.name}
            </button>
          );
        })}
      </div>
      <div className="card-stack" role="tabpanel" id="theme-panel" aria-labelledby={`tab-${current.id}`}>
        {current.slots.map((slot) => (
          <Tile key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}
