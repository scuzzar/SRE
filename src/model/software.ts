import { z } from 'zod';
import { DomainError } from './errors';
import { computerModelOf, shipDesignOf, softwareOf, type ComputerModel } from './reference';
import type { Ship, ShipSoftware, Turret } from './ship';

// Programme in CPU, Speicher und Archiv, Stufe 2b des Raumkampfs (Domänenmodell 2026-11-22d;
// SR 38, SE 10 und SE 13, zusammengefasst in docs/regeln-schiffe.md).

/** Die Ablage eines Programms im Rechner (Domänenmodell: `SoftwareSlot`): CPU = läuft, Speicher = bereit, Archiv = angelegt. */
export type SoftwareSlot = 'cpu' | 'storage' | 'archive';
export const softwareSlots = ['cpu', 'storage', 'archive'] as const;
export const SoftwareSlotSchema = z.enum(softwareSlots);

/** Der Name der Ablage, wie die Oberfläche sie zeigt (SR 38). */
export const softwareSlotNames: Record<SoftwareSlot, string> = { cpu: 'CPU · läuft', storage: 'Speicher · bereit', archive: 'Archiv' };

/** Die Pflichtprogramme: ohne sie steht der Antrieb still, bzw. feuert kein Turret (Owner: streng). */
export const THRUST_PROGRAM = 'maneuver';
export const TARGET_PROGRAM = 'target';

/**
 * Die Programme, die in Stufe 2b schon wirken (Owner, 22. November 2026): Predict, Gunner
 * Interact, Maneuver/Evade, Auto-Evade und Return Fire dazu die Pflichtprogramme. Select,
 * Multi-Target, Launch, Double Fire, Anti-Missile und ECM folgen mit Stufe 3 und später, Jump
 * und Navigation prüft der Sprung noch nicht.
 */
export const EFFECTS_2B = ['predict-1', 'predict-2', 'predict-3', 'predict-4', 'predict-5', 'gunner-interact', 'maneuver-evade-1', 'maneuver-evade-2', 'maneuver-evade-3', 'maneuver-evade-4', 'maneuver-evade-5', 'maneuver-evade-6', 'auto-evade', 'return-fire', THRUST_PROGRAM, TARGET_PROGRAM] as const;

/** Wirkt das Programm in Stufe 2b? */
export function worksIn2b(program: string): boolean {
  return (EFFECTS_2B as readonly string[]).includes(program);
}

/** Der Rechner des Schiffs (SE 10); ein Small Craft hat keinen und fliegt ohne Programme. */
export function computerOf(ship: Ship): ComputerModel | undefined {
  const model = shipDesignOf(ship.design).computer;
  return model === undefined ? undefined : computerModelOf(model);
}

/** Wie viel Space eine Ablage fasst; das Archiv wächst ohne Grenze (SE 12, *Suleiman*). */
export function slotCapacity(ship: Ship, slot: SoftwareSlot): number {
  const computer = computerOf(ship);
  if (computer === undefined || slot === 'archive') return Number.POSITIVE_INFINITY;
  return slot === 'cpu' ? computer.cpu : computer.storage;
}

/** Wie viel Space in einer Ablage liegt. */
export function slotUsed(ship: Ship, slot: SoftwareSlot): number {
  return onboard(ship).filter((s) => s.slot === slot).reduce((sum, s) => sum + softwareOf(s.program).space, 0);
}

/** Was in einer Ablage liegt, in der Reihenfolge an Bord; ohne `slot` alles. */
export function onboard(ship: Ship, slot?: SoftwareSlot): readonly ShipSoftware[] {
  return ship.software.filter((s) => slot === undefined || s.slot === slot);
}

/** Die Ablage eines Programms an Bord; undefined, wenn das Schiff es nicht hat. */
export function slotOfProgram(ship: Ship, program: string): SoftwareSlot | undefined {
  return ship.software.find((s) => s.program === program)?.slot;
}

/** Hat das Schiff das Programm an Bord? Jedes Programm liegt höchstens einmal an Bord. */
export function hasProgram(ship: Ship, program: string): boolean {
  return ship.software.some((s) => s.program === program);
}

/** Läuft das Programm? Wirken kann nur, was in der CPU liegt (SR 38). */
export function runs(ship: Ship, program: string): boolean {
  return slotOfProgram(ship, program) === 'cpu';
}

/** Bekommt das Schiff Schub? Ohne *Maneuver* in der CPU steht es still (Owner: streng). */
export function hasThrust(ship: Ship): boolean {
  return computerOf(ship) === undefined || runs(ship, THRUST_PROGRAM);
}

/** Dürfen die Turrets feuern? Ohne *Target* in der CPU nicht; ein Schiff ohne Turret braucht es nicht. */
export function hasTarget(ship: Ship): boolean {
  return computerOf(ship) === undefined || ship.turrets.length === 0 || runs(ship, TARGET_PROGRAM);
}

