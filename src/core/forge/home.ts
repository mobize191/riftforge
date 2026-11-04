import type { GameState } from '../types';
import { RECIPES } from '../../data/recipes';

// R6-07 — Maison du héros : trophées dérivés de l'état réel (jamais stockés à part).
export interface Trophies {
  bosses: string[]; // ids des boss vaincus (persistés)
  contractsDone: number;
  contractsTotal: number;
  codexSeen: number;
  codexTotal: number;
  codexComplete: boolean;
  runCompleted: boolean;
}

export function trophiesOf(state: GameState): Trophies {
  const f = state.forge;
  return {
    bosses: [...f.defeatedBosses],
    contractsDone: f.claimedContracts.length,
    contractsTotal: f.claimedContracts.length, // V1 : les contrats du Marchand sont tous réclamables
    codexSeen: f.discoveredRecipes.length,
    codexTotal: RECIPES.length,
    codexComplete: RECIPES.every((r) => f.discoveredRecipes.includes(r.id)),
    runCompleted: f.runCompleted,
  };
}
