import { Fragment, memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DamageItem, JourneyItem, LogItem, NoteItem } from '../../controller';
import { answerText, attackTitle, checkDetail, clockTime, damageDetail, isYesAnswer, recoveryLine, recoveryText, mapText, partLabel, patronDetail, patronName, rumorDetail, rumorName, eventDetail, saveDetail, butcheringDetail, pickText, quoted, resultLine, scatterText, taskDetail, taskTitle } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { LightbulbIcon, PencilIcon, TrashIcon } from '../icons';
import { MapIconSvg, ScatterRose } from './CardRollIcons';

interface LogListProps {
  log: readonly LogItem[];
  /** Je Eintrag das Datum seines Spieltags; ein neuer Tag bekommt eine Trennzeile. */
  days: readonly (string | undefined)[];
  /** „Deuten“ am Ergebnis an dieser Stelle des Logs: öffnet das Blatt der Deutung. */
  onInterpret: (index: number) => void;
  /** Der Stift an einer Notiz oder Deutung: öffnet das Blatt mit ihrem Text zum Ändern. */
  onEdit: (index: number) => void;
}

/**
 * Der Log wie ein Chat: das Älteste oben, das Neueste unten, direkt über den Knöpfen. Das neueste
 * Ergebnis steht groß da, mit „Deuten“; alles Ältere ist eine Zeile (links was, rechts das Ergebnis),
 * die beim Antippen aufklappt, mit den Einzelheiten, „Deuten“ und „Löschen“. Eine Deutung steht im
 * Kasten ihres Ergebnisses, auch wenn sie später geschrieben wurde, ebenso der Schadenswurf im Kasten
 * seines Treffers; das ist nur Anzeige. Welche Zeile offen ist und welcher Eintrag gerade gelöscht
 * werden will, hält die View, das Löschen der Controller.
 */
/** So viele Zeilen zeigt der Log auf einmal; „Ältere zeigen“ holt jeweils so viele dazu. */
const PAGE = 150;

