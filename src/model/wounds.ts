import { activeSkills, anyCharacterOf, characterOf, isCampaignCharacter, keepFocus, livingCharacters, type Campaign, type CharacterId, type Upp } from './campaign';
import { DomainError } from './errors';
import { damageDiceOf, damageOf, damageVictim, physical, type AttackResult, type DamageRoll, type LogEntry, type PhysicalCharacteristic, type Recovery, type RecoveryKind } from './log';
import { animalRowOf } from './animals';
import type { Clock, Random } from './ports';
import { currentEncounter, encounterStart } from './encounter';

/** Wie viel STR, DEX und END jemand durch Treffer verloren hat. */
export interface Wounds {
  readonly str: number;
  readonly dex: number;
  readonly end: number;
}

export type WoundState = 'unhurt' | 'wounded' | 'unconscious' | 'serious' | 'dead';

const key = { STR: 'str', DEX: 'dex', END: 'end' } as const;


/** Die Schadenswürfe gegen diesen Charakter, in der Reihenfolge des Logs. */
export function damageAgainst(log: readonly LogEntry[], who: CharacterId): readonly DamageRoll[] {
  return log.flatMap((e) => (e.kind === 'damage' && e.to !== undefined && damageVictim(log, e) === who ? [e] : []));
}

export function uppOf(campaign: Campaign, who: CharacterId): Upp {
  return anyCharacterOf(campaign, who).upp;
}

/** Ein Block eines Schadenswurfs: so viele Punkte auf dieses Attribut (SR 21). */
export interface WoundBlock {
  readonly points: number;
  readonly to: PhysicalCharacteristic;
}

/** Die Blöcke eines Schadenswurfs; einer von vor dem Überlauf hat keine Punkte: je Würfel ein Block. */
export function blocksOf(roll: DamageRoll): readonly WoundBlock[] {
  if (roll.to === undefined) return [];
  const dice = damageDiceOf(roll);
  return roll.to.map((to, i) => ({ to, points: roll.points ? roll.points[i]! : dice[i]! }));
}

/** Wendet Blöcke auf Wunden an; ein Attribut nimmt höchstens auf, was es bis 0 noch hat. */
function apply(upp: Upp, wounds: Wounds, blocks: readonly WoundBlock[]): Wounds {
  const taken = { ...wounds };
  blocks.forEach((b) => {
    const k = key[b.to];
    taken[k] += Math.min(b.points, Math.max(0, upp[k] - taken[k]));
  });
  return taken;
}

/** Wie weit die Verteilung ist: die Blöcke bis hierher und, wenn noch etwas offen ist, der nächste. */
export interface Distribution {
  readonly blocks: readonly WoundBlock[];
  /** Der nächste Block: Würfel `die`, Rest `rest`, auf eines der Attribute über 0 (`open`). */
  readonly next?: { readonly die: number; readonly rest: number; readonly open: readonly PhysicalCharacteristic[] };
}

/**
 * Verteilt Würfel nach SR 21 in Blöcken: je gewähltem Attribut (`to`, je Block eins) so viel, wie es
 * bis 0 aufnimmt; der Rest des Würfels wird der nächste Block. Ist nur ein Attribut über 0, nimmt
 * es den Block von selbst; sind alle auf 0, verfällt der Rest. Ein Attribut auf 0 lässt sich nicht
 * wählen.
 */
export function distribute(upp: Upp, wounds: Wounds, dice: readonly number[], to: readonly PhysicalCharacteristic[]): Distribution {
  const taken = { ...wounds };
  const left = (c: PhysicalCharacteristic) => Math.max(0, upp[key[c]] - taken[key[c]]);
  const blocks: WoundBlock[] = [];
  for (let die = 0; die < dice.length; die++) {
    let rest = dice[die]!;
    while (rest > 0) {
      const open = physical.filter((c) => left(c) > 0);
      if (open.length === 0) break;
      const choice = to[blocks.length] ?? (open.length === 1 ? open[0] : undefined);
      if (choice === undefined) return { blocks, next: { die, rest, open } };
      if (!physical.includes(choice)) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
      if (!open.includes(choice)) throw new DomainError(`${choice} steht schon auf 0; der Rest geht auf ein anderes Attribut.`);
      const points = Math.min(rest, left(choice));
      taken[key[choice]] += points;
      rest -= points;
      blocks.push({ points, to: choice });
    }
  }
  if (to.length > blocks.length) throw new DomainError('Es sind schon alle Würfel verteilt.');
  return { blocks };
}

