/** Der Unterreiter Crew: die Posten des Schiffs, Zuweisung über das Blatt, Umziehen durch Ziehen (2026-11-22d). */
import { useState, type CSSProperties } from 'react';
import type { CrewPostRow, VesselCrewRow } from '../../controller';
import { useGame } from '../game-context';
import { CloseIcon, PlusIcon } from '../icons';
import { SheetFrame } from './SheetFrame';
import { useDrag } from '../drag';

/** Wohin ein Charakter gezogen wird: auf einen Posten oder zurück zu den ohne Posten. */
type Payload = { readonly at: number } | { readonly who: string };

/**
 * Die Posten des Schiffs: besetzte als Karte mit der Person darin, die freien als schmale Zeile,
 * darunter, wer keinen Posten hat (Vorbild docs/mock/crew-zuweisen.html). Die Blätter dazu öffnet
 * der Bereich Schiff, sie stehen dort an der Stelle des Bereichs wie die übrigen Blätter.
 */
export function CrewTab({ crews, onOpenPost, onOpenPerson }: { readonly crews: readonly VesselCrewRow[]; readonly onOpenPost: (shipId: string, at: number) => void; readonly onOpenPerson: (shipId: string, who: string) => void }) {
  const game = useGame();
  const [vessel, setVessel] = useState(0);
  const boat = crews[Math.min(vessel, crews.length - 1)];
  const drag = useDrag<Payload>({
    onDrop: (payload, target) => {
      if (boat === undefined) return;
      if (target === 'frei') {
        if ('at' in payload) game.seatPost(boat.shipId, payload.at);
        return;
      }
      const at = Number(target.slice(5));
      if ('who' in payload) game.seatPost(boat.shipId, at, payload.who);
      else game.movePost({ ship: boat.shipId, at: payload.at }, { ship: boat.shipId, at });
    },
    blocker: (payload, target) => {
      if (target === 'frei' || boat === undefined) return undefined;
      const at = Number(target.slice(5));
      const post = boat.posts[at];
      if (post === undefined) return 'kein Posten';
      if ('at' in payload) return payload.at === at ? 'steht schon dort' : undefined;
      const person = boat.people.find((p) => p.id === payload.who);
      if (person === undefined) return 'nicht hier';
      return person.posts >= 2 && post.whoId !== undefined ? 'hat schon zwei Posten' : undefined;
    },
  });
  if (boat === undefined) return null;
  const held = boat.posts.filter((p) => p.who !== undefined);
  const free = boat.posts.filter((p) => p.who === undefined);
  const idle = boat.people.filter((p) => p.posts === 0);
  const gezogene = drag.dragging === undefined ? undefined : labelOf(boat, drag.dragging.payload);

  return (
    <div className="crew">
      {crews.length > 1 && (
        <div className="segmented" style={{ '--seg-cols': crews.length } as CSSProperties} role="tablist" aria-label="Schiff">
          {crews.map((c, i) => (
            <button type="button" key={c.shipId} role="tab" aria-selected={i === vessel} onClick={() => setVessel(i)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {boat.smallCraft && <p className="crew-note mono">Small Craft · Pilot = Ship&apos;s Boat oder Pilot − 1</p>}

      {held.length > 0 && (
        <div className="post-list">
          {held.map((post) => (
            <div className="post" role="group" aria-label={post.label} key={post.at} {...drag.target(`post:${post.at}`)}>
              <div className="post-head">
                <span className="post-name">{post.label}</span>
                {below(post) && <span className="crew-warn mono">ab {post.minimum}</span>}
                <span className="spacer" />
                <button type="button" className="icon-button" aria-label={`${post.label} aufgeben`} onClick={() => game.seatPost(boat.shipId, post.at)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="chip" role="button" aria-label={`${post.who} im Posten ${post.label}`} {...drag.props({ at: post.at }, () => onOpenPost(boat.shipId, post.at))}>
                <span className="grip" aria-hidden="true" />
                <span className="chip-name">{post.who}</span>
                <span className="chip-dm mono">DM {post.skill}</span>
                {post.posts > 1 && <span className="chip-two mono">2</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {free.length > 0 && (
        <>
          <p className="group-label">Freie Posten</p>
          <div className="post-list">
            {free.map((post) => (
              <button type="button" key={post.at} className="post-free" {...drag.target(`post:${post.at}`)} onClick={() => onOpenPost(boat.shipId, post.at)}>
                <span className="post-name">{post.label}</span>
                {post.minimum !== undefined && <span className="crew-hint mono">ab {post.minimum}</span>}
                <span className="spacer" />
                <PlusIcon />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="crew-idle" {...drag.target('frei')}>
        <p className="group-label">Ohne Posten</p>
        <div className="chip-row">
          {idle.length === 0 && <span className="muted">alle haben einen Posten</span>}
          {idle.map((p) => (
            <span className="chip ghost" role="button" key={p.id} aria-label={`${p.name} ohne Posten`} {...drag.props({ who: p.id }, () => onOpenPerson(boat.shipId, p.id))}>
              <span className="chip-name">{p.name}</span>
            </span>
          ))}
        </div>
      </div>

      {drag.dragging !== undefined && (
        <div className={`drag-ghost${drag.dragging.refused ? ' refused' : ''}`} style={{ '--ghost-x': `${drag.dragging.x}px`, '--ghost-y': `${drag.dragging.y}px` } as CSSProperties}>
          {gezogene}
        </div>
      )}
    </div>
  );
}

/** Das Blatt am Posten: wer ihn bekommt, und wer ihn verliert. */
export function CrewPostSheet({ boat, post, onClose }: { readonly boat: VesselCrewRow; readonly post: CrewPostRow; readonly onClose: () => void }) {
  const game = useGame();
  return (
    <SheetFrame
      className="two-col"
      title={post.who === undefined ? `${post.label} besetzen` : post.label}
      {...(post.minimum === undefined ? {} : { aside: `ab Stufe ${post.minimum}` })}
      onClose={onClose}
      {...(post.who === undefined
        ? {}
        : {
            foot: (
              <button
                type="button"
                className="action soft"
                onClick={() => {
                  game.seatPost(boat.shipId, post.at);
                  onClose();
                }}
              >
                Posten freigeben
              </button>
            ),
          })}
    >
      <div className="shop-table" role="table" aria-label="Wer den Posten bekommt">
        {boat.people.map((p) => {
          const skill = p.skill[post.role];
          const dort = post.whoId === p.id;
          const full = p.posts >= 2 && !dort;
          return (
            <button
              type="button"
              key={p.id}
              className="shop-row"
              disabled={full}
              title={full ? 'schon zwei Posten' : undefined}
              onClick={() => {
                game.seatPost(boat.shipId, post.at, p.id);
                onClose();
              }}
            >
              <span>
                {p.name}
                {p.posts > 0 && <span className="muted"> · {p.posts} Posten</span>}
              </span>
              <span className="val mono">
                {skill}
                {dort && <small>dort</small>}
              </span>
            </button>
          );
        })}
      </div>
    </SheetFrame>
  );
}

/** Das Blatt an einer Person ohne Posten: der erste freie Posten, den sie bekommt. */
export function CrewPersonSheet({ boat, who, onClose }: { readonly boat: VesselCrewRow; readonly who: string; readonly onClose: () => void }) {
  const game = useGame();
  const person = boat.people.find((p) => p.id === who);
  const free = boat.posts.filter((p) => p.who === undefined);
  return (
    <SheetFrame className="two-col" title={`${person?.name ?? ''} · Posten`} onClose={onClose}>
      <div className="shop-table" role="table" aria-label="Freie Posten">
        {free.map((post) => (
          <button
            type="button"
            key={post.at}
            className="shop-row"
            onClick={() => {
              game.seatPost(boat.shipId, post.at, who);
              onClose();
            }}
          >
            <span>{post.label}</span>
            <span className="val mono">{person === undefined ? undefined : person.skill[post.role]}</span>
          </button>
        ))}
        {free.length === 0 && <p className="crew-note">Kein Posten ist frei.</p>}
      </div>
    </SheetFrame>
  );
}

/** Unter der Mindeststufe aus SR 33? Nur ein Hinweis, verboten ist nichts. */
function below(post: CrewPostRow): boolean {
  return post.minimum !== undefined && post.skill < post.minimum;
}

function labelOf(boat: VesselCrewRow, payload: Payload): string {
  if ('who' in payload) return boat.people.find((p) => p.id === payload.who)?.name ?? '';
  return boat.posts[payload.at]?.label ?? '';
}
