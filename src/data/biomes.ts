import type { MonsterFamily } from '../core/types';

export interface BiomeDef {
  id: string;
  name: string;
  resourceId: string;
  twist: string;
  family: MonsterFamily;
  palette: { floor: string; wall: string; accent: string; monster: string }; // R6-09 — identité visuelle par biome
}

// Palettes par biome (identité visuelle ; assets générés en code, voir public/assets/LICENSE.md).
export const BIOME_PALETTES: Record<string, BiomeDef['palette']> = {
  'failles-vertes': { floor: '#1d3320', wall: '#2f5231', accent: '#66ff99', monster: '#4caf50' },
  datacathedrales: { floor: '#14243d', wall: '#274a7a', accent: '#66d9ff', monster: '#3399ff' },
  'hauts-fourneaux': { floor: '#3d1c10', wall: '#7a3a1e', accent: '#ffb066', monster: '#ff5533' },
  fibration: { floor: '#241238', wall: '#4a2a7a', accent: '#e08cff', monster: '#b44aff' },
};

// Biome 1 — les biomes 2-4 seront des squelettes en P6-A.
export const BIOME_1: BiomeDef = {
  id: 'failles-vertes',
  name: 'Les Failles Vertes',
  resourceId: 'spores',
  twist: 'les racines bloquent/rouvrent des passages',
  family: 'spore',
  palette: BIOME_PALETTES['failles-vertes'],
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
  altarsPerFloor: 1, // TODO-BALANCE — 1 défi à tours limités par niveau (§SPEC-4.3)
} as const;

// --- P6-A : squelettes des biomes 2-4 (données descriptives uniquement, aucune logique) ---

export const BIOME_SKELETONS: BiomeDef[] = [
  {
    id: 'datacathedrales',
    name: 'Les Datacathédrales',
    resourceId: 'donnees',
    twist: 'circuits qui modifient la carte',
    family: 'gremlin',
    palette: BIOME_PALETTES['datacathedrales'],
  },
  {
    id: 'hauts-fourneaux',
    name: 'Les Hauts-Fourneaux',
    resourceId: 'mercurium',
    twist: 'sol brûlant, zones de dégâts',
    family: 'elementaire',
    palette: BIOME_PALETTES['hauts-fourneaux'],
  },
  {
    id: 'fibration',
    name: 'La Fibration',
    resourceId: 'optifibre',
    twist: 'zones accélérées / ralenties',
    family: 'vermine',
    palette: BIOME_PALETTES['fibration'],
  },
];

// --- R6-01..R6-04 : les 4 biomes jouables (structures chiffrées TODO-BALANCE) ---

export interface BiomeStructure {
  floors: number;
  bossId: string;
  family: MonsterFamily;
  resourceId: string;
  monsterCountBase: number;
  monsterCountPerFloor: number;
  resourceNodesPerFloor: number;
  altarsPerFloor: number;
  rootsEnabled?: boolean;
  attractRadius?: number;
  // Twist biome 2 : circuits — déclencheurs qui ouvrent/ferment des portes.
  circuits?: { triggers: number; doorsPerTrigger: number };
  // Twist biome 3 : sol brûlant — zones de dégâts par tour, télégraphiées.
  burnZonesPerFloor?: number;
  burnDamage?: number;
  // Twist biome 4 : zones de vitesse (2 = accéléré, 0 = ralenti/saute un tour).
  speedZonesPerFloor?: number;
}

export const BIOME_STRUCTURES: Record<string, BiomeStructure> = {
  'failles-vertes': {
    floors: BIOME_1_STRUCTURE.floors,
    bossId: BIOME_1_STRUCTURE.bossId,
    family: 'spore',
    resourceId: 'spores',
    monsterCountBase: BIOME_1_STRUCTURE.monsterCountBase,
    monsterCountPerFloor: BIOME_1_STRUCTURE.monsterCountPerFloor,
    resourceNodesPerFloor: BIOME_1_STRUCTURE.sporeNodesPerFloor,
    altarsPerFloor: BIOME_1_STRUCTURE.altarsPerFloor,
    rootsEnabled: BIOME_1_STRUCTURE.rootsEnabled,
    attractRadius: BIOME_1_STRUCTURE.attractRadius,
  },
  datacathedrales: {
    floors: 4, // TODO-BALANCE
    bossId: 'grand-index', // TODO-BALANCE
    family: 'gremlin',
    resourceId: 'donnees',
    monsterCountBase: 6, // TODO-BALANCE (ajusté R9-01)
    monsterCountPerFloor: 1, // TODO-BALANCE (ajusté R9-01)
    resourceNodesPerFloor: 3, // TODO-BALANCE — nœuds de données
    altarsPerFloor: 1, // TODO-BALANCE
    circuits: { triggers: 2, doorsPerTrigger: 2 }, // TODO-BALANCE — twist circuits
  },
  'hauts-fourneaux': {
    floors: 4, // TODO-BALANCE
    bossId: 'coeur-fournaise', // TODO-BALANCE
    family: 'elementaire',
    resourceId: 'mercurium',
    monsterCountBase: 6, // TODO-BALANCE (ajusté R9-01)
    monsterCountPerFloor: 1, // TODO-BALANCE (ajusté R9-01)
    resourceNodesPerFloor: 3, // TODO-BALANCE — nœuds de mercurium
    altarsPerFloor: 1, // TODO-BALANCE
    burnZonesPerFloor: 4, // TODO-BALANCE — twist sol brûlant
    burnDamage: 6, // TODO-BALANCE (ajusté R9-01) — dégâts exacts par tour sur une case brûlante
  },
  fibration: {
    floors: 4, // TODO-BALANCE
    bossId: 'noeud-final', // TODO-BALANCE
    family: 'vermine',
    resourceId: 'optifibre',
    monsterCountBase: 7, // TODO-BALANCE (ajusté R9-01)
    monsterCountPerFloor: 1, // TODO-BALANCE (ajusté R9-01)
    resourceNodesPerFloor: 3, // TODO-BALANCE — nœuds d'optifibre
    altarsPerFloor: 1, // TODO-BALANCE
    speedZonesPerFloor: 5, // TODO-BALANCE — twist zones de vitesse
  },
};

// Les 4 biomes dans l'ordre de la run (§SPEC-4.1).
export const BIOME_ORDER = ['failles-vertes', 'datacathedrales', 'hauts-fourneaux', 'fibration'] as const;

export const BIOME_BY_ID: Record<string, BiomeDef> = Object.fromEntries(
  [BIOME_1, ...BIOME_SKELETONS].map((b) => [b.id, b]),
);
