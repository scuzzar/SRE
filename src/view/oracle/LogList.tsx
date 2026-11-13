import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { DamageItem, LogItem, NoteItem } from '../../controller';
import { attackTitle, clockTime, damageDetail, recoveryLine, recoveryText, mapText, partLabel, patronDetail, patronName, rumorDetail, rumorName, eventDetail, pickText, quoted, scatterText, taskDetail, taskTitle } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { MapIconSvg, ScatterRose } from './CardRollIcons';

/** So lange muss man auf einen Eintrag drücken, damit er sich löschen lässt. */
const LONG_PRESS_MS = 550;
/** Bewegt sich der Finger weiter, scrollt man und drückt nicht. */
const SLOP_PX = 10;

interface LogListProps {
  log: readonly LogItem[];
  /** Das Ergebnis, auf das sich eine Deutung gerade bezöge; nur markiert, wenn `marked`. */
  target: number | undefined;
  marked: boolean;
  /** Antippen eines Ergebnisses macht es zum Ziel der Deutung. */
  onPick: (index: number) => void;
}

/**
 * Der Log wie ein Chat: das Älteste oben, das Neueste unten, direkt über den Knöpfen. Eine Deutung
 * steht im Kasten ihres Ergebnisses, auch wenn sie später geschrieben wurde, ebenso der Schadenswurf im
 * Kasten seines Treffers; das ist nur Anzeige.
 * Antippen eines Ergebnisses wählt es als Ziel der Deutung. Langes Drücken auf einen Eintrag (oder
 * ein Rechtsklick) bietet an, ihn zu löschen; welcher Eintrag das gerade ist, hält die View, das
 * Löschen der Controller.
 */
