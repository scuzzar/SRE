import type { LogItem } from '../../controller';
import { clockTime, partLabel, quoted, taskDetail, taskTitle } from '../format';

/** Der Log wie ein Chat: das Älteste oben, das Neueste unten, direkt über den Knöpfen. */
export function LogList({ log }: { log: readonly LogItem[] }) {
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
              <LogEntry key={index} item={item} latest={index === log.length - 1} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function LogEntry({ item, latest }: { item: LogItem; latest: boolean }) {
  return (
    <li className={latest ? 'entry latest' : 'entry'}>
      <div className="entry-head">
        <span className="kicker">{kicker(item)}</span>
        <time className="entry-time" dateTime={item.at}>
          {clockTime(item.at)}
        </time>
      </div>
      <EntryBody item={item} />
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
                <dd>{pick.text}</dd>
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
