import type { ElementId, ModuleEffect } from '../core/types';

export interface RecipeDef {
  id: string;
  name: string;
  inputs: ElementId[];
  tier: number;
  effect: ModuleEffect;
}

// Les 18 recettes de §SPEC-5.3. Effets chiffrés en data, TODO-BALANCE (valeurs de dev).
// Palier 1 = orbe primordiale seule ; palier 2 = 2 primordiales ; palier 3 = composites dépliés.
export const RECIPES: RecipeDef[] = [
  { id: 'trait-incandescent', name: 'Trait incandescent', inputs: ['feu'], tier: 1, effect: { kind: 'damage', power: 5 } }, // TODO-BALANCE
  { id: 'jet-pression', name: 'Jet sous pression', inputs: ['eau'], tier: 1, effect: { kind: 'damage', power: 4 } }, // TODO-BALANCE
  { id: 'ecran-gravats', name: 'Écran de gravats', inputs: ['terre'], tier: 1, effect: { kind: 'shield', power: 6 } }, // TODO-BALANCE
  { id: 'souffle', name: 'Souffle', inputs: ['air'], tier: 1, effect: { kind: 'push', power: 1 } }, // TODO-BALANCE
  { id: 'combustion', name: 'Combustion', inputs: ['feu', 'feu'], tier: 2, effect: { kind: 'damage', power: 9 } }, // TODO-BALANCE
  { id: 'condensation', name: 'Condensation', inputs: ['eau', 'eau'], tier: 2, effect: { kind: 'heal', power: 6 } }, // TODO-BALANCE (purifie brûlure)
  { id: 'plaque-blindee', name: 'Plaque blindée', inputs: ['terre', 'terre'], tier: 2, effect: { kind: 'shield', power: 12 } }, // TODO-BALANCE
  { id: 'cyclone', name: 'Cyclone', inputs: ['air', 'air'], tier: 2, effect: { kind: 'push', power: 2 } }, // TODO-BALANCE (tous les ennemis)
  { id: 'vapeur', name: 'Vapeur', inputs: ['feu', 'eau'], tier: 2, effect: { kind: 'aoe', power: 3, duration: 2 } }, // TODO-BALANCE (zone brûlante)
  { id: 'magma', name: 'Magma', inputs: ['feu', 'terre'], tier: 2, effect: { kind: 'dot', power: 3, duration: 3 } }, // TODO-BALANCE
  { id: 'souffle-thermique', name: 'Souffle thermique', inputs: ['feu', 'air'], tier: 2, effect: { kind: 'aoe', power: 5 } }, // TODO-BALANCE
  { id: 'boue', name: 'Boue', inputs: ['eau', 'terre'], tier: 2, effect: { kind: 'slow', power: 1 } }, // TODO-BALANCE
  { id: 'cryo-brume', name: 'Cryo-brume', inputs: ['eau', 'air'], tier: 2, effect: { kind: 'slow', power: 2 } }, // TODO-BALANCE (gèle)
  { id: 'poussiere', name: 'Poussière', inputs: ['terre', 'air'], tier: 2, effect: { kind: 'blind', power: 1 } }, // TODO-BALANCE
  { id: 'seve-synthetique', name: 'Sève synthétique', inputs: ['eau', 'terre', 'eau'], tier: 3, effect: { kind: 'heal', power: 12 } }, // TODO-BALANCE — soin du 1er biome
  { id: 'brume-corrosive', name: 'Brume corrosive', inputs: ['feu', 'eau', 'terre'], tier: 3, effect: { kind: 'dot', power: 4, duration: 3 } }, // TODO-BALANCE (Vapeur+Terre déplié)
  { id: 'obsidienne', name: 'Obsidienne', inputs: ['feu', 'terre', 'eau'], tier: 3, effect: { kind: 'damage', power: 8 } }, // TODO-BALANCE (ignore armure, Magma+Eau déplié)
  { id: 'deflagration', name: 'Déflagration', inputs: ['feu', 'feu', 'terre'], tier: 3, effect: { kind: 'aoe', power: 8 } }, // TODO-BALANCE (Combustion+Terre déplié)
];

export const RECIPE_BY_ID: Record<string, RecipeDef> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);
