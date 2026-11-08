import { anyCharacterOf, appendLog, type Campaign, type CharacterId } from './campaign';
import { fighterOf, weaponSkill } from './combat';
import { currentEncounter, distanceOf, encounterStart, type Encounter } from './encounter';
import { fightOrder, fightState, isEvading, sideOf, surprisingOf, withEncounter } from './fight';
import type { AttackResult, DamageRoll, Strike } from './log';
import type { Random } from './ports';
import { weaponOf, type Range, type Weapon } from './reference';
import { canFight, historyOf, uppOf, victimOf, woundStateOf, type WoundState } from './wounds';

/** Battle Dress gibt unbegrenzte Ausdauer (S. 4). */
const BATTLE_DRESS = 'battle-dress';

/** Laser schießen lautlos; jeder andere Schuss gibt Alarm (SR 20). */
const SILENT_GUNS = ['laser-carbine', 'laser-rifle'];

/** Lange Gewehre parieren wie ein Cudgel; Pistolen, SMG und Laser nicht (SR 22). */
const LONG_GUNS = ['rifle', 'carbine', 'auto-rifle', 'shotgun'];

/** Ab 9 auf 2W6 sieht ein Kamerad jemanden fallen und gibt Alarm (SR 20). */
export const ALARM_TARGET = 9;

/** Die Angriffsergebnisse der Begegnung mit ihrer Stelle im Log. */
function encounterAttacks(campaign: Campaign, encounter: Encounter): readonly AttackResult[] {
  return campaign.log.slice(encounterStart(campaign.log, encounter)).filter((e): e is AttackResult => e.kind === 'attack');
}


/**
 * `/blows`: wie viele Combat-Schläge der Kämpfer in der laufenden Begegnung noch hat (SR 20, 22):
 * END zu Beginn der Begegnung (mit den Wunden von vorher) minus seine Angriffe mit der Schlagart
 * Combat und minus die Läufe (beim SC seine, beim NSC die seiner Gruppe), nie unter 0. `undefined` ohne laufende Begegnung und
 * mit Battle Dress (unbegrenzt).
 */
export function blowsOf(campaign: Campaign, who: CharacterId): number | undefined {
  const encounter = currentEncounter(campaign);
  if (!encounter || anyCharacterOf(campaign, who).wears === BATTLE_DRESS) return undefined;
  const upp = uppOf(campaign, who);
  const start = historyOf(campaign.log, upp, who, encounterStart(campaign.log, encounter)).wounds;
  const used = encounterAttacks(campaign, encounter).filter((e) => e.strike === 'combat' && e.for === who).length;
  const runs = (sideOf(campaign, who) === 'pcs' ? distanceOf(encounter, who).runs : encounter.npcRuns) ?? 0;
  return Math.max(0, upp.end - start.end - used - runs);
}

/** Ist das ein Schlag oder Hieb (Faust, Klinge, Stangenwaffe)? */
export function isMelee(weapon: Weapon): boolean {
  return weapon.attack !== 'shot';
}

/**
 * Wie ein Schlag oder Hieb zählt (SR 22): mit Überraschung, solange die Partei des Angreifers sie
 * hat; Special gegen ein bewusstloses oder schwer verwundetes Ziel; geschwächt, wenn keine
 * Combat-Schläge mehr übrig sind oder der Angreifer es will; sonst Combat. Schüsse: `undefined`.
 */
export function strikeOf(campaign: Campaign, attacker: CharacterId, weapon: Weapon, target: WoundState | undefined, weakened: boolean): Strike | undefined {
  if (!isMelee(weapon)) return undefined;
  const encounter = currentEncounter(campaign);
  if (encounter && surprisingOf(fightState(campaign, encounter)) === sideOf(campaign, attacker)) return 'surprise';
  if (target === 'unconscious' || target === 'serious') return 'special';
  if (weakened || blowsOf(campaign, attacker) === 0) return 'weakened';
  return 'combat';
}

/** Der DM, den die Schlagart bringt: nur der geschwächte Schlag hat einen (S. 4). */
export function strikeDm(weapon: Weapon, strike: Strike | undefined): number {
  return strike === 'weakened' ? (weapon.weakened ?? 0) : 0;
}

/**
 * Die Parade des Ziels gegen einen Schlag oder Hieb (SR 22), als negativer DM: seine Stufe in seiner
 * Faust- oder Nahkampfwaffe; ein langes Gewehr pariert als Cudgel. Wer nicht kämpfen kann, pariert
 * nicht, wer ausweicht, auch nicht; gegen Schüsse gibt es keine Parade.
 */
