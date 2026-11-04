import type { ElementId, Module, Orb } from '../types';
import { RECIPES, RECIPE_BY_ID, type RecipeDef } from '../../data/recipes';

export type CreateResult =
  | { ok: true; module: Module; orbs: Orb[] }
  | { ok: false; reason: 'unknown-recipe' | 'missing-orbs' };

// Multiset d'éléments requis par la recette.
function requiredElements(recipe: RecipeDef): Map<ElementId, number> {
  const map = new Map<ElementId, number>();
  for (const el of recipe.inputs) map.set(el, (map.get(el) ?? 0) + 1);
  return map;
}

// La création d'un module CONSOMME ses orbes (§SPEC-5.2) — gardé jusqu'à la fin de la run.
export function createModule(orbs: Orb[], recipeId: string): CreateResult {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return { ok: false, reason: 'unknown-recipe' };
  const required = requiredElements(recipe);
  const available = new Map<ElementId, Orb[]>();
  for (const orb of orbs) {
    if (orb.kind === 'primordial' && orb.element) {
      const list = available.get(orb.element) ?? [];
      list.push(orb);
      available.set(orb.element, list);
    }
  }
  for (const [el, count] of required) {
    if ((available.get(el) ?? []).length < count) return { ok: false, reason: 'missing-orbs' };
  }
  const consumed = new Set<string>();
  for (const [el, count] of required) {
    for (const orb of available.get(el)!.slice(0, count)) consumed.add(orb.id);
  }
  const module: Module = {
    id: recipe.id,
    name: recipe.name,
    tier: recipe.tier,
    effect: recipe.effect,
  };
  return { ok: true, module, orbs: orbs.filter((o) => !consumed.has(o.id)) };
}

export function craftableRecipes(orbs: Orb[], discovered: string[]): RecipeDef[] {
  return RECIPES.filter((r) => {
    if (!discovered.includes(r.id)) return false;
    const required = requiredElements(r);
    const counts = new Map<ElementId, number>();
    for (const o of orbs) if (o.kind === 'primordial' && o.element) counts.set(o.element, (counts.get(o.element) ?? 0) + 1);
    return [...required].every(([el, n]) => (counts.get(el) ?? 0) >= n);
  });
}
