import { useState } from 'react';
import type { Snapshot, TripRoll } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { patronDetail, patronName, rumorDetail, rumorName } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

const TITLES: Record<string, string> = { random: 'Zufallsbegegnung', animal: 'Tiere', patron: 'Patron', rumor: 'Gerücht', legal: 'Polizei' };
const RULES: Record<string, string> = {
  random: 'Random Encounter List (S. 21) · täglich',
  animal: 'Tiertabelle der Welt im Gelände (S. 18–19) · zweimal täglich',
  patron: 'Patron Encounters Matrix (S. 20) · wöchentlich',
  rumor: 'Rumors Matrix (S. 21) · wöchentlich',
  legal: 'Legal Encounter (S. 20) · wöchentlich',
};

/**
 * Die Würfelbühne eines Begegnungswurfs aus der Aktionsleiste im Bereich Begegnung: Der Würfel des Tests rollt,
 * dann steht da, was herauskam, und was man danach tun kann (beim Patron „Als NSC“, das ihn anlegt
 * und das Fenster schließt, daneben „Abbrechen“; bei einem
 * Tierereignis die Rettungswürfe). Ohne Würfel (etwa schon getestet) steht nur der Hinweis da. Kam es
 * zur Begegnung, führt „Zur Begegnung“ zu ihrer Übersicht. Ein Tippen überspringt die Animation.
 */
export function EncounterRollDialog({ roll, view }: { roll: TripRoll; view: Snapshot }) {
  const game = useGame();
  const thrown = roll.dice.length > 0;
  const [phase, skip] = useTimeline(thrown ? [200, THROW_MS, 250] : [0, 0, 0]);
  const landed = !thrown || phase >= 2;
  const total = roll.dice.reduce((s, d) => s + d, 0);
  const [saved, setSaved] = useState(false);
  const patron = roll.kind === 'patron' && roll.passed ? view.patron : undefined;
  const rumor = (roll.kind === 'rumor' && roll.passed) || (patron?.last?.rumor ?? false) ? view.rumor?.last : undefined;
  const event = roll.kind === 'animal' ? view.combat?.animals.lastEvent : undefined;
  // Ein Patron (keine Gerücht-Zeile), den man als NSC anlegen kann.
  const asNpc = patron?.last && !patron.last.rumor ? patron.npc : undefined;
  return (
    <div className="modal">
      <section className="result trip-roll encounter-roll" role="dialog" aria-modal="true" aria-labelledby="encounter-roll-title" onClick={() => thrown && phase < 3 && skip(3)}>
        <span className="kicker">{RULES[roll.kind] ?? 'Begegnung'}</span>
        <h2 id="encounter-roll-title" className="shop-buy-title">
          {TITLES[roll.kind] ?? 'Begegnung'}
        </h2>
        {thrown && (phase >= 1 ? <DiceView dice={roll.dice} seed={total * 11 + roll.target} landed={landed} /> : <div className="dice-stage large" aria-hidden="true" />)}
        <p className={landed ? 'surprise-verdict shown' : 'surprise-verdict'} aria-live="polite">
          {landed ? (thrown ? `${total} (${roll.target}+ nötig) · ${roll.text}` : roll.text) : ''}
        </p>
        {landed && patron?.last && !patron.last.rumor && (
          <p className="patron-last">
            <strong>{patronName(patron.last)}</strong> <span>{patronDetail(patron.last)}</span>
          </p>
        )}
        {landed && rumor && (
          <p className="patron-last">
            <strong>{rumorName(rumor)}</strong> <span>{rumorDetail(rumor)}</span>
          </p>
        )}
        {landed && asNpc && <p className="small-label">{asNpc.blocker ?? 'Als NSC: ein zufälliger NSC in der Laufbahn des Patrons, er kommt unter Charaktere › NSC. Als Mission: dazu eine offene Mission mit ihm als Auftraggeber.'}</p>}
        {landed && event && (
          <p className="patron-last">
            <span>{event.text}</span>
          </p>
        )}
        {landed && event?.canSave && !saved && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              haptic('shake');
              setSaved(true);
              game.rollEventSaves(event.index);
            }}
          >
            Rettungswürfe würfeln ({/^\d/.test(event.save!) ? event.save : `${event.save} oder weniger`}, sonst {event.damage}W6)
          </button>
        )}
        {landed && saved && view.combat?.animals.note && (
          <p className="encounter-note" role="status">
            {view.combat.animals.note}
          </p>
        )}
        {landed && asNpc ? (
          // Beim Patron: „Als NSC“ legt ihn an und schließt das Fenster, „Als Mission“ dazu eine Mission
          // mit ihm als Auftraggeber (2026-11-18), „Abbrechen“ schließt nur.
          <div className="encounter-choice-actions patron-actions">
            <button type="button" className="ghost" data-escape onClick={() => game.closeEncounterRoll()}>
              Abbrechen
            </button>
            <button type="button" className="ghost" disabled={asNpc.blocker !== undefined} onClick={() => void game.createPatronNpc()}>
              Als NSC
            </button>
            <button type="button" className="primary" disabled={asNpc.blocker !== undefined} onClick={() => void game.createPatronMission()}>
              Als Mission
            </button>
          </div>
        ) : (
          // Esc schließt erst, wenn der Wurf steht; vorher springt es wie ein Tippen zum Ergebnis.
          <button type="button" className="primary" data-escape={landed || undefined} onClick={() => game.closeEncounterRoll()}>
            {roll.encounter ? 'Zur Begegnung' : 'Weiter'}
          </button>
        )}
      </section>
    </div>
  );
}

