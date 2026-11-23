/** Der Reiter Computer: CPU, Speicher und Archiv des Rechners, Umstecken durch Ziehen, Kauf in der Werft (2026-11-22d). */
import { useState } from 'react';
import type { ProgramRow, ShipView, SoftwareOfferRow, SoftwareSlot, VesselSoftwareRow } from '../../controller';
import { useGame } from '../game-context';
import { mcr, softwarePrice } from '../format';
import { SheetFrame } from './SheetFrame';
import { useDrag } from '../drag';
import { TrashIcon } from '../icons';
/** Die Ablagen des Rechners, in der Reihenfolge der Oberfläche (SR 38). */
const SLOTS: readonly { readonly slot: SoftwareSlot; readonly label: string }[] = [
  { slot: 'cpu', label: 'CPU · läuft' },
  { slot: 'storage', label: 'Speicher · bereit' },
  { slot: 'archive', label: 'Archiv' },
];

/** Die Programme in der Reihenfolge der Ablagen. */
const inSlot = (boat: VesselSoftwareRow, slot: SoftwareSlot): readonly ProgramRow[] => boat.programs.filter((p) => p.slot === slot);

/**
 * CPU, Speicher und Archiv des Rechners untereinander (Vorbild docs/mock/computer-programme.html).
 * Die Blätter dazu öffnet der Reiter Schiff, sie stehen dort an der Stelle des Reiters wie die
 * übrigen Blätter; `onOpenProgram` nennt das Schiff, `onOpenYard` führt in die Software-Werft.
 */