/** Die Verteilung auf diesen Charakter mit seinen Wunden bis jetzt. */
export function distributeOn(campaign: Campaign, who: CharacterId, dice: readonly number[], to: readonly PhysicalCharacteristic[]): Distribution {
  return distribute(uppOf(campaign, who), woundsOf(campaign, who), dice, to);
}

/** Gilt die Heilung diesem Charakter? */
function heals(entry: LogEntry, who: CharacterId): entry is Recovery {
  return entry.kind === 'recovery' && entry.for === who;
}

/** Was Schaden und Heilung bis hierher ergeben haben. */
export interface History {
  readonly wounds: Wounds;
  /** Standen seit der letzten vollen Heilung zwei Attribute zugleich auf 0? */
  readonly serious: boolean;
  /** Kein Schaden seit der letzten vollen Heilung: Der nächste Treffer ist ein erster. */
  readonly fresh: boolean;
}

function zerosOf(upp: Upp, wounds: Wounds): number {
  const current = woundedUpp(upp, wounds);
  return [current.str, current.dex, current.end].filter((v) => v <= 0).length;
}

/** Aufwachen: bei einem Attribut auf 0 die Mitte zwischen verwundet und voll (abgerundet), bei zwei mindestens 1. */
function woken(upp: Upp, wounds: Wounds): Wounds {
  const serious = zerosOf(upp, wounds) >= 2;
  const back = (k: 'str' | 'dex' | 'end') => {
    const current = upp[k] - wounds[k];
    const after = serious ? Math.min(upp[k], Math.max(1, current)) : Math.floor((current + upp[k]) / 2);
    return upp[k] - after;
  };
  return { str: back('str'), dex: back('dex'), end: back('end') };
}

/** Schaden und Heilung im Log der Reihe nach, bis vor die Stelle `upTo`. */
export function historyOf(log: readonly LogEntry[], upp: Upp, who: CharacterId, upTo = log.length): History {
  let wounds: Wounds = { str: 0, dex: 0, end: 0 };
  let serious = false;
  let fresh = true;
  log.slice(0, upTo).forEach((entry) => {
    if (entry.kind === 'damage' && entry.to !== undefined && damageVictim(log, entry) === who) {
      wounds = apply(upp, wounds, blocksOf(entry));
      fresh = false;
      if (zerosOf(upp, wounds) >= 2) serious = true;
    } else if (heals(entry, who)) {
      if (entry.how === 'wake') wounds = woken(upp, wounds);
      else {
        wounds = { str: 0, dex: 0, end: 0 };
        serious = false;
        fresh = true;
      }
    }
  });
  return { wounds, serious, fresh };
}

/** `/wounds`: was Schadenswürfe und Heilungen im Log diesem Charakter genommen bzw. gegeben haben. */
export function woundsOf(campaign: Campaign, who: CharacterId): Wounds {
  return historyOf(campaign.log, uppOf(campaign, who), who).wounds;
}

/** Das UPP mit den Wunden: STR, DEX und END um das verringert, was sie verloren haben. */
export function woundedUpp(upp: Upp, wounds: Wounds): Upp {
  return { ...upp, str: upp.str - wounds.str, dex: upp.dex - wounds.dex, end: upp.end - wounds.end };
}

/** `/state`: nach der Zahl der Attribute auf 0. */
export function woundState(upp: Upp, wounds: Wounds): WoundState {
  const current = woundedUpp(upp, wounds);
  const zeros = [current.str, current.dex, current.end].filter((v) => v <= 0).length;
  if (zeros >= 3) return 'dead';
  if (zeros === 2) return 'serious';
  if (zeros === 1) return 'unconscious';
  return wounds.str + wounds.dex + wounds.end > 0 ? 'wounded' : 'unhurt';
}

export function woundStateOf(campaign: Campaign, who: CharacterId): WoundState {
  const character = anyCharacterOf(campaign, who);
  if (character.animal) return animalState(animalRowOf(campaign.hexes, character.animal).hits!, hurtOf(campaign, who));
  return woundState(uppOf(campaign, who), woundsOf(campaign, who));
}

/** `/hurt`: die Summe des Schadens, den ein Tier genommen hat (SR 47); Tiere haben keine Attribute. */
export function hurtOf(campaign: Campaign, who: CharacterId): number {
  const log = campaign.log;
  return log.reduce((sum, e) => (e.kind === 'damage' && damageVictim(log, e) === who ? sum + damageOf(e) : sum), 0);
}

