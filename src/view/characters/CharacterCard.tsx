import type { EquipSlotView, CharacterView } from '../../controller';
import { characteristicLabel, credits, hex, signed, withLevel } from '../format';
import { useGame } from '../game-context';
import { PencilIcon } from '../icons';
import { CareerList } from './GenerationSheet';
import { EquipSlots } from './StashPanel';

/**
 * Das UPP. Beim Charakter oben sind die Attribute Knöpfe: Nach der Fertigkeit lassen sie sich zur
 * Probe dazuwählen. Im Charakter-Screen ist es nur Anzeige.
 */
export function UppRow({ character, interactive }: { character: CharacterView; interactive: boolean }) {
  const game = useGame();
  if (!interactive) {
    return (
      <div className="upp" role="group" aria-label="Attribute">
        {character.characteristics.map((c) => (
          <span key={c.characteristic} className="cell" aria-label={`${characteristicLabel[c.characteristic]} ${hex(c.value)}`}>
            <span className="upp-label" aria-hidden="true">
              {characteristicLabel[c.characteristic]}
            </span>
            <span className="upp-code" aria-hidden="true">
              {hex(c.value)}
            </span>
          </span>
        ))}
      </div>
    );
  }
  const skillChosen = character.unskilled?.chosen || character.skills.some((s) => s.chosen);
  return (
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
  );
}

/**
 * Die Fertigkeiten mit Kürzel. Beim Charakter oben startet ein Tippen die Probe; im Charakter-Screen
 * sind sie nur Anzeige, aufgeklappt mit vollem Namen.
 */
/**
 * Die Fertigkeiten als Kürzel. Antippbar starten sie eine Probe; auf der Karte eines Charakters, der
 * nicht oben steht (nur in der Charakterspalte antippbar), holt das Antippen ihn zugleich nach oben.
 */
export function SkillChips({ character, interactive, full = false }: { character: CharacterView; interactive: boolean; full?: boolean }) {
  const game = useGame();
  const choose = (skill: string | null) => (character.focus ? game.chooseSkill(skill) : game.chooseSkillOf(character.id, skill));
  if (!interactive) {
    return (
      <ul className="chips" aria-label="Fertigkeiten">
        {character.skills.map((skill) => (
          <li key={skill.of} className="chip" aria-label={withLevel(skill.name, skill.level)}>
            <span aria-hidden="true">{withLevel(full ? skill.name : skill.short, skill.level)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="chips" role="group" aria-label="Fertigkeit für die Probe">
      {character.skills.map((skill) => (
        <button key={skill.of} type="button" aria-label={withLevel(skill.name, skill.level)} aria-pressed={skill.chosen} onClick={() => choose(skill.of)}>
          {withLevel(skill.short, skill.level)}
        </button>
      ))}
      {character.unskilled && (
        <button type="button" className="unskilled" aria-pressed={character.unskilled.chosen} onClick={() => choose(null)}>
          Ohne ({signed(character.unskilled.dm)})
        </button>
      )}
    </div>
  );
}

/**
 * Eine Charakterkarte im Charakter-Screen, zum Verwalten: oben das UPP, darunter die Fertigkeiten mit
 * Kürzel, dann bei einem lebenden SC seine Ausrüstung (Primär, Sekundär, Rüstung; siehe
 * `EquipSlots`). Der Kopf klappt die Details auf: volle Namen, Ausrüstung als Text, Notiz und
 * Lebenslauf. Der Stift öffnet den Editor, dort lässt sich der Charakter auch löschen. Proben
 * würfelt man oben im Orakel-Screen.
 */
export function CharacterCard({ character, slots }: { character: CharacterView; slots?: readonly EquipSlotView[] | undefined }) {
  const game = useGame();

  return (
    <article className="pc" aria-label={character.name}>
      <div className="pc-top">
        <button type="button" className="pc-head" aria-expanded={character.open} onClick={() => game.toggleDetails(character.id)}>
          <span className="pc-name">{character.name}</span>
          {character.background && <span className="pc-sub">{character.background}</span>}
        </button>
        <button type="button" className="icon-button" aria-label="Bearbeiten" onClick={() => game.editCharacter(character.id)}>
          <PencilIcon />
        </button>
      </div>

      <UppRow character={character} interactive={false} />
      <SkillChips character={character} interactive={false} full={character.open} />
      {slots && <EquipSlots member={character.id} name={character.name} slots={slots} />}

      {character.open && (
        <dl className="facts">
          {character.homeworld && (
            <>
              <dt>Heimatwelt</dt>
              <dd>{character.homeworld}</dd>
            </>
          )}
          <dt>Ausrüstung</dt>
          <dd>{character.equipment || '–'}</dd>
          <dt>Credits</dt>
          <dd>{credits(character.credits)}</dd>
          <dt>Notiz</dt>
          <dd>{character.note || '–'}</dd>
        </dl>
      )}
      {character.open && character.career && (
        <details className="career-details">
          <summary>Lebenslauf</summary>
          <CareerList lines={character.career} worlds={character.termWorlds} heading={false} />
        </details>
      )}
    </article>
  );
}
