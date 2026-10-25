import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import type { LogItem } from '../../controller';
import { clockTime, pairText, partLabel, quoted, taskDetail, taskTitle } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/** So lange muss man auf einen Eintrag drücken, damit er sich löschen lässt. */
const LONG_PRESS_MS = 550;
/** Bewegt sich der Finger weiter, scrollt man und drückt nicht. */
const SLOP_PX = 10;

/**
 * Der Log wie ein Chat: das Älteste oben, das Neueste unten, direkt über den Knöpfen. Langes Drücken
 * auf einen Eintrag (oder ein Rechtsklick) bietet an, ihn zu löschen; welcher Eintrag das gerade ist,
 * hält die View, das Löschen der Controller.
 */
export function LogList({ log }: { log: readonly LogItem[] }) {
  const game = useGame();
  // Welcher Eintrag gerade gelöscht werden will, zu welcher Länge des Logs: Ändert sich der Log,
  // kann es ein anderer sein, dann bietet die View nichts mehr an.
  const [pending, setPending] = useState<{ index: number; length: number } | undefined>(undefined);
  const confirm = pending?.length === log.length ? pending.index : undefined;
  const setConfirm = (index: number | undefined) => setPending(index === undefined ? undefined : { index, length: log.length });
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | undefined>(undefined);

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = undefined;
  };
  useEffect(() => cancelPress, []);

  const offer = (index: number) => {
    cancelPress();
    haptic('pick');
    setConfirm(index);
  };

  const pressHandlers = (index: number) => ({
    onPointerDown: (e: PointerEvent) => {
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
      offer(index);
    },
  });

  return (
    <section className="scroll log-scroll" aria-labelledby="log-title">
      <div className="log">
        <h2 id="log-title" className="section-title">
          Log
        </h2>
        {log.length === 0 ? (
          <p className="log-empty">Noch nichts im Log. Stell eine Frage, zieh eine Karte oder würfle.</p>
        ) : (
          <ol aria-live="polite">
            {log.map((item, index) => (
              <LogEntry
                key={index}
                item={item}
                latest={index === log.length - 1}
                confirming={confirm === index}
                handlers={pressHandlers(index)}
                onCancel={() => setConfirm(undefined)}
                onDelete={() => {
                  setConfirm(undefined);
                  game.deleteLogEntry(index);
                }}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

interface EntryProps {
  item: LogItem;
  latest: boolean;
  confirming: boolean;
  handlers: object;
  onCancel: () => void;
  onDelete: () => void;
}

function LogEntry({ item, latest, confirming, handlers, onCancel, onDelete }: EntryProps) {
  const classes = ['entry', latest ? 'latest' : '', confirming ? 'confirming' : ''].filter(Boolean).join(' ');
  return (
    <li className={classes} {...handlers}>
      <div className="entry-head">
        <span className="kicker">{kicker(item)}</span>
        <time className="entry-time" dateTime={item.at}>
          {clockTime(item.at)}
        </time>
      </div>
      <EntryBody item={item} />
      {confirming && (
        <div className="entry-delete" role="group" aria-label="Eintrag löschen?">
          <span>Eintrag endgültig löschen?</span>
          <button type="button" className="ghost" onClick={onCancel}>
            Behalten
          </button>
          <button type="button" className="ghost danger" onClick={onDelete}>
            Löschen
          </button>
        </div>
      )}
    </li>
  );
}

function kicker(item: LogItem): string {
  switch (item.kind) {
    case 'oracle':
      return `Orakel · ${item.odds}`;
    case 'dice':
      return 'Würfel · 2W6';
    case 'card':
      return 'Karte';
    case 'task':
      return 'Probe';
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
            {item.items.map((pick, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <dt>{pick.section === pick.slot ? pick.section : `${pick.section} · ${pick.slot}`}</dt>
                <dd>{pairText(pick.texts)}</dd>
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
  }
}
