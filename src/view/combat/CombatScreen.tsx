import { useCallback, useState } from 'react';
import { DiceRoll } from '../oracle/DiceRoll';
import type { CombatView, HealingView, Snapshot } from '../../controller';
import { EncounterIntro, FightScreen, SurpriseDialog } from './FightScreen';
import { FireToggle } from './FireToggle';
import { armorText, attackText, characteristicLabel, hex, partLabel, rangeMeters, rangeShort, rangeText, rangeTiny, signed } from '../format';
import { CloseIcon } from '../icons';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import { CharacterStrip } from '../oracle/CharacterStrip';

/**
 * Der Reiter Kampf, in zwei Modi. Ohne laufende Begegnung die **Waffentabelle**: oben die Leiste mit
 * dem Charakter oben und seinen Waffen, die getragene Rüstung und die klassische Tabelle der Waffe in
 * der Hand (Rüstung × Reichweite, in jeder Zelle der nötige Wurf). Mit laufender Begegnung die
 * **Kampfsimulation** (FightScreen). Begegnungen würfelt man im Reiter Begegnung (EncounterScreen).
 * Gerechnet wird im Model; die View zeigt nur.
 */

/** Wen der Heilen-Dialog gerade zeigt: den Charakter oben oder einen NSC. Reine Anzeige. */
export interface Patient {
  readonly npc: string | undefined;
  /** In der Simulation: welcher SC; sonst der Charakter oben. */
  readonly pc?: string;
  readonly name: string;
}

export function CombatScreen({ view }: { view: Snapshot }) {
  const combat = view.combat;
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const healing = patient && combat && (patient.npc === undefined && !combat.sim ? combat.healing : combat.sim?.fighters.find((f) => f.id === (patient.npc ?? patient.pc))?.healing);
  return (
    <div className="screen">
      {/* Ohne Begegnung steht der Charakter oben in der Leiste; in der Kampfsimulation stehen die SC links in der Arena. */}
      {!combat?.sim && <CharacterStrip view={view} weapons heal={combat && pcHeal(combat, setPatient)} />}
      {!combat ? (
        <section className="scroll combat-scroll">
          <p className="log-empty">Ohne lebenden Charakter gibt es keinen Angriff.</p>
        </section>
      ) : combat.sim ? (
        <FightScreen combat={combat} onHeal={setPatient} quiet={view.result !== undefined || combat.wounding !== undefined} />
      ) : (
        <>
          <section className="scroll combat-scroll" aria-label="Waffentabelle">
            <WeaponHead combat={combat} />
            <AttackTable combat={combat} />
          </section>
          <AttackDock combat={combat} />
        </>
      )}
      {combat?.intro && combat.sim && <EncounterIntro sim={combat.sim} />}
      {combat?.surpriseShown && combat.sim && !combat.intro && <SurpriseDialog sim={combat.sim} />}
      {combat?.wounding && <WoundingDialog key={`${combat.wounding.victim}-${combat.wounding.dice.join('-')}-${view.log.length}`} combat={combat} />}
      {combat && patient && healing && <HealDialog key={patient.npc ?? patient.pc ?? 'pc'} patient={patient} healing={healing} note={combat.note} onClose={() => setPatient(undefined)} />}
    </div>
  );
}

/**
 * Heilen für den Charakter oben, wenn er verwundet ist und sich etwas tun lässt: in der Simulation als
 * Kämpfer, sonst mit den Werten der Waffentabelle. Der Knopf steht in der Leiste oben auf seiner Karte.
 */
function pcHeal(combat: CombatView, onHeal: (patient: Patient) => void): { readonly name: string; readonly onHeal: () => void } | undefined {
  const pc = combat.sim?.fighters.find((f) => f.side === 'pcs' && f.name === combat.character);
  const healing = combat.sim ? pc?.healing : combat.healing;
  if (!healing || !(healing.wake || healing.treatable)) return undefined;
  return { name: combat.character, onHeal: () => onHeal({ npc: undefined, ...(pc ? { pc: pc.id } : {}), name: combat.character }) };
}


function WeaponHead({ combat }: { combat: CombatView }) {
  const { weapon, base } = combat;
  const characteristic = characteristicLabel[weapon.characteristic];
  return (
    <div className="weapon-head">
      {combat.defender && (
        <p className="combat-who">
          Ziel: <b>{combat.defender.name}</b> ({armorText[combat.defender.armor]})
        </p>
      )}
      <div className="weapon-title">
        <h2 className="section-title">{weapon.name}</h2>
        <span className="muted">
          {attackText[weapon.attack]} · Schaden {weapon.wounds}W6
        </span>
      </div>
      {combat.ammo && (
        <p className={combat.ammo.rounds === 0 ? 'weapon-ammo empty' : 'weapon-ammo'}>
          Magazin {combat.ammo.rounds}/{combat.ammo.capacity} Schuss · {combat.ammo.magazines} × {combat.ammo.magazine}
        </p>
      )}
      {combat.fire && <FireToggle fire={combat.fire} />}
      <p className="weapon-dms">
        {base.map(partLabel).join(' · ')}
        <span className="muted">
          {' '}
          ({characteristic} unter {hex(weapon.required)} {signed(weapon.requiredDm)}, ab {hex(weapon.advantageous)} {signed(weapon.advantageousDm)})
        </span>
      </p>
    </div>
  );
}

