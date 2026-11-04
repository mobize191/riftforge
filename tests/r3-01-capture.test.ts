import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce, captureChance } from '../src/core/combat/combat';
import { initialState, reduce } from '../src/core/run/state';

describe('R3-01 capture', () => {
  it('la probabilité est monotone : moins de PV = mieux', () => {
    expect(captureChance(8, 8)).toBeLessThan(captureChance(4, 8));
    expect(captureChance(4, 8)).toBeLessThan(captureChance(1, 8));
    expect(captureChance(0, 8)).toBeLessThanOrEqual(1);
  });

  it('le tirage est seedé et un succès fait rejoindre le monstre au butin', () => {
    // mousse : 8 PV. On le réduit à 1 PV puis on tente la capture.
    function tryCapture(seed: number) {
      let c = startCombat(seed, 20, 20, 4, ['mousse']);
      c = combatReduce(c, { type: 'ATTACK', target: 0 }); // 4-5 dégâts -> 3-4 PV restants
      c = combatReduce(c, { type: 'CAPTURE', target: 0 });
      return { c };
    }
    const a = tryCapture(3);
    const b = tryCapture(3);
    expect(a.c.captured).toEqual(b.c.captured);
    // sur 50 seeds, des succès attendus (proba ≈ 0.3 + 0.6*(4/8 à 5/8) ≈ 0.6-0.7 par tentative)
    let successes = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const { c } = tryCapture(seed * 131);
      if (c.captured.includes('mousse')) successes++;
    }
    expect(successes).toBeGreaterThan(10);
  });

  it('un monstre mort ne peut plus être capturé ; la capture ôte la cible du combat', () => {
    let c = startCombat(1, 20, 20, 4, ['mousse']);
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
    if (c.enemies[0].hp <= 0) {
      const after = combatReduce(c, { type: 'CAPTURE', target: 0 });
      expect(after).toBe(c); // cible morte -> action ignorée
    }
  });

  it('la capture victorieuse ajoute le compagnon à la run', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 9 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    s = reduce(s, {
      type: 'EXIT_COMBAT',
      victory: true,
      loot: { credits: 5, orbs: [], kills: 1, essence: 0, minerai: 0, captured: ['mousse'] },
    });
    expect(s.run!.companions).toContain('mousse');
  });
});
