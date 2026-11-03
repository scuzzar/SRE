import { useState } from 'react';
import type { CombatView, FighterView, SimView } from '../../controller';
import { damageDetail, hex, partLabel, rangeText, signed, woundStateText } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import type { Patient } from './CombatScreen';

/**
 * Die Kampfsimulation einer laufenden Begegnung: oben Runde, Entfernung und Überraschung, darunter
 * die Kämpfer in Zugreihenfolge. Wer am Zug ist, wählt nur ein Ziel und würfelt; Rüstung ist die des
 * Ziels, Reichweite die Entfernung. Nach einem Treffer der Schaden, dann der nächste Zug.
 */
export function FightScreen({ combat, onHeal }: { combat: CombatView; onHeal: (patient: Patient) => void }) {
  const sim = combat.sim!;
  return (
    <>
      <section className="scroll combat-scroll fight" aria-label="Kampfsimulation">
        <FightHead sim={sim} />
        <RangeBar sim={sim} />
        <Fighters sim={sim} side={sim.first} onHeal={onHeal} />
        <Fighters sim={sim} side={sim.first === 'pcs' ? 'npcs' : 'pcs'} onHeal={onHeal} />
        <Recent combat={combat} />
      </section>
      <FightDock combat={combat} sim={sim} />
    </>
  );
}

const sideName = { pcs: 'SC', npcs: 'NSC' } as const;

function FightHead({ sim }: { sim: SimView }) {
  const game = useGame();
  const surprise = sim.pcSurprise && sim.npcSurprise ? `Überraschung: SC ${sim.pcSurprise.die}${signed(sim.pcSurprise.dm)} gegen NSC ${sim.npcSurprise.die}${signed(sim.npcSurprise.dm)}` : undefined;
  return (
    <div className="fight-head">
      <div className="encounter-head">
        <h2 className="section-title">
          Runde {sim.round} · {sim.fighters.filter((f) => f.side === 'npcs').length} × {sim.name}
        </h2>
        <button type="button" className="ghost compact" onClick={() => game.endEncounter()}>
          Beenden
        </button>
      </div>
      <p className="encounter-reaction">
        Reaktion {sim.reaction}: {sim.reactionText}
      </p>
      {surprise && (
        <p className="encounter-reaction">
          {surprise}
          {sim.surprise ? ` – die ${sideName[sim.surprise]} haben Überraschung und ziehen in Runde 1 allein.` : ` – die ${sideName[sim.first]} ziehen zuerst.`}
        </p>
      )}
      {sim.defeated && <p className="fight-decided">Entschieden: Die {sideName[sim.defeated]} sind außer Gefecht.</p>}
    </div>
  );
}