/** Der Zustand eines Tiers nach seinen Hits: die erste Zahl erreicht bewusstlos, beide zusammen tot (SR 47). */
export function animalState(hits: readonly [number, number], hurt: number): WoundState {
  if (hurt >= hits[0] + hits[1]) return 'dead';
  if (hurt >= hits[0]) return 'unconscious';
  return hurt > 0 ? 'wounded' : 'unhurt';
}

/** Ist das ein Tier? */
export function isAnimal(campaign: Campaign, who: CharacterId): boolean {
  return anyCharacterOf(campaign, who).animal !== undefined;
}

/** Wer bewusstlos, schwer verwundet oder tot ist, greift nicht an. */
export function canFight(state: WoundState): boolean {
  return state === 'unhurt' || state === 'wounded';
}

/**
 * Der erste Schaden, den jemand bekommt, geht auf ein zufälliges Attribut, bis es auf 0 ist (S. 7,
 * SR 21); nach einer vollen Heilung wieder. Mit `since` (der erste Logeintrag eines Kampfs) gilt er
 * in jedem Kampf neu (Errata zu *The Traveller Book*, S. 35: „first wound … in each combat“).
 */
export function isFirstHit(log: readonly LogEntry[], who: CharacterId, since?: number): boolean {
  let fresh = true;
  log.forEach((entry, i) => {
    if (i === since) fresh = true;
    if (entry.kind === 'damage' && entry.to !== undefined && damageVictim(log, entry) === who) fresh = false;
    else if (heals(entry, who) && entry.how !== 'wake') fresh = true;
  });
  return fresh;
}

/** Ist der nächste Treffer gegen diesen Charakter ein erster? In einer laufenden Begegnung zählt nur sie. */
export function isFirstHitNow(campaign: Campaign, who: CharacterId): boolean {
  const encounter = currentEncounter(campaign);
  return isFirstHit(campaign.log, who, encounter ? encounterStart(campaign.log, encounter) : undefined);
}

/**
 * Die Wunden, die beim Kämpfen zählen (SR 21; Errata zu *The Traveller Book*, S. 36): In der
 * laufenden Begegnung senken nur die Wunden von vor ihr STR und DEX für die DMs (Heilungen seitdem
 * zählen mit), ohne Begegnung alle.
 */
export function fightingWounds(campaign: Campaign, who: CharacterId): Wounds {
  const now = woundsOf(campaign, who);
  const encounter = currentEncounter(campaign);
  if (!encounter) return now;
  const start = historyOf(campaign.log, uppOf(campaign, who), who, encounterStart(campaign.log, encounter)).wounds;
  return { str: Math.min(now.str, start.str), dex: Math.min(now.dex, start.dex), end: Math.min(now.end, start.end) };
}

/** Wen der Treffer an dieser Stelle trifft, wenn er ein Ziel hat. */
export function victimOf(attack: AttackResult): CharacterId | undefined {
  return attack.against;
}

/**
 * Verteilt die Würfel, wo die App es tut (SR 21): beim ersten Treffer alle Blöcke auf ein zufälliges
 * Attribut, bis es auf 0 ist, den Rest zufällig auf die anderen; bei einem NSC sonst jeden Block
 * zufällig auf ein Attribut über 0. Bei einem SC nach dem ersten Treffer wählt der Spieler; dann gibt
 * es `undefined`.
 */
export function autoWounds(campaign: Campaign, who: CharacterId, dice: readonly number[], random: Random, always = false): readonly WoundBlock[] | undefined {
  const first = isFirstHitNow(campaign, who);
  if (!first && !always && isCampaignCharacter(campaign, who)) return undefined;
  const upp = uppOf(campaign, who);
  const wounds = woundsOf(campaign, who);
  const critical = first ? physical[random.int(0, 2)]! : undefined;
  let to: PhysicalCharacteristic[] = [];
  for (;;) {
    const step = distribute(upp, wounds, dice, to);
    if (!step.next) return step.blocks;
    const open = step.next.open;
    const pick = critical !== undefined && open.includes(critical) ? critical : open[random.int(0, open.length - 1)]!;
    to = [...step.blocks.map((b) => b.to), pick];
  }
}

