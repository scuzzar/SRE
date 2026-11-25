import type { Snapshot } from '../controller';

/**
 * Die **Wartenscheibe** (2026-11-24g, siehe domain-model.md, *Was der Lauf verschluckt*): Sie steht,
 * während die Erschaffung eines NSC läuft, und zählt, was der Lauf verschluckt – wie viele Läufe er
 * schon verworfen hat und wie viele davon gestorben sind. Ist ein Lauf zum Namen gefunden, bleibt
 * die Scheibe eine Sekunde stehen. Was sie zeigt, ist flüchtig: Es wird nicht gespeichert.
 */
export function NpcRunDisc({ run }: { run: Snapshot['npcRun'] }) {
  if (!run) return null;
  return (
    <div className="npc-run" role="status" aria-live="polite">
      <section className="npc-run-card">
        <span className="npc-run-wheel" aria-hidden />
        <span className="npc-run-text">
          <strong>Die Erschaffung läuft</strong>
          <span className="npc-run-count">Lauf {run.attempts}</span>
          {run.deaths > 0 && <span className="npc-run-deaths">{run.deaths} gestorben</span>}
        </span>
      </section>
    </div>
  );
}