/** Mit `memo`: Öffnet der Screen ein Blatt, zeichnet der Log nicht neu, solange sich der Log nicht ändert. */
export const LogList = memo(function LogList({ log, days, onInterpret, onEdit }: LogListProps) {
  const game = useGame();
  // Der Log steht auf dem Smartphone im Orakel-Screen und im Desktop-Modus links; beide Instanzen
  // dürfen nicht dieselbe Überschrift-ID tragen.
  const titleId = useId();
  // Offene Zeile und Rückfrage gelten zu einer Länge des Logs: Ändert er sich, kann es ein anderer
  // Eintrag sein, dann ist beides zu.
  const [pending, setPending] = useState<{ index: number; length: number } | undefined>(undefined);
  const confirm = pending?.length === log.length ? pending.index : undefined;
  const setConfirm = (index: number | undefined) => setPending(index === undefined ? undefined : { index, length: log.length });
  const [opened, setOpened] = useState<{ index: number; length: number } | undefined>(undefined);
  const open = opened?.length === log.length ? opened.index : undefined;
  // Ein neuer Eintrag holt das Neueste ins Bild, auch wenn man hochgescrollt hat. Der Log läuft von
  // unten nach oben (column-reverse); ganz unten ist dort die Scrollposition 0.
  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [log.length]);

  const deletion = (index: number, interpretations: number) => ({
    confirming: confirm === index,
    interpretations,
    onCancel: () => setConfirm(undefined),
    onDelete: () => {
      setConfirm(undefined);
      game.deleteLogEntry(index);
    },
  });
  const interpret = (index: number) => {
    haptic('pick');
    onInterpret(index);
  };
  /** Kleine Knöpfe in der Kopfzeile eines Teils: Deuten oder Ändern, und Löschen. */
  const tools = (index: number, what: string, canRead: boolean) => (
    <span className="entry-tools">
      {log[index]?.kind === 'note' && (
        <button type="button" className="icon-button small" aria-label={`${what} ändern`} onClick={() => onEdit(index)}>
          <PencilIcon />
        </button>
      )}
      {canRead && (
        <button type="button" className="icon-button small interpret" aria-label={`${what} deuten`} onClick={() => interpret(index)}>
          <LightbulbIcon />
        </button>
      )}
      {deletable(log[index]) && (
        <button type="button" className="icon-button small" aria-label={`${what} löschen`} onClick={() => setConfirm(index)}>
          <TrashIcon />
        </button>
      )}
    </span>
  );

  const groups = useMemo(() => groupLog(log), [log]);
  // Einfache Würfe hintereinander (ohne Deutung, nicht das Neueste) stehen als eine Zeile; antippen
  // faltet sie auf. Was aufgefaltet ist, gilt wie die offene Zeile zu einer Länge des Logs.
  const [unfolding, setUnfolding] = useState<{ indices: readonly number[]; length: number } | undefined>(undefined);
  const unfolded = unfolding?.length === log.length ? unfolding.indices : undefined;
  const rows = useMemo(() => {
    const out: (readonly number[])[] = [];
    groups.forEach((group, g) => {
      const plain = group.item.kind === 'dice' && group.notes.length === 0 && !group.latest && group.index !== open;
      const previous = out.at(-1);
      const first = previous && groups[previous[0]!]!;
      const loose = (i: number) => unfolded?.includes(i) ?? false;
      if (plain && !loose(group.index) && first && first.item.kind === 'dice' && first.notes.length === 0 && !first.latest && first.index !== open && !loose(first.index) && days[first.index] === days[group.index] && previous.every((p) => groups[p]!.item.kind === 'dice')) {
        out[out.length - 1] = [...previous, g];
      } else out.push([g]);
    });
    return out;
  }, [groups, open, unfolded, days]);
  // Nur die neuesten Zeilen zeichnen; ein langer Log bleibt so schnell.
  const [limit, setLimit] = useState(PAGE);
  const shown = rows.slice(-limit);
  const hidden = rows.length - shown.length;

  const noteBlock = (note: NoteAt, className: string, head: boolean) => (
    <div key={note.index} className={confirm === note.index ? `${className} confirming` : className}>
      {head && (
        <div className="entry-head">
          <span className="kicker">Deutung</span>
          <span className="entry-head-end">
            <Edited at={note.item.at} editedAt={note.item.editedAt} />
            {tools(note.index, 'Deutung', false)}
          </span>
        </div>
      )}
      <p className="note-text">
        {note.item.text}
        {!head && tools(note.index, 'Deutung', false)}
      </p>
      <DeleteBar {...deletion(note.index, 0)} what="Deutung" />
    </div>
  );

  const damageBlock = (damage: DamageAt) => (
    <div className={confirm === damage.index ? 'interpretation damage confirming' : 'interpretation damage'}>
      <div className="entry-head">
        <span className="kicker">Schaden{damage.item.victim ? ` · ${damage.item.victim}` : ''}</span>
        <span className="entry-head-end">
          <time className="entry-time" dateTime={damage.item.at}>
            {clockTime(damage.item.at)}
          </time>
          {tools(damage.index, 'Schadenswurf', true)}
        </span>
      </div>
      <div className="dice-total">
        <strong>{damage.item.damage}</strong>
        <span className="muted">{damageDetail(damage.item)}</span>
      </div>
      {damage.notes.map((note) => noteBlock(note, 'damage-note', false))}
      <DeleteBar {...deletion(damage.index, damage.notes.length)} what="Schadenswurf" />
    </div>
  );
  return (
    <section className="scroll log-scroll" aria-labelledby={titleId} ref={scroller}>
      <div className="log">
        <h2 id={titleId} className="visually-hidden">
          Log
        </h2>
        {log.length === 0 ? (
          <p className="log-empty">Noch nichts im Log. Zieh eine Karte oder würfle.</p>
        ) : (
          <ol aria-live="polite">
            {hidden > 0 && (
              <li className="log-more">
                <button type="button" className="ghost compact" onClick={() => setLimit((l) => l + PAGE)}>
                  Ältere zeigen ({hidden} {hidden === 1 ? 'Zeile' : 'Zeilen'})
                </button>
              </li>
            )}
            {shown.map((row, r) => {
              const { item, index, notes, damage, volley, latest } = groups[row[0]!]!;
              const day = days[index];
              const before = r === 0 ? undefined : groups[shown[r - 1]![0]!]!.index;
              const newDay = day !== undefined && (before === undefined || days[before] !== day);
              const dayLine = newDay && (
                <li className="log-day" aria-label={`Spieltag ${day}`}>
                  {day}
                </li>
              );
              if (row.length > 1) {
                const totals = row.map((g) => groups[g]!.item).map((roll) => (roll.kind === 'dice' ? roll.total : 0));
                return (
                  <Fragment key={index}>
                    {dayLine}
                    <li className="log-row">
                      <button type="button" className="log-row-button" aria-expanded={false} aria-label={`${row.length} Würfe 2W6: ${totals.join(', ')}. Antippen zum Auffalten.`} onClick={() => setUnfolding({ indices: row.map((g) => groups[g]!.index), length: log.length })}>
                        <span className="row-what plain">2W6 × {row.length}</span>
                        <span className="row-result gold">{totals.join(' · ')}</span>
                      </button>
                    </li>
                  </Fragment>
                );
              }
              const result = item.kind !== 'note';
              const full = latest || open === index;
              const what = volley.length > 0 ? 'Die ganze Garbe' : result ? 'Ergebnis' : 'Notiz';
              if (!full) {
                return (
                  <Fragment key={index}>
                    {dayLine}
                    <li className={result ? 'log-row' : 'log-row note'}>
                      <button type="button" className="log-row-button" aria-expanded={false} onClick={() => setOpened({ index, length: log.length })}>
                        <CompactRow item={item} notes={notes.map((n) => n.item.text)} extra={[...(damage ? [resultLine(damage.item).head] : []), ...volley.map((v) => `${resultLine(v.item).head}${v.damage ? ` · ${resultLine(v.damage.item).head}` : ''}`)]} />
                      </button>
                    </li>
                  </Fragment>
                );
              }
              const classes = ['entry', result ? 'outcome' : 'note', latest ? 'latest' : 'open', confirm === index ? 'confirming' : ''].filter(Boolean).join(' ');
              return (
                <Fragment key={index}>
                  {dayLine}
                  <li className={classes}>
                    <div className="entry-head">
                      <span className="kicker">{kicker(item, volley.length > 0)}</span>
                      <span className="entry-head-end">
                        {item.kind === 'note' ? (
                          <Edited at={item.at} editedAt={item.editedAt} />
                        ) : (
                          <time className="entry-time" dateTime={item.at}>
                            {clockTime(item.at)}
                          </time>
                        )}
                        {!latest && (
                          <button type="button" className="icon-button small" aria-label="Zuklappen" aria-expanded={true} onClick={() => setOpened(undefined)}>
                            <span aria-hidden="true">−</span>
                          </button>
                        )}
                      </span>
                    </div>
                    <EntryBody item={item} />
                    {notes.map((note) => noteBlock(note, 'interpretation', true))}
                    {damage && damageBlock(damage)}
                    {volley.map((v, i) => (
                      <div key={v.index} className={confirm === v.index ? 'interpretation volley-entry confirming' : 'interpretation volley-entry'}>
                        <div className="entry-head">
                          <span className="kicker">{v.item.neighbour ? 'Nachbar' : `${i + 2}. Wurf`}</span>
                          <span className="entry-head-end">
                            <time className="entry-time" dateTime={v.item.at}>
                              {clockTime(v.item.at)}
                            </time>
                            {tools(v.index, 'Wurf', true)}
                          </span>
                        </div>
                        <EntryBody item={v.item} />
                        {v.notes.map((note) => noteBlock(note, 'damage-note', false))}
                        {v.damage && damageBlock(v.damage)}
                        <DeleteBar {...deletion(v.index, 0)} what="Die ganze Garbe" />
                      </div>
                    ))}
                    {confirm !== index && (result || deletable(item)) && (
                      <div className="entry-actions">
                        {result && (
                          <button type="button" className="ghost compact interpret" onClick={() => interpret(index)}>
                            <LightbulbIcon />
                            Deuten
                          </button>
                        )}
                        <span className="entry-actions-end">
                          {item.kind === 'note' && (
                            <button type="button" className="icon-button" aria-label="Notiz ändern" onClick={() => onEdit(index)}>
                              <PencilIcon />
                            </button>
                          )}
                          {deletable(item) && (
                            <button type="button" className="icon-button" aria-label={`${what} löschen`} onClick={() => setConfirm(index)}>
                              <TrashIcon />
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                    <DeleteBar {...deletion(index, notes.length + (damage ? 1 + damage.notes.length : 0))} what={volley.length > 0 ? 'Die ganze Garbe' : result ? 'Eintrag' : 'Notiz'} />
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
});

/** Die Uhrzeit einer Notiz oder Deutung; nach einer Änderung mit „geändert“ und deren Uhrzeit. */
function Edited({ at, editedAt }: { at: string; editedAt: string | undefined }) {
  return editedAt === undefined ? (
    <time className="entry-time" dateTime={at}>
      {clockTime(at)}
    </time>
  ) : (
    <time className="entry-time" dateTime={editedAt} title={`geschrieben ${clockTime(at)}`}>
      geändert {clockTime(editedAt)}
    </time>
  );
}

/** Ein älterer Eintrag als Zeile: links was (Frage, Probe, Wurf), rechts das Ergebnis; darunter Kartenfelder und Deutungen. */
function CompactRow({ item, notes, extra }: { item: LogItem; notes: readonly string[]; extra: readonly string[] }): ReactNode {
  if (item.kind === 'note') return <span className="row-what row-note">{item.text}</span>;
  const line = resultLine(item);
  const negative = (item.kind === 'card' && item.answer !== undefined && !isYesAnswer(item.answer.answer)) || ((item.kind === 'task' || item.kind === 'attack' || item.kind === 'save') && !item.success);
  const picks = item.kind === 'card' ? [...(item.bell === undefined ? [] : [String(item.bell)]), ...(item.scatter === undefined ? [] : [scatterText[item.scatter]]), ...(item.map === undefined ? [] : [mapText(item.map)]), ...item.items.map((i) => pickText(i.name, i.texts))] : [];
  return (
    <>
      <span className={item.kind === 'dice' ? 'row-what plain' : 'row-what'}>{item.kind === 'dice' ? `2W6 · ${line.rest}` : line.rest}</span>
      <span className={['row-result', negative ? 'negative' : '', item.kind === 'dice' ? 'gold' : '', item.kind === 'card' && !item.answer ? 'kind' : ''].filter(Boolean).join(' ')}>{item.kind === 'dice' ? item.total : line.head}</span>
      {picks.length > 0 && (
        <span className="row-picks">
          {picks.map((p, i) => (
            <span key={i}>{p}</span>
          ))}
        </span>
      )}
      {item.kind === 'card' && item.answer?.event && <span className="row-extra event">Zufallsereignis: {item.answer.event.name}</span>}
      {extra.map((e, i) => (
        <span key={`x${i}`} className="row-extra">
          {e}
        </span>
      ))}
      {notes.map((n, i) => (
        <span key={i} className="row-reading">
          {n}
        </span>
      ))}
    </>
  );
}

type NoteAt = { readonly item: NoteItem; readonly index: number };
type DamageAt = { readonly item: DamageItem; readonly index: number; readonly notes: readonly NoteAt[] };

/**
 * Die Kästen: jedes Ergebnis und jede Notiz, mit den Deutungen, die zum Ergebnis gehören, und beim
 * Treffer mit seinem Schadenswurf und dessen Deutungen. Die weiteren Würfe einer Garbe stehen im
 * Kasten ihres ersten Wurfs, jeder mit seinem Schaden. `latest` hat der Kasten, in dem der neueste
 * Eintrag steht. Ein Durchgang durch den Log baut die Verweise auf, so bleibt es auch bei langem Log
 * schnell.
 */
function groupLog(log: readonly LogItem[]) {
  const notesOf = new Map<number, NoteAt[]>();
  const damageOf = new Map<number, number>();
  const volleyOf = new Map<number, number[]>();
  log.forEach((item, i) => {
    if (item.kind === 'note' && item.interprets !== undefined) notesOf.set(item.interprets, [...(notesOf.get(item.interprets) ?? []), { item, index: i }]);
    if (item.kind === 'damage' && !damageOf.has(item.of)) damageOf.set(item.of, i);
    if (item.kind === 'attack' && item.volley !== undefined) volleyOf.set(item.volley, [...(volleyOf.get(item.volley) ?? []), i]);
  });
  const notes = (index: number): readonly NoteAt[] => notesOf.get(index) ?? [];
  const damage = (index: number): DamageAt | undefined => {
    const at = damageOf.get(index);
    return at === undefined ? undefined : { item: log[at] as DamageItem, index: at, notes: notes(at) };
  };
  const last = log.length - 1;
  const touches = (d: DamageAt | undefined) => d !== undefined && (d.index === last || d.notes.some((n) => n.index === last));
  const groups = log.flatMap((item, index) => {
    if ((item.kind === 'note' && item.interprets !== undefined) || item.kind === 'damage' || (item.kind === 'attack' && item.volley !== undefined)) return [];
    const own = notes(index);
    const hit = damage(index);
    const volley = (volleyOf.get(index) ?? []).map((i) => ({ item: log[i] as Extract<LogItem, { kind: 'attack' }>, index: i, notes: notes(i), damage: damage(i) }));
    const latest = index === last || own.some((n) => n.index === last) || touches(hit) || volley.some((v) => v.index === last || touches(v.damage) || v.notes.some((n) => n.index === last));
    return [{ item, index, notes: own, damage: hit, volley, latest }];
  });
  // Ohne Treffer bei den Verweisen ist der letzte Kasten der neueste.
  if (groups.length > 0 && !groups.some((g) => g.latest)) groups[groups.length - 1] = { ...groups[groups.length - 1]!, latest: true };
  return groups;
}

interface DeleteBarProps {
  confirming: boolean;
  what: string;
  interpretations: number;
  onCancel: () => void;
  onDelete: () => void;
}

function DeleteBar({ confirming, what, interpretations, onCancel, onDelete }: DeleteBarProps) {
  if (!confirming) return null;
  const withNotes = interpretations === 0 ? '' : ` mit ${interpretations} ${interpretations === 1 ? 'Deutung' : 'Deutungen'}`;
  return (
    <div className="entry-delete" role="group" aria-label={`${what} löschen?`} onClick={(e) => e.stopPropagation()}>
      <span>
        {what}
        {withNotes} endgültig löschen?
      </span>
      <button type="button" className="ghost" onClick={onCancel}>
        Behalten
      </button>
      <button type="button" className="ghost danger" onClick={onDelete}>
        Löschen
      </button>
    </div>
  );
}

function kicker(item: LogItem, volley = false): string {
  switch (item.kind) {
    case 'dice':
      return 'Würfel · 2W6';
    case 'card':
      return item.answer ? `Orakel · ${item.answer.odds}` : 'Karte';
    case 'task':
      return 'Probe';
    case 'attack':
      return volley ? (item.fire === 'burst' ? 'Feuerstoß' : 'Schrotschuss') : 'Angriff';
    case 'damage':
      return 'Schaden';
    case 'recovery':
      return `Heilung · ${recoveryText[item.how]}`;
    case 'patron':
      return `Patron · Liste ${item.list}`;
    case 'rumor':
      return 'Gerücht';
    case 'event':
      return 'Tiere · Ereignis';
    case 'save':
      return 'Rettungswurf';
    case 'butchering':
      return 'Ausweiden';
    case 'check':
      return `Test · ${item.name}`;
    case 'time':
      return item.week ? 'Zeit · Woche beendet' : 'Zeit';
    case 'journey':
      return 'Reise';
    case 'note':
      return item.interprets === undefined ? 'Notiz' : 'Deutung';
  }
}

/** Zeit und Reisen haben den Stand geändert; sie lassen sich nicht löschen. */
function deletable(item: LogItem | undefined): boolean {
  return item !== undefined && item.kind !== 'time' && item.kind !== 'journey';
}

function EntryBody({ item }: { item: LogItem }) {
  switch (item.kind) {
    case 'dice':
      return (
        <div className="dice-total">
          <strong>{item.total}</strong>
          <span className="muted">
            {item.dice[0]} + {item.dice[1]}
          </span>
        </div>
      );
    case 'card':
      return (
        <>
          {item.question ? <span className="entry-question">{quoted(item.question)}</span> : item.answer && <span className="entry-question">Ohne Frage</span>}
          {item.answer && (
            <>
              <span className={isYesAnswer(item.answer.answer) ? 'verdict' : 'verdict negative'}>{answerText[item.answer.answer]}</span>
              <span className="entry-detail">
                W100: {item.answer.roll} · Ja bis {item.answer.chance}
              </span>
              {item.answer.event && (
                <span className="log-event">
                  <b>Zufallsereignis: {item.answer.event.name}</b> · {item.answer.event.text}
                </span>
              )}
            </>
          )}
          <dl className="picks">
            {item.bell !== undefined && (
              <div className="pick-row">
                <dt>1–10</dt>
                <dd className="pick-bell">{item.bell}</dd>
              </div>
            )}
            {item.scatter !== undefined && (
              <div className="pick-row">
                <dt>Streuwürfel</dt>
                <dd className="pick-roll">
                  <ScatterRose value={item.scatter} />
                  <span>{scatterText[item.scatter]}</span>
                </dd>
              </div>
            )}
            {item.map !== undefined && (
              <div className="pick-row">
                <dt>Kartensymbol</dt>
                <dd className="pick-roll">
                  <MapIconSvg map={item.map} />
                  <span>{mapText(item.map)}</span>
                </dd>
              </div>
            )}
            {item.items.map((pick, i) => (
              <div key={i} className="pick-row">
                <dt>{pick.section === pick.slot ? pick.section : `${pick.section} · ${pick.slot}`}</dt>
                <dd>{pickText(pick.name, pick.texts)}</dd>
              </div>
            ))}
          </dl>
        </>
      );
    case 'task':
      return (
        <>
          <span className="entry-title">{taskTitle(item)}</span>
          <span className={item.success ? 'verdict medium' : 'verdict medium negative'}>
            {item.success ? 'ERFOLG' : 'FEHLSCHLAG'}
          </span>
          <span className="entry-detail">{taskDetail(item)}</span>
          <span className="entry-question small">
            {item.parts.map(partLabel).join(', ')}
          </span>
        </>
      );
    case 'attack':
      return (
        <>
          <span className="entry-title">{attackTitle(item)}</span>
          <span className={item.success ? 'verdict medium' : 'verdict medium negative'}>
            {item.success ? 'TREFFER' : 'DANEBEN'}
          </span>
          <span className="entry-detail">{taskDetail(item)}</span>
          <span className="entry-question small">
            {item.parts.map(partLabel).join(', ')}
          </span>
        </>
      );
    case 'damage':
      return <span className="entry-detail">{damageDetail(item)}</span>;
    case 'recovery':
      return <span className="entry-title">{recoveryLine(item)}</span>;
    case 'patron':
      return (
        <>
          <span className="verdict small">
            {patronName(item)}
          </span>
          <span className="entry-detail">{patronDetail(item)}</span>
        </>
      );
    case 'event':
      return (
        <>
          <span className="verdict small">
            {item.name}
          </span>
          <p className="note-text">{item.text}</p>
          <span className="entry-detail">{eventDetail(item)}</span>
        </>
      );
    case 'butchering':
      return (
        <>
          <span className="verdict small">
            {item.meat} kg Fleisch · {item.fur} kg Fell
          </span>
          <span className="entry-detail">{butcheringDetail(item)}</span>
          {!item.edible && <span className="entry-question">{item.reason}</span>}
        </>
      );
    case 'save':
      return (
        <>
          <span className={item.success ? 'verdict small' : 'verdict small negative'}>
            {item.success ? 'GESCHAFFT' : 'MISSLUNGEN'}
          </span>
          <span className="entry-detail">{saveDetail(item)}</span>
        </>
      );
    case 'rumor':
      return (
        <>
          <span className="verdict small">
            {rumorName(item)}
          </span>
          <span className="entry-detail">{rumorDetail(item)}</span>
        </>
      );
    case 'check':
      return (
        <>
          <span className={item.passed === (item.check !== 'legal') ? 'verdict small' : 'verdict small negative'}>
            {item.check === 'legal' ? (item.passed ? 'Ruhe' : 'Angehalten') : item.passed ? 'JA' : 'NEIN'}
          </span>
          <span className="entry-detail">{checkDetail(item)}</span>
        </>
      );
    case 'time':
      return (
        <>
          <span className="verdict small">
            {item.week ? 'Woche beendet' : `${item.days} ${item.days === 1 ? 'Tag' : 'Tage'} vergangen`}
          </span>
          <span className="entry-detail">
            {item.from} → {item.to}
          </span>
        </>
      );
    case 'journey':
      return <JourneyBody item={item} />;
    case 'note':
      return <p className="note-text">{item.text}</p>;
  }
}

/** Eine Reise im Log: wohin, wer mit welcher Passage, der Kälteschlaf und die Lotterie. */
export function JourneyBody({ item }: { item: JourneyItem }) {
  return (
    <>
      <span className="verdict small">
        {item.from} → {item.to}
      </span>
      <span className="entry-detail">
        {item.fromDate} → {item.toDate}
      </span>
      <span className="entry-question small">
        {item.passengers.map((p) => `${p.name}: ${p.passage}`).join(' · ')}
      </span>
      {item.berths.length > 0 && (
        <ul className="journey-berths">
          {item.berths.map((b, i) => (
            <li key={i} className={b.survived ? '' : 'negative'}>
              {b.name ?? `NSC ${i + 1 - item.berths.filter((x) => x.name !== undefined).length}`}: {b.dice[0]} + {b.dice[1]}
              {b.dm === 0 ? '' : ` ${b.dm > 0 ? '+' : '−'}${Math.abs(b.dm)}`} = {b.total} ({item.reviveTarget}+) {b.survived ? 'wach' : 'tot'} · Tipp {b.guess}
              {b.winner ? ' · gewinnt' : ''}
            </li>
          ))}
        </ul>
      )}
      {item.winner !== undefined && (
        <span className="entry-detail">
          {item.survivors} von {item.berths.length} überlebt · Lotterie Cr {item.pot}
          {item.lot ? ' (Los)' : ''}: {item.paid ? `${item.winner} gewinnt` : `${item.winner} überlebte nicht, der Kapitän behält den Topf`}
        </span>
      )}
    </>
  );
}
