import { useState } from 'react';
import type { ShipCheckView } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { useGame } from '../game-context';
import { HoldButton } from '../HoldButton';

/**
 * Der Dialog der Begegnungsprüfung (2026-11-22b): vor dem Wurf Spalte, DM und Zielwert mit „Würfeln“
 * und „Abbrechen“ (nur lang gedrückt: der Wurf fällt aus); danach rollen die Würfel, und es steht da,
 * was kam. Bei einer Sichtung fragt er „Zur Raumkarte“ oder „Weiter“. Ein Tippen überspringt die Animation.
 */
export function ShipCheckDialog({ check }: { check: ShipCheckView }) {
  const game = useGame();
  const thrown = check.dice !== undefined;
  const [phase, skip] = useTimeline(thrown ? [200, THROW_MS, 250] : [0, 0, 0]);
  const landed = !thrown || phase >= 2;
  // Ein kurzes Tippen auf „Abbrechen“ hebt nur den Hinweis hervor, dass man lange drücken muss.
  const [nudged, setNudged] = useState(false);
  return (
    <div className="modal">
      <section className="result trip-roll encounter-roll ship-check" role="dialog" aria-modal="true" aria-labelledby="ship-check-title" onClick={() => thrown && phase < 3 && skip(3)}>
        <span className="kicker">{check.kicker}</span>
        <h2 id="ship-check-title" className="shop-buy-title">
          {check.title}
        </h2>
        <p className="ship-check-target">
          Spalte {check.column}
          {check.dmParts.length > 0 ? ` · ${check.dmParts.join(', ')}` : ''} · Schiff bei <strong>{check.target}</strong>
        </p>
        {thrown && (phase >= 1 ? <DiceView dice={check.dice!} seed={(check.total ?? 0) * 13 + check.dm} landed={landed} /> : <div className="dice-stage large" aria-hidden="true" />)}
        {thrown && (
          <p className={landed ? 'surprise-verdict shown' : 'surprise-verdict'} aria-live="polite">
            {landed ? `${check.total}${check.dm ? ` (mit DM +${check.dm})` : ''} · ${check.text}` : ''}
          </p>
        )}
        {check.phase === 'ready' && (
          <div className="encounter-choice-actions">
            <HoldButton className="ghost" onPress={() => setNudged(true)} onHold={() => game.skipShipCheck()} label="Abbrechen" hint={check.skip} title={check.skip}>
              Abbrechen
            </HoldButton>
            <button type="button" className="primary" onClick={() => game.rollShipCheck()}>
              Würfeln
            </button>
          </div>
        )}
        {check.phase === 'ready' && (
          <p className={nudged ? 'small-label ship-check-nudge' : 'small-label'} role={nudged ? 'status' : undefined}>
            {check.skip}
          </p>
        )}
        {landed && check.phase === 'sighting' && (
          <div className="encounter-choice-actions">
            <button type="button" className="ghost" onClick={() => game.answerSighting(false)}>
              {check.next}
            </button>
            <button type="button" className="primary" onClick={() => game.answerSighting(true)}>
              Zur Raumkarte
            </button>
          </div>
        )}
        {landed && check.phase === 'rolled' && (
          <button type="button" className="primary" onClick={() => game.closeShipCheck()}>
            {check.next}
          </button>
        )}
      </section>
    </div>
  );
}
