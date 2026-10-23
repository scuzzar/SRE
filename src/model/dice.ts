/** Wahrscheinlichkeit in Prozent, mit 2W6 mindestens `need` zu werfen. */
export function chance2d6(need: number): number {
  let hits = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) hits++;
  return (hits / 36) * 100;
}
