import type { GameState } from '../types';
import { LAB } from '../../data/lab';
import { spendResources } from './forge';
import { RECIPES } from '../../data/recipes';

// Slots de canalisation : 3 de base (niveau 1 du Labo), améliorables (§SPEC-5.2).
export function canalizationSlots(state: GameState): number {
  const level = Math.max(0, (state.forge.buildings[LAB.id] ?? 1) - 1);
  return LAB.baseSlots + level * LAB.slotPerLevel;
}

// Coût d'une fusion : réduit au Labo (malus/bonus en data, §R2-04).
export function fusionCostMultiplier(state: GameState): number {
  const level = Math.max(0, (state.forge.buildings[LAB.id] ?? 1) - 1);
  return Math.max(0, 1 - level * LAB.fusionDiscountPerLevel);
}

// Recette tier 1 du labo : ne demande que du commun (essence + minerai brut).
// Enregistre le module au codex de la Forge (débloque la recette connue).
export function craftLabRecipe(state: GameState, recipeId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe || recipe.tier !== 1) return state;
  if (state.forge.unlockedRecipes.includes(recipeId)) return state;
  const next = spendResources(state, LAB.tier1RecipeCost);
  if (next === state) return state; // solde insuffisant -> refus propre
  return {
    ...next,
    forge: { ...next.forge, unlockedRecipes: [...next.forge.unlockedRecipes, recipeId] },
  };
}

export function upgradeLab(state: GameState): GameState {
  if (state.mode !== 'FORGE') return state;
  const next = spendResources(state, LAB.upgradeCost);
  if (next === state) return state;
  const level = state.forge.buildings[LAB.id] ?? 0;
  return {
    ...next,
    forge: { ...next.forge, buildings: { ...next.forge.buildings, [LAB.id]: level + 1 } },
  };
}
