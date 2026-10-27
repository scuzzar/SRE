import { useState } from 'react';
import type { EditorView, ItemChoice, SkillChoice } from '../../controller';
import type { ItemKind, Upp } from '../../model';
import { characteristicLabel, hex } from '../format';
import { useGame } from '../game-context';
import { CloseIcon } from '../icons';

const uppFields = [
  ['str', 'STR'],
  ['dex', 'DEX'],
  ['end', 'END'],
  ['int', 'INT'],
  ['edu', 'EDU'],
  ['soc', 'SOC'],
] as const;

const kindNames: Record<ItemKind, string> = {
  weapon: 'Waffen',
  ammunition: 'Munition',
  armor: 'Rüstungen',
  equipment: 'Ausrüstung',
  vehicle: 'Fahrzeuge',
  ship: 'Schiffe und Small Craft',
  passage: 'Passagen',
  membership: 'Mitgliedschaften',
};

/** Charakter anlegen oder bearbeiten. Die Eingaben während des Tippens hält die View; prüfen und speichern tut der Controller. */
export function CharacterEditor({ editor, skills, items }: { editor: EditorView; skills: readonly SkillChoice[]; items: readonly ItemChoice[] }) {
  const game = useGame();
  const [form, setForm] = useState(() => ({
    ...editor.input,
    credits: String(editor.input.credits),
    skills: editor.input.skills.map((s) => ({ of: s.of, level: String(s.level) })),
    possessions: (editor.input.possessions ?? []).map((p) => ({ of: p.of, count: String(p.count) })),
  }));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const isNew = editor.id === undefined;
  const unused = skills.filter((s) => !form.skills.some((f) => f.of === s.id));
  const unowned = items.filter((i) => !form.possessions.some((p) => p.of === i.id));

  const setUpp = (key: keyof Upp, value: number) => setForm({ ...form, upp: { ...form.upp, [key]: value } });

  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="editor-title">{isNew ? 'Neuer Charakter' : 'Charakter bearbeiten'}</h2>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={() => game.cancelEdit()}>
            <CloseIcon />
          </button>
        </div>
        <form
          className="sheet-body form"
          id="character-form"
          onSubmit={(e) => {
            e.preventDefault();
            game.saveCharacter({
              ...form,
              credits: Number(form.credits === '' ? 0 : form.credits),
              skills: form.skills.map((s) => ({ of: s.of, level: Number(s.level) })),
              possessions: form.possessions.map((p) => ({ of: p.of, count: Number(p.count) })),
            });
          }}
        >
          {editor.error && (
            <p className="error" role="alert">
              {editor.error}
            </p>
          )}
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
          </label>
          <label className="field">
            <span>Herkunft</span>
            <input
              value={form.background}
              onChange={(e) => setForm({ ...form, background: e.target.value })}
              placeholder="z. B. Ex-Scout · 4 Terms · 34 Jahre"
            />
          </label>
          <fieldset>
            <legend>UPP</legend>
            <div className="upp-inputs">
              {uppFields.map(([key, characteristic]) => (
                <label key={key}>
                  {characteristicLabel[characteristic]}
                  <select value={form.upp[key]} onChange={(e) => setUpp(key, Number(e.target.value))}>
                    {Array.from({ length: 16 }, (_, v) => (
                      <option key={v} value={v}>
                        {hex(v)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Fertigkeiten</legend>
            {form.skills.map((skill, i) => {
              const choice = skills.find((s) => s.id === skill.of);
              const name = choice?.name ?? skill.of;
              return (
                <div key={skill.of} className="skill-row">
                  <span>{name}</span>
                  {choice?.leveled === false ? (
                    <span className="small-label">ohne Stufe</span>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      aria-label={`Stufe ${name}`}
                      value={skill.level}
                      onChange={(e) => setForm({ ...form, skills: form.skills.map((s, j) => (j === i ? { ...s, level: e.target.value } : s)) })}
                    />
                  )}
                  <button
                    type="button"
                    className="ghost square"
                    aria-label={`${name} entfernen`}
                    onClick={() => setForm({ ...form, skills: form.skills.filter((_, j) => j !== i) })}
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
            <select
              aria-label="Fertigkeit hinzufügen"
              value=""
              onChange={(e) => e.target.value && setForm({ ...form, skills: [...form.skills, { of: e.target.value, level: '0' }] })}
            >
              <option value="">+ Fertigkeit hinzufügen</option>
              {unused.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Besitz</legend>
            {form.possessions.map((possession, i) => {
              const item = items.find((it) => it.id === possession.of);
              const name = item?.label ?? possession.of;
              return (
                <div key={possession.of} className="skill-row">
                  <span>{name}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    aria-label={`Anzahl ${name}`}
                    disabled={item?.once}
                    value={possession.count}
                    onChange={(e) => setForm({ ...form, possessions: form.possessions.map((p, j) => (j === i ? { ...p, count: e.target.value } : p)) })}
                  />
                  <button
                    type="button"
                    className="ghost square"
                    aria-label={`${name} entfernen`}
                    onClick={() => setForm({ ...form, possessions: form.possessions.filter((_, j) => j !== i) })}
                  >
                    <CloseIcon />
                  </button>
                </div>
              );
            })}
            <select
              aria-label="Gegenstand hinzufügen"
              value=""
              onChange={(e) => e.target.value && setForm({ ...form, possessions: [...form.possessions, { of: e.target.value, count: '1' }] })}
            >
              <option value="">+ Gegenstand hinzufügen</option>
              {(Object.keys(kindNames) as ItemKind[]).map((kind) => (
                <optgroup key={kind} label={kindNames[kind]}>
                  {unowned
                    .filter((i) => i.kind === kind)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </fieldset>
          <label className="field">
            <span>Ausrüstung</span>
            <textarea value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          </label>
          <label className="field">
            <span>Credits</span>
            <input type="number" inputMode="numeric" step={1} value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
          </label>
          <label className="field">
            <span>Notiz</span>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          {!isNew && (
            <label className="toggle">
              <input type="checkbox" checked={form.dead ?? false} onChange={(e) => setForm({ ...form, dead: e.target.checked })} />
              <span>
                Tot
                <span className="small-label">Steht dann unter „Verstorben“ und ist für Proben nicht wählbar. Lässt sich zurücknehmen.</span>
              </span>
            </label>
          )}
          {!isNew && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {confirmRemove ? (
                <button type="button" className="ghost danger" onClick={() => game.removeCharacter(editor.id!)}>
                  {editor.inLog ? 'Wirklich ausblenden?' : 'Wirklich löschen?'}
                </button>
              ) : (
                <button type="button" className="ghost danger" onClick={() => setConfirmRemove(true)}>
                  {editor.inLog ? 'Ausblenden' : 'Löschen'}
                </button>
              )}
              <span className="small-label">
                {editor.inLog
                  ? 'Kommt im Log vor: wird ausgeblendet, nicht gelöscht, und lässt sich wieder einblenden.'
                  : 'Kommt nicht im Log vor: wird gelöscht.'}
              </span>
            </div>
          )}
        </form>
        <div className="sheet-foot">
          <button type="button" className="ghost" onClick={() => game.cancelEdit()}>
            Abbrechen
          </button>
          <span className="count" />
          <button type="submit" form="character-form" className="primary" style={{ padding: '0 24px' }}>
            Speichern
          </button>
        </div>
      </section>
    </div>
  );
}
