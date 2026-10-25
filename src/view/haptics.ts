// Reine Darstellung: Vibration zu Würfeln und Karte. Auf Android über `navigator.vibrate`; Safari auf
// dem iPhone kennt das nicht, gibt aber beim Umschalten eines Schalters (`<input switch>`) einen
// kurzen Ruck. Dort wird jeder Puls eines Musters zu einem solchen Ruck.

export type Feel = 'shake' | 'land' | 'add' | 'success' | 'failure' | 'draw' | 'pick' | 'unpick' | 'confirm' | 'discard';

/** Muster wie bei `navigator.vibrate`: an, aus, an, … in Millisekunden. */
const patterns: Record<Feel, readonly number[]> = {
  // Würfel in der Hand schütteln, dann zweimal aufschlagen, im Takt von `die-throw` in styles.css
  // (Aufschläge bei 70 % und 92 % von 850 ms).
  shake: [10, 30, 10, 30, 12, 503, 18, 169, 10],
  land: [28],
  add: [10],
  success: [18, 70, 40],
  failure: [60, 50, 20],
  draw: [8, 150, 16],
  pick: [7],
  unpick: [4],
  confirm: [12, 50, 26],
  discard: [8],
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

/** Spielt ein Muster und bricht ein laufendes ab. */
export function haptic(feel: Feel): void {
  stopHaptics();
  const pattern = patterns[feel];
  if (canVibrate()) {
    navigator.vibrate([...pattern]);
    return;
  }
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

/** Ob Animationen laufen sollen; bei „Bewegung reduzieren“ steht gleich das Ergebnis da. */
export function animated(): boolean {
  return !reducedMotion();
}
