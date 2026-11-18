import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CardSectionView, CardView } from '../../controller';
import { answerText, cardSelectionText, isYesAnswer, mapShort, mapText, nameText, pairText, scatterText } from '../format';
import { useGame } from '../game-context';
import { animated, haptic } from '../haptics';
import { CheckIcon, CloseIcon, Emblem, FlagIcon, PlusIcon, SenseIcon } from '../icons';
import { BellCurve, MapIconSvg, ScatterRose } from './CardRollIcons';

type SlotView = CardSectionView['slots'][number];

/** So lange fliegt die Karte herein und dreht sich um; passt zu `card-draw` in styles.css. */
const DRAW_MS = 750;

/** So lange, bis auch das letzte Feld erschienen ist (Themen-Tafeln eingeschlossen); passt zu `tile-in`. */
const REVEAL_MS = 1150;

/** So lange fliegt die Karte hinaus, bevor sie verworfen oder übernommen ist; passt zu `sheet-toss` und `sheet-sink`. */
const LEAVE_MS = 260;

/**
 * Die offene Inspirationskarte im Vordergrund. Oben das Fragefeld, dann das Orakelfeld (je Stufe die
 * Antwort; man tippt die Stufe an, die zur Frage passt), darunter Aufbau nach der GMA2e-Karte und die
 * Themen-Tafeln. Ein Paar steht in einem Feld. Die Karte passt auf einen Bildschirm: Reicht der Platz
 * nicht, werden Themen-Tafeln von unten her zu ganzzeiligen Knöpfen, die beim Antippen aufklappen.
 * Die Frage während des Tippens ist reine Darstellung; übergeben wird sie beim Bestätigen.
 *
 * Animation (reine Darstellung), so inszeniert wie der Würfelwurf: Die Karte fliegt mit dem Rücken
 * nach oben von unten herein, wo „Karte ziehen“ sitzt, schwebt kurz mit rotem Glimmen und dreht sich
 * dann mit Schwung um, Themen-Tafeln eingeschlossen. Ein Lichtreflex läuft über die Vorderseite, die
 * Felder erscheinen der Reihe nach. „Neu ziehen“ spielt das mit einer neuen Karte. Übernehmen lässt
 * die Karte nach unten in den Log sinken, Verwerfen wirft sie zur Seite weg. Ein Tippen, solange sie
 * noch hereinkommt, beendet die Animation und zeigt sofort die ganze Karte, ohne etwas auszuwählen.
 *
 * Mit `onConfirm` (aus dem Feld Notiz des Charakter-Editors gezogen, `card.forNote`) übernimmt „Bestätigen“ nicht in den
 * Log, sondern gibt die Auswahl als Text weiter; die Karte schließt ohne Logeintrag.
 */
