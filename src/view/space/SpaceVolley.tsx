import { useEffect, useState } from 'react';
import type { Snapshot } from '../../controller';
import type { ShotEffect } from './SpaceScreen';
import { DiceView, THROW_MS } from '../Dice';
import { animated, haptic, stopHaptics } from '../haptics';

type Volley = NonNullable<Snapshot['spaceVolley']>;

/** Wie lange ein Schuss nach dem Aufschlagen der Würfel stehen bleibt, und wie lange das Ende des Raumkampfs. */
const SHOW_MS = 1300;
const END_MS = 1800;

/**
 * Die Salven des Raumkampfs im Vordergrund (2026-11-21e): Schuss für Schuss rollen 2W6, dann stehen
 * Summe mit DM, Treffer oder daneben und die Trefferzonen; zuletzt, wenn der Raumkampf endete, wie.
 * Im Log steht alles schon; das hier ist nur Anzeige. Ein Tippen springt zum nächsten Schuss.
 */
export function SpaceVolley({ volley, onShot, onDone }: { volley: Volley; onShot?: (shot: ShotEffect) => void; onDone: () => void }) {
  // Schritt 0: warten (die Bewegung spielt ab); danach je Schuss werfen und liegen; zuletzt das Ende.
  const [step, setStep] = useState<{ shot: number; landed: boolean } | 'wait' | 'end'>(volley.delay > 0 && animated() ? 'wait' : { shot: 0, landed: !animated() });
  const shots = volley.shots;
  const next = () => {
    if (step === 'wait') return setStep({ shot: 0, landed: false });
    if (step === 'end') return onDone();
    if (!step.landed) return setStep({ ...step, landed: true });
    if (step.shot + 1 < shots.length) return setStep({ shot: step.shot + 1, landed: false });
    return volley.endings.length > 0 ? setStep('end') : onDone();
  };
  // Sobald die Würfel eines Schusses liegen, zeigt die Raumkarte darüber Strahl und Trefferzonen.
  const landedShot = step !== 'wait' && step !== 'end' && step.landed ? step.shot : undefined;
  useEffect(() => {
    if (landedShot === undefined) return;
    const s = shots[landedShot]!;
    onShot?.({ id: `${volley.key}-${landedShot}`, attacker: s.attacker, target: s.target, hit: s.hit, hits: s.hits });
  }, [landedShot, onShot, shots, volley.key]);
  useEffect(() => {
    const ms = step === 'wait' ? volley.delay : step === 'end' ? END_MS : step.landed ? SHOW_MS : THROW_MS;
    const timer = setTimeout(next, ms);
    if (step !== 'wait' && step !== 'end' && step.landed) haptic(shots[step.shot]!.hit ? 'land' : 'pick');
    return () => clearTimeout(timer);
  });
  if (step === 'wait') return null;
  if (step === 'end') {
    return (
      <div className="dice-roll space-volley" aria-live="polite" onClick={onDone}>
        <span className="dice-roll-kicker">RAUMKAMPF VORBEI</span>
        {volley.endings.map((e) => (
          <strong key={e} className="space-volley-end">
            {e}
          </strong>
        ))}
      </div>
    );
  }
  const shot = shots[step.shot]!;
  return (
    <div
      className="dice-roll space-volley"
      aria-live="polite"
      onClick={() => {
        stopHaptics();
        next();
      }}
    >
      <span className="dice-roll-kicker">
        {shot.attacker.toUpperCase()} → {shot.target.toUpperCase()}
      </span>
      <span className="space-volley-weapon">
        {shot.weapon} · Turret {shot.turret + 1} · Schuss {step.shot + 1}/{shots.length}
      </span>
      <span className="space-volley-need">
        braucht <b>{shot.need}+</b> auf 2W6
        {shot.parts.length > 0 ? ` (8 ${shot.parts.map((p) => `${p.dm < 0 ? '−' : '+'} ${Math.abs(p.dm)} ${p.label}`).join(', ')})` : ' (keine DMs)'}
      </span>
      <DiceView key={step.shot} dice={shot.dice} seed={volley.key * 31 + step.shot} landed={step.landed} />
      <div className={step.landed ? 'dice-sum shown' : 'dice-sum'}>
        <strong className={shot.hit ? 'space-hit' : 'space-miss'}>{shot.hit ? 'Treffer' : 'daneben'}</strong>
        <span>
          {shot.dice[0]} + {shot.dice[1]} = {shot.total - shot.dm} · braucht {shot.need}+
        </span>
        {shot.hits.length > 0 && <span className="space-volley-zones">{shot.hits.join(' · ')}</span>}
      </div>
    </div>
  );
}
