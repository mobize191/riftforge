import type { MonsterFamily } from '../core/types';

export interface BiomeDef {
  id: string;
  name: string;
  resourceId: string;
  twist: string;
  family: MonsterFamily;
}

// Biome 1 minimal (itération 1) — les biomes 2-4 seront des squelettes en P6-A.
export const BIOME_1: BiomeDef = {
  id: 'failles-vertes',
  name: 'Les Failles Vertes',
  resourceId: 'spores',
  twist: 'les racines bloquent/rouvrent des passages',
  family: 'spore',
};
