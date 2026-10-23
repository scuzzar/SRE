/** Eine Eingabe verletzt eine Regel des Domänenmodells. Die Meldung ist für den Spieler lesbar. */
export class DomainError extends Error {
  override name = 'DomainError';
}
