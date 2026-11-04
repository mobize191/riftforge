import { describe, it, expect } from 'vitest';
import { RECIPES } from '../src/data/recipes';
import { createModule, craftableRecipes } from '../src/core/combat/createModule';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import type { Orb } from '../src/core/types';

const orb = (element: 'feu' | 'eau' | 'terre' | 'air', id: string): Orb => ({
  id, kind: 'primordial', element, tier: 1,
});

describe('R4-02 table des 18 recettes', () => {
  it('les 18 recettes chargent avec un palier marqué', () => {
    expect(RECIPES).toHaveLength(18);
    for (const r of RECIPES) {
      expect(r.tier).toBeGreaterThanOrEqual(1);
      expect(r.effect.power).toBeGreaterThanOrEqual(0);
    }
    // le module de soin du premier biome existe (Sève synthétique)
    expect(RECIPES.find((r) => r.id === 'seve-synthetique')?.effect.kind).toBe('heal');
  });

  it('la création consomme exactement les orbes requises', () => {
    const orbs = [orb('feu', 'a'), orb('feu', 'b'), orb('eau', 'c')];
    const r = createModule(orbs, 'combustion');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.module.id).toBe('combustion');
      expect(r.orbs.map((o) => o.id)).toEqual(['c']);
    }
    expect(createModule(orbs, 'magma').ok).toBe(false); // feu+terre, orbe terre manquante... feu dispo mais pas terre
  });

  it('chaque famille d’effet est produite en combat', () => {
    // dégâts
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu'], null, {}, false, ['combustion']);
    c.orbs = ['feu', 'feu'];
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'combustion', target: 0 });
    expect(c.enemies[0].hp).toBeLessThan(c.enemies[0].maxHp);
    // soin
    c = startCombat(2, 5, 20, 4, ['mousse'], [], null, {}, false, ['seve-synthetique']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'seve-synthetique' });
    expect(c.player.hp).toBeGreaterThan(5);
    // bouclier
    c = startCombat(3, 5, 20, 4, ['mousse'], [], null, {}, false, ['plaque-blindee']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'plaque-blindee' });
    expect(c.player.shield).toBeGreaterThan(0);
    // projection
    c = startCombat(4, 20, 20, 4, ['mousse'], [], null, {}, false, ['cyclone']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'cyclone', target: 0 });
    expect(c.player.hp).toBe(20); // ennemi projeté, pas de riposte
    // DoT
    c = startCombat(5, 20, 20, 4, ['cuirasse'], [], null, {}, false, ['magma']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'magma', target: 0 });
    expect(c.enemies[0].dot).toBeGreaterThan(0);
  });

  it('craftableRecipes ne propose que le réalisable avec les orbes actuelles', () => {
    const orbs = [orb('feu', 'a'), orb('feu', 'b')];
    const list = craftableRecipes(orbs, RECIPES.map((r) => r.id)).map((r) => r.id);
    expect(list).toContain('combustion');
    expect(list).not.toContain('magma');
  });
});
