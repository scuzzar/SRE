// Missionen (Domänenmodell: Mission, MissionPlace, MissionState; siehe docs/modell/mission.md, *Missionen*).
// Eine Mission ist ein Auftrag oder Ziel der Gruppe, mit Titel, Text, Zustand, höchstens einem
// Auftraggeber (einem dauerhaften NSC) und Orten, die immer Felder der Oberfläche sind. Die offenen
// Missionen sind die Handlungsfäden des Orakels.

import type { Campaign, CharacterId } from './campaign';
import { DomainError } from './errors';
import { checkPlace, placeCell, type Place } from './place';
import { worldOf } from './sector';

export const missionStates = ['open', 'done', 'failed'] as const;
export type MissionState = (typeof missionStates)[number];

export type MissionId = string;

/** Ein Ort einer Mission: ein Feld der Oberfläche oder eine Stadt auf einem Feld, mit einem freien Etikett. */
export interface MissionPlace {
  readonly place: Place;
  /** Z. B. „Treffpunkt“ oder „Ziel“; fehlt, wenn keins vergeben ist. */
  readonly label?: string;
}

/** Ein Beteiligter einer Mission (2026-11-18b): ein Charakter der Kampagne, NSC oder SC, mit einem freien Etikett. */
export interface MissionPerson {
  readonly character: CharacterId;
  /** Z. B. „Opfer“, „Fahrer“ oder „Informant“; fehlt, wenn keins vergeben ist. */
  readonly label?: string;
}

export interface Mission {
  readonly id: MissionId;
  /** Nicht leer, ohne Leerraum am Rand. */
  readonly title: string;
  /** Freier Text, darf leer sein. */
  readonly text: string;
  readonly state: MissionState;
  /** Ausgeblendet statt gelöscht, weil eine Kartenauswahl auf sie verweist (als Handlungsfaden). */
  readonly retired: boolean;
  /** Der Auftraggeber: ein dauerhafter NSC der Kampagne; fehlt, wenn es keinen gibt. */
  readonly client?: CharacterId;
  /** In der Reihenfolge, in der man sie hinzugefügt hat. */
  readonly places: readonly MissionPlace[];
  /** Die Beteiligten, in der Reihenfolge, in der man sie hinzugefügt hat; jeder Charakter höchstens einmal. */
  readonly people: readonly MissionPerson[];
}

/** Was man im Editor einer Mission eingibt. */
export interface MissionInput {
  readonly title: string;
  readonly text: string;
  readonly state: MissionState;
  readonly client?: CharacterId;
  readonly places: readonly MissionPlace[];
  /** Fehlt bei Eingaben von vor den Beteiligten: keine. */
  readonly people?: readonly MissionPerson[];
}

/** Eine Mission der Kampagne, auch eine ausgeblendete. */
export function missionOf(campaign: Campaign, id: MissionId): Mission {
  const mission = campaign.missions.find((m) => m.id === id);
  if (!mission) throw new DomainError(`Die Mission ${id} gibt es nicht.`);
  return mission;
}

/** Die offenen, nicht ausgeblendeten Missionen: die Handlungsfäden des Orakels. */
export function openMissions(campaign: Campaign): readonly Mission[] {
  return campaign.missions.filter((m) => m.state === 'open' && !m.retired);
}

/** Die Missionen, die der Bereich zeigt (nicht ausgeblendet), in einem Zustand. */
export function missionsIn(campaign: Campaign, state: MissionState): readonly Mission[] {
  return campaign.missions.filter((m) => m.state === state && !m.retired);
}

/** Die ausgeblendeten Missionen. */
export function retiredMissions(campaign: Campaign): readonly Mission[] {
  return campaign.missions.filter((m) => m.retired);
}

/** Die Missionen (nicht ausgeblendet), deren Auftraggeber dieser Charakter ist. */
export function missionsOfClient(campaign: Campaign, id: CharacterId): readonly Mission[] {
  return campaign.missions.filter((m) => m.client === id && !m.retired);
}

/** Ob eine Mission auf diesen Charakter als Auftraggeber oder Beteiligten verweist (auch eine ausgeblendete); dann wird er nie gelöscht. */
export function isClient(campaign: Campaign, id: CharacterId): boolean {
  return campaign.missions.some((m) => m.client === id || m.people.some((p) => p.character === id));
}

