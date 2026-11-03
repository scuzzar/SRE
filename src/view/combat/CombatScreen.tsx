import { useCallback, useState } from 'react';
import { DiceRoll } from '../oracle/DiceRoll';
import type { CombatView, HealingView, Snapshot } from '../../controller';
import { EncounterIntro, FightScreen } from './FightScreen';
import { armorText, attackText, characteristicLabel, damageDetail, hex, partLabel, rangeMeters, rangeShort, rangeText, signed, woundStateText } from '../format';
import { CloseIcon } from '../icons';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import { CharacterStrip } from '../oracle/CharacterStrip';

/**
 * Der Reiter Kampf, in zwei Modi. Ohne laufende Begegnung die **Waffentabelle**: oben die Leiste mit
 * dem Charakter oben und seinen Waffen, Begegnung würfeln, die getragene Rüstung und die klassische
 * Tabelle der Waffe in der Hand (Rüstung × Reichweite, in jeder Zelle der nötige Wurf). Mit laufender
 * Begegnung die **Kampfsimulation** (FightScreen). Gerechnet wird im Model; die View zeigt nur.
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
      {/* Die SC stehen oben in der Leiste, auch in der Kampfsimulation; die Liste dort zeigt nur die NSC. */}
      <CharacterStrip view={view} weapons />
      {!combat ? (
        <section className="scroll combat-scroll">
          <p className="log-empty">Ohne lebenden Charakter gibt es keinen Angriff.</p>
        </section>
      ) : combat.sim ? (
        <FightScreen combat={combat} onHeal={setPatient} />
      ) : (
        <>
          <section className="scroll combat-scroll" aria-label="Waffentabelle">
            <EncounterStart combat={combat} />
            <ArmorChips combat={combat} onHeal={setPatient} />
            <WeaponHead combat={combat} />
            <AttackTable combat={combat} />
            <Recent combat={combat} />
          </section>
          <AttackDock combat={combat} />
        </>
      )}
      {combat?.intro && combat.sim && <EncounterIntro sim={combat.sim} />}
      {combat?.wounding && <WoundingDialog key={`${combat.wounding.victim}-${combat.wounding.dice.join('-')}-${view.log.length}`} combat={combat} />}
      {combat && patient && healing && <HealDialog key={patient.npc ?? patient.pc ?? 'pc'} patient={patient} healing={healing} note={combat.note} onClose={() => setPatient(undefined)} />}
    </div>
  );
}

/** Eine Begegnung würfeln oder wählen, mit Gelände für die Entfernung; danach beginnt die Kampfsimulation. */
function EncounterStart({ combat }: { combat: CombatView }) {
  const game = useGame();
  // Das Gelände gilt erst beim Würfeln; bis dahin hält es nur die View.
  const [terrain, setTerrain] = useState('');
  const ground = terrain || undefined;
  return (
    <div className="encounter">
      <div className="encounter-start">
        <button
          type="button"
          className="primary"
          disabled={!combat.canEncounter}
          onClick={() => {
            haptic('shake');
            game.rollEncounter(undefined, ground);
          }}
        >
          Begegnung würfeln
        </button>
        <select aria-label="Begegnung wählen" value="" disabled={!combat.canEncounter} onChange={(e) => e.target.value && game.rollEncounter(Number(e.target.value), ground)}>
          <option value="">oder wählen …</option>
          {combat.encounterTypes.map((t) => (
            <option key={t.roll} value={t.roll}>
              {t.roll} · {t.quantity}W6 {t.name}
            </option>
          ))}
        </select>
      </div>
      <label className="field encounter-terrain">
        <span>Gelände (DM auf die Entfernung)</span>
        <select value={terrain} disabled={!combat.canEncounter} onChange={(e) => setTerrain(e.target.value)}>
          <option value="">ohne (±0)</option>
          {combat.terrains.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({signed(t.dm)})
            </option>
          ))}
        </select>
      </label>
      <LocationPick combat={combat} />
      {combat.note && <p className="combat-hint">{combat.note}</p>}
    </div>
  );
}

/** Wo die Gruppe ist; ohne Aufenthaltsort gibt es keine Begegnung. Gibt es keine fertige Welt, geht es zum Sektor. */
function LocationPick({ combat }: { combat: CombatView }) {
  const game = useGame();
  if (combat.worlds.length === 0) {
    return (
      <div className="location-pick">
        <p className="combat-hint">Eine Begegnung findet auf einer Welt statt. Erst im Sektor eine Welt erschaffen.</p>
        <button type="button" className="ghost" onClick={() => game.showScreen('sector')}>
          Zum Sektor
        </button>
      </div>
    );
  }
  return (
    <label className="field location-pick">
      <span>{combat.location ? 'Die Gruppe ist auf' : 'Wo ist die Gruppe? (für Begegnungen nötig)'}</span>
      <select value={combat.location ?? ''} onChange={(e) => e.target.value && game.stayAt(e.target.value)}>
        {!combat.location && <option value="">Welt wählen …</option>}
        {combat.worlds.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.id} · {w.uwp})
          </option>
        ))}
      </select>
    </label>
  );
}