export function LogList({ log, target, marked, onPick }: LogListProps) {
  const game = useGame();
  // Welcher Eintrag gerade gelöscht werden will, zu welcher Länge des Logs: Ändert sich der Log,
  // kann es ein anderer sein, dann bietet die View nichts mehr an.
  const [pending, setPending] = useState<{ index: number; length: number } | undefined>(undefined);
  const confirm = pending?.length === log.length ? pending.index : undefined;
  const setConfirm = (index: number | undefined) => setPending(index === undefined ? undefined : { index, length: log.length });
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | undefined>(undefined);
  // Ein langes Drücken endet mit einem Klick; der soll nicht zusätzlich das Ziel wählen.
  const offered = useRef(false);

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = undefined;
  };
  useEffect(() => cancelPress, []);

  const offer = (index: number) => {
    cancelPress();
    offered.current = true;
    haptic('pick');
    setConfirm(index);
  };

  // Eine Deutung liegt im Kasten ihres Ergebnisses; ihr Drücken gilt nur ihr, nicht dem Kasten.
  const pressHandlers = (index: number) => ({
    onPointerDown: (e: PointerEvent) => {
      e.stopPropagation();
      offered.current = false;
      if (e.button !== 0 || confirm === index) return;
      cancelPress();
      press.current = { timer: setTimeout(() => offer(index), LONG_PRESS_MS), x: e.clientX, y: e.clientY };
    },
    onPointerMove: (e: PointerEvent) => {
      if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > SLOP_PX) cancelPress();
    },
    onPointerUp: cancelPress,
    onPointerCancel: cancelPress,
    onPointerLeave: cancelPress,
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      offer(index);
    },
  });

  const deletion = (index: number, interpretations: number) => ({
    confirming: confirm === index,
    interpretations,
    onCancel: () => setConfirm(undefined),
    onDelete: () => {
      setConfirm(undefined);
      game.deleteLogEntry(index);
    },
  });

  // Die Kästen: jedes Ergebnis und jede Notiz, mit den Deutungen, die zum Ergebnis gehören, und beim
  // Treffer mit seinem Schadenswurf und dessen Deutungen.
  // Die weiteren Würfe einer Garbe stehen im Kasten ihres ersten Wurfs, jeder mit seinem Schaden.
  const groups = log.flatMap((item, index) =>
    (item.kind === 'note' && item.interprets !== undefined) || item.kind === 'damage' || (item.kind === 'attack' && item.volley !== undefined)
      ? []
      : [
          {
            item,
            index,
            notes: interpretationsAt(log, index),
            damage: damageAt(log, index),
            volley: log.flatMap((roll, i) => (roll.kind === 'attack' && roll.volley === index ? [{ item: roll, index: i, notes: interpretationsAt(log, i), damage: damageAt(log, i) }] : [])),
          },
        ],
  );

  const damageBlock = (damage: NonNullable<ReturnType<typeof damageAt>>) => (
    <div
      className={confirm === damage.index ? 'interpretation damage confirming' : marked && damage.index === target ? 'interpretation damage target' : 'interpretation damage'}
      {...pressHandlers(damage.index)}
      onClick={(e) => {
        e.stopPropagation();
        if (offered.current) return;
        haptic('pick');
        onPick(damage.index);
      }}
    >
      <div className="entry-head">
        <span className="kicker">Schaden{damage.item.victim ? ` · ${damage.item.victim}` : ''}</span>
        <time className="entry-time" dateTime={damage.item.at}>
          {clockTime(damage.item.at)}
        </time>
      </div>
      <div className="dice-total">
        <strong>{damage.item.damage}</strong>
        <span className="muted">{damageDetail(damage.item)}</span>
      </div>
      {damage.notes.map((note) => (
        <div key={note.index} className={confirm === note.index ? 'damage-note confirming' : 'damage-note'} {...pressHandlers(note.index)}>
          <p className="note-text">{note.item.text}</p>
          <DeleteBar {...deletion(note.index, 0)} what="Deutung" />
        </div>
      ))}
      <DeleteBar {...deletion(damage.index, damage.notes.length)} what="Schadenswurf" />
    </div>
  );
  const last = log.length - 1;

  return (
    <section className="scroll log-scroll" aria-labelledby="log-title">
      <div className="log">
        <div className="log-head">
          <h2 id="log-title" className="section-title">
            Log
          </h2>
          {log.length > 0 && <span className="log-hint">Ergebnis antippen zum Deuten · lange drücken zum Löschen</span>}
        </div>
        {log.length === 0 ? (
          <p className="log-empty">Noch nichts im Log. Stell eine Frage, zieh eine Karte oder würfle.</p>
        ) : (
          <ol aria-live="polite">
            {groups.map(({ item, index, notes, damage, volley }) => {
              const result = item.kind !== 'note';
              const touches = (d: ReturnType<typeof damageAt>) => d !== undefined && (d.index === last || d.notes.some((n) => n.index === last));
              const classes = [
                'entry',
                result ? 'outcome' : 'note',
                index === last || notes.some((n) => n.index === last) || touches(damage) || volley.some((v) => v.index === last || touches(v.damage) || v.notes.some((n) => n.index === last)) ? 'latest' : '',
                marked && index === target ? 'target' : '',
                confirm === index ? 'confirming' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <li
                  key={index}
                  className={classes}
                  {...pressHandlers(index)}
                  onClick={
                    result
                      ? () => {
                          if (offered.current) return;
                          haptic('pick');
                          onPick(index);
                        }
                      : undefined
                  }
                >
                  <div className="entry-head">
                    <span className="kicker">{kicker(item, volley.length > 0)}</span>
                    <time className="entry-time" dateTime={item.at}>
                      {clockTime(item.at)}
                    </time>
                  </div>
                  <EntryBody item={item} />
                  {notes.map((note) => (
                    <div key={note.index} className={confirm === note.index ? 'interpretation confirming' : 'interpretation'} {...pressHandlers(note.index)} onClick={(e) => e.stopPropagation()}>
                      <div className="entry-head">
                        <span className="kicker">Deutung</span>
                        <time className="entry-time" dateTime={note.item.at}>
                          {clockTime(note.item.at)}
                        </time>
                      </div>
                      <p className="note-text">{note.item.text}</p>
                      <DeleteBar {...deletion(note.index, 0)} what="Deutung" />
                    </div>
                  ))}
                  {damage && damageBlock(damage)}
                  {volley.map((v, i) => (
                    <div
                      key={v.index}
                      className={confirm === v.index ? 'interpretation volley-entry confirming' : marked && v.index === target ? 'interpretation volley-entry target' : 'interpretation volley-entry'}
                      {...pressHandlers(v.index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (offered.current) return;
                        haptic('pick');
                        onPick(v.index);
                      }}
                    >
                      <div className="entry-head">
                        <span className="kicker">{v.item.neighbour ? 'Nachbar' : `${i + 2}. Wurf`}</span>
                        <time className="entry-time" dateTime={v.item.at}>
                          {clockTime(v.item.at)}
                        </time>
                      </div>
                      <EntryBody item={v.item} />
                      {v.notes.map((note) => (
                        <div key={note.index} className={confirm === note.index ? 'damage-note confirming' : 'damage-note'} {...pressHandlers(note.index)}>
                          <p className="note-text">{note.item.text}</p>
                          <DeleteBar {...deletion(note.index, 0)} what="Deutung" />
                        </div>
                      ))}
                      {v.damage && damageBlock(v.damage)}
                      <DeleteBar {...deletion(v.index, 0)} what="Die ganze Garbe" />
                    </div>
                  ))}
                  <DeleteBar {...deletion(index, notes.length + (damage ? 1 + damage.notes.length : 0))} what={volley.length > 0 ? 'Die ganze Garbe' : 'Eintrag'} />
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Der Schadenswurf des Treffers an der Stelle `index`, mit seinen Deutungen. */
function damageAt(
  log: readonly LogItem[],
  index: number,
):
  | {
      item: DamageItem;
      index: number;
      notes: { item: NoteItem; index: number }[];
    }
  | undefined {
  const at = log.findIndex((item) => item.kind === 'damage' && item.of === index);
  return at < 0
    ? undefined
    : {
        item: log[at] as DamageItem,
        index: at,
        notes: interpretationsAt(log, at),
      };
}

/** Die Deutungen des Ergebnisses an der Stelle `index`, in der Reihenfolge des Logs. */
function interpretationsAt(log: readonly LogItem[], index: number): { item: NoteItem; index: number }[] {
  return log.flatMap((item, i) => (item.kind === 'note' && item.interprets === index ? [{ item, index: i }] : []));
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
    case 'oracle':
      return `Orakel · ${item.odds}`;
    case 'dice':
      return 'Würfel · 2W6';
    case 'card':
      return 'Karte';
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
    case 'note':
      return item.interprets === undefined ? 'Notiz' : 'Deutung';
  }
}

function EntryBody({ item }: { item: LogItem }) {
  switch (item.kind) {
    case 'oracle':
      return (
        <>
          <span className="entry-question">{item.question ? quoted(item.question) : 'Ohne Frage'}</span>
          <span className={item.yes ? 'verdict' : 'verdict negative'}>{item.yes ? 'JA' : 'NEIN'}</span>
          <span className="entry-detail">
            W100: {item.roll} · Ja bis {item.chance}
          </span>
        </>
      );
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
          {item.question && <span className="entry-question">{quoted(item.question)}</span>}
          <dl className="picks">
            {item.bell !== undefined && (
              <div style={{ display: 'contents' }}>
                <dt>1–10</dt>
                <dd className="pick-bell">{item.bell}</dd>
              </div>
            )}
            {item.scatter !== undefined && (
              <div style={{ display: 'contents' }}>
                <dt>Streuwürfel</dt>
                <dd className="pick-roll">
                  <ScatterRose value={item.scatter} />
                  <span>{scatterText[item.scatter]}</span>
                </dd>
              </div>
            )}
            {item.map !== undefined && (
              <div style={{ display: 'contents' }}>
                <dt>Kartensymbol</dt>
                <dd className="pick-roll">
                  <MapIconSvg map={item.map} />
                  <span>{mapText(item.map)}</span>
                </dd>
              </div>
            )}
            {item.items.map((pick, i) => (
              <div key={i} style={{ display: 'contents' }}>
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
          <span style={{ fontSize: 14, fontWeight: 600 }}>{taskTitle(item)}</span>
          <span className={item.success ? 'verdict' : 'verdict negative'} style={{ fontSize: 26 }}>
            {item.success ? 'ERFOLG' : 'FEHLSCHLAG'}
          </span>
          <span className="entry-detail">{taskDetail(item)}</span>
          <span className="entry-question" style={{ fontSize: 12 }}>
            {item.parts.map(partLabel).join(', ')}
          </span>
        </>
      );
    case 'attack':
      return (
        <>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{attackTitle(item)}</span>
          <span className={item.success ? 'verdict' : 'verdict negative'} style={{ fontSize: 26 }}>
            {item.success ? 'TREFFER' : 'DANEBEN'}
          </span>
          <span className="entry-detail">{taskDetail(item)}</span>
          <span className="entry-question" style={{ fontSize: 12 }}>
            {item.parts.map(partLabel).join(', ')}
          </span>
        </>
      );
    case 'damage':
      return <span className="entry-detail">{damageDetail(item)}</span>;
    case 'recovery':
      return <span style={{ fontSize: 14, fontWeight: 600 }}>{recoveryLine(item)}</span>;
    case 'patron':
      return (
        <>
          <span className="verdict" style={{ fontSize: 22 }}>
            {patronName(item)}
          </span>
          <span className="entry-detail">{patronDetail(item)}</span>
        </>
      );
    case 'event':
      return (
        <>
          <span className="verdict" style={{ fontSize: 20 }}>
            {item.name}
          </span>
          <p className="note-text">{item.text}</p>
          <span className="entry-detail">{eventDetail(item)}</span>
        </>
      );
    case 'rumor':
      return (
        <>
          <span className="verdict" style={{ fontSize: 20 }}>
            {rumorName(item)}
          </span>
          <span className="entry-detail">{rumorDetail(item)}</span>
        </>
      );
    case 'note':
      return <p className="note-text">{item.text}</p>;
  }
}
