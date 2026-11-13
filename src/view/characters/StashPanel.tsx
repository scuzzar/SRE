import { createContext, useContext, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { EquipSlotView, StashView } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';

type Slot = EquipSlotView['slot'];

const slotNames: Record<Slot, string> = { primary: 'Primär', secondary: 'Sekundär', wears: 'Rüstung' };

/** Was gerade gezogen wird: ein Stück aus dem Gepäck oder was ein SC an einer Stelle hat. Reine Anzeige. */
type Dragged = ({ readonly key: string } | { readonly from: string; readonly fromSlot: Slot }) & { readonly fits: readonly Slot[]; readonly label: string };

/** So weit bewegt sich die Maus, bevor sie zieht; so lange hält der Finger, bevor er zieht (sonst scrollt er). */
const MOUSE_SLOP = 4;
const TOUCH_SLOP = 8;
const HOLD_MS = 250;

function kg(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/** Ein Ziel unter dem Zeiger: eine Stelle („c1:primary“) oder das Gepäck („stash“). */
function targetAt(x: number, y: number): string | undefined {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
  return el?.dataset.drop;
}

/** Ob das Ziel das Gezogene aufnimmt: eine passende Stelle oder, für etwas von einer Stelle, das Gepäck. */
function accepts(dragged: Dragged, target: string | undefined): boolean {
  if (target === undefined) return false;
  if (target === 'stash') return 'from' in dragged;
  const slot = target.split(':')[1] as Slot;
  return dragged.fits.includes(slot) && !('from' in dragged && `${dragged.from}:${dragged.fromSlot}` === target);
}

interface DragState {
  readonly dragged: Dragged | undefined;
  readonly over: string | undefined;
  /** Die Zeiger-Handler für etwas, das sich ziehen lässt. */
  readonly bind: (what: Dragged) => { onPointerDown: (event: ReactPointerEvent) => void; onContextMenu: (event: ReactMouseEvent) => void };
}

const DragContext = createContext<DragState | undefined>(undefined);

function useDrag(): DragState {
  const state = useContext(DragContext);
  if (!state) throw new Error('StashDrag fehlt um Ausrüstung und Gepäck.');
  return state;
}

/**
 * Ziehen zwischen den Anziehpuppen der Charakterkacheln und dem Gepäck, mit Maus und Finger gleich:
 * Die Maus zieht nach ein paar Pixeln, der Finger nach kurzem Halten (wischt er gleich, scrollt die
 * Seite). Ein Schild mit dem Namen folgt dem Zeiger; passende Ziele leuchten. Losgelassen auf einer
 * passenden Stelle rüstet aus, auf dem Gepäck legt ab. Was erlaubt ist, entscheidet der Controller.
 * Reine Anzeige.
 */
export function StashDrag({ children }: { children: ReactNode }) {
  const game = useGame();
  const [dragged, setDragged] = useState<Dragged | undefined>(undefined);
  const [over, setOver] = useState<string | undefined>(undefined);
  const [ghost, setGhost] = useState<{ x: number; y: number } | undefined>(undefined);
  const cleanup = useRef<() => void>(() => undefined);
  useEffect(() => () => cleanup.current(), []);

  const bind = (what: Dragged) => ({
    onContextMenu: (event: ReactMouseEvent) => {
      // Langes Halten öffnet sonst das Kontextmenü des Browsers.
      if (dragged) event.preventDefault();
    },
    onPointerDown: (event: ReactPointerEvent) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('button, select')) return;
      cleanup.current();
      const touch = event.pointerType !== 'mouse';
      const start = { x: event.clientX, y: event.clientY };
      let active = false;
      let target: string | undefined;
      const begin = (x: number, y: number) => {
        active = true;
        if (touch) haptic('pick');
        setDragged(what);
        setGhost({ x, y });
      };
      const timer = touch ? window.setTimeout(() => begin(start.x, start.y), HOLD_MS) : undefined;
      const move = (e: PointerEvent) => {
        if (!active) {
          const far = Math.hypot(e.clientX - start.x, e.clientY - start.y) > (touch ? TOUCH_SLOP : MOUSE_SLOP);
          if (!far) return;
          // Der Finger wischt, bevor er gehalten hat: Das ist Scrollen, kein Ziehen.
          if (touch) return stop();
          begin(e.clientX, e.clientY);
        }
        target = targetAt(e.clientX, e.clientY);
        setOver(target);
        setGhost({ x: e.clientX, y: e.clientY });
      };
      // Solange gezogen wird, scrollt der Finger die Seite nicht.
      const noScroll = (e: TouchEvent) => active && e.preventDefault();
      const up = (e: PointerEvent) => {
        if (active) {
          const at = targetAt(e.clientX, e.clientY) ?? target;
          if (accepts(what, at)) {
            haptic('pick');
            if (at === 'stash' && 'from' in what) game.unequip(what.from, what.fromSlot);
            else if (at !== undefined && at !== 'stash') {
              const [member, slot] = at.split(':') as [string, Slot];
              game.equip(member, slot, 'key' in what ? { key: what.key } : { from: what.from, fromSlot: what.fromSlot });
            }
          }
        }
        stop();
      };
      const stop = () => {
        window.clearTimeout(timer);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', stop);
        window.removeEventListener('touchmove', noScroll);
        cleanup.current = () => undefined;
        setDragged(undefined);
        setOver(undefined);
        setGhost(undefined);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', stop);
      window.addEventListener('touchmove', noScroll, { passive: false });
      cleanup.current = stop;
    },
  });

  return (
    <DragContext.Provider value={{ dragged, over, bind }}>
      {children}
      {dragged && ghost && (
        <div className={accepts(dragged, over) ? 'drag-ghost ok' : 'drag-ghost'} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          {dragged.label}
        </div>
      )}
    </DragContext.Provider>
  );
}

/** Eine Stelle der Anziehpuppe: Name der Stelle, was dort ist, ✕ zum Ablegen; zieht und nimmt auf. */
function SlotBox({ member, name, slot }: { member: string; name: string; slot: EquipSlotView }) {
  const game = useGame();
  const { dragged, over, bind } = useDrag();
  const id = `${member}:${slot.slot}`;
  const fits = dragged !== undefined && accepts(dragged, id);
  const fitsOf: readonly Slot[] = slot.slot === 'wears' ? ['wears'] : ['primary', 'secondary'];
  return (
    <div
      className={['doll-slot', `doll-${slot.slot}`, slot.item ? 'filled' : 'empty', dragged ? (fits ? 'droppable' : 'blocked') : '', over === id && fits ? 'over' : ''].filter(Boolean).join(' ')}
      aria-label={`${name}, ${slotNames[slot.slot]}: ${slot.label ?? 'leer'}`}
      data-drop={id}
      {...(slot.item && slot.label ? bind({ from: member, fromSlot: slot.slot, fits: fitsOf, label: slot.label }) : {})}
    >
      <span className="doll-slot-name">{slotNames[slot.slot]}</span>
      <span className="doll-slot-item">{slot.label ?? <span className="muted">{slot.slot === 'wears' ? 'keine' : 'Hände'}</span>}</span>
      {(slot.inHand || slot.rounds) && (
        <span className="doll-slot-meta">
          {slot.inHand && <span className="doll-hand">in der Hand</span>}
          {slot.rounds && <span className="mono">{slot.rounds}</span>}
        </span>
      )}
      {slot.item && (
        <button type="button" className="icon-button doll-off" aria-label={`${slot.label} ablegen`} title="Ins Gepäck legen" onClick={() => game.unequip(member, slot.slot)}>
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

/**
 * Die Anziehpuppe eines SC in seiner Charakterkachel: eine schlichte Figur, in ihrer rechten Hand
 * (vom Betrachter links) die Primärwaffe, in der linken die Sekundärwaffe, am Körper die Rüstung. Die
 * Hand mit der Waffe, die er führt, leuchtet. Auf eine Stelle zieht man aus dem Gepäck oder von einem
 * anderen SC; ✕ legt ab.
 */
export function EquipSlots({ member, name, slots }: { member: string; name: string; slots: readonly EquipSlotView[] }) {
  const at = (s: Slot) => slots.find((x) => x.slot === s)!;
  const primary = at('primary');
  const secondary = at('secondary');
  const armor = at('wears');
  return (
    <div className="doll" role="group" aria-label={`Ausrüstung von ${name}`}>
      <SlotBox member={member} name={name} slot={primary} />
      <div className="doll-figure">
        <svg viewBox="0 0 100 150" aria-hidden="true">
          <circle cx="50" cy="16" r="11" />
          <path className={armor.item ? 'doll-body worn' : 'doll-body'} d="M34 34 h32 l4 8 v44 h-40 v-44 z" />
          <path d="M34 38 L12 82 M66 38 L88 82 M40 86 L36 142 M60 86 L64 142" />
          <circle className={primary.inHand ? 'doll-grip held' : 'doll-grip'} cx="12" cy="84" r="4" />
          <circle className={secondary.inHand ? 'doll-grip held' : 'doll-grip'} cx="88" cy="84" r="4" />
        </svg>
        <SlotBox member={member} name={name} slot={armor} />
      </div>
      <SlotBox member={member} name={name} slot={secondary} />
    </div>
  );
}

/**
 * Das Gruppengepäck unter den Charakterkacheln: Last gegen Traglast als Balken, darunter, was drin
 * ist, mit Gewicht. Ausrüstbares zieht man auf eine Stelle einer Anziehpuppe oder wählt es mit
 * „Ausrüsten …“; was man von einer Stelle hierher zieht, wird abgelegt.
 */
export function StashPack({ stash }: { stash: StashView }) {
  const game = useGame();
  const { dragged, over, bind } = useDrag();
  const ratio = stash.capacity > 0 ? stash.load / stash.capacity : stash.load > 0 ? 3 : 0;
  const takes = dragged !== undefined && accepts(dragged, 'stash');
  return (
    <section className="stash" aria-labelledby="stash-title">
      <h2 id="stash-title" className="section-title">
        Gepäck
      </h2>
      {stash.error && (
        <p className="error" role="alert">
          {stash.error}
        </p>
      )}
      <div className={['stash-pack', takes ? 'droppable' : '', over === 'stash' && takes ? 'over' : ''].filter(Boolean).join(' ')} data-drop="stash">
        <div className="stash-load" aria-label={`Last ${kg(stash.load)} von ${kg(stash.capacity)} kg`}>
          <span className="stash-load-text">
            Last <b>{kg(stash.load)}</b> / {kg(stash.capacity)} kg
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
              <li key={item.key} className={item.fits.length > 0 ? 'stash-item equipable' : 'stash-item'} {...(item.fits.length > 0 ? bind({ key: item.key, fits: item.fits, label: item.label }) : {})}>
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
