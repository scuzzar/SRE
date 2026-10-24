import { useSyncExternalStore } from 'react';
import { ExpandIcon, ShrinkIcon } from './icons';

// Vollbild ist reine Darstellung: Es bleibt in der View, der Controller entscheidet nichts damit.

function subscribe(listener: () => void): () => void {
  document.addEventListener('fullscreenchange', listener);
  return () => document.removeEventListener('fullscreenchange', listener);
}

const isFullscreen = () => document.fullscreenElement !== null;

/** Schaltet Vollbild an und aus. Wo der Browser kein Vollbild kann (Safari auf dem iPhone), fehlt der Knopf. */
export function FullscreenButton() {
  const active = useSyncExternalStore(subscribe, isFullscreen);
  if (!document.fullscreenEnabled) return null;

  const toggle = () => {
    const change = active ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    // Der Browser darf ablehnen, etwa in einer eingebetteten Vorschau; dann bleibt alles, wie es ist.
    change.catch(() => undefined);
  };

  return (
    <button type="button" className="icon-button" aria-label={active ? 'Vollbild beenden' : 'Vollbild'} aria-pressed={active} onClick={toggle}>
      {active ? <ShrinkIcon /> : <ExpandIcon />}
    </button>
  );
}
