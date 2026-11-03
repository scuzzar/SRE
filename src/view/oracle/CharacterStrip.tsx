import { useEffect, useRef } from 'react';
import type { CombatView, Snapshot } from '../../controller';
import { SkillChips, UppRow } from '../characters/CharacterCard';
import { useGame } from '../game-context';
import { ChevronDownIcon, PencilIcon } from '../icons';
import { hex, woundStateText } from '../format';

/** So lange nach dem letzten Scrollen gilt das Wischen als beendet. */
const SETTLE_MS = 120;

/**
 * Die Leiste oben im Orakel-Screen: die Lebenden nebeneinander, der Charakter oben in der Mitte.
 * Wischen zeigt den nächsten; welcher oben steht, entscheidet der Controller, die Leiste meldet nur,
 * bei welcher Karte das Wischen liegen geblieben ist. Fertigkeit antippen startet eine Probe, danach
 * lassen sich Attribute dazuwählen. Der Kopf klappt die Leiste ein und auf. Im Reiter Kampf zeigt
 * sie statt der Fertigkeiten die Waffen des Charakters oben; antippen nimmt sie in die Hand.
 */
export function CharacterStrip({ view, weapons = false }: { view: Snapshot; weapons?: boolean }) {
  const game = useGame();
  const track = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const characters = view.characters;
  const index = Math.max(0, characters.findIndex((c) => c.focus));

  // Die Karte des Charakters oben in die Mitte holen, wenn er sich anders als durch Wischen ändert
  // (neuer Charakter, Tod, Start der App).
  useEffect(() => {
    const el = track.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const left = card.offsetLeft - (el.firstElementChild as HTMLElement).offsetLeft;
    if (Math.abs(el.scrollLeft - left) > 2) el.scrollTo({ left, behavior: 'auto' });
  }, [index, characters.length, view.stripCollapsed]);

  useEffect(() => () => clearTimeout(settle.current), []);

  if (characters.length === 0) {
    return (
      <section className="strip strip-empty" aria-label="Spielercharaktere">
        <button type="button" className="add-character" onClick={() => game.newCharacter()}>
          + Charakter anlegen
        </button>
        <button type="button" className="add-character" onClick={() => game.openGeneration()}>
          {view.generationRunning ? 'Erschaffung fortsetzen' : '+ Nach Regeln erschaffen'}
        </button>
      </section>
    );
  }

  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = track.current;
      const first = el?.firstElementChild as HTMLElement | null | undefined;
      if (!el || !first) return;
      const step = first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
      const at = Math.min(characters.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
      const id = characters[at]?.id;
      if (id && at !== index) game.focusCharacter(id);
    }, SETTLE_MS);
  };

  const collapsed = view.stripCollapsed;
  return (
    <section className={collapsed ? 'strip collapsed' : 'strip'} aria-label="Spielercharaktere">
      <div className="strip-track" ref={track} onScroll={onScroll}>
        {characters.map((character, i) => (
          <article key={character.id} className={character.focus ? 'strip-card focus' : 'strip-card'} aria-label={character.name} aria-hidden={!character.focus}>
            <div className="strip-head">
              <button type="button" className="strip-title" aria-expanded={!collapsed} onClick={() => game.toggleStrip()} tabIndex={character.focus ? 0 : -1}>
                <span className="strip-name">{character.name}</span>
                {character.background && <span className="pc-sub">{character.background}</span>}
              </button>
              <span className="strip-position" aria-hidden="true">
                {i + 1}/{characters.length}
              </span>
              <button type="button" className="icon-button" aria-label={`${character.name} bearbeiten`} onClick={() => game.editCharacter(character.id)} tabIndex={character.focus ? 0 : -1}>
                <PencilIcon />
              </button>
              <button
                type="button"
                className="icon-button strip-toggle"
                aria-label={collapsed ? 'Leiste aufklappen' : 'Leiste einklappen'}
                aria-expanded={!collapsed}
                onClick={() => game.toggleStrip()}
                tabIndex={character.focus ? 0 : -1}
              >
                <ChevronDownIcon />
              </button>
            </div>
            {character.state !== 'unhurt' && (
              <p className={`strip-state state-${character.state}`}>
                {woundStateText[character.state]} · STR {hex(Math.max(0, character.current.str))} · DEX {hex(Math.max(0, character.current.dex))} · END {hex(Math.max(0, character.current.end))}
              </p>
            )}
            {!collapsed && (
              <>
                <UppRow character={character} interactive={character.focus && !weapons} />
                {weapons ? (
                  character.focus && view.combat ? (
                    <WeaponChips combat={view.combat} />
                  ) : (
                    <ul className="chips" aria-hidden="true">
                      <li className="chip">…</li>
                    </ul>
                  )
                ) : (
                  <SkillChips character={character} interactive={character.focus} />
                )}
              </>
            )}
          </article>
        ))}
      </div>
      {characters.length > 1 && (
        <div className="strip-dots" role="group" aria-label="Charakter oben wählen">
          {characters.map((character) => (
            <button key={character.id} type="button" aria-label={`${character.name} nach oben`} aria-current={character.focus} onClick={() => game.focusCharacter(character.id)}>
              <span />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Die Waffen des Charakters oben: die Hände und die aus seinem Besitz; die in der Hand ist gedrückt. */
function WeaponChips({ combat }: { combat: CombatView }) {
  const game = useGame();
  return (
    <div className="chips" role="group" aria-label="Waffe in der Hand">
      {combat.weapons.map((weapon) => (
        <button key={weapon.id} type="button" aria-label={`${weapon.name} (${weapon.skill})`} aria-pressed={weapon.wielded} onClick={() => game.wieldWeapon(weapon.id)}>
          {weapon.name} <span className="chip-skill">{weapon.short}</span>
        </button>
      ))}
    </div>
  );
}
