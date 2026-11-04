import { describe, it, expect } from 'vitest';
// R6-03 — Biome 4 « La Fibration » : famille vermine, ressource « optifibre »,
// 4 niveaux + boss, twist zones de vitesse (joueur ET monstres), victoire de run.
import { initialState, reduce, biomeStructureOf } from '../src/core/run/state';
import { generateLevel, isWall, type LevelMap } from '../src/core/run/generate';
import { patrolStep } from '../src/core/run/encounter';
import { BIOME_STRUCTURES, BIOME_ORDER } from '../src/data/biomes';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';
import { startCombat, combatReduce } from '../src/core/combat/combat';

const B4 = BIOME_STRUCTURES['fibration'];
const FAMILY = MONSTERS_BY_FAMILY[B4.family].map((m) => m.id);

function genB4(seed: number, floor: number) {
  return generateLevel(seed, floor, FAMILY, {
    monsterCount: B4.monsterCountBase + (floor - 1) * B4.monsterCountPerFloor,
    resourceNodes: B4.resourceNodesPerFloor,
    altars: B4.altarsPerFloor,
    speedZones: { count: B4.speedZonesPerFloor! },
  });
}

describe('R6-03 biome 4 — La Fibration', () => {
  it('zones de vitesse seedées et reproductibles', () => {
    for (const seed of [5, 66, 999999]) {
      const a = genB4(seed, 1);
      const b = genB4(seed, 1);
      expect(a.speedZones).toEqual(b.speedZones);
      expect(a.speedZones.length).toBe(B4.speedZonesPerFloor);
      for (const z of a.speedZones) expect([0, 2]).toContain(z.speed);
    }
  });

  it('zone accélérée (speed 2) : le joueur avance de 2 cases en un déplacement', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 31, biomeIndex: 3 });
    const level = s.run!.level!;
    const haste = level.speedZones.find((z) => z.speed === 2)!;
    expect(haste).toBeDefined();
    // se placer juste à côté de la zone, dans l'axe, case libre
    const from = { x: haste.pos.x - 1, y: haste.pos.y };
    if (isWall(level, from.x, from.y)) return; // ce seed n'a pas de case libre à gauche : skip
    s = { ...s, run: { ...s.run!, playerPos: from, moveCount: 0 } };
    const before = { ...s.run!.playerPos };
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: from.x + 1, y: from.y } });
    expect(s.run!.playerPos.x).toBe(before.x + 2); // 2 cases parcourues
  });

  it('zone ralentie (speed 0) : un déplacement sur deux du joueur est ignoré', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 31, biomeIndex: 3 });
    const level = s.run!.level!;
    const slow = level.speedZones.find((z) => z.speed === 0)!;
    expect(slow).toBeDefined();
    const adj = [
      { x: slow.pos.x + 1, y: slow.pos.y },
      { x: slow.pos.x - 1, y: slow.pos.y },
      { x: slow.pos.x, y: slow.pos.y + 1 },
      { x: slow.pos.x, y: slow.pos.y - 1 },
    ].find((p) => !isWall(level, p.x, p.y))!;
    // depuis la zone ralentie, moveCount 0 -> 1 (impair) : déplacement autorisé
    s = { ...s, run: { ...s.run!, playerPos: slow.pos, moveCount: 0 } };
    s = reduce(s, { type: 'MOVE_PLAYER', to: adj });
    expect(s.run!.playerPos).toEqual(adj);
    // depuis la zone ralentie, moveCount 1 -> 2 (pair) : déplacement ignoré (tour sauté)
    s = { ...s, run: { ...s.run!, playerPos: slow.pos, moveCount: 1 } };
    s = reduce(s, { type: 'MOVE_PLAYER', to: adj });
    expect(s.run!.playerPos).toEqual(slow.pos);
    expect(s.run!.lastEvent).toContain('ralentie');
    // puis à nouveau autorisé (moveCount 2 -> 3)
    s = { ...s, run: { ...s.run!, playerPos: slow.pos, moveCount: 2 } };
    s = reduce(s, { type: 'MOVE_PLAYER', to: adj });
    expect(s.run!.playerPos).toEqual(adj);
  });

  it('zones de vitesse appliquées aux monstres (patrouille x2 en zone accélérée, saut en zone ralentie)', () => {
    const map = genB4(31, 1);
    const haste = map.speedZones.find((z) => z.speed === 2)!;
    const slow = map.speedZones.find((z) => z.speed === 0)!;
    // monstre en zone accélérée : 2 cases par patrouille
    map.monsters[0] = { id: 'wyrm', pos: { ...haste.pos }, patrolAxis: 'x', patrolDir: 1 };
    const walls = (x: number, y: number) => isWall(map, x, y);
    const x0 = map.monsters[0].pos.x;
    patrolStep(map, 0, walls);
    expect(map.monsters[0].pos.x).toBe(x0 + 2);
    // monstre en zone ralentie : un tour sur deux sauté
    map.monsters[1] = { id: 'wyrm', pos: { ...slow.pos }, patrolAxis: 'x', patrolDir: 1 };
    const y0 = map.monsters[1].pos.x;
    patrolStep(map, 1, walls);
    expect(map.monsters[1].pos.x).toBe(y0); // sauté
    patrolStep(map, 1, walls);
    expect(map.monsters[1].pos.x).toBe(y0 + 1); // puis déplacé
  });

  it('victoire sur le boss du biome 4 = victoire de run (runCompleted, retour Forge avec butin)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 12, biomeIndex: 3 });
    s = { ...s, run: { ...s.run!, floor: B4.floors, playerPos: s.run!.level!.exit } };
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.encounter).toEqual([`boss:${B4.bossId}`]);
    // combat de boss gagné directement (kit de test)
    let c = startCombat(1, 60, 60, 10, s.run!.encounter!, ['feu'], null, {}, false, ['deflagration']);
    let guard = 0;
    while (c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
      if (c.phase === 'player') c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    expect(c.phase).toBe('won');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined, playerHp: c.player.hp });
    expect(s.mode).toBe('RETOUR');
    expect(s.run!.runCompleted).toBe(true);
    expect(s.run!.journal).toContain('boss-final');
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.runCompleted).toBe(true);
    expect(s.forge.allBiomesCleared).toBe(true);
  });

  it('boss du biome 1 : pas de victoire de run (flag à false)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 12, biomeIndex: 0 });
    s = { ...s, run: { ...s.run!, floor: 4, playerPos: s.run!.level!.exit } };
    s = reduce(s, { type: 'INTERACT' });
    let c = startCombat(1, 60, 60, 10, s.run!.encounter!, ['feu'], null, {}, false, ['deflagration']);
    let guard = 0;
    while (c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
      if (c.phase === 'player') c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    expect(c.phase).toBe('won');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined, playerHp: c.player.hp });
    expect(s.run!.runCompleted).toBe(false);
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.allBiomesCleared).toBe(false);
  });

  it('structure du biome 4 + ressource optifibre transférée', () => {
    expect(B4.floors).toBe(4);
    expect(B4.family).toBe('vermine');
    expect(B4.resourceId).toBe('optifibre');
    expect(BIOME_ORDER[3]).toBe('fibration');
    expect(biomeStructureOf(3).def.bossId).toBe('noeud-final');
    expect(BOSS_BY_ID[B4.bossId]).toBeDefined();
    expect(FAMILY.length).toBeGreaterThanOrEqual(3);
    let s = reduce(initialState(), { type: 'START_RUN', seed: 8, biomeIndex: 3 });
    const node = s.run!.level!.resourceNodes[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: node });
    expect(s.run!.lootBiome['optifibre'] ?? 0).toBe(1);
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.optifibre).toBe(1);
  });
});
