import { describe, it, expect } from 'vitest';
import { generateLevel, isWall } from '../src/core/run/generate';
import { monsterAt, pickEncounter, patrolStep } from '../src/core/run/encounter';

describe('R1-02 monsters & contact', () => {
  it('contact detection finds a monster on the player tile', () => {
    const map = generateLevel(42, 1);
    const m = map.monsters[0];
    expect(monsterAt(map, m.pos)).toBe(0);
    expect(monsterAt(map, { x: 0, y: 0 })).toBe(-1);
  });

  it('encounter pick is seeded and yields 1-3 monsters from the family', () => {
    const a = pickEncounter(7, 1, 0, ['mousse', 'sporeling']);
    const b = pickEncounter(7, 1, 0, ['mousse', 'sporeling']);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(1);
    expect(a.length).toBeLessThanOrEqual(3);
    for (const id of a) expect(['mousse', 'sporeling']).toContain(id);
  });

  it('patrol keeps monsters on free floor', () => {
    const map = generateLevel(9, 2);
    for (let step = 0; step < 20; step++) {
      for (let i = 0; i < map.monsters.length; i++) patrolStep(map, i, (x, y) => isWall(map, x, y));
    }
    for (const m of map.monsters) expect(isWall(map, m.pos.x, m.pos.y)).toBe(false);
  });
});
