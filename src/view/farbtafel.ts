// Die Farben des Canvas. Im Canvas greift `var()` nicht, darum steht hier, was `styles.css` in
// `:root` führt – derselbe Name ohne Gedankenstriche (`--welt-globus` wird `weltGlobus`) und
// derselbe Wert. Der Test `farbtafel.test.ts` rechnet jeden Eintrag gegen `:root` und fällt durch,
// sobald beides auseinanderläuft.
//
// Nicht jeder Eintrag hat eine Variable im Stylesheet: Zeichen, die nur der Canvas malt (die
// Sprunggrenze, das kleine Haus einer Kleinstadt, der Schusstrahl), kennt kein Blatt. Sie stehen in
// derselben Familie und tragen am Kommentar `nur im Canvas`.
//
// Deckkraftstufen bekommen nie einen eigenen Namen – die rechnet `mitDeckkraft` aus der Grundfarbe,
// so wie im Stylesheet `rgba(79, 209, 255, .35)` dieselbe Farbe ist wie `--welt-globus`.

/** Die Farben, die der Canvas malt, in den Familien des GUI-Handbuchs. */
export const FARBTAFEL = {
  // Grund und Schrift: dasselbe Dunkel und Hell wie in den Blättern.
  void: '#04060b', // der Raum zwischen den Körpern (--void)
  ink: '#111111', // Ziffern in einem hellen Abzeichen (--ink)
  onFill: '#ffffff', // helles Zeichen auf dunklem Grund (--on-fill)
  papier: '#ffffff', // der Grund eines Deckplans als JPEG (--papier)
  shadowSolid: '#000000', // Grund aller Schatten und Randlinien (--shadow-solid)
  accentText: '#ef5a5f', // Rot für das eigene Zeichen auf dem Globus (--accent-text)

  // Welt: Gruppenstand, Schiffe und Markierungen auf Globus, Karte und Reiseroute.
  weltGruppe: '#6ec8ff', // die Gruppe selbst (--welt-gruppe)
  weltHauptwelt: '#ffd65a', // die Hauptwelt (--welt-hauptwelt)
  weltSystem: '#ffd27a', // ein System und der Blitz eines Treffers (--welt-system)
  weltSchiff: '#ffe05c', // das Schiff (--welt-schiff)
  weltStadt: '#fff0c8', // Städte und ihre Lichter (--welt-stadt)
  weltNsc: '#be96ff', // Nichtspielerfiguren (--welt-nsc)
  weltEreignis: '#ffaa3c', // ein Ereignis und die gereiste Strecke (--welt-ereignis)
  weltVulkan: '#d64024', // ein Vulkan (--welt-vulkan)
  weltGlobus: '#4fd1ff', // eigene Schiffe und ihre Kurse (--welt-globus)
  weltKoerper: '#c8c8d2', // Scheibe eines Körpers ohne Weltsymbol, nur im Canvas
  weltName: '#c8d2e6', // Name eines Körpers im Kampfstand, nur im Canvas
  weltSprunggrenze: '#9678dc', // der gestrichelte Ring der Sprunggrenze, nur im Canvas
  weltSprungtext: '#aa91eb', // die Schrift an der Sprunggrenze, nur im Canvas
  weltRing: '#d6c8aa', // das Band eines Planetenrings, nur im Canvas
  weltBahn: '#a0afc8', // die Bahn eines Mondes, nur im Canvas
  weltKleinstadt: '#e8e2d2', // das kleine Haus einer Kleinstadt, nur im Canvas
  weltStadttext: '#fff8e1', // der Namen einer Stadt auf dem Globus, nur im Canvas
  weltFahrzeug: '#aae68c', // das Abzeichen „F“ für ein Fahrzeug, nur im Canvas
  weltKontur: '#0f0f0f', // der Rand der Abzeichen, nur im Canvas
  weltKonturWeich: '#141414', // der Rand von Haus und Städten, nur im Canvas
  weltKonturGlut: '#1e0a05', // der Rand eines Vulkans, nur im Canvas
  weltKonturGold: '#16140c', // das Schiffssymbol auf gelbem Feld, nur im Canvas

  // Status: Absicht, Gefahr und Schaden auf dem Kampfstand.
  statusFeind: '#ff6b6b', // fremde Schiffe und ihr Kurs (--status-feind)
  statusFeindLicht: '#ffb4b4', // Schrift über einem Treffer (--status-feind-licht)
  statusWarnung: '#ff5a6a', // ein Bruchlandung oder ein Alarm (--status-warnung)
  statusLandung: '#7ee08a', // gelungen, angekommen (--status-landung)
  statusDaneben: '#dcdcdc', // die Schrift „daneben“, nur im Canvas

  // Strahl: Schuss, Treffer und Explosion auf dem Kampfstand, alle nur im Canvas.
  strahlTreffer: '#ff4d4d', // der Strahl eines Treffers
  strahlFaden: '#ff8c8c', // der dünne Strahl daneben
  strahlGlut: '#ff2a2a', // das Glühen des Strahls
  strahlBrand: '#ff7a2a', // das Glühen der Explosion
} as const;

/**
 * Eine Farbe der Tafel in eine Deckkraftstufe verwandeln: `mitDeckkraft(FARBTAFEL.weltGlobus, .35)`.
 * Jede Farbe der Tafel steht als `#rrggbb` da, der Test prüft das für alle.
 */
export function mitDeckkraft(farbe: string, anteil: number): string {
  const wert = Number.parseInt(farbe.slice(1), 16);
  return `rgba(${(wert >> 16) & 255},${(wert >> 8) & 255},${wert & 255},${anteil})`;
}
