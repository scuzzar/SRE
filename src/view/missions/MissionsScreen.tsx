import { useEffect, useRef, useState } from 'react';
import type { MissionItem, MissionPersonView, MissionPlaceView, MissionsView, Snapshot } from '../../controller';
import type { MissionInput, MissionState } from '../../model';
import { missionStateText, roleText } from '../format';
import { Form } from '../Form';
import { useGame, useSnapshot } from '../game-context';
import { haptic } from '../haptics';
import { BriefcaseIcon, CardIcon, CloseIcon, LocateIcon, PencilIcon, PersonIcon, PinIcon, TrashIcon } from '../icons';
import { CardSheet } from '../oracle/CardSheet';

/**
 * Der Bereich Missionen (siehe domain-model.md, *Missionen*): oben die offenen Missionen, darunter
 * eingeklappt die erledigten, gescheiterten und ausgeblendeten. Ein Ort-Chip öffnet den Globus an
 * diesem Feld, ein Tippen auf die Mission den Editor. Läuft das Ort wählen, steht hier nur der Hinweis.
 */
export function MissionsScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const missions = view.missions;
  if (missions.picking) {
    return (
      <div className="screen">
        <section className="scroll mission-screen" aria-labelledby="missions-title">
          <h2 id="missions-title" className="section-title">
            Missionsort wählen
          </h2>
          <p className="npc-placing">Ort für „{missions.picking.title}“: auf dem Globus ein Feld antippen, dann „OK“. Im Subsektor erst eine Welt öffnen.</p>
        </section>
        <section className="dock" aria-label="Ort wählen">
          <div className="actions oracle-actions">
            <button type="button" className="action note" onClick={() => game.cancelMissionPicking()}>
              <CloseIcon />
              Abbrechen
            </button>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="screen">
      <section className="scroll mission-screen" aria-labelledby="missions-title">
        <h2 id="missions-title" className="section-title">
          Offene Missionen ({missions.open.length})
        </h2>
        {missions.open.length === 0 && <p className="npc-empty">Keine offene Mission. Missionen entstehen mit „+ Neue Mission“ oder beim Patron im Bereich Begegnung („Als Mission“).</p>}
        {missions.open.length > 0 && <MissionList items={missions.open} />}
        <div className="add-characters">
          <button type="button" className="add-character" onClick={() => game.newMission()}>
            + Neue Mission
          </button>
        </div>
        <ClosedGroup title="Erledigt" items={missions.done} />
        <ClosedGroup title="Gescheitert" items={missions.failed} />
        {missions.retired.length > 0 && (
          <details className="fallen mission-closed">
            <summary className="section-title">Ausgeblendet ({missions.retired.length})</summary>
            <ul>
              {missions.retired.map((m) => (
                <li key={m.id}>
                  <span className="fallen-name">{m.title}</span>
                  <button type="button" className="ghost compact" onClick={() => game.restoreMission(m.id)}>
                    Einblenden
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function ClosedGroup({ title, items }: { title: string; items: readonly MissionItem[] }) {
  if (items.length === 0) return null;
  return (
    <details className="mission-closed">
      <summary className="section-title">
        {title} ({items.length})
      </summary>
      <MissionList items={items} />
    </details>
  );
}

function MissionList({ items }: { items: readonly MissionItem[] }) {
  return (
    <ul className="mission-list">
      {items.map((m) => (
        <MissionRow key={m.id} mission={m} />
      ))}
    </ul>
  );
}

function MissionRow({ mission }: { mission: MissionItem }) {
  const game = useGame();
  const open = mission.state === 'open';
  return (
    <li className={open ? 'mission' : 'mission closed'} aria-label={mission.title}>
      <div className="mission-top">
        <button type="button" className="mission-open" onClick={() => game.editMission(mission.id)}>
          <span className="mission-title">
            {mission.title}
            {open && mission.here && <span className="here-tag">hier</span>}
          </span>
          {!open && <span className={`mission-state ${mission.state}`}>{missionStateText[mission.state]}</span>}
          <span className="mission-client">
            <BriefcaseIcon />
            {mission.client ? `${mission.client.name}${mission.client.role ? ` · ${roleText[mission.client.role]}` : ''}${mission.client.dead ? ' · tot' : ''}` : <i>kein Auftraggeber</i>}
          </span>
          {open && mission.text && <span className="mission-text">{mission.text}</span>}
        </button>
        <button type="button" className="icon-button" aria-label={`${mission.title} bearbeiten`} onClick={() => game.editMission(mission.id)}>
          <PencilIcon />
        </button>
      </div>
      {mission.people.length > 0 && (
        <ul className="mission-people">
          {mission.people.map((p) => (
            <li key={p.id}>
              <PersonChip person={p} />
            </li>
          ))}
        </ul>
      )}
      {open && mission.places.length > 0 && (
        <ul className="mission-places">
          {mission.places.map((p, i) => (
            <li key={i}>
              <PlaceChip place={p} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Ein Beteiligter einer Mission: Etikett und Name; ein Tippen öffnet den Charakter im Editor. */
function PersonChip({ person }: { person: MissionPersonView }) {
  const game = useGame();
  return (
    <button type="button" className="person-chip" aria-label={`${person.label ? `${person.label}: ` : ''}${person.name} öffnen`} onClick={() => game.editCharacter(person.id)}>
      <PersonIcon />
      {person.label && <b>{person.label}</b>}
      <span>
        {person.name}
        {person.dead ? ' †' : ''}
      </span>
    </button>
  );
}

function PlaceChip({ place }: { place: MissionPlaceView }) {
  const game = useGame();
  return (
    <button type="button" className="place-chip" aria-label={`${place.label ? `${place.label}: ` : ''}${place.text} auf dem Globus zeigen`} disabled={place.cell === undefined} onClick={() => place.cell !== undefined && game.showMissionPlace(place.world, place.cell)}>
      <PinIcon />
      {place.label && <b>{place.label}</b>}
      <span>{place.text}</span>
    </button>
  );
}

/**
 * Der Editor einer Mission: Titel, Zustand, Auftraggeber, Text und Orte mit Etikett. Die Eingaben
 * während des Tippens hält die View; „+ Auf dem Globus“ gibt sie dem Controller mit, der sie über das
 * Ort wählen hinweg hält (`rev` wechselt danach, und der Editor beginnt mit dem neuen Stand).
 *
 * Unter dem Text zieht „Karte ziehen“ die Inspirationskarte als eigenes Overlay über den Editor, wie
 * beim Feld Notiz des Charakter-Editors: Was man darauf auswählt, hängt sich beim Bestätigen an den
 * Text an (neue Zeile), statt einen Logeintrag anzulegen (`card.forNote`, siehe `CardSheet`).
 */
export function MissionEditor({ missions }: { missions: MissionsView }) {
  const game = useGame();
  const view = useSnapshot();
  const noteCard = view.card?.forNote ? view.card : undefined;
  const editor = missions.editor!;
  const [title, setTitle] = useState(editor.title);
  const [text, setText] = useState(editor.text);
  const [state, setState] = useState<MissionState>(editor.state);
  const [client, setClient] = useState(editor.client ?? '');
  const [places, setPlaces] = useState<readonly MissionPlaceView[]>(editor.places);
  const [people, setPeople] = useState<readonly MissionPersonView[]>(editor.people);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Der Text wächst mit, damit eine angehängte Kartenauswahl immer ganz zu sehen ist.
  const textField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = textField.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  const isNew = editor.id === undefined;
  const input = (): MissionInput => ({ title, text, state, ...(client === '' ? {} : { client }), places: places.map((p) => ({ place: p.place, ...(p.label ? { label: p.label } : {}) })), people: people.map((p) => ({ character: p.id, ...(p.label ? { label: p.label } : {}) })) });
  const save = () => game.saveMission(input());
  const here = missions.here;
  // Ein Auftraggeber, der nicht mehr wählbar ist (inzwischen SC oder ausgeblendet), bleibt als eigene Zeile stehen.
  const listed = missions.clients.some((g) => g.npcs.some((n) => n.id === client));
  return (
    <div className="overlay">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="mission-editor-title">
        <div className="sheet-head centered">
          <h2 id="mission-editor-title">{isNew ? 'Neue Mission' : 'Mission bearbeiten'}</h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={() => game.closeMissionEditor()}>
            <CloseIcon />
          </button>
        </div>
        <Form className="sheet-body form" id="mission-form" onSend={save}>
          {editor.error && (
            <p className="error" role="alert">
              {editor.error}
            </p>
          )}
          <label className="field">
            <span>Titel</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Fracht nach Regina schmuggeln" autoComplete="off" />
          </label>
          <div className="field">
            <span id="mission-state-label">Zustand</span>
            <div className="segmented mission-states" role="radiogroup" aria-labelledby="mission-state-label">
              {(['open', 'done', 'failed'] as const).map((s) => (
                <button key={s} type="button" role="radio" data-state={s} aria-checked={state === s} onClick={() => setState(s)}>
                  {missionStateText[s]}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Auftraggeber</span>
            <select value={client} onChange={(e) => setClient(e.target.value)}>
              <option value="">keiner</option>
              {client !== '' && !listed && <option value={client}>{editor.client === client ? 'bisheriger Auftraggeber' : client}</option>}
              {missions.clients.map((g) => (
                <optgroup key={g.role} label={roleText[g.role]}>
                  {g.npcs.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Text</span>
            <textarea ref={textField} className="note-grow" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Worum es geht, was vereinbart ist, Belohnung, Frist …" />
          </label>
          <button
            type="button"
            className="ghost name-from-card note-card-draw"
            onClick={() => {
              haptic('draw');
              game.drawCard(undefined, true);
            }}
          >
            <CardIcon />
            Karte ziehen
          </button>
          <fieldset>
            <legend>Beteiligte</legend>
            {people.length === 0 && <p className="small-label">Noch niemand. Etwa das Opfer, der Fahrer, ein Informant; NSC oder SC.</p>}
            {people.length > 0 && (
              <ul className="mission-place-rows">
                {people.map((p, i) => (
                  <li key={p.id} className="mission-place-row mission-person-row">
                    <span className="mission-place-where">
                      <PersonIcon />
                      <span>
                        {p.name}
                        {p.dead ? ' †' : ''}
                      </span>
                    </span>
                    <input aria-label={`Etikett für ${p.name}`} value={p.label ?? ''} placeholder="Etikett, z. B. Opfer, Fahrer" onChange={(e) => setPeople(people.map((q, j) => (j === i ? { ...q, label: e.target.value } : q)))} />
                    <button type="button" className="icon-button" aria-label={`${p.name} entfernen`} onClick={() => setPeople(people.filter((_, j) => j !== i))}>
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <select
              aria-label="Beteiligten hinzufügen"
              value=""
              onChange={(e) => {
                const chosen = missions.persons.flatMap((g) => g.characters).find((c) => c.id === e.target.value);
                if (chosen) setPeople([...people, { ...chosen, label: undefined }]);
              }}
            >
              <option value="">+ Beteiligten hinzufügen</option>
              {missions.persons.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.characters
                    .filter((c) => !people.some((p) => p.id === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.dead ? ' †' : ''}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Orte</legend>
            {places.length === 0 && <p className="small-label">Noch kein Ort.</p>}
            {places.length > 0 && (
              <ul className="mission-place-rows">
                {places.map((p, i) => (
                  <li key={i} className="mission-place-row">
                    <span className="mission-place-where">
                      <LocateIcon />
                      <span>{p.text}</span>
                    </span>
                    <input aria-label={`Etikett für ${p.text}`} value={p.label ?? ''} placeholder="Etikett, z. B. Treffpunkt" onChange={(e) => setPlaces(places.map((q, j) => (j === i ? { ...q, label: e.target.value } : q)))} />
                    <button type="button" className="icon-button" aria-label={`Ort ${p.text} entfernen`} onClick={() => setPlaces(places.filter((_, j) => j !== i))}>
                      <CloseIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mission-place-adds">
              <button type="button" className="ghost" disabled={!here} title={missions.hereBlocker} onClick={() => here && setPlaces([...places, here])}>
                + Aufenthaltsort
              </button>
              <button type="button" className="ghost" onClick={() => game.startMissionPicking(input())}>
                + Auf dem Globus
              </button>
            </div>
            {!here && missions.hereBlocker && <p className="small-label">{missions.hereBlocker}</p>}
          </fieldset>
          {!isNew && (
            <div className="remove-block">
              {confirmRemove ? (
                <button type="button" className="ghost danger" onClick={() => game.deleteMission(editor.id!)}>
                  {editor.inLog ? 'Wirklich ausblenden?' : 'Wirklich löschen?'}
                </button>
              ) : (
                <button type="button" className="ghost danger" onClick={() => setConfirmRemove(true)}>
                  <TrashIcon />
                  {editor.inLog ? 'Ausblenden' : 'Löschen'}
                </button>
              )}
              <span className="small-label">{editor.inLog ? 'Kommt im Log als Handlungsfaden vor: wird ausgeblendet, nicht gelöscht.' : 'Wird gelöscht.'}</span>
            </div>
          )}
        </Form>
        <div className="sheet-foot">
          <button type="button" className="ghost" onClick={() => game.closeMissionEditor()}>
            Abbrechen
          </button>
          <span className="count" />
          <button type="button" className="primary wide" onClick={save}>
            Speichern
          </button>
        </div>
      </section>
      {noteCard && (
        <CardSheet
          card={noteCard}
          onConfirm={(picked) => {
            if (!picked) return;
            setText((t) => (t.trim() ? `${t}\n${picked}` : picked));
          }}
        />
      )}
    </div>
  );
}
