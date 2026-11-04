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
  entrepot: 1, // TODO-BALANCE
};

// Caps de stockage par ressource (§SPEC-6.4). TODO-BALANCE.
export type ResourceKey = 'credits' | 'essence' | 'mineraiBrut' | 'lingots' | 'spores';
export const STORAGE_CAPS: Record<ResourceKey, number> = {
  credits: 500, // TODO-BALANCE
  essence: 50, // TODO-BALANCE
  mineraiBrut: 50, // TODO-BALANCE
  lingots: 25, // TODO-BALANCE
  spores: 20, // TODO-BALANCE
};

// L'Entrepôt augmente tous les caps : cap effectif = base * multiplicateur(level).
// TODO-BALANCE: coût d'amélioration et gain par niveau.
export const ENTREPOS = {
  id: 'entrepot',
  name: 'Entrepôts',
  capMultiplierPerLevel: 2, // TODO-BALANCE (niveau 1 -> x2)
  upgradeCost: { credits: 30 }, // TODO-BALANCE
} as const;

export const UPGRADE_COSTS: Record<string, Record<string, number>> = {
  entrepot: { credits: 30 }, // TODO-BALANCE
  extracteur: { credits: 20 }, // TODO-BALANCE
  'forge-arcane': { credits: 20 }, // TODO-BALANCE
};

// Bonus de production d'un worker assigné à un bâtiment (§R3-06). TODO-BALANCE.
export const WORKER_BONUS: Record<string, number> = {
  extracteur: 1, // TODO-BALANCE — +1 minerai par cycle
  'forge-arcane': 0, // TODO-BALANCE
};
