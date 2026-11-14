import type { LogItem } from '../../controller';
import { resultLine } from '../format';

/**
 * „Was hier geschah“: die Logeinträge mit diesem Ort, das Neueste oben, je eine Zeile mit Spieltag,
 * was es war und dem Ergebnis. Welche es sind, sagt der Snapshot; hier nur die Darstellung.
 */
export function HappenedList({ title, indices, log, logDays, limit = 12 }: { title: string; indices: readonly number[]; log: readonly LogItem[]; logDays: readonly (string | undefined)[]; limit?: number }) {
  const shown = [...indices].reverse().slice(0, limit);
  return (
    <section className="career happened" aria-label={title}>
      <div className="career-term">
        <h4>{title}</h4>
        <ul>
          {shown.map((i) => {
            const item = log[i];
            if (!item) return null;
            const line = item.kind === 'note' ? { head: 'Notiz', rest: item.text } : resultLine(item);
            return (
              <li key={i}>
                <span>
                  {logDays[i] && <span className="happened-day">{logDays[i]} · </span>}
                  {line.rest} · <strong>{line.head}</strong>
                </span>
              </li>
            );
          })}
        </ul>
        {indices.length > shown.length && <p className="combat-hint">und {indices.length - shown.length} ältere</p>}
      </div>
    </section>
  );
}