/**
 * „Manuell wählen“: statt des Wurfs die Art der Zufallsbegegnung bzw. die Zeile der Tiertabelle wählen,
 * ohne Test. Die Tiertabelle entsteht beim ersten Wurf; bis dahin bietet das Fenster nur das Würfeln an.
 */
export function EncounterChoiceDialog({ kind, view }: { kind: 'random' | 'animal'; view: Snapshot }) {
  const game = useGame();
  const combat = view.combat;
  if (!combat) return null;
  const rows =
    kind === 'random'
      ? [...(combat.joining.length > 0 ? [{ value: 'none', label: 'keine · nur die NSC' }] : []), ...combat.encounterTypes.map((t) => ({ value: String(t.roll), label: `${t.roll} · ${t.quantity}W${combat.quantityDie} ${t.name}` }))]
      : combat.animals.rows.map((r) => ({ value: String(r.roll), label: `${r.roll} · ${r.quantity === 0 ? '1' : `${r.quantity}W${combat.quantityDie}`} ${r.name}` }));
  const pick = (value: string) => {
    if (kind === 'animal') game.rollAnimals(Number(value));
    else game.rollEncounter(value === 'none' ? 'none' : Number(value));
  };
  return (
    <div className="modal">
      <section className="result encounter-choice" role="dialog" aria-modal="true" aria-labelledby="encounter-choice-title">
        <span className="kicker">Manuell wählen{kind === 'random' && combat.joining.length > 0 ? ` · mit ${combat.joining.length} NSC` : ''}</span>
        <h2 id="encounter-choice-title" className="shop-buy-title">
          {kind === 'random' ? 'Welche Begegnung?' : 'Welche Tiere?'}
        </h2>
        {rows.length === 0 ? (
          <p className="combat-hint">Die Tiertabelle dieser Welt entsteht beim ersten Wurf.</p>
        ) : (
          <ul className="encounter-choice-list">
            {rows.map((r) => (
              <li key={r.value}>
                <button type="button" className="ghost" onClick={() => pick(r.value)}>
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="encounter-choice-actions">
          <button type="button" data-escape className="ghost" onClick={() => game.closeEncounterChoice()}>
            Abbrechen
          </button>
          {rows.length === 0 && (
            <button type="button" className="primary" onClick={() => game.rollAnimals()}>
              Würfeln
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
