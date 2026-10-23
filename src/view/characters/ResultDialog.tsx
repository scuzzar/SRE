import { useEffect, useRef } from 'react';
import type { TaskItem } from '../../controller';
import { partLabel, taskDetail, taskTitle } from '../format';
import { useGame } from '../game-context';

/** Das Ergebnis einer Probe als Popup. Danach geht es zurück zum Orakel; geloggt ist es schon. */
export function ResultDialog({ result }: { result: TaskItem }) {
  const game = useGame();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);

  return (
    <div className="modal">
      <section className="result" role="alertdialog" aria-modal="true" aria-labelledby="result-title" aria-describedby="result-detail">
        <span className="kicker">Probe</span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{taskTitle(result)}</span>
        <h2 id="result-title" className={result.success ? undefined : 'verdict negative'}>
          {result.success ? 'ERFOLG' : 'FEHLSCHLAG'}
        </h2>
        <span id="result-detail" className="mono muted" style={{ fontSize: 14 }}>
          {taskDetail(result)}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {result.parts.map(partLabel).join(', ')}
        </span>
        <button ref={close} type="button" className="primary" style={{ marginTop: 8 }} onClick={() => game.closeResult()}>
          Weiter zum Orakel
        </button>
      </section>
    </div>
  );
}
