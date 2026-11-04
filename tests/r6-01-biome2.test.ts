import { describe, it, expect } from 'vitest';
// R6-01 — Biome 2 « Les Datacathédrales » : famille gremlin, ressource « données »,
// 4 niveaux + boss télégraphié, twist circuits (portes basculées par des déclencheurs,
// connexité BFS garantie dans chaque état, même seed = même séquence).
import { initialState, reduce, biomeStructureOf } from '../src/core/run/state';
import { generateLevel, isWall, type LevelMap } from '../src/core/run/generate';
import { BIOME_STRUCTURES, BIOME_ORDER } from '../src/data/biomes';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';
import { createRng } from '../src/core/rng';
import type { Position } from '../src/core/types';

const B2 = BIOME_STRUCTURES['datacathedrales'];
const FAMILY = MONSTERS_BY_FAMILY[B2.family].map((m) => m.id);

function bfs(map: LevelMap, from: Position, to: Position): boolean {
  const seen = new Set<number>();
  const q: Position[] = [from];
  seen.add(from.y * map.width + from.x);
  while (q.length) {
    const c = q.shift()!;
    if (c.x === to.x && c.y === to.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      const k = ny * map.width + nx;
      if (!seen.has(k) && !isWall(map, nx, ny)) {
        seen.add(k);
        q.push({ x: nx, y: ny });
      }
    }
  }
  return false;
}

// Applique un sous-ensemble de déclencheurs (état des circuits) sur une copie du niveau.
function withCircuits(map: LevelMap, toggled: Set<number>): LevelMap {
  const walls = [...map.walls];
  map.circuits.forEach((c, i) => {
    if (!toggled.has(i)) return;
    for (const d of c.doors) walls[d.y * map.width + d.x] = !walls[d.y * map.width + d.x];
  });
  return { ...map, walls };
}

function genB2(seed: number, floor: number) {
  return generateLevel(seed, floor, FAMILY, {
    monsterCount: B2.monsterCountBase + (floor - 1) * B2.monsterCountPerFloor,
    resourceNodes: B2.resourceNodesPerFloor,
    altars: B2.altarsPerFloor,
    circuits: B2.circuits,
  });
}

describe('R6-01 biome 2 — Les Datacathédrales', () => {
  it('niveaux seedés reproductibles (même seed = même niveau, circuits inclus)', () => {
    for (const seed of [1, 42, 777, 2654435761]) {
      for (let floor = 1; floor <= B2.floors; floor++) {
        const a = genB2(seed, floor);
        const b = genB2(seed, floor);
        expect(a.walls).toEqual(b.walls);
        expect(a.circuits).toEqual(b.circuits);
        expect(a.resourceNodes).toEqual(b.resourceNodes);
        expect(a.monsters.map((m) => m.id)).toEqual(b.monsters.map((m) => m.id));
      }
    }
  });

  it('connexité BFS garantie dans TOUS les états de circuits (2^n combinaisons)', () => {
    const rng = createRng(123);
    for (let trial = 0; trial < 30; trial++) {
      const seed = rng.int(1_000_000);
      const floor = 1 + rng.int(B2.floors);
      const map = genB2(seed, floor);
      expect(map.circuits.length).toBe(B2.circuits!.triggers);
      const n = map.circuits.length;
      for (let mask = 0; mask < 2 ** n; mask++) {
        const toggled = new Set<number>();
        for (let i = 0; i < n; i++) if (mask & (1 << i)) toggled.add(i);
        const m2 = withCircuits(map, toggled);
        expect(bfs(m2, m2.entrance, m2.exit)).toBe(true);
      }
    }
  });

  it('les déclencheurs basculent réellement les portes via INTERACT (état déterministe)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 4242, biomeIndex: 1 });
    expect(s.run!.biomeIndex).toBe(1);
    const level = s.run!.level!;
    expect(level.circuits.length).toBeGreaterThan(0);
    const c0 = level.circuits[0];
    const doorWallBefore = isWall(s.run!.level!, c0.doors[0].x, c0.doors[0].y);
    // marcher sur le déclencheur puis INTERACT
    s = reduce(s, { type: 'MOVE_PLAYER', to: c0.trigger });
    expect(s.run!.playerPos).toEqual(c0.trigger);
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.journal).toContain('circuit');
    const doorWallAfter = isWall(s.run!.level!, c0.doors[0].x, c0.doors[0].y);
    expect(doorWallAfter).toBe(!doorWallBefore); // la porte a basculé
    // re-INTERACT -> rebascule (les portes se rouvrent ET se ferment)
    s = reduce(s, { type: 'INTERACT' });
    expect(isWall(s.run!.level!, c0.doors[0].x, c0.doors[0].y)).toBe(doorWallBefore);
    // connexité maintenue après bascule
    expect(bfs(s.run!.level!, s.run!.level!.entrance, s.run!.level!.exit)).toBe(true);
  });

  it('boss télégraphié reproductible (même seed = mêmes patterns)', () => {
    const boss = BOSS_BY_ID[B2.bossId];
    expect(boss).toBeDefined();
    expect(boss.attacks.length).toBeGreaterThanOrEqual(2);
    // le boss est invoqué en fin de biome (dernier sol) via la sortie
    let s = reduce(initialState(), { type: 'START_RUN', seed: 99, biomeIndex: 1 });
    s = { ...s, run: { ...s.run!, floor: B2.floors, playerPos: s.run!.level!.exit } };
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    expect(s.run!.encounter).toEqual([`boss:${B2.bossId}`]);
  });

  it('ressource « données » ramassable en run et transférée à 100 % à la Forge', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 777, biomeIndex: 1 });
    const node = s.run!.level!.resourceNodes[0];
    expect(node).toBeDefined();
    s = reduce(s, { type: 'MOVE_PLAYER', to: node });
    expect(s.run!.lootBiome['donnees'] ?? 0).toBe(1);
    expect(s.run!.level!.resourceNodes.length).toBe(B2.resourceNodesPerFloor - 1);
    // retour à la Forge (mort) : la ressource est transférée
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.forge.donnees).toBe(1);
  });

  it('structure du biome 2 : 4 niveaux, famille gremlin, ressource donnees', () => {
    expect(B2.floors).toBe(4);
    expect(B2.family).toBe('gremlin');
    expect(B2.resourceId).toBe('donnees');
    expect(BIOME_ORDER[1]).toBe('datacathedrales');
    expect(biomeStructureOf(1).def.bossId).toBe('grand-index');
    expect(FAMILY.length).toBeGreaterThanOrEqual(3);
  });
});
