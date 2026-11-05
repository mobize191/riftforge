import { describe, it, expect } from 'vitest';
import { affinityMultiplier, AFFINITY } from '../src/data/affinities';
import { MONSTERS, MONSTER_BY_ID } from '../src/data/monsters';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { BALANCE } from '../src/data/balance';

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

  it('les dégâts de combat sont multipliés selon l’affinité (modules scalés avec l’ATQ, R9)', () => {
    const mousse = MONSTER_BY_ID['mousse'];
    // mousse faible au feu : trait incandescent (5 + ATQ 4 x scaling) x1.5
    const dmgFeu = Math.round((5 + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]) * AFFINITY.weakness);
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.enemies[0].hp).toBe(Math.max(0, mousse.hp - dmgFeu));
    // mousse résistante à l'eau : jet sous pression (4 + scaling) x0.5
    const dmgEau = Math.round((4 + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]) * AFFINITY.resistance);
    c = startCombat(2, 20, 20, 4, ['mousse'], ['eau']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'jet-pression', target: 0 });
    expect(c.enemies[0].hp).toBe(Math.max(0, mousse.hp - dmgEau));
  });
});
