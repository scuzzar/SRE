import { FARBTAFEL } from '../farbtafel';

/** Die längste Seite eines Deckplans in Pixeln; größere Bilder werden verkleinert. */
const MAX_SIDE = 2048;
/** Bis zu dieser Länge des Data URL bleibt ein PNG ein PNG; darüber wird es ein JPEG. */
const MAX_PNG = 3_000_000;

/**
 * Macht aus einer gewählten oder fotografierten Datei das Bild für einen Deckplan, als Data URL:
 * Fotos werden auf höchstens 2048 Pixel verkleinert und als JPEG abgelegt, Pläne als PNG bleiben PNG,
 * solange sie nicht zu groß sind. Kann der Browser das Bild nicht lesen (etwa HEIC in Chrome), geht die
 * Datei unverändert weiter; der Controller weist sie dann mit seiner Meldung ab.
 */
export async function deckImage(file: File): Promise<string> {
  const image = await loaded(file).catch(() => undefined);
  if (image === undefined) return dataUrl(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const png = file.type === 'image/png';
  if (png && scale === 1 && file.size * 1.37 <= MAX_PNG) return dataUrl(file);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (context === null) return dataUrl(file);
  if (png) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const asPng = canvas.toDataURL('image/png');
    if (asPng.length <= MAX_PNG) return asPng;
  }
  // JPEG kennt keine Transparenz: durchsichtige Stellen eines Plans werden weiß statt schwarz.
  context.fillStyle = FARBTAFEL.papier;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', png ? 0.9 : 0.85);
}

function loaded(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Das Bild ließ sich nicht lesen.'));
    };
    image.src = url;
  });
}

function dataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Die Datei ließ sich nicht lesen.')));
    reader.onerror = () => reject(reader.error ?? new Error('Die Datei ließ sich nicht lesen.'));
    reader.readAsDataURL(file);
  });
}
