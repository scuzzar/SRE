import { useEffect, useRef } from 'react';
import { useGame } from './game-context';
import { CloseIcon } from './icons';

/**
 * Die App ist schon in einem anderen Fenster offen: Damit sich die Fenster nicht gegenseitig
 * überschreiben, speichert nur eines. Dieses Fenster steht still, bis der Spieler hier weiterspielt.
 */
export function ElsewhereDialog() {
  const game = useGame();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <div className="modal elsewhere">
      <section className="result" role="alertdialog" aria-modal="true" aria-labelledby="elsewhere-title" aria-describedby="elsewhere-text">
        <h2 id="elsewhere-title">In einem anderen Fenster offen</h2>
        <p id="elsewhere-text">
          Die App läuft schon in einem anderen Fenster oder Tab. Damit sich die beiden nicht gegenseitig den Spielstand überschreiben, speichert nur eines. Hier weiterspielen lädt den Spielstand neu; das andere Fenster speichert dann nichts mehr.
        </p>
        <button ref={button} type="button" className="primary" onClick={() => void game.takeOver()}>
          Hier weiterspielen
        </button>
      </section>
    </div>
  );
}

/** Was nach einer Eingabe nicht ging, oben als Hinweis; ✕ nimmt ihn weg. */
export function NoticeToast({ text }: { text: string }) {
  const game = useGame();
  return (
    <div className="notice-toast" role="alert">
      <span>{text}</span>
      <button type="button" className="icon-button" aria-label="Hinweis schließen" onClick={() => game.closeNotice()}>
        <CloseIcon />
      </button>
    </div>
  );
}
