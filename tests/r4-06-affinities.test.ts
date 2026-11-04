import { describe, it, expect } from 'vitest';
import { affinityMultiplier, AFFINITY } from '../src/data/affinities';
import { MONSTERS, MONSTER_BY_ID } from '../src/data/monsters';
import { startCombat, combatReduce } from '../src/core/combat/combat';

describe('R4-06 affinités & faiblesses', () => {
  it('multiplicateurs dans les deux sens', () => {
    const mousse = MONSTER_BY_ID['mousse']; // faible: feu, résistant: eau
    expect(affinityMultiplier('feu', mousse)).toBe(AFFINITY.weakness);
    expect(affinityMultiplier('eau', mousse)).toBe(AFFINITY.resistance);
    expect(affinityMultiplier('terre', mousse)).toBe(AFFINITY.neutral);
  });

  it('chaque monstre du biome 1 a au moins une faiblesse exploitable', () => {
    for (const m of MONSTERS) expect(m.weaknesses.length).toBeGreaterThanOrEqual(1);
  });

  it('les dégâts de combat sont multipliés selon l’affinité', () => {
    // mousse faible au feu : trait incandescent (5) x1.5 = 8
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.enemies[0].hp).toBe(8 - 8); // 8 PV - 8 = 0
    // mousse résistante à l'eau : jet sous pression (4) x0.5 = 2
    c = startCombat(2, 20, 20, 4, ['mousse'], ['eau']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'jet-pression', target: 0 });
    expect(c.enemies[0].hp).toBe(8 - 2);
  });
});