/** Was von den Pflichtprogrammen in der CPU fehlt; leer, wenn das Schiff fliegen und feuern darf. */
export function missingPrograms(ship: Ship): readonly string[] {
  if (computerOf(ship) === undefined) return [];
  const fehlt: string[] = [];
  if (!runs(ship, THRUST_PROGRAM)) fehlt.push(softwareOf(THRUST_PROGRAM).name);
  if (ship.turrets.length > 0 && !runs(ship, TARGET_PROGRAM)) fehlt.push(softwareOf(TARGET_PROGRAM).name);
  return fehlt;
}

/**
 * Passt das Programm in eine Ablage? Liegt es schon dort, braucht der Umzug keinen Platz; kommt es
 * aus einer anderen Ablage, wird deren Platz frei – gerechnet wird gegen die Grenze der Zielablage.
 */
export function fitsIn(ship: Ship, program: string, slot: SoftwareSlot): boolean {
  const space = softwareOf(program).space;
  return slotUsed(ship, slot) + (slotOfProgram(ship, program) === slot ? 0 : space) <= slotCapacity(ship, slot);
}

/**
 * Steckt ein Programm um (Domänenmodell: `ShipSoftware.slot`). Die Zielablage muss Platz haben;
 * ein Small Craft hat keinen Rechner, und was nicht an Bord ist, lässt sich nicht umstecken.
 */
export function plugIn(ship: Ship, program: string, slot: SoftwareSlot): Ship {
  if (computerOf(ship) === undefined) throw new DomainError(`${ship.name} hat keinen Rechner.`);
  if (slotOfProgram(ship, program) === undefined) throw new DomainError(`${softwareOf(program).name} ist nicht an Bord.`);
  if (!fitsIn(ship, program, slot)) throw new DomainError(`${softwareOf(program).name}: zu wenig Platz in ${softwareSlotNames[slot]}.`);
  return { ...ship, software: ship.software.map((s) => (s.program === program ? { ...s, slot } : s)) };
}

/** Legt ein Programm an Bord (Kauf, Bestand): in den Speicher, wenn dort Platz ist, sonst ins Archiv. */
export function stow(ship: Ship, program: string): Ship {
  if (computerOf(ship) === undefined) throw new DomainError(`${ship.name} hat keinen Rechner.`);
  if (hasProgram(ship, program)) return ship;
  const slot: SoftwareSlot = fitsIn(ship, program, 'storage') ? 'storage' : 'archive';
  return { ...ship, software: [...ship.software, { program, slot }] };
}

/** Wirft ein Programm von Bord, ohne Erstattung. */
export function discard(ship: Ship, program: string): Ship {
  return { ...ship, software: ship.software.filter((s) => s.program !== program) };
}

/**
 * Setzt Programme in die Ablagen: zuerst die Pflichtprogramme in die CPU – Maneuver, dann Target –,
 * dann füllt der Rest den Speicher, und was dort keinen Platz findet, kommt ins Archiv. Benutzt
 * der Bestand beim Laden (⚑ Owner, 23. November 2026) und das Standardpaket beim Kauf.
 */
export function withSlots(computer: ComputerModel | undefined, programs: readonly string[]): readonly ShipSoftware[] {
  const unique = [...new Set(programs)];
  if (computer === undefined) return unique.map((program) => ({ program, slot: 'archive' as const }));
  const cpu: string[] = [];
  let frei = computer.cpu;
  for (const program of [THRUST_PROGRAM, TARGET_PROGRAM]) {
    const space = softwareOf(program).space;
    if (unique.includes(program) && space <= frei) {
      cpu.push(program);
      frei -= space;
    }
  }
  const storage: string[] = [];
  frei = computer.storage;
  for (const program of unique) {
    const space = softwareOf(program).space;
    if (!cpu.includes(program) && space <= frei) {
      storage.push(program);
      frei -= space;
    }
  }
  return unique.map((program): ShipSoftware => ({ program, slot: cpu.includes(program) ? 'cpu' : storage.includes(program) ? 'storage' : 'archive' }));
}

/**
 * Die Programme eines neuen Schiffs: das Standardpaket (⚑ Hausregel, 16. November 2026). Ein
 * Schiff mit Turret bekommt das Pflichtprogramm der Waffe dazu (Owner, 23. November 2026) –
 * `turrets` sind die Turrets, die das Schiff wirklich hat, nicht nur die des Entwurfs.
 */
export function packageOf(design: string, turrets: readonly Turret[] = []): readonly ShipSoftware[] {
  const plan = shipDesignOf(design);
  // Small Craft haben keinen Rechner und damit keine Programme (SE 13, 2026-11-21b).
  if (plan.computer === undefined) return [];
  const programme = [THRUST_PROGRAM, ...(plan.jump > 0 ? [`jump-${plan.jump}`] : []), 'navigation', 'generate', 'anti-hijack', 'library'];
  if (turrets.length > 0) programme.push(TARGET_PROGRAM);
  return withSlots(computerModelOf(plan.computer), programme);
}
