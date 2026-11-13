import type { Screen, Snapshot } from '../../controller';
import { credits, hex, woundStateText } from '../format';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';
import { WeaponChips } from '../oracle/CharacterStrip';
import { SkillChips, UppRow } from './CharacterCard';

type CharacterView = Snapshot['characters'][number];

/** „Heilen“ im Kopf der Karte oben, wenn er verwundet ist und sich im Kampf etwas tun lässt. */
export interface ColumnHeal {
  readonly name: string;
  readonly onHeal: () => void;
}

/**
 * Die Charakterspalte im Desktop-Modus, zwischen Orakel und Bereich: alle Lebenden untereinander,
 * immer mit Attributen und Fertigkeiten, damit Proben in jedem Bereich gehen. Dazu blendet sie ein,
 * was der Bereich daneben braucht: im Kampf Zustand, Rüstung und Waffen (antippen nimmt die Waffe in
 * die Hand) und „Heilen“, im Shop Credits und was er ausgerüstet hat. Die Karte oben trägt die rote Kante. Eine
 * Fertigkeit lässt sich auf jeder Karte antippen und holt den Charakter dabei nach oben; Attribute und
 * Waffen wählt man auf der Karte oben, ein Klick auf eine andere Karte holt diesen Charakter nach oben.
 * Welcher oben steht, entscheidet der Controller; die Spalte zeigt es nur.
 */
export function CharacterColumn({ view, screen, heal }: { view: Snapshot; screen: Screen; heal: ColumnHeal | undefined }) {
  const game = useGame();
  const characters = view.characters;
  // Waffen nur in der Waffentabelle; in der Kampfsimulation stehen die SC in der Arena.
  const weapons = screen === 'combat' && view.combat !== undefined && view.combat.sim === undefined;
  const shop = screen === 'shop';

  if (characters.length === 0) {
    return (
      <section className="strip char-column strip-empty" aria-label="Spielercharaktere">
        <button type="button" className="add-character" onClick={() => game.newCharacter()}>
          + Charakter anlegen
        </button>
        <button type="button" className="add-character" onClick={() => game.openGeneration()}>
          {view.generationRunning ? 'Erschaffung fortsetzen' : '+ Nach Regeln erschaffen'}
        </button>
      </section>
    );
  }

  return (
    <section className={['strip', 'char-column', weapons ? 'char-column-combat' : '', shop ? 'char-column-shop' : ''].filter(Boolean).join(' ')} aria-label="Spielercharaktere">
      {characters.map((character) => (
        <article
          key={character.id}
          className={character.focus ? 'strip-card focus' : 'strip-card'}
          aria-label={character.name}
          onClick={
            character.focus
              ? undefined
              : (e) => {
                  // Knöpfe auf der Karte (Bearbeiten, Waffen) tun ihr Eigenes; ein Klick daneben holt sie nach oben.
                  if (!(e.target instanceof Element && e.target.closest('button'))) game.focusCharacter(character.id);
                }
          }
        >
          <div className="strip-head">
            <button
              type="button"
              className="strip-title"
              aria-label={character.focus ? undefined : `${character.name} nach oben`}
              aria-current={character.focus}
              onClick={() => !character.focus && game.focusCharacter(character.id)}
            >
              <span className="strip-name">{character.name}</span>
              <Sub character={character} weapons={weapons} shop={shop} />
            </button>
            {heal && character.focus && heal.name === character.name && (
              <button type="button" className="ghost compact strip-heal" onClick={heal.onHeal}>
                Heilen
              </button>
            )}
            <button type="button" className="icon-button" aria-label={`${character.name} bearbeiten`} onClick={() => game.editCharacter(character.id)}>
              <PencilIcon />
            </button>
          </div>
          {character.state !== 'unhurt' && (
            <p className={`strip-state state-${character.state}`}>
              {woundStateText[character.state]} · STR {hex(Math.max(0, character.current.str))} · DEX {hex(Math.max(0, character.current.dex))} · END {hex(Math.max(0, character.current.end))}
            </p>
          )}
          <UppRow character={character} interactive={character.focus} />
          {/* Fertigkeiten gehen auf jeder Karte: Antippen holt den Charakter nach oben und beginnt die Probe. */}
          <SkillChips character={character} interactive />
          {weapons && <WeaponChips character={character} />}
          {shop && <Possessions character={character} />}
        </article>
      ))}
    </section>
  );
}

/** Die Zeile unter dem Namen: im Kampf Rüstung, im Shop Credits, sonst die Herkunft. */
function Sub({ character, weapons, shop }: { character: CharacterView; weapons: boolean; shop: boolean }) {
  if (shop) {
    return (
      <span className="pc-sub">
        <span className="mono strip-credits">{credits(character.credits)}</span>
      </span>
    );
  }
  if (weapons) return <span className="pc-sub">{character.armor ?? 'keine Rüstung'}</span>;
  return character.background ? <span className="pc-sub">{character.background}</span> : null;
}

/** Im Shop: was der SC ausgerüstet hat; alles andere liegt im Gruppengepäck. */
function Possessions({ character }: { character: CharacterView }) {
  return (
    <p className="char-column-possessions">
      <span className="small-label">Ausgerüstet</span>{' '}
      {character.possessions.length === 0 ? <span className="muted">nichts</span> : character.possessions.map((p) => (p.count > 1 ? `${p.count} × ${p.name}` : p.name)).join(', ')}
    </p>
  );
}
