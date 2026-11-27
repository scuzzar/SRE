import { useState } from 'react';
import type { HoldView } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/**
 * Unterreiter Laderaum im Bereich Schiff (2026-11-27): die Ladungen an Bord, die Fahrgäste und der
 * Postvertrag. „Über Bord“ geht erst beim zweiten Tippen, wie Löschen sonst auch.
 */
export function HoldTab({ hold, error }: { hold: HoldView | undefined; error: string | undefined }) {
  const game = useGame();
  const [arming, setArming] = useState<string | undefined>(undefined);
  if (hold === undefined) return null;
  return (
    <div className="trade-hold">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="trade-hold-sum mono">
        {hold.used.toLocaleString('de-DE')} / {hold.capacity.toLocaleString('de-DE')} t belegt
      </p>
      <h2 className="section-title">Ladungen</h2>
      {hold.lots.length === 0 && <p className="log-empty">Der Laderaum ist leer. Ware gibt es am Markt einer Stadt, Fracht und Botschaften an einer Welt im Subsektor.</p>}
      <ul className="trade-list">
        {hold.lots.map((lot) => (
          <li key={lot.id} className="trade-row">
            <span className="trade-row-main">
              <b>{lot.label}</b>
              <span className="muted">{lot.detail}</span>
            </span>
            <button
              type="button"
              className="ghost compact danger"
              onClick={() => {
                if (arming !== lot.id) return setArming(lot.id);
                haptic('pick');
                setArming(undefined);
                game.jettisonCargo(lot.id);
              }}
            >
              {arming === lot.id ? 'Wirklich?' : 'Über Bord'}
            </button>
          </li>
        ))}
      </ul>
      <h2 className="section-title">Fahrgäste</h2>
      {hold.fares.length === 0 && <p className="log-empty">Keine Fahrgäste an Bord.</p>}
      <ul className="trade-list">
        {hold.fares.map((f) => (
          <li key={f.id} className="trade-row">
            <span className="trade-row-main">
              <b>{f.label}</b>
              <span className="muted">{f.detail} · zahlen bei Ankunft</span>
            </span>
          </li>
        ))}
      </ul>
      <h2 className="section-title">Postvertrag</h2>
      <p className="muted trade-note">5 t Laderaum fest reserviert; je Sprung Cr 25.000, wenn das Schiff bewaffnet ist und ein Gunner auf Posten steht.</p>
      <button type="button" className={hold.mailContract ? 'ghost' : 'primary'} disabled={hold.mailBlocker !== undefined} title={hold.mailBlocker} onClick={() => game.toggleMailContract()}>
        {hold.mailContract ? 'Postvertrag kündigen' : 'Postvertrag schließen'}
      </button>
    </div>
  );
}
