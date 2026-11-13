import { useState, type DragEvent } from 'react';
import type { EquipSlotView, StashView } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';

type Slot = EquipSlotView['slot'];

const slotNames: Record<Slot, string> = { primary: 'Primär', secondary: 'Sekundär', wears: 'Rüstung' };

/** Was gerade gezogen wird: ein Stück aus dem Gepäck oder was ein SC an einer Stelle hat. Reine Anzeige. */
type Dragged = { readonly key: string; readonly fits: readonly Slot[] } | { readonly from: string; readonly fromSlot: Slot; readonly fits: readonly Slot[] };

function kg(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/**
 * Das Gruppengepäck und wer was ausgerüstet hat. Je SC drei Stellen (Primär, Sekundär, Rüstung);
 * darunter das Gepäck mit Last und Traglast. Auf dem Desktop zieht man ein Stück aus dem Gepäck auf
 * eine Stelle, von Stelle zu Stelle (auch zu einem anderen SC) oder zurück ins Gepäck. Ohne Ziehen
 * (Smartphone, Tastatur) rüstet „Ausrüsten …“ an einem Stück aus, und ✕ an einer Stelle legt ab.
 * Was erlaubt ist, entscheidet der Controller; die Ansicht hebt nur passende Stellen hervor.
 */
export function StashPanel({ stash }: { stash: StashView }) {
  const game = useGame();
  const [dragged, setDragged] = useState<Dragged | undefined>(undefined);
  const [over, setOver] = useState<string | undefined>(undefined);

  const start = (event: DragEvent, what: Dragged) => {
    event.dataTransfer.effectAllowed = 'move';
    // Firefox zieht nur mit Daten; was gezogen wird, hält der Zustand.
    event.dataTransfer.setData('text/plain', 'key' in what ? what.key : `${what.from}:${what.fromSlot}`);
    setDragged(what);
  };
  const end = () => {
    setDragged(undefined);
    setOver(undefined);
  };
  const dropOnSlot = (member: string, slot: Slot) => {
    if (!dragged || !dragged.fits.includes(slot)) return;
    haptic('pick');
    game.equip(member, slot, 'key' in dragged ? { key: dragged.key } : { from: dragged.from, fromSlot: dragged.fromSlot });
    end();
  };
  const dropOnStash = () => {
    if (dragged && 'from' in dragged) {
      haptic('pick');
      game.unequip(dragged.from, dragged.fromSlot);
    }
    end();
  };
  const ratio = stash.capacity > 0 ? stash.load / stash.capacity : stash.load > 0 ? 3 : 0;

  return (
    <section className="stash" aria-labelledby="stash-title">
      <h2 id="stash-title" className="section-title">
        Ausrüstung und Gepäck
      </h2>
      {stash.error && (
        <p className="error" role="alert">
          {stash.error}
        </p>
      )}
      <div className="stash-members">
        {stash.members.map((member) => (
          <div key={member.id} className="stash-member" role="group" aria-label={`Ausrüstung von ${member.name}`}>
            <span className="stash-member-name">{member.name}</span>
            <div className="stash-slots">
              {member.slots.map((s) => {
                const id = `${member.id}:${s.slot}`;
                const fits = dragged?.fits.includes(s.slot) ?? false;
                return (
                  <div
                    key={s.slot}
                    className={['stash-slot', s.item ? 'filled' : 'empty', dragged ? (fits ? 'droppable' : 'blocked') : '', over === id && fits ? 'over' : ''].filter(Boolean).join(' ')}
                    aria-label={`${member.name}, ${slotNames[s.slot]}: ${s.label ?? 'leer'}`}
                    draggable={s.item !== undefined}
                    onDragStart={(e) => s.item && start(e, { from: member.id, fromSlot: s.slot, fits: s.slot === 'wears' ? ['wears'] : ['primary', 'secondary'] })}
                    onDragEnd={end}
                    onDragOver={(e) => {
                      if (!fits) return;
                      e.preventDefault();
                      setOver(id);
                    }}
                    onDragLeave={() => setOver((o) => (o === id ? undefined : o))}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropOnSlot(member.id, s.slot);
                    }}
                  >
                    <span className="stash-slot-name">{slotNames[s.slot]}</span>
                    <span className="stash-slot-item">
                      {s.label ?? <span className="muted">{s.slot === 'wears' ? 'keine' : 'Hände'}</span>}
                      {s.inHand && <span className="stash-hand"> · in der Hand</span>}
                      {s.rounds && <span className="mono stash-rounds"> {s.rounds}</span>}
                    </span>
                    {s.item && (
                      <button type="button" className="icon-button stash-off" aria-label={`${s.label} ablegen`} title="Ins Gepäck legen" onClick={() => game.unequip(member.id, s.slot)}>
                        <CloseIcon />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className={['stash-pack', dragged && 'from' in dragged ? 'droppable' : '', over === 'stash' ? 'over' : ''].filter(Boolean).join(' ')}
        onDragOver={(e) => {
          if (!dragged || !('from' in dragged)) return;
          e.preventDefault();
          setOver('stash');
        }}
        onDragLeave={() => setOver((o) => (o === 'stash' ? undefined : o))}
        onDrop={(e) => {
          e.preventDefault();
          dropOnStash();
        }}
      >
        <div className="stash-load" aria-label={`Last ${kg(stash.load)} von ${kg(stash.capacity)} kg`}>
          <span className="stash-load-text">
            Gepäck · Last <b>{kg(stash.load)}</b> / {kg(stash.capacity)} kg
          </span>
          <span className={['stash-bar', stash.burden > 0 ? `burden-${stash.burden}` : ''].filter(Boolean).join(' ')} aria-hidden="true">
            <span style={{ width: `${Math.min(100, (ratio / 2) * 100)}%` }} />
            <i style={{ left: '50%' }} />
          </span>
          {stash.burden > 0 && (
            <span className="stash-burden" role="status">
              Belastet: STR, DEX und END aller SC −{stash.burden}
            </span>
          )}
        </div>
        {stash.items.length === 0 ? (
          <p className="muted stash-empty">Das Gepäck ist leer.</p>
        ) : (
          <ul className="stash-items" aria-label="Gepäck">
            {stash.items.map((item) => (
              <li
                key={item.key}
                className={item.fits.length > 0 ? 'stash-item equipable' : 'stash-item'}
                draggable={item.fits.length > 0}
                onDragStart={(e) => start(e, { key: item.key, fits: item.fits })}
                onDragEnd={end}
              >
                <span className="stash-item-name">
                  {item.count > 1 && <span className="mono">{item.count} × </span>}
                  {item.label}
                  {item.rounds && <span className="mono stash-rounds"> {item.rounds}</span>}
                </span>
                <span className="mono stash-weight">{item.weight === undefined ? '–' : `${kg(item.weight)} kg`}</span>
                {item.fits.length > 0 && stash.members.length > 0 && (
                  <select
                    className="stash-equip"
                    aria-label={`${item.label} ausrüsten`}
                    value=""
                    onChange={(e) => {
                      const [member, slot] = e.target.value.split(':') as [string, Slot];
                      haptic('pick');
                      game.equip(member, slot, { key: item.key });
                    }}
                  >
                    <option value="">Ausrüsten …</option>
                    {stash.members.flatMap((m) =>
                      item.fits.map((slot) => (
                        <option key={`${m.id}:${slot}`} value={`${m.id}:${slot}`}>
                          {m.name.split(' ')[0]} · {slotNames[slot]}
                        </option>
                      )),
                    )}
                  </select>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