/**
 * Prüft, dass die Verteilung zum Treffer passt: ohne Ziel keine; mit Ziel je Würfel ein Attribut
 * (vor dem Überlauf) oder Blöcke, die der Reihe nach genau die Würfel ergeben, beim letzten
 * Würfel, der einen tötet, auch weniger.
 */
export function checkWounds(log: readonly LogEntry[], roll: DamageRoll, attack: AttackResult, animals?: ReadonlySet<CharacterId>): void {
  checkWoundsOn(log, roll, victimOf(attack), animals);
}

/** Prüft die Verteilung eines Schadens auf diesen Charakter (ohne Ziel: keine). */
export function checkWoundsOn(log: readonly LogEntry[], roll: DamageRoll, who: CharacterId | undefined, animals?: ReadonlySet<CharacterId>): void {
  if (!who) {
    if (roll.to !== undefined || roll.points !== undefined) throw new DomainError('Ein Treffer ohne Ziel verteilt keinen Schaden.');
    return;
  }
  if (animals?.has(who)) {
    if (roll.to !== undefined || roll.points !== undefined) throw new DomainError('Schaden an einem Tier geht nicht auf Attribute, er zählt gegen seine Hits.');
    return;
  }
  if (roll.to === undefined) throw new DomainError('Ein Schaden mit Ziel geht auf Attribute.');
  if (roll.to.some((c) => !physical.includes(c))) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
  if (roll.points === undefined) {
    if (roll.to.length !== damageDiceOf(roll).length) throw new DomainError('Ein Schaden mit Ziel geht je Würfel auf ein Attribut.');
    const earlier = log.slice(0, log.indexOf(roll) < 0 ? log.length : log.indexOf(roll));
    if (isFirstHit(earlier, who) && new Set(roll.to).size > 1) throw new DomainError('Der erste Treffer geht ganz auf ein Attribut.');
    return;
  }
  if (roll.points.length !== roll.to.length) throw new DomainError('Ein Schaden hat je Block ein Attribut und Punkte.');
  const dice = damageDiceOf(roll);
  if (roll.points.some((p) => !Number.isInteger(p) || p < 1 || p > Math.max(6, ...dice))) throw new DomainError('Ein Block hat mindestens einen Punkt und höchstens so viele wie sein Würfel.');
  let block = 0;
  for (const d of dice) {
    let rest = d;
    while (rest > 0 && block < roll.points.length) {
      const points = roll.points[block]!;
      if (points > rest) throw new DomainError('Die Blöcke eines Würfels ergeben mehr als den Würfel.');
      rest -= points;
      block++;
    }
  }
  if (block < roll.points.length) throw new DomainError('Es gibt mehr Blöcke als Würfel.');
}

/** Stirbt ein SC an seinen Wunden, ist er tot; der Charakter oben rückt nach. */
export function markDeath(campaign: Campaign, who: CharacterId): Campaign {
  if (!isCampaignCharacter(campaign, who) || woundStateOf(campaign, who) !== 'dead') return campaign;
  const after = { ...campaign, characters: campaign.characters.map((c) => (c.id === who ? { ...c, dead: true } : c)) };
  return keepFocus(campaign, after);
}

/** Was man für leichte Wunden braucht, neben Medical-1 (S. 7). */
export const MEDICAL_KIT = 'medical-kit';

/** Ob und durch wen jemand geheilt werden kann. */
export interface RecoveryOptions {
  /** Bewusstlos oder schwer verwundet: kann aufwachen. */
  readonly wake: boolean;
  /** Leicht verwundet: heilt nach 3 Tagen Ruhe. */
  readonly rest: boolean;
  /** Seit der letzten vollen Heilung schwer verwundet. */
  readonly serious: boolean;
  /** Verwundet und nicht tot: lässt sich behandeln, wenn es einen gibt, der es kann. */
  readonly treatable: boolean;
  /** Die lebenden SC und ob sie behandeln können, mit Grund, wenn nicht. */
  readonly healers: readonly { readonly id: CharacterId; readonly name: string; readonly able: boolean; readonly why?: string }[];
}

function medicalLevel(campaign: Campaign, id: CharacterId): number {
  return activeSkills(characterOf(campaign, id)).find((s) => s.of === 'medical')?.level ?? 0;
}

