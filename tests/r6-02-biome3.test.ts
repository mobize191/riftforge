import { describe, it, expect } from 'vitest';
// R6-02 — Biome 3 « Les Hauts-Fourneaux » : famille élémentaire, ressource « mercurium »,
// 4 niveaux + boss, twist sol brûlant (zones de dégâts par tour, seedées et visibles).
import { initialState, reduce, biomeStructureOf } from '../src/core/run/state';
import { generateLevel } from '../src/core/run/generate';
import { BIOME_STRUCTURES, BIOME_ORDER } from '../src/data/biomes';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';

const B3 = BIOME_STRUCTURES['hauts-fourneaux'];
const FAMILY = MONSTERS_BY_FAMILY[B3.family].map((m) => m.id);

function genB3(seed: number, floor: number) {
  return generateLevel(seed, floor, FAMILY, {
    monsterCount: B3.monsterCountBase + (floor - 1) * B3.monsterCountPerFloor,
    resourceNodes: B3.resourceNodesPerFloor,
    altars: B3.altarsPerFloor,
    burnZones: { count: B3.burnZonesPerFloor!, damage: B3.burnDamage! },
  });
}

describe('R6-02 biome 3 — Les Hauts-Fourneaux', () => {
  it('zones brûlantes seedées, visibles et reproductibles (même seed = mêmes zones)', () => {
    for (const seed of [3, 88, 123456]) {
      for (let floor = 1; floor <= B3.floors; floor++) {
        const a = genB3(seed, floor);
        const b = genB3(seed, floor);
        expect(a.burnZones).toEqual(b.burnZones);
        expect(a.burnZones.length).toBe(B3.burnZonesPerFloor);
        for (const z of a.burnZones) expect(z.damage).toBe(B3.burnDamage);
      }
    }
  });

  it('une case brûlante inflige ses dégâts EXACTS par tour de déplacement', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 555, biomeIndex: 2 });
    expect(s.run!.biomeIndex).toBe(2);
    const zone = s.run!.level!.burnZones[0];
    const hpBefore = s.run!.playerHp;
    s = reduce(s, { type: 'MOVE_PLAYER', to: zone.pos });
    expect(s.run!.playerPos).toEqual(zone.pos);
    expect(s.run!.playerHp).toBe(hpBefore - B3.burnDamage!); // dégâts exacts
    expect(s.run!.journal).toContain('brulure');
    // quitter la zone ne brûle pas ; revenir dessus brûle à nouveau (par tour)
    const free = { x: zone.pos.x, y: Math.max(1, zone.pos.y - 1) };
    if (s.run!.level!.walls[free.y * s.run!.level!.width + free.x]) {
      // prend une autre case libre adjacente si la première est un mur
      free.y = zone.pos.y + 1;
    }
    const hpMid = s.run!.playerHp;
    s = reduce(s, { type: 'MOVE_PLAYER', to: free });
    expect(s.run!.playerHp).toBe(hpMid); // pas de dégâts hors zone
    s = reduce(s, { type: 'MOVE_PLAYER', to: zone.pos });
    expect(s.run!.playerHp).toBe(hpMid - B3.burnDamage!); // rebrûlure au 2e tour
  });

  it('mort sur une case brûlante -> retour à la Forge avec le butin conservé', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 555, biomeIndex: 2 });
    s = { ...s, run: { ...s.run!, playerHp: B3.burnDamage! } }; // 1 seul PV avant la brûlure
    const node = s.run!.level!.resourceNodes[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: node });
    expect(s.run!.lootBiome['mercurium'] ?? 0).toBe(1);
    const zone = s.run!.level!.burnZones[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: zone.pos });
    expect(s.mode).toBe('RETOUR');
    expect(s.run!.playerHp).toBe(0);
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.mercurium).toBe(1); // butin 100 % conservé malgré la mort
  });

  it('boss télégraphié en fin de biome + ressource mercurium transférée à la Forge', () => {
    expect(BOSS_BY_ID[B3.bossId]).toBeDefined();
    let s = reduce(initialState(), { type: 'START_RUN', seed: 77, biomeIndex: 2 });
    s = { ...s, run: { ...s.run!, floor: B3.floors, playerPos: s.run!.level!.exit } };
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    expect(s.run!.encounter).toEqual([`boss:${B3.bossId}`]);
    // structure
    expect(B3.floors).toBe(4);
    expect(B3.family).toBe('elementaire');
    expect(B3.resourceId).toBe('mercurium');
    expect(BIOME_ORDER[2]).toBe('hauts-fourneaux');
    expect(biomeStructureOf(2).def.bossId).toBe('coeur-fournaise');
    expect(FAMILY.length).toBeGreaterThanOrEqual(3);
  });
});
