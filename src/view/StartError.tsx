import { Component, type ReactNode } from 'react';

/** Was die Fehlerseite zum Sichern braucht: die rohen Spielstände als Datei anbieten. */
export interface StartErrorActions {
  readonly saveRaw: () => void;
}

/**
 * Die Fehlerseite statt eines schwarzen Bildschirms: Startet die App nicht oder bricht sie beim
 * Zeichnen ab, steht hier die Meldung, und die Spielstände lassen sich roh als Datei sichern.
 */
export function StartError({ error, actions }: { error: unknown; actions: StartErrorActions }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? '') : '';
  return (
    <div className="start-error" role="alert">
      <h1>Die App konnte nicht starten</h1>
      <p>Deine Spielstände sind nicht verloren. Sichere sie mit dem Knopf als Datei und schick die Meldung unten mit.</p>
      <button type="button" className="primary" onClick={actions.saveRaw}>
        Spielstände roh sichern
      </button>
      <button type="button" className="ghost" onClick={() => location.reload()}>
        Neu laden
      </button>
      <pre>
        {message}
        {'\n\n'}
        {stack}
      </pre>
    </div>
  );
}

/** Fängt Fehler beim Zeichnen ab und zeigt die Fehlerseite. */
export class RenderGuard extends Component<{ actions: StartErrorActions; children: ReactNode }, { error: unknown }> {
  override state: { error: unknown } = { error: undefined };

  static getDerivedStateFromError(error: unknown): { error: unknown } {
    return { error: error ?? 'Unbekannter Fehler' };
  }

  override render(): ReactNode {
    return this.state.error === undefined ? this.props.children : <StartError error={this.state.error} actions={this.props.actions} />;
  }
}