export function CardSheet({ card, onConfirm }: { card: CardView; onConfirm?: (text: string) => void }) {
  const game = useGame();
  // Zählt die Ziehungen, damit jede neue Karte ihre Drehung von vorn spielt.
  const [draw, setDraw] = useState(0);
  // Solange die Karte hereinfliegt, schneidet der Kartenbereich ab, statt kurz zu scrollen.
  const [drawing, setDrawing] = useState(animated);
  // Solange die Felder noch erscheinen, beendet ein Tippen die Animation, statt etwas auszuwählen.
  const [revealing, setRevealing] = useState(animated);
  const [skipped, setSkipped] = useState(false);
  const [leaving, setLeaving] = useState<'confirm' | 'discard' | undefined>(undefined);
  const [question, setQuestion] = useState(card.question ?? '');
  // Welche Themen-Tafeln als Knopf stehen und welche man zuletzt aufgeklappt hat; reine Anzeige.
  const [collapsed, setCollapsed] = useState<readonly number[]>([]);
  const [open, setOpen] = useState<number | undefined>(undefined);
  const body = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const done = setTimeout(() => setDrawing(false), DRAW_MS);
    // Danach sind alle Animationen ohnehin am Ende; ohne `skip-animation` darf die Karte wieder normal hinausfliegen.
    const revealed = setTimeout(() => {
      setRevealing(false);
      setSkipped(false);
    }, REVEAL_MS);
    return () => {
      clearTimeout(done);
      clearTimeout(revealed);
    };
  }, [draw]);

  /** Erst hinausfliegen, dann die Eingabe an den Controller; doppeltes Tippen zählt einmal. */
  const leave = (how: 'confirm' | 'discard', then: () => void) => {
    if (leaving) return;
    if (!animated()) return then();
    setLeaving(how);
    timer.current = setTimeout(then, LEAVE_MS);
  };
  const cardSections = card.sections.filter((s) => s.kind === 'card');
  const themes = card.sections.filter((s) => s.kind === 'theme');
  const boxCount = boxed(themes).length;
  // Erscheint das Band des Zufallsereignisses, wird die Karte höher und wird neu eingepasst.
  // Angepasst beim Zeichnen, wie React es für abgeleiteten Zustand empfiehlt, nicht in einem Effekt.
  const event = card.oracle.event !== undefined;
  const [shownEvent, setShownEvent] = useState(event);
  if (shownEvent !== event) {
    setShownEvent(event);
    setCollapsed([]);
  }

  // Passt die Karte nicht, wird die unterste offene Tafel zum Knopf, bis sie passt oder keine mehr
  // übrig ist; die zuletzt aufgeklappte bleibt offen. Ändert sich das Fenster, wird neu eingepasst.
  // Gemessen wird die Höhe im Layout (offsetHeight), nicht die Scrollhöhe: Die fliegende Karte ist
  // während der Animation verschoben und gedreht, das zählt dort mit.
  useLayoutEffect(() => {
    const el = body.current;
    const content = el?.querySelector<HTMLElement>('.card-flip');
    if (!el || !content) return;
    const room = el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom);
    if (content.offsetHeight <= room + 1) return;
    for (let i = boxCount - 1; i >= 0; i--) {
      if (i !== open && !collapsed.includes(i)) {
        setCollapsed([...collapsed, i]);
        return;
      }
    }
  }, [collapsed, open, draw, boxCount]);
  useEffect(() => {
    const refit = () => setCollapsed([]);
    window.addEventListener('resize', refit);
    return () => window.removeEventListener('resize', refit);
  }, []);
  const section = (id: string) => cardSections.find((s) => s.id === id);
  const known = ['event', 'senses', 'scene', 'belongings', 'situation', 'traits', 'flavor'];

  return (
    <div
      className={[leaving ? `overlay leaving ${leaving}` : 'overlay', skipped ? 'skip-animation' : ''].filter(Boolean).join(' ')}
      onClickCapture={(e) => {
        if (!revealing) return;
        e.stopPropagation();
        e.preventDefault();
        setRevealing(false);
        setDrawing(false);
        setSkipped(true);
      }}
    >
      <section className="sheet card-sheet" role="dialog" aria-modal="true" aria-labelledby="card-title">
        <h2 id="card-title" className="visually-hidden">
          Inspirationskarte
        </h2>
        <div className="card-question">
          <label htmlFor="card-question" className="visually-hidden">
            Frage an die Karte
          </label>
          {/* Ein einzeiliges Textfeld statt <input>: Chrome auf Android zeigt bei <input> trotz
              autoComplete="off" die Autofill-Leiste (Passwort, Karte, Adresse) statt Wortvorschlägen.
              Enter (✓ auf der Tastatur) fügt keine Zeile ein, sondern schließt die Tastatur. */}
          <textarea
            id="card-question"
            rows={1}
            value={question}
            placeholder="Frage an die Karte (freiwillig)"
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setQuestion(e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              e.currentTarget.blur();
            }}
          />
        </div>
        <div ref={body} className={drawing ? 'sheet-body drawing' : 'sheet-body'}>
          <div key={draw} className="card-flip">
            <div className="card-front">
              <article className="card" aria-label="Karte">
                {card.oracle.event && (
                  <p className="card-event" role="status">
                    <b>Zufallsereignis: {card.oracle.event.name}</b>
                    {card.oracle.event.thread && (
                      <span className="card-thread">
                        <FlagIcon />
                        {card.oracle.event.thread.title}
                      </span>
                    )}
                    <span>{card.oracle.event.text}</span>
                  </p>
                )}
                <Oracle card={card} />
                <Stack section={section('event')} variant={card.oracle.event ? 'event' : undefined} />
                <Senses section={section('senses')} />
                <Rolls card={card} />
                <Stack section={section('scene')} />
                {section('belongings') || section('situation') ? (
                  <div className="card-columns">
                    <div className="card-stack">
                      <Banded section={section('belongings')} hideLabels />
                      <Banded section={section('situation')} />
                    </div>
                    <div className="card-stack">
                      <Banded section={section('traits')} />
                    </div>
                  </div>
                ) : (
                  <Banded section={section('traits')} />
                )}
                <Stack section={section('flavor')} variant="flavor" hideLabels />
                {cardSections
                  .filter((s) => !known.includes(s.id))
                  .map((s) => (
                    <Banded key={s.id} section={s} />
                  ))}
              </article>
              {themes.length > 0 && (
                <Themes
                  themes={themes}
                  collapsed={collapsed}
                  onOpen={(i) => {
                    haptic('pick');
                    setOpen(i);
                    setCollapsed([]);
                  }}
                />
              )}
            </div>
            <div className="card-back" aria-hidden="true">
              <span className="card-back-frame" />
              <Emblem className="card-back-mark" />
              <span className="card-back-title">Inspiration</span>
            </div>
          </div>
        </div>
        <div className="sheet-foot">
          <button
            type="button"
            className="ghost square"
            data-escape
            aria-label="Karte verwerfen"
            onClick={() => {
              haptic('discard');
              leave('discard', () => game.discardCard());
            }}
          >
            <CloseIcon />
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              haptic('draw');
              game.redrawCard();
              setDraw((d) => d + 1);
              setOpen(undefined);
              setCollapsed([]);
              setDrawing(animated());
              setRevealing(animated());
              setSkipped(false);
            }}
          >
            Neu ziehen
          </button>
          <span className="count" aria-live="polite">
            {card.pickedCount === 0 ? 'Nichts ausgewählt' : `${card.pickedCount} ausgewählt`}
          </span>
          <button
            type="button"
            className="confirm"
            disabled={!card.canConfirm}
            aria-label={`${card.pickedCount} ${card.pickedCount === 1 ? 'Eintrag' : 'Einträge'} ${onConfirm ? 'in die Notiz' : 'in den Log'} übernehmen`}
            onClick={() => {
              haptic('confirm');
              if (onConfirm) {
                const text = cardSelectionText(card);
                leave('confirm', () => {
                  onConfirm(text);
                  game.discardCard();
                });
              } else {
                leave('confirm', () => game.confirmCard(question));
              }
            }}
          >
            <CheckIcon />
          </button>
        </div>
      </section>
    </div>
  );
}