export function parryDm(campaign: Campaign, defender: CharacterId | undefined, weapon: Weapon): number {
  if (!defender || !isMelee(weapon)) return 0;
  const fighter = fighterOf(campaign, defender);
  if (!canFight(fighter.state) || isEvading(campaign, defender)) return 0;
  if (isMelee(fighter.weapon)) return 0 - fighter.skill || 0;
  if (!LONG_GUNS.includes(fighter.weapon.id)) return 0;
  return 0 - (weaponSkill(anyCharacterOf(campaign, defender), weaponOf('cudgel'))?.level ?? 0) || 0;
}

/** Der DM auf Angriffe gegen einen, der ausweicht, nach der Reichweite (SR 20). */
const EVADE_DM: Record<Range, number> = { close: -1, short: -1, medium: -2, long: -4, veryLong: -4 };

/**
 * Weicht das Ziel aus und kann kämpfen, bekommt jeder Angriff auf es einen DM nach der Reichweite
 * (SR 20): −1 auf Close oder Short, −2 auf Medium, −4 auf Long oder Very Long.
 */
export function evadeDm(campaign: Campaign, defender: CharacterId | undefined, range: Range): number {
  return evadesNow(campaign, defender) ? evadeDmAt(range) : 0;
}

/** Weicht dieser Kämpfer aus und kann kämpfen? Nur dann zählt das Ausweichen. */
export function evadesNow(campaign: Campaign, defender: CharacterId | undefined): boolean {
  return defender !== undefined && isEvading(campaign, defender) && canFight(woundStateOf(campaign, defender));
}

/** Der DM des Ausweichens auf diese Reichweite. */
export function evadeDmAt(range: Range): number {
  return EVADE_DM[range];
}

/** Setzt den Alarm auf die laufende Runde, wenn die Überraschung noch hält und es noch keinen gab. */
function raiseAlarm(campaign: Campaign): Campaign {
  const running = currentEncounter(campaign);
  if (!running) return campaign;
  const encounter = fightState(campaign, running);
  if (encounter.alarm !== undefined || surprisingOf(encounter) === undefined) return campaign;
  return withEncounter(campaign, { ...encounter, alarm: encounter.round });
}

/** Greift jemand mit Überraschung an? Nur dann kann es Alarm geben. */
function withSurprise(campaign: Campaign, attacker: CharacterId): boolean {
  const encounter = currentEncounter(campaign);
  return encounter !== undefined && surprisingOf(fightState(campaign, encounter)) === sideOf(campaign, attacker);
}

/** Nach einem Angriff mit Überraschung: Jeder Schuss außer mit einem Laser gibt Alarm (SR 20). */
export function alarmAfterAttack(campaign: Campaign, results: readonly AttackResult[]): Campaign {
  const first = results[0];
  if (!first || !withSurprise(campaign, first.for)) return campaign;
  const weapon = weaponOf(first.with);
  return weapon.attack === 'shot' && !SILENT_GUNS.includes(weapon.id) ? raiseAlarm(campaign) : campaign;
}

/**
 * Schreibt einen Schadenswurf in den Log und prüft dabei den Alarm (SR 20): Bleibt das Ziel eines
 * Angriffs mit Überraschung wach, schreit es. Fällt es, sieht es bei 9+ auf 2W6 ein Kamerad, der
 * kämpfen kann und in der Begegnung noch nicht angegriffen wurde; der Wurf steht am Schadenswurf.
 */
export function logDamage(campaign: Campaign, roll: DamageRoll, random: Random): Campaign {
  const hit = campaign.log[roll.of] as AttackResult;
  const victim = victimOf(hit);
  if (!victim || !withSurprise(campaign, hit.for)) return appendLog(campaign, roll);
  const after = appendLog(campaign, roll);
  if (canFight(woundStateOf(after, victim))) return raiseAlarm(after);
  const encounter = currentEncounter(after)!;
  const attacked = encounterAttacks(after, encounter);
  const witness = fightOrder(after, fightState(after, encounter)).some(
    (s) =>
      s.side === sideOf(after, victim) &&
      s.id !== victim &&
      canFight(woundStateOf(after, s.id)) &&
      !attacked.some((a) => victimOf(a) === s.id),
  );
  if (!witness) return after;
  const alarmDice = [random.int(1, 6), random.int(1, 6)] as const;
  const seen = appendLog(campaign, { ...roll, alarmDice });
  return alarmDice[0] + alarmDice[1] >= ALARM_TARGET ? raiseAlarm(seen) : seen;
}
