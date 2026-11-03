import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { canalizationSlots, fusionCostMultiplier, craftLabRecipe } from '../src/core/forge/lab';
import { LAB } from '../src/data/lab';

function forgeWith(essence: number, mineraiBrut: number, credits = 0) {
  const s = initialState();
  return { ...s, forge: { ...s.forge, essence, mineraiBrut, credits } };
}

describe('R2-04 labo de canalisation minimal', () => {
  it('recette tier 1 craftable avec les seuls communs (essence + minerai)', () => {
    let s = forgeWith(2, 3);
    s = reduce(s, { type: 'CRAFT_LAB_RECIPE', recipeId: 'trait-incandescent' });
    expect(s.forge.unlockedRecipes).toContain('trait-incandescent');
    expect(s.forge.essence).toBe(2 - LAB.tier1RecipeCost.essence!);
    expect(s.forge.mineraiBrut).toBe(3 - LAB.tier1RecipeCost.mineraiBrut!);
  });

  it('recette tier 1 refusée sans assez de commun', () => {
    const s = forgeWith(0, 0);
    const next = craftLabRecipe(s, 'trait-incandescent');
    expect(next).toBe(s);
  });

  it('slots de canalisation : 3 de base, améliorables via le labo', () => {
    let s = forgeWith(10, 10, 100);
    expect(canalizationSlots(s)).toBe(3);
    s = reduce(s, { type: 'UPGRADE_LAB' });
    expect(canalizationSlots(s)).toBe(3 + LAB.slotPerLevel);
  });

  it('fusions moins chères au labo (multiplicateur en data)', () => {
    let s = forgeWith(0, 0);
    const m0 = fusionCostMultiplier(s);
    s = reduce(s, { type: 'UPGRADE_LAB' });
    expect(fusionCostMultiplier(s)).toBeLessThan(m0);
  });
});