/** Die Missionen (nicht ausgeblendet), in denen dieser Charakter vorkommt: als Auftraggeber und bzw. oder als Beteiligter mit Etikett. */
export function missionsOfCharacter(campaign: Campaign, id: CharacterId): readonly { readonly mission: Mission; readonly client: boolean; readonly person: MissionPerson | undefined }[] {
  return campaign.missions.flatMap((mission) => {
    if (mission.retired) return [];
    const client = mission.client === id;
    const person = mission.people.find((p) => p.character === id);
    return client || person ? [{ mission, client, person }] : [];
  });
}

/** Ob eine Kartenauswahl im Log auf die Mission verweist (als Handlungsfaden); dann wird sie nie gelöscht. */
export function isThreadInLog(campaign: Campaign, id: MissionId): boolean {
  return campaign.log.some((e) => e.kind === 'card' && e.thread === id);
}

/** Das Feld eines Missionsorts: das Feld selbst oder das Feld der Stadt. */
export function missionCell(campaign: Pick<Campaign, 'hexes'>, place: Place): number | undefined {
  return placeCell(campaign.hexes, place);
}

/** Die offenen Missionen mit einem Ort auf diesem Feld (auch in einer Stadt darauf), je mit ihren Orten dort. */
export function missionsAt(campaign: Campaign, world: string, cell: number): readonly { readonly mission: Mission; readonly places: readonly MissionPlace[] }[] {
  return openMissions(campaign).flatMap((mission) => {
    const places = mission.places.filter((p) => p.place.world === world && missionCell(campaign, p.place) === cell);
    return places.length > 0 ? [{ mission, places }] : [];
  });
}

/** Die Felder einer Welt, auf denen eine offene Mission einen Ort hat (für die Fahnen auf dem Globus). */
export function missionCells(campaign: Campaign, world: string): readonly number[] {
  const cells = new Set<number>();
  for (const m of openMissions(campaign)) {
    for (const p of m.places) {
      const cell = p.place.world === world ? missionCell(campaign, p.place) : undefined;
      if (cell !== undefined) cells.add(cell);
    }
  }
  return [...cells];
}

/** Die Welten, auf denen eine offene Mission einen Ort hat (für die Fahnen im Subsektor). */
export function missionWorlds(campaign: Campaign): ReadonlySet<string> {
  return new Set(openMissions(campaign).flatMap((m) => m.places.map((p) => p.place.world)));
}

/** Warum ein Ort kein Missionsort sein kann; sonst `undefined`. Ein Missionsort ist ein Feld oder eine Stadt auf einem Feld, nie eine ganze Welt. */
export function missionPlaceBlocker(campaign: Pick<Campaign, 'hexes'>, place: Place | undefined): string | undefined {
  if (!place) return 'Die Gruppe hat keinen Aufenthaltsort.';
  if (place.cell === undefined && place.city === undefined) return 'Ein Missionsort ist ein Feld der Oberfläche, keine ganze Welt.';
  if (missionCell(campaign, place) === undefined) return 'Eine Orbitalstadt liegt auf keinem Feld; ein Missionsort ist ein Feld der Oberfläche.';
  return undefined;
}

/** Prüft einen Missionsort: einen gültigen Ort mit Feld (siehe `missionPlaceBlocker`). */
export function checkMissionPlace(campaign: Pick<Campaign, 'hexes'>, place: Place): void {
  checkPlace(campaign.hexes, place);
  const blocker = missionPlaceBlocker(campaign, place);
  if (blocker) throw new DomainError(`${blocker} (${worldOf(campaign.hexes, place.world).name})`);
}

