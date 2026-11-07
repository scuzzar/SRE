import { useEffect, useRef } from 'react';
import type { AttackItem, DmPart, TaskItem } from '../../controller';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import { armorText, characteristicLabel, partLabel, rangeText, rollTitle, signed, skillTitle, taskDetail } from '../format';
import { useGame } from '../game-context';
import { haptic, stopHaptics } from '../haptics';

/**
 * Das Ergebnis einer Probe oder eines Angriffs als Popup; geloggt ist es schon und steht nach „Weiter“ im Log darunter.
 *
 * Wie in Baldur's Gate 3 erscheint bei der Probe zuerst der Zielwert, dann rollen die Würfel; dann
 * kommen die Fertigkeit und jedes gewählte Attribut einzeln mit Namen dazu, und zuletzt fällt das
 * Urteil. Beim Angriff steht der nötige Wurf schon in der Tabelle; dort stehen oben gleich die
 * Modifikatoren und der nötige Wurf, dann rollen die Würfel, und das Urteil fällt. Alles steht von
 * Anfang an im Dokument (für Screenreader und Tests), die Animation blendet es nur nacheinander ein.
 * Ein Tippen springt zum Urteil.
 */
export function ResultDialog({ result }: { result: TaskItem | AttackItem }) {
  const game = useGame();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);

  // Zielwert zeigen, werfen, Augen zeigen, bei der Probe dann je Teil des DM ein Schritt (erst die
  // Fertigkeit, dann die Attribute), Urteil. Beim Angriff kommt nichts mehr dazu.
  const attack = result.kind === 'attack';
  const parts = result.parts;
  const steps = attack ? [] : parts;
  const [phase, skip] = useTimeline([500, THROW_MS, 350, ...steps.map(() => 380)]);
  const THROWN = 1;
  const LANDED = 2;
  const added = Math.max(0, Math.min(phase - LANDED, steps.length));
  const VERDICT = steps.length + 3;

  useEffect(() => {
    if (phase === THROWN) haptic('shake');
    if (phase > LANDED && phase < VERDICT) haptic('add');
    if (phase === VERDICT) haptic(result.success ? 'success' : 'failure');
  }, [phase, VERDICT, result.success]);

  const [a, b] = result.dice;
  // Die Zwischensummen sind nur Anzeige; am Ende steht die Summe, die das Model ausgerechnet hat.
  const shown = attack ? a + b : added === parts.length ? result.total : parts.slice(0, added).reduce((sum, part) => sum + part.dm, a + b);
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
        <span className="kicker">{result.kind === 'attack' ? (result.fire === 'burst' ? 'Feuerstoß' : result.fire === 'shotgun' ? 'Schrotschuss' : 'Angriff') : 'Probe'}</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{rollTitle(result)}</span>
        {attack && (
          <ol className="roll-parts" aria-hidden="true">
            {parts.map((part, i) => (
              <li key={i} className="roll-part added">
                {partName(part)} <strong>{signed(part.dm)}</strong>
              </li>
            ))}
          </ol>
        )}
        <div className="roll-target" aria-hidden="true">
          <span>{attack ? 'Braucht' : 'Zielwert'}</span>
          <strong>{result.kind === 'attack' ? Math.max(2, result.need) : result.target}+</strong>
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
        {!attack && (
          <ol className="roll-parts" aria-hidden="true">
            {parts.map((part, i) => (
              <li key={i} className={i < added ? (i === added - 1 && phase < VERDICT ? 'roll-part added latest' : 'roll-part added') : 'roll-part'}>
                {partName(part)} <strong>{signed(part.dm)}</strong>
              </li>
            ))}
          </ol>
        )}
        <h2 id="result-title" className={result.success ? 'roll-verdict' : 'roll-verdict negative'}>
          {verdict(result)}
        </h2>
        {result.kind === 'attack' && result.rest.length > 0 && phase >= VERDICT && <VolleyRolls rest={result.rest} />}
        <div className="roll-after">
          <span id="result-detail" className="mono muted" style={{ fontSize: 14 }}>
            {result.kind === 'attack' ? `2W6: ${a} + ${b} = ${a + b}, braucht ${Math.max(2, result.need)}+` : taskDetail(result)}
          </span>
          {/* Für Screenreader: Die Teile des DM stehen oben schon sichtbar, aber dort nur für das Auge. */}
          <span className="visually-hidden">{result.parts.map(partLabel).join(', ')}</span>
          {result.kind === 'attack' && (result.damagePending || result.volleyPending) ? (
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

/** Die weiteren Würfe einer Garbe: der zweite Wurf auf das Ziel, dann die Nachbarn, jeder mit Würfeln und Urteil. */
export function VolleyRolls({ rest }: { rest: readonly AttackItem[] }) {
  return (
    <ol className="volley-rolls">
      {rest.map((roll, i) => (
        <li key={i} className="volley-roll">
          <span className="volley-who">{roll.neighbour ? `Nachbar ${firstName(roll.victim)}` : `${i + 2}. Wurf ${firstName(roll.victim)}`}</span>
          <span className="volley-dice">
            {roll.dice[0]}+{roll.dice[1]}, braucht {Math.max(2, roll.need)}+
          </span>
          <span className={roll.success ? 'volley-verdict' : 'volley-verdict negative'}>{roll.success ? 'TREFFER' : 'DANEBEN'}</span>
        </li>
      ))}
    </ol>
  );
}

/** Im Popup ist wenig Platz: nur der Vorname. */
function firstName(name: string | undefined): string {
  return name?.split(' ')[0] ?? '';
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
    case 'neighbour':
      return 'Nachbar';
    case 'weakened':
      return 'geschwächt';
    case 'parry':
      return 'Parade';
    default:
      return skillTitle([part]);
  }
}
