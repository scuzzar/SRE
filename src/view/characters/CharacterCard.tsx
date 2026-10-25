import type { CharacterView } from '../../controller';
import { characteristicLabel, credits, hex, signed } from '../format';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';

/**
 * Eine Charakterkarte: oben das UPP, darunter die Fertigkeiten mit Kürzel. Eine Fertigkeit antippen
 * startet die Probe, ohne die Details aufzuklappen; dann Attribute im UPP dazuwählen. Erst der Kopf
 * klappt die Details auf: volle Namen, Ausrüstung und Notiz. Der Stift im Kopf öffnet den Editor,
 * dort lässt sich der Charakter auch löschen.
 */
export function CharacterCard({ character }: { character: CharacterView }) {
  const game = useGame();
  const skillChosen = character.chosen && (character.unskilled.chosen || character.skills.some((s) => s.chosen));

  return (
    <article className={character.chosen ? 'pc chosen' : 'pc'} aria-label={character.name}>
      <div className="pc-top">
        <button type="button" className="pc-head" aria-expanded={character.open} onClick={() => game.chooseCharacter(character.id)}>
          <span className="pc-name">{character.name}</span>
          {character.background && <span className="pc-sub">{character.background}</span>}
        </button>
        <button type="button" className="icon-button" aria-label="Bearbeiten" onClick={() => game.editCharacter(character.id)}>
          <PencilIcon />
        </button>
      </div>

      <div className="upp" role="group" aria-label="Attribute, nach der Fertigkeit dazuwählbar">
        {character.characteristics.map((c) => {
          const label = characteristicLabel[c.characteristic];
          const offer = skillChosen && !c.counted && c.dm !== 0;
          const classes = [offer ? 'offer' : '', offer && c.dm < 0 ? 'malus' : '', skillChosen && c.dm === 0 ? 'neutral' : ''].filter(Boolean).join(' ');
          const aria = !skillChosen
            ? `${label} ${hex(c.value)}`
            : c.counted
              ? `${label} ${hex(c.value)}: gewählt, DM ${signed(c.dm)}. Tippen zum Abwählen.`
              : c.dm !== 0
                ? `${label} ${hex(c.value)}: würde DM ${signed(c.dm)} geben. Tippen zum Dazuwählen.`
                : `${label} ${hex(c.value)}: kein Einfluss.`;
          return (
            <button
              key={c.characteristic}
              type="button"
              className={classes || undefined}
              aria-label={aria}
              aria-pressed={c.counted}
              disabled={!c.selectable}
              onClick={() => game.toggleCharacteristic(c.characteristic)}
            >
              <span className="upp-label">{label}</span>
              <span className="upp-code">{hex(c.value)}</span>
              <span className="upp-state">{c.counted ? `DM ${signed(c.dm)}` : offer ? signed(c.dm) : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="chips" role="group" aria-label="Fertigkeit für die Probe">
        {character.skills.map((skill) => (
          <button
            key={skill.of}
            type="button"
            aria-label={`${skill.name}-${skill.level}`}
            aria-pressed={skill.chosen}
            onClick={() => game.chooseSkill(character.id, skill.of)}
          >
            {character.open ? skill.name : skill.short}-{skill.level}
          </button>
        ))}
        <button type="button" className="unskilled" aria-pressed={character.unskilled.chosen} onClick={() => game.chooseSkill(character.id, null)}>
          Ohne ({signed(character.unskilled.dm)})
        </button>
      </div>

      {character.open && (
        <dl className="facts">
          <dt>Ausrüstung</dt>
          <dd>{character.equipment || '–'}</dd>
          <dt>Credits</dt>
          <dd>{credits(character.credits)}</dd>
          <dt>Notiz</dt>
          <dd>{character.note || '–'}</dd>
        </dl>
      )}
    </article>
  );
}
