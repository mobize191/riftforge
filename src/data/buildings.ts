import type { Purse } from '../core/forge/forge';

export interface BuildingDef {
  id: string;
  name: string;
  cadenceTicks: number;
  input?: Purse;
  output?: Purse;
}

// Chaîne simplifiée de l'itération 2 (§SPEC-10) : Extracteur -> minerai brut,
// Forge Arcane consomme essence + minerai -> lingots. TODO-BALANCE: cadences de dev.
// La Forge Arcane existe dès le départ (§SPEC-6.3).
export const BUILDINGS: Record<string, BuildingDef> = {
  extracteur: {
    id: 'extracteur',
    name: 'Extracteur',
    cadenceTicks: 5, // TODO-BALANCE
    output: { mineraiBrut: 1 }, // TODO-BALANCE
  },
  'forge-arcane': {
    id: 'forge-arcane',
    name: 'Forge Arcane',
    cadenceTicks: 20, // TODO-BALANCE
    input: { essence: 1, mineraiBrut: 2 }, // TODO-BALANCE
    output: { lingots: 1 }, // TODO-BALANCE
  },
};

export const STARTING_BUILDINGS: Record<string, number> = {
  extracteur: 1, // TODO-BALANCE
  'forge-arcane': 1, // TODO-BALANCE
};
