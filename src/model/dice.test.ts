import { describe, expect, it } from 'vitest';
import { chance2d6 } from './dice';

describe('chance2d6', () => {
  it('ist bis 2 sicher und über 12 unmöglich', () => {
    expect(chance2d6(2)).toBe(100);
    expect(chance2d6(13)).toBe(0);
  });
});
