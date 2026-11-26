import { useCallback, useState } from 'react';
import type { Snapshot } from '../../controller';
import { resultLine } from '../format';
import { CharacterStrip } from './CharacterStrip';
import { LogList } from './LogList';
import { NoteSheet } from './NoteSheet';
import { OracleDock } from './OracleDock';

/**
 * Orakel und Proben auf einem Screen: oben der Charakter oben, darunter der Log, unten eine Aktionsleiste mit
 * drei Knöpfen: Notiz, Würfeln, Karte (`OracleDock`). Das Orakel steht auf der Karte; die Frage schreibt man dort.
 * Notiz und Deutung schreibt man in einem eigenen Blatt; welches Blatt offen ist,
 * ist reine Darstellung. Als Bereich Log im Ziehblatt bzw. in der Seitenspalte des Desktops steht die Aktionsleiste
 * unten fest unter allem (`dock={false}`).
 */
export function OracleScreen({ view, dock = true }: { view: Snapshot; /** Ohne die Aktionsleiste unten: Im Ziehblatt und in der Seitenspalte steht sie fest unter allem. */ dock?: boolean }) {
  // Das offene Blatt: Notiz, Deutung zum Ergebnis an dieser Stelle des Logs, oder den Text der Notiz
  // bzw. Deutung an dieser Stelle ändern.
  const [sheet, setSheet] = useState<{ readonly reading?: number; readonly edit?: number } | undefined>(undefined);
  const reading = sheet?.reading === undefined ? undefined : view.log[sheet.reading];
  const edited = sheet?.edit === undefined ? undefined : view.log[sheet.edit];
  // Gleichbleibende Handler, damit der Log (memo) beim Öffnen eines Blatts nicht neu zeichnet.
  const interpret = useCallback((index: number) => setSheet({ reading: index }), []);
  const edit = useCallback((index: number) => setSheet({ edit: index }), []);

  return (
    <div className="screen">
      <CharacterStrip view={view} />
      <LogList log={view.log} days={view.logDays} onInterpret={interpret} onEdit={edit} />
      {dock && <OracleDock view={view} onNote={() => setSheet({})} shortcuts />}
      {sheet && (
        <NoteSheet
          target={sheet.reading !== undefined && reading ? { index: sheet.reading, ...resultLine(reading) } : undefined}
          edit={sheet.edit !== undefined && edited?.kind === 'note' ? { index: sheet.edit, text: edited.text } : undefined}
          onClose={() => setSheet(undefined)}
        />
      )}
    </div>
  );
}
