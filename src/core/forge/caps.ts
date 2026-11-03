import type { GameState } from '../types';
import { ENTREPOS, STORAGE_CAPS, type ResourceKey } from '../../data/buildings';

// Cap effectif d'une ressource, amplifié par le niveau de l'Entrepôt.
export function storageCap(state: GameState, resource: ResourceKey): number {
  const base = STORAGE_CAPS[resource];
  const entrepotLevel = state.forge.buildings[ENTREPOS.id] ?? 0;
  const multiplier = 1 + entrepotLevel * (ENTREPOS.capMultiplierPerLevel - 1);
  return base * multiplier;
}

export function canHold(forge: GameState['forge'], resource: ResourceKey, amount: number): boolean {
  return forge[resource] + amount <= storageCap({ forge } as GameState, resource);
}
