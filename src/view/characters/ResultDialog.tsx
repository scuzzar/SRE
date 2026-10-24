import { useEffect, useRef } from 'react';
import type { TaskItem } from '../../controller';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import { partLabel, signed, taskDetail, taskTitle } from '../format';
import { useGame } from '../game-context';
import { haptic, stopHaptics } from '../haptics';

/**
 * Das Ergebnis einer Probe als Popup. Danach geht es zurück zum Orakel; geloggt ist es schon.
 *
 * Wie in Baldur's Gate 3 steht der Zielwert oben, darunter rollen die Würfel; dann kommt der DM
 * dazu, und zuletzt fällt das Urteil. Alles steht von Anfang an im Dokument (für Screenreader und
 * Tests), die Animation blendet es nur nacheinander ein. Ein Tippen springt zum Urteil.
 */
export function ResultDialog({ result }: { result: TaskItem }) {
  const game = useGame();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);

  // Werfen, Augen zeigen, DM dazu, Urteil.
  const [phase, skip] = useTimeline([THROW_MS, result.dm === 0 ? 250 : 380, result.dm === 0 ? 0 : 420]);
  const VERDICT = 3;

  useEffect(() => {
    if (phase === 2 && result.dm !== 0) haptic('add');
    if (phase === VERDICT) haptic(result.success ? 'success' : 'failure');
  }, [phase, result.dm, result.success]);

  const [a, b] = result.dice;
  const shown = phase >= 2 ? result.total : a + b;
  const verdict = phase >= VERDICT ? (result.success ? ' success' : ' failure') : '';

  return (
    <div className="modal">
      <section
        className={`result roll-result phase-${Math.min(phase, VERDICT)}${verdict}`}
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
        <span className="kicker">Probe</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{taskTitle(result)}</span>
        <div className="roll-target" aria-hidden="true">
          <span>Zielwert</span>
          <strong>{result.target}+</strong>
        </div>
        <DicePairView dice={result.dice} seed={result.dice[0] * 7 + result.dice[1]} landed={phase >= 1} size="small" />
        <div className="roll-sum" aria-hidden="true">
          <strong key={shown} className="roll-total">
            {shown}
          </strong>
          {result.dm !== 0 && <span className="roll-dm">DM {signed(result.dm)}</span>}
        </div>
        <h2 id="result-title" className={result.success ? 'roll-verdict' : 'roll-verdict negative'}>
          {result.success ? 'ERFOLG' : 'FEHLSCHLAG'}
        </h2>
        <div className="roll-after">
          <span id="result-detail" className="mono muted" style={{ fontSize: 14 }}>
            {taskDetail(result)}
          </span>
          <span className="muted" style={{ fontSize: 13 }}>
            {result.parts.map(partLabel).join(', ')}
          </span>
          <button ref={close} type="button" className="primary" style={{ marginTop: 8 }} onClick={() => game.closeResult()}>
            Weiter zum Orakel
          </button>
        </div>
      </section>
    </div>
  );
}