/** Prüft die Eingabe; `before` ist die Mission, wie sie war (ein Auftraggeber, der inzwischen SC ist, darf bleiben). */
function validateMission(campaign: Campaign, input: MissionInput, before?: Mission): MissionInput {
  const title = input.title.trim();
  if (title === '') throw new DomainError('Eine Mission braucht einen Titel.');
  if (!missionStates.includes(input.state)) throw new DomainError(`Den Zustand ${input.state} gibt es nicht.`);
  if (input.client !== undefined && input.client !== before?.client) {
    const client = campaign.characters.find((c) => c.id === input.client);
    if (!client) throw new DomainError('Der Auftraggeber gehört nicht zur Kampagne.');
    if (!client.npc) throw new DomainError(`${client.name} ist kein NSC; Auftraggeber ist immer ein dauerhafter NSC.`);
    if (client.retired) throw new DomainError(`${client.name} ist ausgeblendet.`);
  }
  for (const p of input.places) checkMissionPlace(campaign, p.place);
  const people = input.people ?? [];
  const seen = new Set<string>();
  for (const p of people) {
    if (seen.has(p.character)) throw new DomainError('Ein Charakter ist in einer Mission höchstens einmal beteiligt.');
    seen.add(p.character);
    const character = campaign.characters.find((c) => c.id === p.character);
    if (!character) throw new DomainError('Ein Beteiligter gehört nicht zur Kampagne.');
    if (character.retired && !before?.people.some((q) => q.character === p.character)) throw new DomainError(`${character.name} ist ausgeblendet.`);
  }
  return {
    title,
    text: input.text.trim(),
    state: input.state,
    ...(input.client === undefined ? {} : { client: input.client }),
    places: input.places.map((p) => {
      const label = p.label?.trim() ?? '';
      return { place: copyPlace(p.place), ...(label === '' ? {} : { label }) };
    }),
    people: people.map((p) => {
      const label = p.label?.trim() ?? '';
      return { character: p.character, ...(label === '' ? {} : { label }) };
    }),
  };
}

function copyPlace(place: Place): Place {
  return { world: place.world, ...(place.cell === undefined ? {} : { cell: place.cell }), ...(place.city === undefined ? {} : { city: place.city }) };
}

/** Die nächste freie Id: m1, m2, … */
function nextMissionId(campaign: Campaign): MissionId {
  const used = new Set(campaign.missions.map((m) => m.id));
  let n = campaign.missions.length + 1;
  while (used.has(`m${n}`)) n++;
  return `m${n}`;
}

/** Legt eine Mission an. */
export function addMission(campaign: Campaign, input: MissionInput): { campaign: Campaign; id: MissionId } {
  const { people, ...valid } = validateMission(campaign, input);
  const id = nextMissionId(campaign);
  return { campaign: { ...campaign, missions: [...campaign.missions, { id, retired: false, ...valid, people: people ?? [] }] }, id };
}

/** Übernimmt die Eingabe für eine bestehende Mission. */
export function updateMission(campaign: Campaign, id: MissionId, input: MissionInput): Campaign {
  const before = missionOf(campaign, id);
  const { people, ...valid } = validateMission(campaign, input, before);
  return { ...campaign, missions: campaign.missions.map((m) => (m.id === id ? { id, retired: m.retired, ...valid, people: people ?? [] } : m)) };
}

/** Löscht eine Mission; verweist eine Kartenauswahl auf sie, wird sie stattdessen ausgeblendet. */
export function removeMission(campaign: Campaign, id: MissionId): Campaign {
  missionOf(campaign, id);
  if (!isThreadInLog(campaign, id)) return { ...campaign, missions: campaign.missions.filter((m) => m.id !== id) };
  return { ...campaign, missions: campaign.missions.map((m) => (m.id === id ? { ...m, retired: true } : m)) };
}

/** Blendet eine ausgeblendete Mission wieder ein. */
export function restoreMission(campaign: Campaign, id: MissionId): Campaign {
  missionOf(campaign, id);
  return { ...campaign, missions: campaign.missions.map((m) => (m.id === id ? { ...m, retired: false } : m)) };
}

/** Prüft die Missionen einer Kampagne (beim Lesen einer Datei): Ids eindeutig, Auftraggeber dauerhafte NSC, Orte Felder. */
export function validateMissions(campaign: Campaign): void {
  const ids = new Set<string>();
  for (const m of campaign.missions) {
    if (ids.has(m.id)) throw new DomainError(`Die Missions-Id ${m.id} kommt doppelt vor.`);
    ids.add(m.id);
    if (m.title.trim() === '' || m.title !== m.title.trim()) throw new DomainError('Eine Mission braucht einen Titel ohne Leerraum am Rand.');
    if (m.client !== undefined && !campaign.characters.some((c) => c.id === m.client)) throw new DomainError(`Der Auftraggeber der Mission ${m.title} gehört nicht zur Kampagne.`);
    for (const p of m.places) checkMissionPlace(campaign, p.place);
    const people = new Set<string>();
    for (const p of m.people) {
      if (people.has(p.character)) throw new DomainError(`In der Mission ${m.title} ist ein Charakter doppelt beteiligt.`);
      people.add(p.character);
      if (!campaign.characters.some((c) => c.id === p.character)) throw new DomainError(`Ein Beteiligter der Mission ${m.title} gehört nicht zur Kampagne.`);
    }
  }
}
