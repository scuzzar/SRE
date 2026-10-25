// Reine Darstellung: Vibration zu Würfeln und Karte. Auf Android über `navigator.vibrate`; Safari auf
// dem iPhone kennt das nicht, gibt aber beim Umschalten eines Schalters (`<input switch>`) einen
// kurzen Ruck. Dort wird jeder Puls eines Musters zu einem solchen Ruck.

export type Feel = 'shake' | 'land' | 'add' | 'success' | 'failure' | 'draw' | 'pick' | 'unpick' | 'confirm' | 'discard';

/**
 * Muster wie bei `navigator.vibrate`: an, aus, an, … in Millisekunden. Kein Puls unter 20 ms: Viele
 * Vibrationsmotoren unter Android laufen so schnell gar nicht an, dann spürt man nichts.
 */
const patterns: Record<Feel, readonly number[]> = {
  // Würfel in der Hand schütteln, dann zweimal aufschlagen, im Takt von `die-throw` in styles.css
  // (Aufschläge bei 70 % und 92 % von 850 ms).
  shake: [20, 40, 20, 40, 20, 455, 45, 142, 30],
  land: [50],
  add: [25],
  success: [40, 80, 80],
  failure: [150, 60, 60],
  // Abheben, Umdrehen (Karte steht hochkant bei etwa 620 ms), Ankommen; im Takt von `card-draw`.
  draw: [20, 600, 40, 240, 25],
  pick: [25],
  unpick: [20],
  confirm: [30, 60, 50],
  discard: [25],
};

let pending: ReturnType<typeof setTimeout>[] = [];

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Auf dem iPhone: ein Ruck über einen versteckten Schalter. Nur auf Touch-Geräten, sonst passiert nichts. */
function switchTick(): void {
  if (typeof document === 'undefined' || !matchMedia('(pointer: coarse)').matches) return;
  const label = document.createElement('label');
  label.ariaHidden = 'true';
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.appendChild(input);
  document.body.appendChild(label);
  label.click();
  label.remove();
}

/** Spielt ein Muster; ein neues ersetzt ein laufendes. */
export function haptic(feel: Feel): void {
  const pattern = patterns[feel];
  if (canVibrate()) {
    navigator.vibrate([...pattern]);
    return;
  }
  pending.forEach(clearTimeout);
  pending = [];
  let at = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      if (at === 0) switchTick();
      else pending.push(setTimeout(switchTick, at));
    }
    at += ms;
  });
}

export function stopHaptics(): void {
  pending.forEach(clearTimeout);
  pending = [];
  if (canVibrate()) navigator.vibrate(0);
}

/** Wie dieses Gerät vibriert: über die Vibrations-API, über den Schalter-Ruck des iPhones oder gar nicht. */
export function vibrationKind(): 'api' | 'switch' | 'none' {
  if (canVibrate()) return 'api';
  if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) return 'switch';
  return 'none';
}

/** Ein langer, deutlicher Puls zum Ausprobieren. Gibt zurück, ob der Browser ihn angenommen hat. */
export function testHaptic(): boolean {
  if (canVibrate()) return navigator.vibrate(400);
  switchTick();
  return vibrationKind() === 'switch';
}

/** Ob Animationen laufen sollen; bei „Bewegung reduzieren“ steht gleich das Ergebnis da. */
export function animated(): boolean {
  return !reducedMotion();
}
