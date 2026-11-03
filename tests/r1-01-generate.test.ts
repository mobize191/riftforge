import { describe, it, expect } from 'vitest';
import { generateLevel, isWall } from '../src/core/run/generate';

function pathExists(map: ReturnType<typeof generateLevel>): boolean {
  const seen = new Set<number>();
  const queue = [map.entrance];
  seen.add(map.entrance.y * map.width + map.entrance.x);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === map.exit.x && cur.y === map.exit.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const k = ny * map.width + nx;
      if (!seen.has(k) && !isWall(map, nx, ny)) {
        seen.add(k);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

describe('R1-01 level generation', () => {
  it('same seed + floor -> identical level (placements compris)', () => {
    const a = generateLevel(123, 1);
    const b = generateLevel(123, 1);
    expect(a).toEqual(b);
  });

  it('different seeds -> different levels', () => {
    const a = generateLevel(1, 1);
    const b = generateLevel(2, 1);
    expect(a.walls.join('')).not.toBe(b.walls.join(''));
  });

  it('level is always connected entrance -> exit, for many seeds/floors', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (let floor = 1; floor <= 4; floor++) {
        expect(pathExists(generateLevel(seed, floor))).toBe(true);
      }
    }
  });

  it('places monsters, orbs and chests on free floor', () => {
    const map = generateLevel(42, 2);
    expect(map.monsters.length).toBeGreaterThan(0);
    expect(map.orbs.length).toBeGreaterThan(0);
    for (const m of map.monsters) expect(isWall(map, m.pos.x, m.pos.y)).toBe(false);
    for (const o of map.orbs) expect(isWall(map, o.pos.x, o.pos.y)).toBe(false);
  });
});
