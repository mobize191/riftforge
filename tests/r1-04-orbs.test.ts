import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce, availableSoloModules } from '../src/core/combat/combat';
import { initialState, reduce } from '../src/core/run/state';
import { RECIPES } from '../src/data/recipes';

describe('R1-04 simple orbs in combat', () => {
  it('player starts the run with 3-4 random orbs, seeded', () => {
    const a = reduce(initialState(), { type: 'START_RUN', seed: 77 });
    const b = reduce(initialState(), { type: 'START_RUN', seed: 77 });
    expect(a.run?.orbs).toEqual(b.run?.orbs);
    expect(a.run!.orbs.length).toBeGreaterThanOrEqual(3);
    expect(a.run!.orbs.length).toBeLessThanOrEqual(4);
    for (const o of a.run!.orbs) expect(o.kind).toBe('primordial');
  });

  it('each solo module produces its effect', () => {
    // feu -> dégâts
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.enemies[0].hp).toBeLessThan(c.enemies[0].maxHp);
    // terre -> bouclier posé (peut absorber une riposte selon l'initiative)
    c = startCombat(1, 5, 20, 4, ['mousse'], ['terre']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'ecran-gravats' });
    expect(c.player.shield + c.player.hp).toBeGreaterThanOrEqual(5);
    // air -> projection posée sur l'ennemi
    c = startCombat(1, 5, 20, 4, ['mousse'], ['air']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'souffle', target: 0 });
    expect(c.enemies[0].stunned || c.enemies[0].hp < c.enemies[0].maxHp || c.phase !== 'player').toBe(true);
    // eau -> dégâts
    c = startCombat(1, 20, 20, 4, ['mousse'], ['eau']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'jet-pression', target: 0 });
    expect(c.enemies[0].hp).toBeLessThan(c.enemies[0].maxHp);
  });

  it('casting is free (orb not consumed) but requires the orb', () => {
    let c = startCombat(2, 20, 20, 4, ['mousse'], ['feu']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.orbs).toContain('feu');
    const without = startCombat(2, 20, 20, 4, ['mousse'], ['eau']);
    const after = combatReduce(without, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(after.enemies[0].hp).toBe(after.enemies[0].maxHp);
  });

  it('the 4 solo modules are the tier-1 single-input recipes', () => {
    expect(RECIPES.filter((r) => r.inputs.length === 1)).toHaveLength(4);
    expect(availableSoloModules(['feu', 'eau', 'terre', 'air']).map((r) => r.id).sort()).toEqual(
      ['ecran-gravats', 'jet-pression', 'souffle', 'trait-incandescent'],
    );
  });
});