/**
 * Das Orakelfeld: ein Wurf 1–100, je Stufe die Antwort (Ja!, Ja, Ja?, Nein?, Nein, Nein!). Man tippt
 * die Stufe an, die zur Frage passt; höchstens eine, noch einmal tippen nimmt sie heraus.
 */
function Oracle({ card }: { card: CardView }) {
  const game = useGame();
  return (
    <div className="card-grid cols-3 card-oracle" role="group" aria-label={`Orakel, W100 ${card.oracle.roll}`}>
      {card.oracle.choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          className="tile oracle-choice"
          aria-pressed={choice.picked}
          aria-label={`${choice.name}, ${choice.chance} %: ${answerText[choice.answer]}`}
          onClick={() => {
            haptic(choice.picked ? 'unpick' : 'pick');
            game.toggleOdds(choice.id);
          }}
        >
          <span className="tile-label">
            {choice.name} · {choice.chance} %
          </span>
          <span className={isYesAnswer(choice.answer) ? 'oracle-answer' : 'oracle-answer negative'}>{answerText[choice.answer]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Die Wurffelder unter den Sinneseindrücken: Glockenzahl 1–10, Streuwürfel und Kartensymbol. Antippen
 * wählt aus wie bei einem Feld.
 */
function Rolls({ card }: { card: CardView }) {
  const game = useGame();
  // Bild links, Beschriftung und Wert rechts daneben: So bleibt die Reihe niedrig.
  const tile = (roll: 'bell' | 'scatter' | 'map', picked: boolean, label: string, ariaLabel: string, visual: ReactNode, caption: ReactNode) => (
    <button
      type="button"
      className={`tile card-roll ${roll}`}
      aria-pressed={picked}
      aria-label={ariaLabel}
      onClick={() => {
        haptic(picked ? 'unpick' : 'pick');
        game.toggleRoll(roll);
      }}
    >
      {visual}
      <span className="roll-text">
        <span className="tile-label">{label}</span>
        <span className="roll-caption">{caption}</span>
      </span>
    </button>
  );
  return (
    <div className="card-grid cols-3 card-rolls" role="group" aria-label="Wurffelder">
      {tile(
        'bell',
        card.bell.picked,
        '1–10',
        `1–10: ${card.bell.value}`,
        <span className="bell-number">{card.bell.value}</span>,
        <BellCurve value={card.bell.value} weights={card.bell.weights} />,
      )}
      {tile('scatter', card.scatter.picked, 'Streuwürfel', `Streuwürfel: ${scatterText[card.scatter.value]}`, <ScatterRose value={card.scatter.value} />, scatterText[card.scatter.value])}
      {tile('map', card.map.picked, 'Wege', `Kartensymbol: ${mapText(card.map.value)}`, <MapIconSvg map={card.map.value} />, mapShort(card.map.value))}
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
      aria-label={hideLabel || variant === 'sense' ? `${slot.label}: ${variant === 'name' ? nameText(slot.texts) : pairText(slot.texts)}` : undefined}
      onClick={() => {
        haptic(slot.picked ? 'unpick' : 'pick');
        game.togglePick(slot.id);
      }}
    >
      {variant === 'sense' && <SenseIcon sense={sense} />}
      {!hideLabel && variant !== 'sense' && <span className="tile-label">{slot.label}</span>}
      <span className="tile-text">
        {variant === 'name' ? (
          <span className="tile-line">{nameText(slot.texts)}</span>
        ) : (
          slot.texts.map((text, i) => (
            <span key={i} className="tile-line">
              {text}
            </span>
          ))
        )}
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

function Stack({ section, variant, hideLabels }: { section: CardSectionView | undefined; variant?: 'flavor' | 'event' | undefined; hideLabels?: boolean }) {
  if (!section) return null;
  // Beim Zufallsereignis leuchtet das Feld Zufallsereignis; die Felder selbst bleiben gewöhnlich.
  const tileVariant = variant === 'flavor' ? { variant } : {};
  return (
    <div className={variant === 'event' ? `${layout(section.slots)} event-hit` : layout(section.slots)} role="group" aria-label={section.name}>
      {section.slots.map((slot) => (
        <Tile key={slot.id} slot={slot} {...tileVariant} hideLabel={hideLabels ?? false} />
      ))}
    </div>
  );
}

function Banded({ section, variant, hideLabels, wide = false }: { section: CardSectionView | undefined; variant?: 'name'; hideLabels?: boolean; wide?: boolean }) {
  if (!section) return null;
  const tiles = section.slots.map((slot) => <Tile key={slot.id} slot={slot} {...(variant ? { variant } : {})} hideLabel={hideLabels ?? false} />);
  // Über die volle Breite eine knappe Zeile ohne Band, damit die ganze Karte auf einen Bildschirm passt.
  if (wide) {
    return (
      <div className={`card-grid cols-${columns(section.slots)} wide-band`} role="group" aria-label={section.name}>
        {tiles}
      </div>
    );
  }
  return (
    <div className="card-stack" role="group" aria-label={section.name}>
      <div className="card-band" aria-hidden="true">
        {section.name}
      </div>
      {tiles}
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
function Themes({ themes, collapsed, onOpen }: { themes: readonly CardSectionView[]; collapsed: readonly number[]; onOpen: (box: number) => void }) {
  return (
    <div className="themes">
      {boxed(themes).map((group, i) => {
        if (collapsed.includes(i)) {
          const picked = group.reduce((n, theme) => n + theme.slots.filter((slot) => slot.picked).length, 0);
          return (
            <button key={group[0]!.id} type="button" className="theme-button" style={{ '--deal': i } as CSSProperties} aria-expanded={false} onClick={() => onOpen(i)}>
              <span className="theme-button-title">{group.map((theme) => theme.name).join(' · ')}</span>
              {picked > 0 && <span className="theme-button-count">{picked} gewählt</span>}
              <PlusIcon />
            </button>
          );
        }
        return (
        <div key={group[0]!.id} className="card theme-box" style={{ '--deal': i } as CSSProperties}>
          {group.map((theme) => (
            <section key={theme.id} className={`theme span-${columns(theme.slots.filter((slot) => !slot.name))}`} aria-labelledby={`theme-${theme.id}`}>
              <h3 id={`theme-${theme.id}`} className="theme-title">
                {theme.name}
              </h3>
              {theme.slots.some((slot) => slot.name) && (
                // Die Namen knapp nebeneinander, am Stück zu lesen: oben irdisch, unten spacig.
                <div className="card-grid cols-3 wide-band theme-names" role="group" aria-label="Namen">
                  {theme.slots
                    .filter((slot) => slot.name)
                    .map((slot) => (
                      <Tile key={slot.id} slot={slot} variant="name" hideLabel />
                    ))}
                </div>
              )}
              <div className={layout(theme.slots.filter((slot) => !slot.name))} role="group" aria-label={theme.name}>
                {theme.slots
                  .filter((slot) => !slot.name)
                  .map((slot) => (
                    <Tile key={slot.id} slot={slot} />
                  ))}
              </div>
            </section>
          ))}
        </div>
        );
      })}
    </div>
  );
}
