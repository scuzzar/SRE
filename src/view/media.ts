import { useEffect, useState } from 'react';

// Ab dieser Breite bekommt die App den Desktop-Modus: Reiterzeile oben, Orakel und Charaktere links. Dieselbe
// Grenze steht im @media-Block „Desktop-Modus“ in styles.css; beide sollen zusammen geändert
// werden.
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** Ob das Fenster gerade breit genug für den Desktop-Modus ist; reine Darstellung. */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isDesktop;
}
