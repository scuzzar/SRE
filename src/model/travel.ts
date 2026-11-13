import { keepFocus, livingCharacters, type Campaign, type Character, type CharacterId, type Possession } from './campaign';
import { DomainError } from './errors';
import type { Journey, LowBerth, Passenger } from './log';
import type { Clock, Random } from './ports';
import { itemOf } from './reference';
import { sum, type Dice } from './rules';
import { hexById, hexId, worldOf, type Hex } from './sector';
import { fundsOf, locationOf, type Booking } from './shop';
import { dayOf, JOURNEY_DAYS } from './time';
import { woundedUpp, woundsOf } from './wounds';

/** Wie weit eine Passage zurzeit reicht: Sprung 2 (Entscheidung des Owners). */
export const MAX_JUMP = 2;

/** Die Passagen (SE S. 8–9), als Gegenstände der Liste. */
export const passages = ['high-passage', 'middle-passage', 'low-passage'] as const;
export type PassageId = (typeof passages)[number];
export const LOW_PASSAGE: PassageId = 'low-passage';

/** Der Wurf zum Aufwachen aus dem Kälteschlaf: 5+ auf 2W6 (SE S. 9). */
export const REVIVE_TARGET = 5;

/** Was der Kapitän je Low Passage in die Lotterie gibt (SE S. 9). */
export const LOTTERY_SHARE = 10;

/** Die Raumhäfen mit Linienverkehr: A bis E (in eHex 10 bis 14); X hat keinen. */
export function hasStarport(hex: Hex): boolean {
  const port = hex.uwp.starport;
  return port !== undefined && port >= 10 && port <= 14;
}

/**
 * Die Entfernung zweier Felder in Parsec. Die Karte schiebt gerade Spalten eine halbe Zeile nach
 * unten; daraus werden Würfelkoordinaten.
 */
