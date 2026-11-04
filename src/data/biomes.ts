import type { MonsterFamily } from '../core/types';

export interface BiomeDef {
  id: string;
  name: string;
  resourceId: string;
  twist: string;
  family: MonsterFamily;
}

// Biome 1 — les biomes 2-4 seront des squelettes en P6-A.
export const BIOME_1: BiomeDef = {
  id: 'failles-vertes',
  name: 'Les Failles Vertes',
  resourceId: 'spores',
  twist: 'les racines bloquent/rouvrent des passages',
  family: 'spore',
};

// Structure du biome 1 (itération 5, §SPEC-4.1). TODO-BALANCE.
export const BIOME_1_STRUCTURE = {
  floors: 4, // TODO-BALANCE — 4 niveaux + boss
  bossId: 'racine-mere', // TODO-BALANCE
  rootsEnabled: true, // TODO-BALANCE — twist : racines bloquantes
  monsterCountBase: 4, // TODO-BALANCE
  monsterCountPerFloor: 1, // TODO-BALANCE — difficulté croissante
  monsterHpBonusPerFloor: 1, // TODO-BALANCE
  sporeNodesPerFloor: 3, // TODO-BALANCE — nœuds de spores visibles (§SPEC-4.2)
  sporeHealPower: 8, // TODO-BALANCE — usage soin de la ressource du biome 1
  attractRadius: 5, // TODO-BALANCE — la récolte attire les monstres voisins dans ce rayon
} as const;
