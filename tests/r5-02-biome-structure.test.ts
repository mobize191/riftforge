import { describe, it, expect } from 'vitest';
import { generateLevel, isWall } from '../src/core/run/generate';
import { initialState, reduce } from '../src/core/run/state';
import { BIOME_1_STRUCTURE } from '../src/data/biomes';

function pathExists(map: ReturnType<typeof generateLevel>): boolean {
  const seen = new Set<number>();
  const queue = [map.entrance];
  seen.add(map.entrance.y * map.width + map.entrance.x);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === map.exit.x && cur.y === map.exit.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cur.x + dx, ny = cur.y + dy, k = ny * map.width + nx;
      if (!seen.has(k) && !isWall(map, nx, ny)) {
        seen.add(k);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

describe('R5-02 structure de biome (4 niveaux + boss, racines)', () => {
  it('connexité garantie malgré les racines, niveaux reproductibles par seed', () => {
    for (let seed = 0; seed < 20; seed++) {
      for (let floor = 1; floor <= 4; floor++) {
        const map = generateLevel(seed, floor, undefined, { roots: true, monsterCount: 4 + floor });
        expect(pathExists(map)).toBe(true);
        expect(generateLevel(seed, floor, undefined, { roots: true, monsterCount: 4 + floor })).toEqual(map);
        expect(map.roots.length).toBeGreaterThan(0);
      }
    }
  });

  it('difficulté croissante paramétrée en data', () => {
    expect(BIOME_1_STRUCTURE.monsterCountPerFloor).toBeGreaterThan(0);
    const f1 = generateLevel(1, 1, undefined, { roots: true, monsterCount: BIOME_1_STRUCTURE.monsterCountBase });
    const f4 = generateLevel(1, 4, undefined, { roots: true, monsterCount: BIOME_1_STRUCTURE.monsterCountBase + 3 * BIOME_1_STRUCTURE.monsterCountPerFloor });
    expect(f4.monsters.length).toBeGreaterThan(f1.monsters.length);
  });

  it('la sortie du 4e sol déclenche le combat de boss ; sa victoire termine le biome', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 5 });
    for (let i = 0; i < 3; i++) s = reduce(s, { type: 'NEXT_FLOOR' });
    expect(s.run!.floor).toBe(4);
    const exit = s.run!.level!.exit;
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: exit.x, y: exit.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    expect(s.run!.encounter![0]).toBe('boss:racine-mere');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 50, orbs: [], kills: 1, essence: 2, minerai: 2, captured: [] } });
    // R6-04 : la victoire du boss ouvre le biome suivant dans la même run (plus de RETOUR ici)
    expect(s.mode).toBe('RUN');
    expect(s.run!.biomeIndex).toBe(1);
  });
});