/** Was für diesen Charakter an Heilung geht. */
export function recoveryOptions(campaign: Campaign, who: CharacterId): RecoveryOptions {
  // Tiere heilt man nicht.
  if (isAnimal(campaign, who)) return { wake: false, rest: false, serious: false, treatable: false, healers: [] };
  const history = historyOf(campaign.log, uppOf(campaign, who), who);
  const state = woundStateOf(campaign, who);
  const hurt = history.wounds.str + history.wounds.dex + history.wounds.end > 0;
  const treatable = hurt && state !== 'dead';
  const healers = livingCharacters(campaign).map((c) => {
    const level = medicalLevel(campaign, c.id);
    const awake = canFight(woundStateOf(campaign, c.id));
    const needs = history.serious ? 3 : 1;
    const kit = history.serious || c.possessions.some((p) => p.of === MEDICAL_KIT);
    const why = !awake ? 'ist bewusstlos' : level < needs ? `braucht Medical-${needs}` : !kit ? 'braucht ein Medical Kit' : undefined;
    return { id: c.id, name: c.name, able: why === undefined, ...(why === undefined ? {} : { why }) };
  });
  return { wake: state === 'unconscious' || state === 'serious', rest: treatable && !history.serious, serious: history.serious, treatable, healers };
}

/**
 * Heilt einen SC oder NSC der laufenden Begegnung: Aufwachen, Behandlung durch einen SC (bei einer
 * schweren Wunde nur in einer medizinischen Einrichtung, 5W6 Tage) oder Ruhe (nur leichte Wunden).
 */
export function recover(campaign: Campaign, how: RecoveryKind, who: CharacterId, random: Random, clock: Clock, healer?: CharacterId, facility = false): Recovery {
  if (!isCampaignCharacter(campaign, who) && !currentEncounter(campaign)?.npcs.some((n) => n.id === who)) {
    throw new DomainError('Heilen lassen sich NSC nur in der laufenden Begegnung.');
  }
  const options = recoveryOptions(campaign, who);
  const name = anyCharacterOf(campaign, who).name;
  const base = { kind: 'recovery' as const, at: clock.now(), how, for: who };
  if (how === 'wake') {
    if (!options.wake) throw new DomainError(`${name} ist nicht bewusstlos.`);
    return base;
  }
  if (!options.treatable) throw new DomainError(woundStateOf(campaign, who) === 'dead' ? `${name} ist tot.` : `${name} ist nicht verwundet.`);
  if (how === 'rest') {
    if (!options.rest) throw new DomainError('Eine schwere Wunde heilt ohne Behandlung nicht.');
    return base;
  }
  if (healer === undefined) throw new DomainError('Für die Behandlung fehlt, wer behandelt.');
  const by = options.healers.find((h) => h.id === healer);
  if (!by) throw new DomainError('Behandeln kann nur ein lebender SC.');
  if (!by.able) throw new DomainError(`${by.name} ${by.why}.`);
  if (healer === who && !canFight(woundStateOf(campaign, who))) throw new DomainError(`${name} ist bewusstlos und behandelt sich nicht selbst.`);
  if (!options.serious) return { ...base, by: healer };
  if (!facility) throw new DomainError('Eine schwere Wunde behandelt man nur in einer medizinischen Einrichtung.');
  return { ...base, by: healer, dice: Array.from({ length: 5 }, () => random.int(1, 6)) };
}

/** `/days`: wie lange eine Behandlung einer schweren Wunde dauert. */
export function daysOf(recovery: Recovery): number | undefined {
  return recovery.dice?.reduce((sum, d) => sum + d, 0);
}

/** Prüft eine Heilung aus der Kampagnendatei: Patient ein Charakter, Behandlung mit Behandelndem, Tage nur bei schweren Wunden. */
export function checkRecovery(campaign: Campaign, entry: Recovery, at: number): void {
  const who = entry.for;
  anyCharacterOf(campaign, who);
  if ((entry.how === 'treatment') !== (entry.by !== undefined)) throw new DomainError('Nur eine Behandlung hat einen Behandelnden.');
  if (entry.by !== undefined) characterOf(campaign, entry.by);
  const history = historyOf(campaign.log, uppOf(campaign, who), who, at);
  if (entry.how === 'treatment' && (entry.dice !== undefined) !== history.serious) throw new DomainError('Nur die Behandlung einer schweren Wunde dauert 5W6 Tage.');
  if (entry.dice !== undefined && (entry.dice.length !== 5 || entry.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6))) throw new DomainError('Die Behandlung einer schweren Wunde dauert 5W6 Tage.');
  if (entry.how === 'rest' && history.serious) throw new DomainError('Eine schwere Wunde heilt ohne Behandlung nicht.');
}
