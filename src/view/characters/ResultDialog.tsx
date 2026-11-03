import { useEffect, useRef } from 'react';
import type { AttackItem, DmPart, TaskItem } from '../../controller';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import { armorText, characteristicLabel, partLabel, rangeText, rollTitle, signed, skillTitle, taskDetail } from '../format';
import { useGame } from '../game-context';
import { haptic, stopHaptics } from '../haptics';

/**
 * Das Ergebnis einer Probe oder eines Angriffs als Popup; geloggt ist es schon und steht nach „Weiter“ im Log darunter.
 *
 * Wie in Baldur's Gate 3 erscheint zuerst der Zielwert, dann rollen die Würfel; dann kommen die
 * Fertigkeit und jedes gewählte Attribut einzeln mit Namen dazu, und zuletzt fällt das Urteil. Alles steht von Anfang an im Dokument (für Screenreader und
 * Tests), die Animation blendet es nur nacheinander ein. Ein Tippen springt zum Urteil.
 */
export function ResultDialog({ result }: { result: TaskItem | AttackItem }) {
  const game = useGame();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);

  // Zielwert zeigen, werfen, Augen zeigen, dann je Teil des DM ein Schritt (erst die Fertigkeit, dann
  // die Attribute), Urteil.
  const parts = result.parts;
  const [phase, skip] = useTimeline([500, THROW_MS, 350, ...parts.map(() => 380)]);
  const THROWN = 1;
  const LANDED = 2;
  const added = Math.max(0, Math.min(phase - LANDED, parts.length));
  const VERDICT = parts.length + 3;

  useEffect(() => {
    if (phase === THROWN) haptic('shake');
    if (phase > LANDED && phase < VERDICT) haptic('add');
    if (phase === VERDICT) haptic(result.success ? 'success' : 'failure');
  }, [phase, VERDICT, result.success]);

  const [a, b] = result.dice;
  // Die Zwischensummen sind nur Anzeige; am Ende steht die Summe, die das Model ausgerechnet hat.
  const shown = added === parts.length ? result.total : parts.slice(0, added).reduce((sum, part) => sum + part.dm, a + b);
  const state = phase < LANDED ? ' rolling' : phase >= VERDICT ? (result.success ? ' judged success' : ' judged failure') : '';

  return (
    <div className="modal">
      <section
        className={`result roll-result${state}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-detail"
        onClick={() => {
          if (phase >= VERDICT) return;
          stopHaptics();
          skip(VERDICT);
        }}
      >
        <span className="kicker">{result.kind === 'attack' ? 'Angriff' : 'Probe'}</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{rollTitle(result)}</span>
        <div className="roll-target" aria-hidden="true">
          <span>Zielwert</span>
          <strong>{result.target}+</strong>
        </div>
        {phase >= THROWN ? (
          <DicePairView dice={result.dice} seed={result.dice[0] * 7 + result.dice[1]} landed={phase >= LANDED} size="small" />
        ) : (
          <div className="dice-stage small" aria-hidden="true" />
        )}
        <div className="roll-sum" aria-hidden="true">
          <strong key={shown} className="roll-total">
            {shown}
          </strong>
        </div>
        <ol className="roll-parts" aria-hidden="true">
          {parts.map((part, i) => (
            <li key={i} className={i < added ? (i === added - 1 && phase < VERDICT ? 'roll-part added latest' : 'roll-part added') : 'roll-part'}>
              {partName(part)} <strong>{signed(part.dm)}</strong>
            </li>
          ))}
        </ol>
        <h2 id="result-title" className={result.success ? 'roll-verdict' : 'roll-verdict negative'}>
          {verdict(result)}
        </h2>
        <div className="roll-after">
          <span id="result-detail" className="mono muted" style={{ fontSize: 14 }}>
            {taskDetail(result)}
          </span>
          {/* Für Screenreader: Die Teile des DM stehen oben schon sichtbar, aber dort nur für das Auge. */}
          <span className="visually-hidden">{result.parts.map(partLabel).join(', ')}</span>
          {result.kind === 'attack' && result.damagePending ? (
            <div className="roll-actions">
              <button ref={close} type="button" className="ghost" onClick={() => game.closeResult()}>
                Weiter
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  haptic('shake');
                  game.rollDamage();
                }}
              >
                Schaden würfeln ({result.wounds}W6)
              </button>
            </div>
          ) : (
            <div className="roll-actions single">
              <button ref={close} type="button" className="primary" onClick={() => game.closeResult()}>
                Weiter
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function verdict(result: TaskItem | AttackItem): string {
  if (result.kind === 'attack') return result.success ? 'TREFFER' : 'DANEBEN';
  return result.success ? 'ERFOLG' : 'FEHLSCHLAG';
}

/** Ein Teil des DM mit Namen, so knapp wie möglich: „Pilot-2“, „ohne Fertigkeit“, „DEX“, „Jack“. */
function partName(part: DmPart): string {
  switch (part.kind) {
    case 'characteristic':
      return characteristicLabel[part.characteristic];
    case 'armor':
      return `gegen ${armorText[part.armor]}`;
    case 'range':
      return `auf ${rangeText[part.range]}`;
    default:
      return skillTitle([part]);
  }
}