export function ComputerTab({ ship, onOpenProgram, onOpenYard }: { readonly ship: ShipView; readonly onOpenProgram: (shipId: string, program: string) => void; readonly onOpenYard: () => void }) {
  const game = useGame();
  const boats = ship.ship?.computers ?? [];
  const [vessel, setVessel] = useState(0);
  const boat = boats[Math.min(vessel, boats.length - 1)];
  const drag = useDrag<string>({
    onDrop: (program, target) => game.plugProgram(program, target.slice(5) as SoftwareSlot),
    blocker: (program, target) => (boat === undefined ? 'kein Rechner' : boat.programs.find((p) => p.id === program)?.blocked[target.slice(5) as SoftwareSlot]),
  });
  if (boat === undefined) return null;
  const gezogene = drag.dragging === undefined ? undefined : boat.programs.find((p) => p.id === drag.dragging?.payload)?.name;

  return (
    <div className="computer">
      {boats.length > 1 && (
        <div className="segmented" style={{ gridTemplateColumns: `repeat(${boats.length}, minmax(0, 1fr))` }} role="tablist" aria-label="Schiff">
          {boats.map((c, i) => (
            <button type="button" key={c.shipId} role="tab" aria-selected={i === vessel} onClick={() => setVessel(i)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="comp-head">
        <b>{boat.computer}</b>
        {boat.computer !== 'kein Rechner' && (
          <span className="mono comp-use">
            CPU <strong>{boat.cpu}</strong>/{boat.cpuMax} · Speicher <strong>{boat.storage}</strong>/{boat.storageMax}
          </span>
        )}
      </div>
      {boat.missing.length > 0 && <p className="comp-warn mono">Pflicht in der CPU: {boat.missing.join(', ')}</p>}
      {boat.computer === 'kein Rechner' ? (
        <p className="crew-note">Kein Rechner. Fliegt und feuert ohne Programme, DM −1.</p>
      ) : (
        <>
          {SLOTS.map(({ slot, label }) => (
            <div className={`zone ${slot}${drag.dragging?.over === `slot:${slot}` ? (drag.dragging.refused ? ' nope' : ' drop') : ''}`} key={slot} {...drag.target(`slot:${slot}`)}>
              <div className="zone-head">
                <span>{label}</span>
                <span className="spacer" />
                <span className="mono zone-use">{slot === 'archive' ? inSlot(boat, slot).length : `${used(boat, slot)}/${slot === 'cpu' ? boat.cpuMax : boat.storageMax}`}</span>
              </div>
              <div className="prog-row">
                {inSlot(boat, slot).map((p) => (
                  <span className={`prog${p.slot === 'cpu' ? ' runs' : ''}${p.works ? '' : ' off'}`} role="button" aria-label={`${p.name} in ${label}`} key={p.id} {...drag.props(p.id, () => onOpenProgram(boat.shipId, p.id))}>
                    <b>{p.name}</b>
                    <span className="mono prog-space">{p.space}</span>
                    <span className="prog-effect">{p.effect}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="yard-line" onClick={onOpenYard}>
            <b>Werft</b>
            <span className="muted">Software kaufen</span>
            <span className="spacer" />
            <span className="mono">{mcr(ship.funds)}</span>
          </button>
        </>
      )}
      {drag.dragging !== undefined && (
        <div className={`drag-ghost${drag.dragging.refused ? ' refused' : ''}`} style={{ left: drag.dragging.x, top: drag.dragging.y }}>
          {gezogene}
        </div>
      )}
    </div>
  );
}

/** Wie viel Space in einer Ablage liegt. */
function used(boat: VesselSoftwareRow, slot: SoftwareSlot): number {
  return inSlot(boat, slot).reduce((sum, p) => sum + p.space, 0);
}

/** Das Blatt am Programm: umstecken in eine der drei Ablagen, oder wegwerfen. */
export function ProgramSheet({ boat, program, onClose }: { readonly boat: VesselSoftwareRow; readonly program: ProgramRow; readonly onClose: () => void }) {
  const game = useGame();
  return (
    <SheetFrame
      className="two-col"
      title={program.name}
      aside={`${program.space} Space · ${softwarePrice(program.price)}`}
      onClose={onClose}
      foot={
        <button
          type="button"
          className="action soft"
          onClick={() => {
            game.discardProgram(program.id);
            onClose();
          }}
        >
          <TrashIcon />
          Werfen
        </button>
      }
    >
      <p className="sheet-effect">{program.effect}</p>
      <div className="shop-table" role="table" aria-label="Umstecken">
        {SLOTS.map(({ slot, label }) => {
          const here = program.slot === slot;
          const why = program.blocked[slot];
          return (
            <button
              type="button"
              key={slot}
              className="shop-row"
              disabled={here || why !== undefined}
              title={why}
              onClick={() => {
                game.plugProgram(program.id, slot);
                onClose();
              }}
            >
              <span>{label}</span>
              <span className="val mono">
                {here ? 'hier' : (why ?? `${free(boat, slot)}`)}
                {!here && why === undefined && <small>frei</small>}
              </span>
            </button>
          );
        })}
      </div>
    </SheetFrame>
  );
}

/** Wie viel Platz in einer Ablage bleibt. */
function free(boat: VesselSoftwareRow, slot: SoftwareSlot): number {
  return slot === 'cpu' ? boat.cpuMax - boat.cpu : slot === 'storage' ? boat.storageMax - boat.storage : boat.programs.filter((p) => p.slot === slot).length;
}

/** Die Werft: die Software-Liste der SE 13, ein Tippen kauft bar aus der Kasse. */
export function SoftwareYard({ ship, onClose }: { readonly ship: ShipView; readonly onClose: () => void }) {
  const game = useGame();
  const kinds = ['offensive', 'defensive', 'routine'];
  const names: Record<string, string> = { offensive: 'Offensiv', defensive: 'Defensiv', routine: 'Routine' };
  return (
    <SheetFrame className="two-col" title="Werft · Software" aside={mcr(ship.funds)} onClose={onClose}>
      {ship.error !== undefined && (
        <p className="error" role="alert">
          {ship.error}
        </p>
      )}
      {kinds.map((kind) => (
        <div key={kind}>
          <p className="group-label">{names[kind]}</p>
          <div className="shop-table" role="table" aria-label={names[kind]}>
            {ship.softwareOffer
              .filter((p) => p.kind === names[kind])
              .map((p) => (
                <SoftwareRow key={p.id} offer={p} onBuy={() => game.buyProgram(p.id)} />
              ))}
          </div>
        </div>
      ))}
    </SheetFrame>
  );
}

function SoftwareRow({ offer, onBuy }: { readonly offer: SoftwareOfferRow; readonly onBuy: () => void }) {
  return (
    <button type="button" className="shop-row" disabled={offer.blocker !== undefined} title={offer.blocker} onClick={onBuy}>
      <span className="shop-name">
        <span>
          {offer.name} <span className="prog-space mono">{offer.space} Space</span>
        </span>
        <small>{offer.effect}</small>
      </span>
      <span className="val mono">{offer.blocker ?? softwarePrice(offer.price)}</span>
    </button>
  );
}
