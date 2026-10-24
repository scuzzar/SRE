import type { CardSectionView, CardView } from '../../controller';
import { pairText, quoted } from '../format';
import { useGame } from '../game-context';
import { CheckIcon, CloseIcon, SenseIcon } from '../icons';

type SlotView = CardSectionView['slots'][number];

/** Die offene Inspirationskarte im Vordergrund. Aufbau nach der GMA2e-Karte, darunter die Themen-Tafeln. Ein Paar steht in einem Feld. */
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
            <span className="kicker">Frage</span> <span style={{ fontWeight: 600 }}>{quoted(card.question)}</span>
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
      <span className="tile-text">
        {slot.texts.map((text, i) => (
          <span key={i} className="tile-line">
            {text}
          </span>
        ))}
      </span>
    </button>
  );
}

/**
 * Wie viele Felder mit Paaren nebeneinanderstehen: drei je Reihe, zwei und vier zu zweit, damit keine
 * Reihe halb leer bleibt, ein einzelnes allein.
 */
function columns(slots: readonly SlotView[]): 1 | 2 | 3 {
  if (slots.length === 1) return 1;
  return slots.length === 2 || slots.length === 4 ? 2 : 3;
}

/** Felder mit Paaren stehen nebeneinander, jeder Begriff in einer eigenen Zeile; das spart Platz. */
function layout(slots: readonly SlotView[]): string {
  if (!slots.every((slot) => slot.texts.length > 1)) return 'card-stack';
  return `card-grid cols-${columns(slots)}`;
}

function Senses({ section }: { section: CardSectionView | undefined }) {
  if (!section) return null;
  return (
    <div className={layout(section.slots)} role="group" aria-label={section.name}>
      {section.slots.map((slot) => (
        <Tile key={slot.id} slot={slot} variant="sense" />
      ))}
    </div>
  );
}

function Stack({ section, variant, hideLabels }: { section: CardSectionView | undefined; variant?: 'flavor'; hideLabels?: boolean }) {
  if (!section) return null;
  return (
    <div className={layout(section.slots)} role="group" aria-label={section.name}>
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

/** Welche Themen-Tafeln sich einen Kasten teilen. Eine Tafel, die hier fehlt, bekommt einen eigenen. */
const boxes: readonly (readonly string[])[] = [['npc', 'npc-actions'], ['world', 'creatures'], ['plot']];

function boxed(themes: readonly CardSectionView[]): CardSectionView[][] {
  const grouped = boxes.map((ids) => themes.filter((t) => ids.includes(t.id))).filter((group) => group.length > 0);
  const rest = themes.filter((t) => !boxes.some((ids) => ids.includes(t.id))).map((t) => [t]);
  return [...grouped, ...rest];
}

/**
 * Die Themen-Tafeln (vorläufig), alle mit Überschrift auf einmal, damit die ganze Karte auf einen
 * Bildschirm passt. Verwandte Tafeln stehen in einem Kasten wie die Karte oben (NSC mit NSC-Aktionen,
 * Welt mit Wesen). Eine Tafel ist so breit, wie sie Felder nebeneinander hat; kleine Tafeln teilen
 * sich so eine Reihe.
 */
function Themes({ themes }: { themes: readonly CardSectionView[] }) {
  return (
    <div className="themes">
      {boxed(themes).map((group) => (
        <div key={group[0]!.id} className="card theme-box">
          {group.map((theme) => (
            <section key={theme.id} className={`theme span-${columns(theme.slots)}`} aria-labelledby={`theme-${theme.id}`}>
              <h3 id={`theme-${theme.id}`} className="theme-title">
                {theme.name}
              </h3>
              <div className={layout(theme.slots)} role="group" aria-label={theme.name}>
                {theme.slots.map((slot) => (
                  <Tile key={slot.id} slot={slot} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
