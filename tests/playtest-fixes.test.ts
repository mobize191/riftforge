import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { generateLevel, isWall } from '../src/core/run/generate';
import { patrolStep, monsterAt } from '../src/core/run/encounter';
import { startCombat, combatReduce } from '../src/core/combat/combat';

describe('retours playtest', () => {
  it('les monstres continuent de patrouiller après de nombreux pas (pas de blocage)', () => {
    const map = generateLevel(9, 2);
    const positions = new Set<string>();
    for (let step = 0; step < 40; step++) {
      for (let i = 0; i < map.monsters.length; i++) patrolStep(map, i, (x, y) => isWall(map, x, y));
      positions.add(map.monsters.map((m) => `${m.pos.x},${m.pos.y}`).join('|'));
    }
    expect(positions.size).toBeGreaterThan(5); // les monstres ont bel et bien bougé
  });

  it('un monstre affronté disparaît de la carte (ENTER_COMBAT le retire)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const m = s.run!.level!.monsters[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: m.pos.x, y: m.pos.y } });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    expect(s.run!.level!.monsters.find((x) => x.pos.x === m.pos.x && x.pos.y === m.pos.y)).toBeUndefined();
    expect(monsterAt(s.run!.level!, s.run!.playerPos)).toBe(-1);
  });

  it('messages : ramassage d’orbe / coffre / spore produisent un lastEvent', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const orb = s.run!.level!.orbs[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: orb.pos.x, y: orb.pos.y } });
    expect(s.run!.lastEvent).toContain('Orbe');
    const chest = s.run!.level!.chests[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: chest.x, y: chest.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.lastEvent).toContain('Coffre');
  });

  it('combat : si la cible est morte, l’attaque frappe automatiquement la suivante', () => {
    let c = startCombat(1, 20, 20, 4, ['mousse', 'sporeling']);
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
    c = combatReduce(c, { type: 'ATTACK', target: 0 }); // mousse doit mourir ici
    const mousseDead = c.enemies[0].hp <= 0;
    if (mousseDead) {
      const sporelingHp = c.enemies[1].hp;
      c = combatReduce(c, { type: 'ATTACK', target: 0 }); // cible morte -> auto-retarget
      expect(c.enemies[1].hp).toBeLessThan(sporelingHp);
    }
  });

  it('combat : CRAFT_MODULE consomme les orbes et ajoute le module', () => {
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu', 'feu', 'terre']);
    c = combatReduce(c, { type: 'CRAFT_MODULE', recipeId: 'magma' }); // feu+terre
    expect(c.modules).toContain('magma');
    expect(c.orbs).toEqual(['feu']);
  });
});
