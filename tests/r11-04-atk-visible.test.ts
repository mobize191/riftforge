import { describe, it, expect } from 'vitest';
// R11-04 (E4) — scaling ATK rendu visible : ratios ~0,6/1,0/1,5 (data) et dégâts
// PRÉVUS affichés = dégâts infligés (même formule), corrélation ATK→dégâts stricte.
import { startCombat, combatReduce, predictedModuleDamage } from '../src/core/combat/combat';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';
import { MONSTERS, MONSTER_BY_ID } from '../src/data/monsters';

const DMG_RECIPES = RECIPES.filter((r) => r.effect.kind === 'damage' || r.effect.kind === 'aoe');

describe('R11-04 (E4) scaling ATK visible', () => {
  it('ratios relevés ~0,6 / 1,0 / 1,5 et strictement croissants par palier', () => {
    const t = BALANCE.MODULE_ATK_SCALING_BY_TIER;
    expect(t[1]).toBeCloseTo(0.6, 5);
    expect(t[2]).toBeCloseTo(1.0, 5);
    expect(t[3]).toBeCloseTo(1.5, 5);
    expect(t[2]).toBeGreaterThan(t[1]);
    expect(t[3]).toBeGreaterThan(t[2]);
  });

  it('dégâts prédits (predictedModuleDamage) == dégâts réellement infligés, toute la table', () => {
    // cible haute PV (tisseuse, 260 PV) pour éviter le plafonnement des dégâts au PV restants
    const target = MONSTERS.find((m) => m.id === 'tisseuse')!;
    for (const recipe of DMG_RECIPES) {
      {
        const c = startCombat(5, 30, 30, 4, [target.id], recipe.inputs, null, {}, false, [recipe.id]);
        const pred = predictedModuleDamage(recipe, c.player.attack, c.enemies[0].id);
        const before = c.enemies[0].hp;
        const after = combatReduce(c, { type: 'CAST_MODULE', moduleId: recipe.id, target: 0 });
        const inflicted = before - after.enemies[0].hp;
        expect(inflicted).toBe(pred);
      }
    }
  });

  it('corrélation stricte ATK → dégâts de modules sur toute la table (ATQ 12 > ATQ 4)', () => {
    const target = MONSTERS.find((m) => m.id === 'tisseuse')!; // 260 PV : pas de plafonnement
    for (const recipe of DMG_RECIPES) {
      const low = startCombat(5, 40, 40, 4, [target.id], recipe.inputs, null, {}, false, [recipe.id]);
      const high = startCombat(5, 40, 40, 12, [target.id], recipe.inputs, null, {}, false, [recipe.id]);
      const dmg = (c: typeof low) => {
        const before = c.enemies[0].hp;
        const after = combatReduce(c, { type: 'CAST_MODULE', moduleId: recipe.id, target: 0 });
        return before - after.enemies[0].hp;
      };
      expect(dmg(high)).toBeGreaterThan(dmg(low));
    }
  });

  it('sans cible sélectionnée, la prédiction ignore la faiblesse (mult 1)', () => {
    const recipe = RECIPE_BY_ID['trait-incandescent']; // feu, tier 1
    const pred = predictedModuleDamage(recipe, 4, null);
    expect(pred).toBe(Math.round(recipe.effect.power + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]));
    // avec une cible faible au feu (mousse), la prédiction reflète la faiblesse
    const predWeak = predictedModuleDamage(recipe, 4, 'mousse-0');
    expect(predWeak).toBeGreaterThan(pred);
    void MONSTER_BY_ID;
  });
});
