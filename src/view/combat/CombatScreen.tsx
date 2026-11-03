import type { CombatView, Snapshot } from '../../controller';
import { armorText, attackText, characteristicLabel, damageDetail, hex, partLabel, rangeMeters, rangeShort, rangeText, signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CombatIcon, DiceIcon } from '../icons';
import { CharacterStrip } from '../oracle/CharacterStrip';

/**
 * Der Reiter Kampf: oben die Leiste mit dem Charakter oben und seinen Waffen, darunter die klassische
 * Tabelle der Waffe in der Hand (Rüstung × Reichweite, in jeder Zelle der nötige Wurf mit allen DMs).
 * Eine Zelle antippen wählt Rüstung und Reichweite des Ziels; „Angreifen“ würfelt. Nach einem Treffer
 * lässt sich der Schaden würfeln. Gerechnet wird im Model; die View zeigt nur.
 */
export function CombatScreen({ view }: { view: Snapshot }) {
  const combat = view.combat;
  return (
    <div className="screen">
      <CharacterStrip view={view} weapons />
      {combat ? (
        <>
          <section className="scroll combat-scroll" aria-label="Angriff">
            <WeaponHead combat={combat} />
            <AttackTable combat={combat} />
            <Recent combat={combat} />
          </section>
          <AttackDock combat={combat} />
        </>
      ) : (
        <section className="scroll combat-scroll">
          <p className="log-empty">Ohne lebenden Charakter gibt es keinen Angriff.</p>
        </section>
      )}
    </div>
  );
}

function WeaponHead({ combat }: { combat: CombatView }) {
  const { weapon, base } = combat;
  const characteristic = characteristicLabel[weapon.characteristic];
  return (
    <div className="weapon-head">
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
            <tr key={row.armor}>
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
              {item.character} · {item.weapon} · {armorText[item.armor]}, {rangeText[item.range]}
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
          disabled={!target || combat.ammo?.rounds === 0}
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
