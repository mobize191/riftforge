import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/rng';

describe('R0-03 seeded rng', () => {
  it('same seed -> identical sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds -> different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays in [0, 1), int() in [0, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = rng.int(6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
    }
  });

  it('pick/shuffle do not mutate their input', () => {
    const rng = createRng(99);
    const input = [1, 2, 3, 4, 5] as const;
    const snapshot = [...input];
    rng.pick(input);
    const shuffled = rng.shuffle(input);
    expect([...input]).toEqual(snapshot);
    expect(shuffled).toHaveLength(input.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(snapshot);
  });
});
