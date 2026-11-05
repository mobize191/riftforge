import type { GameState } from '../types';
import { LAB, LAB_UPGRADE_BY_ID, LAB_EXCLUSIVE_FUSIONS } from '../../data/lab';
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

// Recette du labo par palier (R6-06) : tier 1 = que du commun, tier 2 = lingots +
// commun, tier 3 = lingots + ressource de biome profond. Refus propre si solde
// insuffisant. Enregistre le module au codex de la Forge (recette connue).
export function craftLabRecipe(state: GameState, recipeId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return state;
  if (state.forge.unlockedRecipes.includes(recipeId)) return state;
  const cost = recipe.tier === 1 ? LAB.tier1RecipeCost : recipe.tier === 2 ? LAB.tier2RecipeCost : LAB.tier3RecipeCost;
  const next = spendResources(state, cost);
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

// R11-05 : modificateurs de combat dérivés des améliorations permanentes du Labo.
export interface LabCombatModifiers {
  energyMinus: Record<number, number>; // palier -> énergie économisée
  dmgBonus: Record<number, number>; // palier -> bonus de dégâts (0.1 = +10 %)
}

export function labModifiersOf(forge: GameState['forge']): LabCombatModifiers {
  const energyMinus: Record<number, number> = {};
  const dmgBonus: Record<number, number> = {};
  for (const id of forge.labUpgrades) {
    const u = LAB_UPGRADE_BY_ID[id];
    if (!u) continue;
    if (u.kind === 'energy-cost') energyMinus[u.tier] = (energyMinus[u.tier] ?? 0) + u.value;
    else dmgBonus[u.tier] = (dmgBonus[u.tier] ?? 0) + u.value;
  }
  return { energyMinus, dmgBonus };
}

// Achat d'une amélioration permanente (R11-05) : coût en data, persistée, sans doublon.
export function buyLabUpgrade(state: GameState, upgradeId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const u = LAB_UPGRADE_BY_ID[upgradeId];
  if (!u) return state;
  if (state.forge.labUpgrades.includes(upgradeId)) return state; // jamais de doublon
  const next = spendResources(state, u.cost);
  if (next === state) return state;
  return { ...next, forge: { ...next.forge, labUpgrades: [...next.forge.labUpgrades, upgradeId] } };
}

// Déblocage d'une fusion exclusive du Labo (R11-05) : persisté, sans doublon.
export function unlockLabFusion(state: GameState, fusionId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  if (!LAB_EXCLUSIVE_FUSIONS.includes(fusionId)) return state;
  if (state.forge.labFusions.includes(fusionId)) return state;
  const cost = { lingots: 3, mercurium: 2, optifibre: 1 }; // TODO-BALANCE — déblocage recette exclusive
  const next = spendResources(state, cost);
  if (next === state) return state;
  return { ...next, forge: { ...next.forge, labFusions: [...next.forge.labFusions, fusionId] } };
}

// Une fusion exclusive est-elle débloquée à la Forge ?
export function isLabFusionUnlocked(forge: GameState['forge'], fusionId: string): boolean {
  return forge.labFusions.includes(fusionId);
}