/** Die Tabelle der Waffe: Köpfe mit den DMs der Matrix, Zellen mit dem nötigen Wurf auf 2W6. Reichweiten, in die sie nicht reicht, stehen schmal. */
function AttackTable({ combat }: { combat: CombatView }) {
  const game = useGame();
  return (
    <div className="combat-table-wrap">
      <table className="combat-table">
        <caption className="visually-hidden">Nötiger Wurf mit {combat.weapon.name} je Rüstung und Reichweite des Ziels; antippen wählt das Ziel.</caption>
        <thead>
          <tr>
            <th scope="col" className="corner">
              <span>Rüstung</span>
              <span>Reichw.</span>
            </th>
            {combat.ranges.map((r) => (
              <th key={r.range} scope="col" className={r.dm === undefined ? 'out' : undefined} title={rangeMeters[r.range]}>
                <span className="head-name">{r.dm === undefined ? rangeTiny[r.range] : rangeShort[r.range]}</span>
                <span className="head-dm">{r.dm === undefined ? 'no' : signed(r.dm)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {combat.rows.map((row) => (
            <tr key={row.armor} className={row.fixed ? 'fixed' : undefined}>
              <th scope="row">
                <span className="head-name">{armorText[row.armor]}</span>
                <span className="head-dm">{signed(row.dm)}</span>
              </th>
              {row.cells.map((cell) => (
                <td key={cell.range}>
                  {cell.odds ? (
                    <button
                      type="button"
                      className={['cell-button', cell.odds.chance <= 0 ? 'impossible' : '', cell.odds.chance >= 100 ? 'sure' : ''].filter(Boolean).join(' ')}
                      aria-pressed={cell.chosen}
                      disabled={!cell.open}
                      aria-label={`${armorText[row.armor]}, ${rangeText[cell.range]}: braucht ${cell.odds.need}+, ${Math.round(cell.odds.chance)} %`}
                      onClick={() => {
                        haptic('pick');
                        game.chooseTarget(row.armor, cell.range);
                      }}
                    >
                      {cell.odds.need <= 2 ? '2+' : `${cell.odds.need}+`}
                    </button>
                  ) : (
                    <span className="cell-out" aria-label={`${rangeText[cell.range]}: kein Angriff`}>
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="combat-hint">Zelle antippen: Rüstung und Reichweite des Ziels. In der Zelle steht der nötige Wurf auf 2W6 (8+ mit allen DMs).</p>
    </div>
  );
}

function AttackDock({ combat }: { combat: CombatView }) {
  const game = useGame();
  const target = combat.target;
  return (
    <section className="dock" aria-label="Angreifen">
      <div className="actions">
        {combat.damage && (
          <button
            type="button"
            className="action draw"
            onClick={() => {
              haptic('shake');
              game.rollDamage();
            }}
          >
            <DiceIcon />
            {combat.damage.victim ? `Schaden ${combat.damage.victim.split(' ')[0]}` : 'Schaden würfeln'} ({combat.damage.label})
          </button>
        )}
        {combat.ammo && (combat.ammo.rounds < combat.ammo.capacity || combat.ammo.rounds === 0) && (
          <button
            type="button"
            className="action dice"
            disabled={combat.ammo.magazines === 0}
            onClick={() => {
              haptic('pick');
              game.reload();
            }}
          >
            Nachladen ({combat.ammo.magazines})
          </button>
        )}
        <button
          type="button"
          className="action task-roll"
          disabled={!target || !combat.canAttack}
          onClick={() => {
            haptic('land');
            game.rollAttack();
          }}
        >
          <CombatIcon />
          Angreifen
        </button>
      </div>
    </section>
  );
}

/** Schaden an einem SC: Der Spieler gibt jedem Würfel ein Attribut, dann kommt er in den Log. */
export function WoundingDialog({ combat }: { combat: CombatView }) {
  const w = combat.wounding!;
  // Erst rollen die Würfel im Vordergrund, dann verteilt man sie; das ist nur Anzeige.
  const [rolled, setRolled] = useState(false);
  const done = useCallback(() => setRolled(true), []);
  if (!rolled) {
    const item = { kind: 'damage' as const, at: '', of: -1, weapon: w.weapon, victim: w.victim, dice: w.dice, fixed: undefined, blocks: undefined, damage: w.dice.reduce((a, b) => a + b, 0) };
    return <DiceRoll item={item} seed={w.dice.reduce((a, b) => a * 7 + b, 1)} onDone={done} />;
  }
  return <WoundingChoice combat={combat} />;
}

function WoundingChoice({ combat }: { combat: CombatView }) {
  const game = useGame();
  const w = combat.wounding!;
  const next = w.next;
  const taken = (c: 'STR' | 'DEX' | 'END') => w.blocks.flat().reduce((sum, b) => (b.to === c ? sum + b.points : sum), 0);
  const value = (c: 'STR' | 'DEX' | 'END') => w.current[c.toLowerCase() as 'str' | 'dex' | 'end'];
  const state = (i: number) => (next && i === next.die ? 'next' : !next || i < next.die ? 'done' : undefined);
  return (
    <div className="modal">
      <section className="result wounding" role="dialog" aria-modal="true" aria-labelledby="wounding-title">
        <span className="kicker">Schaden verteilen</span>
        <h2 id="wounding-title" className="shop-buy-title">
          {w.victim} · {w.weapon} · {w.dice.length}W6
        </h2>
        <p className="muted">
          {next && next.rest < w.dice[next.die]!
            ? `Übergelaufen: Die restlichen ${next.rest} gehen auf ein anderes Attribut.`
            : 'Jeder Würfel geht ganz auf ein Attribut; bringt er es auf 0, läuft der Rest über.'}
        </p>
        <ol className="wound-dice mono">
          {w.dice.map((d, i) => (
            <li key={i} className={state(i)}>
              {d}
              {w.blocks[i]!.length > 0 ? ` → ${w.blocks[i]!.map((b) => (w.blocks[i]!.length > 1 ? `${b.to} ${b.points}` : b.to)).join(', ')}` : ''}
            </li>
          ))}
        </ol>
        <div className="wound-targets">
          {(['STR', 'DEX', 'END'] as const).map((c) => (
            <button key={c} type="button" className="ghost" disabled={!next || !next.open.includes(c)} onClick={() => game.assignWound(c)}>
              {c} {hex(Math.max(0, value(c)))}
              {taken(c) > 0 ? ` −${taken(c)}` : ''}
            </button>
          ))}
        </div>
        <div className="roll-actions">
          <button type="button" className="ghost" disabled={!w.chosen} onClick={() => game.unassignWound()}>
            Zurück
          </button>
          <button
            type="button"
            className="primary"
            disabled={next !== undefined}
            onClick={() => {
              haptic('land');
              game.confirmWounding();
            }}
          >
            Übernehmen
          </button>
        </div>
      </section>
    </div>
  );
}

/** Heilen nach S. 7: Aufwachen, Behandlung durch einen SC, Ruhe. Was geht, sagt das Model. */
export function HealDialog({ patient, healing, note, onClose }: { patient: Patient; healing: HealingView; note: string | undefined; onClose: () => void }) {
  const game = useGame();
  const able = healing.healers.filter((h) => h.able);
  const [healer, setHealer] = useState(able[0]?.id ?? '');
  const [facility, setFacility] = useState(false);
  const done = (how: 'wake' | 'treatment' | 'rest') => {
    haptic('pick');
    game.recover(how, patient.npc, how === 'treatment' ? healer : undefined, facility, patient.pc);
    if (how !== 'wake') onClose();
  };
  return (
    <div className="modal">
      <section className="result heal" role="dialog" aria-modal="true" aria-labelledby="heal-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="heal-title" className="shop-buy-title">
            {patient.name} heilen
          </h2>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="muted">{healing.serious ? 'Schwere Wunde: Sie heilt nur mit Behandlung (Medical-3, medizinische Einrichtung, 5W6 Tage).' : 'Leichte Wunde: Behandlung mit Medical-1 und Medical Kit (30 Minuten) oder 3 Tage Ruhe.'}</p>
        {note && (
          <p className="error" role="alert">
            {note}
          </p>
        )}
        {healing.wake && (
          <button type="button" className="ghost" onClick={() => done('wake')}>
            Aufwachen {healing.serious ? '(nach 3 Stunden; Werte bleiben, mindestens 1)' : '(nach 10 Minuten; halbe Wunden zurück)'}
          </button>
        )}
        {healing.treatable && able.length === 0 && (
          <p className="muted">Behandeln kann gerade niemand: {healing.healers.map((h) => `${h.name} ${h.why}`).join(', ')}.</p>
        )}
        {healing.treatable && able.length > 0 && (
          <>
            <label className="field">
              <span>Behandelt von</span>
              <select value={healer} onChange={(e) => setHealer(e.target.value)}>
                {healing.healers.map((h) => (
                  <option key={h.id} value={h.id} disabled={!h.able}>
                    {h.name}
                    {h.why ? ` – ${h.why}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {healing.serious && (
              <label className="toggle">
                <input type="checkbox" checked={facility} onChange={(e) => setFacility(e.target.checked)} />
                <span>In einer medizinischen Einrichtung (Krankenhaus, Sick Bay)</span>
              </label>
            )}
            <button type="button" className="primary" disabled={!healer || (healing.serious && !facility)} onClick={() => done('treatment')}>
              Behandeln {healing.serious ? '(5W6 Tage)' : '(30 Minuten)'}
            </button>
          </>
        )}
        {healing.rest && (
          <button type="button" className="ghost" onClick={() => done('rest')}>
            3 Tage Ruhe
          </button>
        )}
      </section>
    </div>
  );
}
