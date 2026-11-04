import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { generateLevel } from '../src/core/run/generate';
import { BIOME_1_STRUCTURE } from '../src/data/biomes';

describe('R5-03 ressource spécifique : spores', () => {
  it('les nœuds de spores sont placés sur le niveau', () => {
    const map = generateLevel(3, 1, undefined, { roots: true, monsterCount: 4, sporeNodes: BIOME_1_STRUCTURE.sporeNodesPerFloor });
    expect(map.sporeNodes.length).toBeGreaterThan(0);
  });

  it('la récolte incrémente le stock, retire le nœud et attire les monstres voisins', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 11 });
    const node = s.run!.level!.sporeNodes[0];
    // place un monstre voisin artificiellement
    s.run!.level!.monsters[0].pos = { x: node.x + 2, y: node.y };
    const before = s.run!.lootSpores;
    const distBefore = Math.abs(s.run!.level!.monsters[0].pos.x - node.x);
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: node.x, y: node.y } });
    expect(s.run!.lootSpores).toBe(before + 1);
    expect(s.run!.level!.sporeNodes.find((p) => p.x === node.x && p.y === node.y)).toBeUndefined();
    const distAfter = Math.abs(s.run!.level!.monsters[0].pos.x - node.x);
    expect(distAfter).toBeLessThan(distBefore); // le monstre voisin s'est rapproché
  });

  it('les spores récoltées vont à la Forge au retour', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 11 });
    const node = s.run!.level!.sporeNodes[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: node.x, y: node.y } });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.spores).toBe(1);
  });
});