/** Die getragene Rüstung des Charakters oben, und wie verwundet er ist. */
function ArmorChips({ combat, onHeal }: { combat: CombatView; onHeal: (patient: Patient) => void }) {
  const game = useGame();
  const physical = (['str', 'dex', 'end'] as const).map((k) => `${k.toUpperCase()} ${hex(Math.max(0, combat.current[k]))}`);
  return (
    <div className="combat-armor">
      <div className="chips" role="group" aria-label={`Rüstung von ${combat.character}`}>
        <span className="chips-label" aria-hidden="true">
          {combat.character.split(' ')[0]} trägt
        </span>
        <button type="button" aria-pressed={!combat.armors.some((a) => a.worn)} onClick={() => game.wear(undefined)}>
          Keine Rüstung
        </button>
        {combat.armors.map((a) => (
          <button key={a.id} type="button" aria-pressed={a.worn} onClick={() => game.wear(a.id)}>
            {a.label}
          </button>
        ))}
      </div>
      {combat.state !== 'unhurt' && (
        <div className="combat-state-row">
          <p className={`combat-state state-${combat.state}`}>
            {combat.character}: {woundStateText[combat.state]}
            {combat.healing.serious ? ' (schwere Wunde)' : ''} · {physical.join(' · ')}
          </p>
          {(combat.healing.wake || combat.healing.treatable) && (
            <button type="button" className="ghost compact" onClick={() => onHeal({ npc: undefined, name: combat.character })}>
              Heilen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function WeaponHead({ combat }: { combat: CombatView }) {
  const { weapon, base } = combat;
  const characteristic = characteristicLabel[weapon.characteristic];
  return (
    <div className="weapon-head">
      {combat.npcAttacks && combat.defender && (
        <p className="combat-who">
          <b>{combat.attacker}</b> greift <b>{combat.defender.name}</b> an ({armorText[combat.defender.armor]})
        </p>
      )}
      {!combat.npcAttacks && combat.defender && (
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

/** Die Tabelle der Waffe: Köpfe mit den DMs der Matrix, Zellen mit dem nötigen Wurf auf 2W6. */
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
                <span className="head-name">{rangeShort[r.range]}</span>
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

/** Die letzten Angriffe mit ihrem Schaden; den ganzen Verlauf zeigt der Log im Orakel-Screen. */
function Recent({ combat }: { combat: CombatView }) {
  if (combat.recent.length === 0) return null;
  return (
    <div className="combat-recent">
      <h2 className="section-title">Letzte Angriffe</h2>
      <ol>
        {[...combat.recent].reverse().map(({ index, item, damage }) => (
          <li key={index} className="combat-recent-item">
            <span className={item.success ? 'verdict' : 'verdict negative'}>{item.success ? 'TREFFER' : 'DANEBEN'}</span>
            <span>
              {item.character}
              {item.victim ? ` → ${item.victim}` : ''} · {item.weapon} · {armorText[item.armor]}, {rangeText[item.range]}
            </span>
            <span className="muted mono">
              {item.dice[0]} + {item.dice[1]} {signed(item.dm)} = {item.total}
              {damage ? ` · Schaden ${damageDetail(damage)}` : item.damagePending ? ' · Schaden offen' : ''}
            </span>
          </li>
        ))}
      </ol>
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
            Schaden würfeln ({combat.damage.wounds}W6)
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
          {combat.npcAttacks ? `${combat.attacker.split(' ')[0]} greift an` : 'Angreifen'}
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
    const item = { kind: 'damage' as const, at: '', of: -1, weapon: w.weapon, victim: w.victim, dice: w.dice, to: undefined, damage: w.dice.reduce((a, b) => a + b, 0) };
    return <DiceRoll item={item} seed={w.dice.reduce((a, b) => a * 7 + b, 1)} onDone={done} />;
  }
  return <WoundingChoice combat={combat} />;
}

function WoundingChoice({ combat }: { combat: CombatView }) {
  const game = useGame();
  const w = combat.wounding!;
  const next = w.to.length;
  const taken = (c: 'STR' | 'DEX' | 'END') => w.to.reduce((sum, to, i) => (to === c ? sum + w.dice[i]! : sum), 0);
  const value = (c: 'STR' | 'DEX' | 'END') => w.current[c.toLowerCase() as 'str' | 'dex' | 'end'];
  return (
    <div className="modal">
      <section className="result wounding" role="dialog" aria-modal="true" aria-labelledby="wounding-title">
        <span className="kicker">Schaden verteilen</span>
        <h2 id="wounding-title" className="shop-buy-title">
          {w.victim} · {w.weapon} · {w.dice.length}W6
        </h2>
        <p className="muted">Jeder Würfel geht ganz auf ein Attribut; was über 0 hinausgeht, verfällt.</p>
        <ol className="wound-dice mono">
          {w.dice.map((d, i) => (
            <li key={i} className={i === next ? 'next' : i < next ? 'done' : undefined}>
              {d}
              {i < next ? ` → ${w.to[i]}` : ''}
            </li>
          ))}
        </ol>
        <div className="wound-targets">
          {(['STR', 'DEX', 'END'] as const).map((c) => (
            <button key={c} type="button" className="ghost" disabled={next >= w.dice.length} onClick={() => game.assignWound(c)}>
              {c} {hex(Math.max(0, value(c)))}
              {taken(c) > 0 ? ` −${taken(c)}` : ''}
            </button>
          ))}
        </div>
        <div className="roll-actions">
          <button type="button" className="ghost" disabled={next === 0} onClick={() => game.unassignWound()}>
            Zurück
          </button>
          <button
            type="button"
            className="primary"
            disabled={next < w.dice.length}
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
