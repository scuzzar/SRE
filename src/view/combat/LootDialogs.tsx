import { useState } from 'react';
import type { CombatView, LootPart } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { credits, perKg, signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/**
 * „Beute nehmen“ bei einem NSC bzw. „Ausweiden“ bei einem Tier: zeigt erst, was es gibt und wer
 * arbeitet, dann wählt man, wer die Beute bekommt. Wer sie bekommt, hält nur die View bis zum Tippen.
 */
export function LootDialog({ combat }: { combat: CombatView }) {
  const game = useGame();
  const loot = combat.loot!;
  const [receiver, setReceiver] = useState(loot.receivers[0]?.id ?? '');
  const sale = loot.items.reduce((total, i) => total + (i.sale ?? 0) * i.count, 0);
  return (
    <div className="modal">
      <section className="result loot-dialog" role="dialog" aria-modal="true" aria-labelledby="loot-title">
        <span className="kicker">{loot.animal ? 'Ausweiden' : 'Beute nehmen'}</span>
        <h2 id="loot-title" className="shop-buy-title">
          {loot.name}
        </h2>
        {loot.animal ? (
          <ul className="loot-list">
            <li>
              Fleisch: <b>{loot.meatWorker ?? '–'}</b> <span className="muted">(Steward oder Medical: DM auf den Fleischwürfel)</span>
            </li>
            <li>
              Fell: <b>{loot.furWorker ?? '–'}</b> <span className="muted">(beste Klinge; ohne Stufe 1 nur halbes Fell)</span>
            </li>
          </ul>
        ) : (
          <ul className="loot-list">
            {loot.items.map((item, i) => (
              <li key={i}>
                {item.count > 1 ? `${item.count} × ` : ''}
                {item.label} <span className="muted">{item.sale === undefined ? 'unverkäuflich' : `Verkauf ${credits(item.sale * item.count)}`}</span>
              </li>
            ))}
            {loot.credits > 0 && (
              <li>
                <b>{credits(loot.credits)}</b> <span className="muted">Kredite</span>
              </li>
            )}
            {loot.items.length > 0 && <li className="muted">Ausrüstung zusammen: Verkauf {credits(sale)}</li>}
          </ul>
        )}
        {loot.blocked ? (
          <p className="error">{loot.blocked}</p>
        ) : (
          <label className="field">
            <span>{loot.animal ? 'Die Beute bekommt' : 'Alles nimmt'}</span>
            <select aria-label="Wer die Beute bekommt" value={receiver} onChange={(e) => setReceiver(e.target.value)}>
              {loot.receivers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="encounter-start">
          <button
            type="button"
            className="primary"
            disabled={loot.blocked !== undefined || receiver === ''}
            onClick={() => {
              haptic('shake');
              if (loot.animal) game.butcher(loot.id, receiver);
              else game.takeLoot(loot.id, receiver);
            }}
          >
            {loot.animal ? 'Ausweiden' : 'Nehmen'}
          </button>
          <button data-escape type="button" className="ghost" onClick={() => game.openLoot(undefined)}>
            Abbrechen
          </button>
        </div>
      </section>
    </div>
  );
}

/** Ein Wert mit allen DMs: „Marktwurf 11 · Mountain +2 · Carnivore +3 · Zeile 11 +2 = 18“. */
function valueLine(market: number, parts: readonly LootPart[], total: number): string {
  return [`Marktwurf ${market}`, ...parts.filter((p) => p.dm !== 0).map((p) => `${p.label} ${signed(p.dm)}`)].join(' · ') + ` = ${total}`;
}

/**
 * Das eben gewürfelte Ausweiden, dramatisch Schritt für Schritt: das Tier und ob es essbar ist, der
 * Fleischwürfel rollt mit dem DM dessen, der es macht, dann das Fell mit Klinge, zuletzt der Wert mit
 * jedem DM einzeln und was die Beute in Cr bringt. Ein Tippen überspringt.
 */
export function ButcheredDialog({ combat }: { combat: CombatView }) {
  const game = useGame();
  const b = combat.butchered!;
  const [phase, skip] = useTimeline([400, THROW_MS, 500, 600, 600]);
  const landed = phase >= 2;
  const sum = b.meatDie === undefined ? undefined : Math.min(6, b.meatDie + b.meatSkill);
  return (
    <div className="modal">
      <section className="result butcher-dialog" role="dialog" aria-modal="true" aria-labelledby="butcher-title" onClick={() => phase < 5 && skip(5)}>
        <span className="kicker">Ausweiden · {b.receiver.split(' ')[0]} bekommt die Beute</span>
        <h2 id="butcher-title" className="shop-buy-title">
          {b.animal} <span className="muted">({b.weight} kg)</span>
        </h2>
        <div className="intro-reaction">
          <span className="small-label">Fleisch {b.meatWorker ? `· ${b.meatWorker} ${signed(b.meatSkill)}` : ''}</span>
          {b.edible && b.meatDie !== undefined ? (
            <>
              {phase >= 1 ? <DiceView dice={[b.meatDie]} seed={b.meatDie * 13 + b.weight} landed={landed} size="small" /> : <div className="dice-stage small" aria-hidden="true" />}
              <p className={landed ? 'intro-verdict shown' : 'intro-verdict'}>
                1W6 {b.meatDie} {signed(b.meatSkill)} = {sum} × 5 % → <strong>{b.meat} kg Fleisch</strong>
              </p>
            </>
          ) : (
            <p className="intro-verdict shown">
              <strong>{b.reason}</strong>
            </p>
          )}
        </div>
        <p className={phase >= 3 ? 'intro-line loot-step shown' : 'intro-line loot-step'}>
          Fell {b.furWorker ? `· ${b.furWorker}` : ''}:{' '}
          {b.hasFur ? (
            <strong>
              {b.fur} kg Fell{b.furHalf ? ' (ohne Klinge-1 nur halb)' : ''}
            </strong>
          ) : (
            <strong>keins (gepanzert)</strong>
          )}
        </p>
        <div className={phase >= 4 ? 'loot-step shown' : 'loot-step'}>
          <p className="intro-line">
            Fellwert: {valueLine(b.market, b.furParts, b.furValue)} → {perKg(b.furPerKg)}
          </p>
          <p className="intro-line">
            Fleischwert: {valueLine(b.market, b.meatParts, b.meatValue)} → {perKg(b.meatPerKg)}
          </p>
        </div>
        <p className={phase >= 5 ? 'intro-verdict loot-total shown' : 'intro-verdict loot-total'}>
          Wert <strong>{credits(b.list)}</strong> · Verkauf {credits(b.sale)}
        </p>
        <button
          type="button"
          data-escape
          className="primary"
          onClick={(e) => {
            e.stopPropagation();
            game.closeButchered();
          }}
        >
          Weiter
        </button>
      </section>
    </div>
  );
}
