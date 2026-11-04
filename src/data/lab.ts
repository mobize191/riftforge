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
