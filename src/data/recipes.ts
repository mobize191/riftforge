import type { ElementId, ModuleEffect } from '../core/types';

export interface RecipeDef {
  id: string;
  name: string;
  inputs: ElementId[];
  tier: number;
  effect: ModuleEffect;
}

// Itération 1 : les 4 modules solo (tier 1). Les 18 recettes complètes arrivent en R4-02.
// TODO-BALANCE: puissances de dev.
export const RECIPES: RecipeDef[] = [
  {
    id: 'trait-incandescent',
    name: 'Trait incandescent',
    inputs: ['feu'],
    tier: 1,
    effect: { kind: 'damage', power: 5 }, // TODO-BALANCE
  },
  {
    id: 'jet-pression',
    name: 'Jet sous pression',
    inputs: ['eau'],
    tier: 1,
    effect: { kind: 'damage', power: 4 }, // TODO-BALANCE
  },
  {
    id: 'ecran-gravats',
    name: 'Écran de gravats',
    inputs: ['terre'],
    tier: 1,
    effect: { kind: 'shield', power: 6 }, // TODO-BALANCE
  },
  {
    id: 'souffle',
    name: 'Souffle',
    inputs: ['air'],
    tier: 1,
    effect: { kind: 'push', power: 1 }, // TODO-BALANCE
  },
];

export const RECIPE_BY_ID: Record<string, RecipeDef> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);
