import type { Purse } from '../core/forge/forge';

// Labo de canalisation — existe dès le départ (§SPEC-6.3). TODO-BALANCE: coûts de dev.
export const LAB = {
  id: 'labo',
  name: 'Labo de canalisation',
  baseSlots: 3, // TODO-BALANCE — slots de canalisation de départ (§SPEC-5.2)
  slotPerLevel: 1, // TODO-BALANCE — slots gagnés par niveau de labo
  upgradeCost: { credits: 25, essence: 2 } as Purse, // TODO-BALANCE
  tier1RecipeCost: { essence: 1, mineraiBrut: 1 } as Purse, // TODO-BALANCE — recettes tier 1 = que du commun
  // R6-06 : coûts par palier de recette — tier 2 = lingots + commun, tier 3 = lingots
  // + ressource de biome profond. Le tier 1 reste accessible aux seuls communs. TODO-BALANCE.
  tier2RecipeCost: { lingots: 1, essence: 2 } as Purse, // TODO-BALANCE
  tier3RecipeCost: { lingots: 2, mercurium: 1 } as Purse, // TODO-BALANCE — mercurium (biome 3)
  fusionDiscountPerLevel: 0.1, // TODO-BALANCE — -10 % par niveau de labo sur les fusions
} as const;

// R11-05 : améliorations PERMANENTES des modules, achetables au Labo avec des
// ressources de biomes profonds (mercurium/optifibre), persistées en save (v7).
export interface LabUpgradeDef {
  id: string;
  name: string;
  desc: string; // texte FR
  cost: Purse;
  tier: number; // palier de module concerné
  kind: 'energy-cost' | 'damage-bonus';
  value: number; // -1 énergie OU +10 % dégâts (0.1)
}

export const LAB_UPGRADES: LabUpgradeDef[] = [
  { id: 'lab-energie-1', name: 'Canalisation I', desc: '-1 énergie sur les modules palier 1', cost: { lingots: 2, mercurium: 1 }, tier: 1, kind: 'energy-cost', value: 1 }, // TODO-BALANCE
  { id: 'lab-degats-1', name: 'Focalisation I', desc: '+10 % dégâts sur les modules palier 1', cost: { lingots: 2, mercurium: 2 }, tier: 1, kind: 'damage-bonus', value: 0.1 }, // TODO-BALANCE
  { id: 'lab-energie-2', name: 'Canalisation II', desc: '-1 énergie sur les modules palier 2', cost: { lingots: 3, mercurium: 2 }, tier: 2, kind: 'energy-cost', value: 1 }, // TODO-BALANCE
  { id: 'lab-degats-2', name: 'Focalisation II', desc: '+10 % dégâts sur les modules palier 2', cost: { lingots: 4, optifibre: 1 }, tier: 2, kind: 'damage-bonus', value: 0.1 }, // TODO-BALANCE
  { id: 'lab-degats-3', name: 'Focalisation III', desc: '+10 % dégâts sur les modules palier 3', cost: { mercurium: 3, optifibre: 3 }, tier: 3, kind: 'damage-bonus', value: 0.1 }, // TODO-BALANCE
];

export const LAB_UPGRADE_BY_ID: Record<string, LabUpgradeDef> = Object.fromEntries(LAB_UPGRADES.map((u) => [u.id, u]));

// Fusions exclusives du Labo (R11-05) : déblocables uniquement ici, persistées.
export const LAB_EXCLUSIVE_FUSIONS: string[] = ['fusion-nova', 'fusion-abime', 'fusion-singularite'];