export function parsecs(a: Pick<Hex, 'column' | 'row'>, b: Pick<Hex, 'column' | 'row'>): number {
  const cube = (h: Pick<Hex, 'column' | 'row'>) => {
    const q = h.column - 1;
    return { q, r: h.row - (q - (q & 1)) / 2 };
  };
  const p = cube(a);
  const o = cube(b);
  const dq = p.q - o.q;
  const dr = p.r - o.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Wer reist: alle lebenden, nicht ausgeblendeten Charaktere der Kampagne. */
export function travellersOf(campaign: Campaign): readonly Character[] {
  return livingCharacters(campaign);
}

/** Warum die Gruppe nicht dorthin reisen kann; `undefined`, wenn sie kann. */
export function journeyBlocker(campaign: Campaign, to: string): string | undefined {
  const from = locationOf(campaign);
  if (!from || campaign.location === undefined) return 'Die Gruppe ist auf keiner Welt; erst den Aufenthaltsort wählen.';
  if (campaign.location === to) return 'Die Gruppe ist schon hier.';
  const target = hexById(campaign.hexes, to);
  if (!target || target.empty) return 'Hier gibt es keine Welt.';
  worldOf(campaign.hexes, to);
  if (!hasStarport(from)) return `${from.name} hat keinen Raumhafen mit Linienverkehr.`;
  if (!hasStarport(target)) return 'Diese Welt hat keinen Raumhafen mit Linienverkehr.';
  const distance = parsecs(from, target);
  if (distance > MAX_JUMP) return `${distance} Parsec sind zu weit; eine Passage reicht bis Sprung ${MAX_JUMP}.`;
  if (campaign.encounters.some((e) => !e.ended)) return 'Während einer laufenden Begegnung reist man nicht.';
  if (travellersOf(campaign).length === 0) return 'Es gibt keinen lebenden Charakter, der reisen könnte.';
  return undefined;
}

/** Die Welten, die die Gruppe von hier aus mit einer Passage erreicht. */
export function destinationsOf(campaign: Campaign): readonly string[] {
  return campaign.hexes.flatMap((h) => {
    const id = hexId(h.column, h.row);
    try {
      return journeyBlocker(campaign, id) === undefined ? [id] : [];
    } catch {
      return [];
    }
  });
}

/** Was die Passagen kosten, die nicht im Gruppengepäck liegen: so viel kauft die App dazu. */
export function journeyCost(campaign: Campaign, choice: Readonly<Record<CharacterId, PassageId>>): number {
  const need = new Map<string, number>();
  for (const id of Object.values(choice)) need.set(id, (need.get(id) ?? 0) + 1);
  let cost = 0;
  for (const [item, count] of need) {
    const have = ticketsOf(campaign, item);
    cost += Math.max(0, count - have) * (itemOf(item).price ?? 0);
  }
  return cost;
}

/** Wie viele Stück dieser Passage im Gruppengepäck liegen. */
export function ticketsOf(campaign: Campaign, item: string): number {
  return campaign.stash.filter((p) => p.of === item && p.from === undefined).reduce((n, p) => n + p.count, 0);
}

/** Der DM beim Aufwachen eines Charakters: +1 mit Medic-2 unter den Wachen, −1 bei END 6 oder weniger (SE S. 9). */
export function reviveDm(campaign: Campaign, who: CharacterId, choice: Readonly<Record<CharacterId, PassageId>>): number {
  const medic = Object.entries(choice).some(([id, passage]) => passage !== LOW_PASSAGE && (campaign.characters.find((c) => c.id === id)?.skills.some((s) => !s.retired && s.of === 'medical' && s.level >= 2) ?? false));
  const character = campaign.characters.find((c) => c.id === who);
  const end = character ? woundedUpp(character.upp, woundsOf(campaign, who)).end : 7;
  return (medic ? 1 : 0) + (end <= 6 ? -1 : 0);
}

/** `/survived`: Würfel + DM ≥ 5. */
export function survived(berth: LowBerth): boolean {
  return sum(berth.revive) + berth.dm >= REVIVE_TARGET;
}

/** `/pot`: Cr 10 je Low-Passagier. */
export function potOf(journey: Journey): number {
  return journey.berths.length * LOTTERY_SHARE;
}

/** Die Stellen der Kojen mit dem besten Tipp: am nächsten an der Zahl der Überlebenden. */
function closest(berths: readonly LowBerth[]): readonly number[] {
  const alive = berths.filter(survived).length;
  const best = Math.min(...berths.map((b) => Math.abs(b.guess - alive)));
  return berths.flatMap((b, i) => (Math.abs(b.guess - alive) === best ? [i] : []));
}

/** `/winner`: die Koje mit dem nächsten Tipp; bei Gleichstand die, die das Los gewann. Ohne Low-Passagiere keine. */
export function winnerOf(journey: Journey): number | undefined {
  if (journey.berths.length === 0) return undefined;
  const best = closest(journey.berths);
  return best.length === 1 ? best[0] : journey.lot;
}

/** Ob die Lotterie an einen Lebenden geht; sonst behält der Kapitän den Topf. */
export function lotteryPaid(journey: Journey): boolean {
  const winner = winnerOf(journey);
  return winner !== undefined && survived(journey.berths[winner]!);
}

function d6(random: Random): number {
  return random.int(1, 6);
}

function roll2(random: Random): Dice {
  return [d6(random), d6(random)];
}

/** Nimmt eine Passage aus dem Gepäck: ein Stück weniger. */
function takeTicket(stash: readonly Possession[], item: string): readonly Possession[] {
  const at = stash.findIndex((p) => p.of === item && p.from === undefined && p.count > 0);
  return stash.flatMap((p, i) => (i !== at ? [p] : p.count > 1 ? [{ ...p, count: p.count - 1 }] : []));
}

/** Die Zahl der NSC in Low Passage, die mitreisen: 1W6 (Hausregel; die Passagiertabelle fehlt). */
export function rollNpcLow(random: Random): number {
  return d6(random);
}

/**
 * Die Gruppe reist von ihrem Aufenthaltsort nach `to` (SE S. 8–9). Jeder Reisende hat eine Passage
 * (`choice`); sie kommt aus dem Gepäck oder wird zum Preis der Charts gekauft. Reist ein SC in Low
 * Passage, reisen `npcDie` NSC mit, jeder SC tippt (`guesses`), alle würfeln zum Aufwachen, und die
 * Lotterie wird ausgezahlt. Danach ist es eine Woche später und die Gruppe am Ziel.
 */
export function travel(
  campaign: Campaign,
  to: string,
  choice: Readonly<Record<CharacterId, PassageId>>,
  guesses: Readonly<Record<CharacterId, number>>,
  npcDie: number | undefined,
  random: Random,
  clock: Clock,
): Campaign {
  const blocker = journeyBlocker(campaign, to);
  if (blocker) throw new DomainError(blocker);
  const from = campaign.location!;
  const travellers = travellersOf(campaign);
  for (const c of travellers) if (!passages.includes(choice[c.id] as PassageId)) throw new DomainError(`Für ${c.name} fehlt die Passage.`);
  if (Object.keys(choice).some((id) => !travellers.some((c) => c.id === id))) throw new DomainError('Eine Passage gehört niemandem, der reist.');
  const cost = journeyCost(campaign, choice);
  if (cost > fundsOf(campaign)) throw new DomainError(`Die Passagen kosten Cr ${cost.toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`);

  // Passagen aus dem Gepäck nehmen, fehlende kaufen.
  let stash = campaign.stash;
  const bookings: Booking[] = [...campaign.bookings];
  const passengers: Passenger[] = [];
  for (const c of travellers) {
    const passage = choice[c.id]!;
    passengers.push({ for: c.id, passage });
    if (ticketsOf({ ...campaign, stash }, passage) > 0) stash = takeTicket(stash, passage);
    else bookings.push({ at: clock.now(), kind: 'purchase', amount: -(itemOf(passage).price ?? 0), bought: passage, count: 1, in: from });
  }

  // Kälteschlaf: die SC in Low Passage, dann die NSC; alle tippen vor dem Aufwachen.
  const low = travellers.filter((c) => choice[c.id] === LOW_PASSAGE);
  const npcs = low.length === 0 ? 0 : (npcDie ?? 0);
  if (low.length > 0 && (npcDie === undefined || !Number.isInteger(npcDie) || npcDie < 1 || npcDie > 6)) throw new DomainError('Die Zahl der mitreisenden NSC fehlt (1W6).');
  const total = low.length + npcs;
  const berths: LowBerth[] = [];
  for (const c of low) {
    const guess = guesses[c.id];
    if (guess === undefined || !Number.isInteger(guess) || guess < 0 || guess > total) throw new DomainError(`${c.name} tippt eine Zahl von 0 bis ${total}.`);
    berths.push({ for: c.id, revive: roll2(random), dm: reviveDm(campaign, c.id, choice), guess });
  }
  for (let i = 0; i < npcs; i++) berths.push({ revive: roll2(random), dm: 0, guess: random.int(0, total) });

  const ties = berths.length === 0 ? [] : closest(berths);
  const today = dayOf(campaign);
  const journey: Journey = {
    kind: 'journey',
    at: clock.now(),
    day: today,
    from,
    to,
    days: JOURNEY_DAYS,
    passengers,
    berths,
    ...(low.length > 0 ? { npcDie: npcs } : {}),
    ...(ties.length > 1 ? { lot: ties[random.int(0, ties.length - 1)]! } : {}),
  };
  const index = campaign.log.length;
  const winner = winnerOf(journey);
  const pc = winner === undefined ? undefined : berths[winner]!.for;
  if (pc !== undefined && lotteryPaid(journey)) bookings.push({ at: clock.now(), kind: 'lottery', amount: potOf(journey), for: pc, won: index });

  // Wer nicht aufwacht, stirbt.
  const dead = new Set(berths.filter((b) => b.for !== undefined && !survived(b)).map((b) => b.for!));
  const after: Campaign = {
    ...campaign,
    stash,
    bookings,
    characters: campaign.characters.map((c) => (dead.has(c.id) ? { ...c, dead: true } : c)),
    log: [...campaign.log, journey],
    day: today + JOURNEY_DAYS,
    location: to,
  };
  return keepFocus(campaign, after);
}

/** Prüft eine Reise aus der Kampagnendatei: Felder, Passagen, Charaktere, Kojen, Los. */
export function checkJourney(campaign: Campaign, journey: Journey): void {
  if (!hexById(campaign.hexes, journey.from) || !hexById(campaign.hexes, journey.to)) throw new DomainError('Eine Reise verweist auf ein Feld, das es nicht gibt.');
  if (journey.days !== JOURNEY_DAYS) throw new DomainError(`Eine Reise dauert ${JOURNEY_DAYS} Tage.`);
  if (journey.passengers.length === 0) throw new DomainError('Eine Reise hat mindestens einen Passagier.');
  for (const p of journey.passengers) {
    if (!campaign.characters.some((c) => c.id === p.for)) throw new DomainError(`Eine Reise verweist auf ${p.for}, der kein Charakter der Kampagne ist.`);
    if (!passages.includes(p.passage as PassageId)) throw new DomainError(`${p.passage} ist keine Passage.`);
  }
  const low = journey.passengers.filter((p) => p.passage === LOW_PASSAGE).map((p) => p.for);
  const pcBerths = journey.berths.filter((b) => b.for !== undefined).map((b) => b.for!);
  if (low.length !== pcBerths.length || low.some((id, i) => pcBerths[i] !== id)) throw new DomainError('Jeder in Low Passage hat genau eine Koje, in der Reihenfolge der Passagiere.');
  if (journey.berths.slice(0, low.length).some((b) => b.for === undefined)) throw new DomainError('Erst die Kojen der Charaktere, dann die der NSC.');
  const npcs = journey.berths.length - low.length;
  if (low.length === 0 ? journey.npcDie !== undefined || npcs !== 0 : journey.npcDie !== npcs) throw new DomainError('Die Zahl der NSC-Kojen passt nicht zum Würfel.');
  for (const b of journey.berths) {
    if (!Number.isInteger(b.guess) || b.guess < 0 || b.guess > journey.berths.length) throw new DomainError('Ein Tipp der Lotterie liegt außerhalb.');
  }
  const ties = journey.berths.length === 0 ? [] : closest(journey.berths);
  if (ties.length > 1 ? journey.lot === undefined || !ties.includes(journey.lot) : journey.lot !== undefined) throw new DomainError('Das Los der Lotterie passt nicht zum Gleichstand.');
}
