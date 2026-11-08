import { useEffect, useRef } from 'react';
import type { Snapshot } from '../../controller';
import { SkillChips, UppRow } from '../characters/CharacterCard';
import { useGame } from '../game-context';
import { ChevronDownIcon, PencilIcon } from '../icons';
import { credits, hex, woundStateText } from '../format';
import { ImpactMarks, LossFloat, RoleBadge } from '../combat/FightScreen';
import type { Impact } from '../../controller';

/** Je SC in der Kampfsimulation: am Zug, Ziel, Nachbar und was ihn eben getroffen hat. */
export type StripFight = Readonly<Record<string, { readonly turn: boolean; readonly targeted: boolean; readonly neighbour: boolean; readonly impacts: readonly Impact[] }>>;


/** So lange nach dem letzten Scrollen gilt das Wischen als beendet. */
const SETTLE_MS = 120;

/**
 * Die Leiste oben im Orakel-Screen: die Lebenden nebeneinander, der Charakter oben in der Mitte.
 * Wischen zeigt den nächsten; welcher oben steht, entscheidet der Controller, die Leiste meldet nur,
 * bei welcher Karte das Wischen liegen geblieben ist. Fertigkeit antippen startet eine Probe, danach
 * lassen sich Attribute dazuwählen. Der Kopf klappt die Leiste ein und auf. Im Reiter Kampf zeigt
 * sie statt der Fertigkeiten die Waffen des Charakters oben; antippen nimmt sie in die Hand. Ist er
 * verwundet und lässt sich etwas tun, steht dort im Kopf seiner Karte „Heilen“. Im Reiter Shop zeigt
 * sie seine Credits und Attribute; für ihn kauft und verkauft man. Die Nachbarkarten zeigen schon beim
 * Wischen ihren Inhalt, nicht erst, wenn sie eingerastet sind.
 */
export function CharacterStrip({
  view,
  weapons = false,
  heal,
  shop = false,
  fight,
}: {
  view: Snapshot;
  weapons?: boolean;
  heal?: { readonly name: string; readonly onHeal: () => void } | undefined;
  shop?: boolean;
  /** In der Kampfsimulation: je SC, ob er am Zug, Ziel oder Nachbar ist, und was ihn eben getroffen hat. */
  fight?: StripFight | undefined;
}) {
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
    <section className={['strip', collapsed ? 'collapsed' : '', weapons || shop ? 'strip-combat' : '', shop ? 'strip-shop' : ''].filter(Boolean).join(' ')} aria-label="Spielercharaktere">
      <div className="strip-track" ref={track} onScroll={onScroll}>
        {characters.map((character, i) => (
          <article
            key={character.id}
            className={['strip-card', character.focus ? 'focus' : '', fight?.[character.id]?.turn ? 'turn' : '', fight?.[character.id]?.targeted ? 'targeted' : '', fight?.[character.id]?.neighbour ? 'neighbour' : ''].filter(Boolean).join(' ')}
            aria-label={character.name}
            aria-hidden={!character.focus}
          >
            {fight?.[character.id] && <ImpactMarks impacts={fight[character.id]!.impacts} atStats={!collapsed && weapons} />}
            <div className="strip-head">
              <button type="button" className="strip-title" aria-expanded={!collapsed} onClick={() => game.toggleStrip()} tabIndex={character.focus ? 0 : -1}>
                <span className="strip-name">
                  {character.name}
                  {fight?.[character.id] && <RoleBadge fighter={fight[character.id]!} />}
                </span>
                {shop ? (
                  <span className="pc-sub">
                    <span className="mono strip-credits">{credits(character.credits)}</span>
                  </span>
                ) : weapons ? (
                  <span className="pc-sub">
                    {character.state !== 'unhurt' && <span className={`state-${character.state}`}>{woundStateText[character.state]} · </span>}
                    {character.armor ?? 'keine Rüstung'}
                  </span>
                ) : (
                  character.background && <span className="pc-sub">{character.background}</span>
                )}
              </button>
              {heal && character.focus && heal.name === character.name && (
                <button type="button" className="ghost compact strip-heal" onClick={heal.onHeal}>
                  Heilen
                </button>
              )}
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
            {!weapons && !shop && character.state !== 'unhurt' && (
              <p className={`strip-state state-${character.state}`}>
                {woundStateText[character.state]} · STR {hex(Math.max(0, character.current.str))} · DEX {hex(Math.max(0, character.current.dex))} · END {hex(Math.max(0, character.current.end))}
              </p>
            )}
            {!collapsed && shop && <UppLine character={character} />}
            {!collapsed && !shop && (
              <>
                {weapons ? <UppLine character={character} impacts={fight?.[character.id]?.impacts ?? []} /> : <UppRow character={character} interactive={character.focus} />}
                {weapons ? (
                  <WeaponChips character={character} />
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
/**
 * Im Kampf in einer Zeile: Primärwaffe, Sekundärwaffe und Hände. Nur die Waffe in der Hand zeigt
 * ihre Fertigkeit und wird nie gekürzt; wird es eng, kürzt sich der Name der anderen.
 */
function WeaponChips({ character }: { character: Snapshot['characters'][number] }) {
  const game = useGame();
  // Auf einer Nachbarkarte holt Antippen den Charakter nach oben, statt die Waffe zu wechseln.
  return (
    <div className="chips weapon-chips" role="group" aria-label="Waffe in der Hand">
      {character.weapons.map((weapon) => (
        <button
          key={weapon.id}
          type="button"
          aria-label={`${weapon.name} (${weapon.skill})`}
          aria-pressed={weapon.wielded}
          tabIndex={character.focus ? 0 : -1}
          onClick={() => (character.focus ? game.wieldWeapon(weapon.id) : game.focusCharacter(character.id))}
        >
          <span className="chip-name">{weapon.name}</span>
          <span className="chip-skill">{weapon.short}</span>
        </button>
      ))}
    </div>
  );
}

const uppKeys = ['str', 'dex', 'end', 'int', 'edu', 'soc'] as const;

/** Im Kampf die Attribute als schmale Zeile wie bei den NSC; verwundete Werte rot. */
function UppLine({ character, impacts = [] }: { character: Snapshot['characters'][number]; impacts?: readonly Impact[] }) {
  return (
    <p className="strip-upp mono" aria-label="Attribute">
      {uppKeys.map((k) => (
        <span key={k} className={character.current[k] < character.upp[k] ? 'stat hurt' : 'stat'}>
          {k.toUpperCase()} {hex(Math.max(0, character.current[k]))}
          {(k === 'str' || k === 'dex' || k === 'end') && <LossFloat impacts={impacts} attr={k} />}
        </span>
      ))}
    </p>
  );
}