/** Die Entfernung für alle Angriffe; gewürfelt, jederzeit änderbar. */
function RangeBar({ sim }: { sim: SimView }) {
  const game = useGame();
  return (
    <div className="fight-range">
      <span className="small-label">
        Entfernung
        {sim.rangeDice ? ` (2W6: ${sim.rangeDice[0]} + ${sim.rangeDice[1]}${sim.terrain ? `, ${sim.terrain.name} ${signed(sim.terrain.dm)}` : ''})` : ''}
      </span>
      <div className="segmented fight-ranges" role="radiogroup" aria-label="Entfernung">
        {sim.ranges.map((r) => (
          <button key={r.range} type="button" role="radio" aria-checked={sim.range === r.range} className={r.reaches ? undefined : 'out'} onClick={() => game.setRange(r.range)}>
            {rangeText[r.range]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Die Kämpfer einer Partei; wer zum Ziel dessen am Zug taugt, lässt sich antippen. */
function Fighters({ sim, side, onHeal }: { sim: SimView; side: 'pcs' | 'npcs'; onHeal: (patient: Patient) => void }) {
  const fighters = sim.fighters.filter((f) => f.side === side);
  if (fighters.length === 0) return null;
  return (
    <div className="fighters">
      <h3 className="section-title" style={{ fontSize: 11 }}>
        {side === 'pcs' ? 'Spielercharaktere' : 'NSC'}
      </h3>
      <ol className="fighter-list">
        {fighters.map((f) => (
          <FighterRow key={f.id} fighter={f} onHeal={onHeal} />
        ))}
      </ol>
    </div>
  );
}

function FighterRow({ fighter: f, onHeal }: { fighter: FighterView; onHeal: (patient: Patient) => void }) {
  const game = useGame();
  // Ob „Übernehmen als SC / als NSC“ offen ist, ist reine Anzeige.
  const [adopting, setAdopting] = useState(false);
  const physical = (['str', 'dex', 'end'] as const).map((k) => ({ k, value: f.current[k], hurt: f.current[k] < f.upp[k] }));
  const classes = ['fighter', f.turn ? 'turn' : '', f.targeted ? 'targeted' : '', f.acted ? 'acted' : '', f.state === 'dead' ? 'out' : ''].filter(Boolean).join(' ');
  const pick = () => {
    if (!f.targetable) return;
    haptic('pick');
    game.chooseFightTarget(f.id);
  };
  return (
    <li className={classes}>
      <button type="button" className="fighter-main" aria-pressed={f.targetable ? f.targeted : undefined} disabled={!f.targetable} onClick={pick} aria-label={`${f.name}${f.turn ? ', am Zug' : ''}${f.targetable ? ', als Ziel wählen' : ''}`}>
        <span className="fighter-name">
          {f.turn && <span className="fighter-turn">▶ </span>}
          {f.name}
          {f.leader && <span className="npc-leader"> · Anführer</span>}
        </span>
        <span className={`npc-state state-${f.state}`}>
          {woundStateText[f.state]}
          {f.acted ? ' · war dran' : ''}
        </span>
        <span className="npc-stats mono">
          {physical.map((p) => (
            <span key={p.k} className={p.hurt ? 'hurt' : undefined}>
              {p.k.toUpperCase()} {hex(Math.max(0, p.value))}
            </span>
          ))}
          <span className="muted">
            {f.weapon} ({f.skill}) · {f.armor ?? 'keine Rüstung'}
          </span>
        </span>
      </button>
      {(f.healing.wake || f.healing.treatable || f.side === 'npcs') && (
        <div className="npc-actions">
          {(f.healing.wake || f.healing.treatable) && (
            <button type="button" className="ghost compact" onClick={() => onHeal(f.side === 'npcs' ? { npc: f.id, name: f.name } : { npc: undefined, pc: f.id, name: f.name })}>
              Heilen
            </button>
          )}
          {f.side === 'npcs' && f.state !== 'dead' &&
            (adopting ? (
              <>
                <button type="button" className="ghost compact" onClick={() => game.adoptNpc(f.id, false)}>
                  Als SC
                </button>
                <button type="button" className="ghost compact" onClick={() => game.adoptNpc(f.id, true)}>
                  Als NSC
                </button>
              </>
            ) : (
              <button type="button" className="ghost compact" onClick={() => setAdopting(true)}>
                Übernehmen
              </button>
            ))}
        </div>
      )}
    </li>
  );
}

/** Die letzten Angriffe mit ihrem Schaden. */
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
              {item.victim ? ` → ${item.victim}` : ''} · {item.weapon}
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

/** Unten: wer am Zug ist, gegen wen, was er braucht; Angreifen, Schaden, Nachladen, Aussetzen. */
function FightDock({ combat, sim }: { combat: CombatView; sim: SimView }) {
  const game = useGame();
  const turn = sim.turn;
  const target = turn?.target === undefined ? undefined : sim.fighters.find((f) => f.id === turn.target);
  const empty = turn?.ammo?.rounds === 0;
  return (
    <section className="dock" aria-label="Zug">
      {turn ? (
        <div className="fight-turn" aria-live="polite">
          <strong>
            {turn.name} ({turn.weapon}) {target ? `→ ${target.name}` : '– Ziel antippen'}
          </strong>
          <span className="task-figures">
            {!turn.reaches
              ? `Reicht nicht auf ${rangeText[sim.range]}.`
              : turn.odds
                ? `${turn.odds.parts.map(partLabel).join(', ')} · ${turn.odds.chance <= 0 ? 'unmöglich' : `braucht ${Math.max(2, turn.odds.need)}+ (${Math.round(turn.odds.chance)} %)`}`
                : ''}
            {turn.ammo ? ` · Magazin ${turn.ammo.rounds}/${turn.ammo.capacity}` : ''}
          </span>
        </div>
      ) : (
        <p className="combat-pick">{sim.defeated ? 'Der Kampf ist entschieden. Heilen, übernehmen oder die Begegnung beenden.' : 'Keiner ist am Zug.'}</p>
      )}
      <div className="actions fight-actions">
        {combat.damage ? (
          <button
            type="button"
            className="action draw"
            onClick={() => {
              haptic('shake');
              game.rollDamage();
            }}
          >
            <DiceIcon />
            Schaden ({combat.damage.wounds}W6)
          </button>
        ) : (
          <>
            {turn && (
              <button type="button" className="action dice" onClick={() => game.skipTurn()}>
                Aussetzen
              </button>
            )}
            {turn?.ammo && turn.ammo.rounds < turn.ammo.capacity && (
              <button type="button" className="action dice" disabled={turn.ammo.magazines === 0} onClick={() => game.fightReload()}>
                Nachladen ({turn.ammo.magazines})
              </button>
            )}
            <button
              type="button"
              className="action task-roll"
              disabled={!turn || !target || !turn.reaches || empty}
              onClick={() => {
                haptic('land');
                game.fightAttack();
              }}
            >
              <CombatIcon />
              Angreifen
            </button>
          </>
        )}
      </div>
    </section>
  );
}
