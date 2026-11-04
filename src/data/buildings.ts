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
  // R6-05 : chaîne matière complète — Extracteur -> Purificateur -> Nanolathe.
  purificateur: {
    id: 'purificateur',
    name: 'Purificateur',
    cadenceTicks: 15, // TODO-BALANCE
    input: { mineraiBrut: 3 }, // TODO-BALANCE
    output: { essence: 1 }, // TODO-BALANCE — purifie le minerai brut en essence
  },
  nanolathe: {
    id: 'nanolathe',
    name: 'Nanolathe',
    cadenceTicks: 30, // TODO-BALANCE
    input: { essence: 2, mineraiBrut: 1 }, // TODO-BALANCE
    output: { lingots: 1 }, // TODO-BALANCE — plus efficace que la Forge Arcane seule
  },
};

export const STARTING_BUILDINGS: Record<string, number> = {
  extracteur: 1, // TODO-BALANCE
  'forge-arcane': 1, // TODO-BALANCE
  entrepot: 1, // TODO-BALANCE
};

// Caps de stockage par ressource (§SPEC-6.4). TODO-BALANCE.
export type ResourceKey = 'credits' | 'essence' | 'mineraiBrut' | 'lingots' | 'spores' | 'donnees' | 'mercurium' | 'optifibre';
export const STORAGE_CAPS: Record<ResourceKey, number> = {
  credits: 500, // TODO-BALANCE
  essence: 50, // TODO-BALANCE
  mineraiBrut: 50, // TODO-BALANCE
  lingots: 25, // TODO-BALANCE
  spores: 20, // TODO-BALANCE
  donnees: 20, // TODO-BALANCE — R6-01, ressource du biome 2
  mercurium: 20, // TODO-BALANCE — R6-02, ressource du biome 3
  optifibre: 20, // TODO-BALANCE — R6-03, ressource du biome 4
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
  purificateur: { credits: 40, mineraiBrut: 10 }, // TODO-BALANCE — coût de construction (R6-05)
  nanolathe: { credits: 120, lingots: 5 }, // TODO-BALANCE — coût de construction (R6-05)
};

// Bonus de production d'un worker assigné à un bâtiment (§R3-06). TODO-BALANCE.
export const WORKER_BONUS: Record<string, number> = {
  extracteur: 1, // TODO-BALANCE — +1 minerai par cycle
  'forge-arcane': 0, // TODO-BALANCE
};

// --- P6-B : les ~10 bâtiments V1 (§SPEC-6.4) — données uniquement, coûts placeholder TODO-BALANCE ---

export interface BuildingSkeleton {
  id: string;
  name: string;
  tier: number;
  cost: Record<string, number>; // TODO-BALANCE
  neighborBonus?: string; // bonus de voisinage décrit en data (Loop Hero)
}

export const BUILDINGS_V1: BuildingSkeleton[] = [
  { id: 'extracteur', name: 'Extracteur', tier: 1, cost: { credits: 0 } }, // TODO-BALANCE
  { id: 'purificateur', name: 'Purificateur', tier: 2, cost: { credits: 40, mineraiBrut: 10 } }, // TODO-BALANCE
  { id: 'nanolathe', name: 'Nanolathe', tier: 3, cost: { credits: 120, lingots: 5 } }, // TODO-BALANCE
  { id: 'forge-arcane', name: 'Forge Arcane', tier: 1, cost: { credits: 0 } }, // TODO-BALANCE
  { id: 'labo', name: 'Labo de canalisation', tier: 1, cost: { credits: 0 } }, // TODO-BALANCE
  { id: 'ecurie', name: 'Écurie', tier: 1, cost: { credits: 20, mineraiBrut: 5 } }, // TODO-BALANCE
  { id: 'entrepot', name: 'Entrepôts', tier: 1, cost: { credits: 0 } }, // TODO-BALANCE
  { id: 'sanctuaire', name: 'Sanctuaire', tier: 2, cost: { credits: 60, essence: 10 } }, // TODO-BALANCE
  { id: 'atelier-androides', name: 'Atelier des androïdes', tier: 2, cost: { credits: 80, lingots: 3 } }, // TODO-BALANCE
  { id: 'maison-heros', name: 'Maison du héros', tier: 3, cost: { credits: 150, lingots: 8, spores: 5 } }, // TODO-BALANCE
];

// Bonus de voisinage décrits en data (ex. four à côté de la mine). TODO-BALANCE.
export const NEIGHBOR_BONUSES: Record<string, string> = {
  'extracteur+forge-arcane': 'La Forge Arcane à côté de l’Extracteur produit un lingot de plus.', // TODO-BALANCE
  'extracteur+purificateur': 'Le Purificateur à côté de l’Extracteur produit une essence de plus.', // TODO-BALANCE
  'purificateur+nanolathe': 'La Nanolathe à côté du Purificateur produit un lingot de plus.', // TODO-BALANCE
};

// R6-05 : effets réels des bonus de voisinage, appliqués quand les deux bâtiments
// du binôme sont construits (niveau >= 1) ; retirer l'un retire le bonus. TODO-BALANCE.
export interface NeighborBonusEffect {
  buildingId: string; // bâtiment qui reçoit le bonus
  outputBonus: Partial<Record<ResourceKey, number>>;
}
export const NEIGHBOR_BONUS_EFFECTS: Record<string, NeighborBonusEffect> = {
  'extracteur+forge-arcane': { buildingId: 'forge-arcane', outputBonus: { lingots: 1 } }, // TODO-BALANCE
  'extracteur+purificateur': { buildingId: 'purificateur', outputBonus: { essence: 1 } }, // TODO-BALANCE
  'purificateur+nanolathe': { buildingId: 'nanolathe', outputBonus: { lingots: 1 } }, // TODO-BALANCE
};
