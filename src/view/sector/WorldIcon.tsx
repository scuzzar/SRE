import { useLayoutEffect, useRef } from 'react';
import type { WorldLook } from '../../controller';
import { worldCanvas } from './world-icon';

/**
 * Das Weltsymbol als Canvas. Mit `size` in CSS-Pixeln fest so groß, ohne füllt es die Breite seines
 * Platzes (quadratisch) und rechnet in der Auflösung, die es dort braucht.
 */
export function WorldIcon({ look, size, className, label }: { look: WorldLook; size?: number; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const css = size ?? canvas.getBoundingClientRect().width;
    if (css <= 0) return;
    const px = Math.round(css * Math.min(2, window.devicePixelRatio || 1));
    const source = worldCanvas(look, px);
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, px, px);
    ctx?.drawImage(source, 0, 0);
  }, [look, size]);
  return (
    <canvas
      ref={ref}
      className={className ? `world-icon ${className}` : 'world-icon'}
      style={size === undefined ? undefined : { width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
