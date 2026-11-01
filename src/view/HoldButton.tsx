import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { haptic } from './haptics';

/** So lange muss man drücken, bis der lange Druck auslöst. */
export const HOLD_MS = 900;

/**
 * Ein Knopf mit zwei Absichten: kurz tippen ist `onPress`, lange drücken ist `onHold`. Während man
 * drückt, füllt er sich von links; erst wenn er voll ist, löst der lange Druck aus, und das folgende
 * Loslassen ist kein Tippen mehr. Lässt man vorher los, ist es ein gewöhnliches Tippen.
 * Reine Darstellung: Was die Absichten bewirken, entscheidet der Controller.
 */
export function HoldButton({
  onPress,
  onHold,
  className = '',
  busy = false,
  label,
  children,
}: {
  onPress: () => void;
  onHold: () => void;
  className?: string;
  /** Während eine Animation läuft: ein Tippen überspringt sie (das fängt die Bühne ab), nicht gesperrt. */
  busy?: boolean;
  /** Für Screenreader, mit dem Hinweis auf den langen Druck. */
  label?: string;
  children: ReactNode;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Nach einem ausgelösten langen Druck gilt das Loslassen nicht als Tippen.
  const held = useRef(false);

  const stop = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`${className} hold-button${holding ? ' holding' : ''}`}
      aria-disabled={busy || undefined}
      aria-label={label}
      aria-description="Lange drücken: alles durchlaufen lassen"
      style={{ '--hold-ms': `${HOLD_MS}ms` } as CSSProperties}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        held.current = false;
        setHolding(true);
        timer.current = setTimeout(() => {
          timer.current = undefined;
          held.current = true;
          setHolding(false);
          haptic('confirm');
          onHold();
        }, HOLD_MS);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (held.current) {
          held.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onPress();
      }}
    >
      <span className="hold-fill" aria-hidden="true" />
      {children}
    </button>
  );
}
