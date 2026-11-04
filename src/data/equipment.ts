export interface EquipmentDef {
  id: string;
  name: string;
  cost: number;
  attackBonus: number;
  hpBonus: number;
}

// Équipement achetable chez le Marchand (itération 1). TODO-BALANCE: coûts et stats de dev.
export const MERCHANT_ITEMS: EquipmentDef[] = [
  { id: 'lame-rustique', name: 'Lame rouillée', cost: 15, attackBonus: 2, hpBonus: 0 }, // TODO-BALANCE
  { id: 'cuirasse-fer', name: 'Cuirasse de fer', cost: 20, attackBonus: 0, hpBonus: 6 }, // TODO-BALANCE
  { id: 'bottes-faille', name: 'Bottes de Faille', cost: 25, attackBonus: 1, hpBonus: 4 }, // TODO-BALANCE
  // R6-06 / Q1-1 : le Marchand passe à 6 équipements achetables. TODO-BALANCE.
  { id: 'dague-venin', name: 'Dague de venin', cost: 35, attackBonus: 4, hpBonus: 0 }, // TODO-BALANCE
  { id: 'egide-lapis', name: 'Égide de lapis', cost: 40, attackBonus: 1, hpBonus: 9 }, // TODO-BALANCE
  { id: 'greves-plomb', name: 'Grèves de plomb', cost: 30, attackBonus: 2, hpBonus: 5 }, // TODO-BALANCE
];

export const EQUIPMENT_BY_ID: Record<string, EquipmentDef> = Object.fromEntries(
  MERCHANT_ITEMS.map((e) => [e.id, e]),
);

export interface CraftableEquipmentDef extends EquipmentDef {
  // R6-06 : les tiers 2+ peuvent exiger les ressources de biomes profonds.
  craftCost: { credits?: number; essence?: number; mineraiBrut?: number; lingots?: number; spores?: number; donnees?: number; mercurium?: number; optifibre?: number };
}

// Équipement craftable à la Forge Arcane (en plus des achetables du Marchand). TODO-BALANCE.
export const CRAFTABLE_EQUIPMENT: CraftableEquipmentDef[] = [
  {
    id: 'lame-arcane',
    name: 'Lame arcane',
    cost: 0,
    attackBonus: 4, // TODO-BALANCE
    hpBonus: 0,
    craftCost: { essence: 3, mineraiBrut: 2, lingots: 1 }, // TODO-BALANCE
  },
  {
    id: 'armure-lingot',
    name: 'Armure de lingot',
    cost: 0,
    attackBonus: 0,
    hpBonus: 10, // TODO-BALANCE
    craftCost: { mineraiBrut: 4, lingots: 2 }, // TODO-BALANCE
  },
  {
    id: 'charm-essence',
    name: 'Charme d’essence',
    cost: 0,
    attackBonus: 2, // TODO-BALANCE
    hpBonus: 6, // TODO-BALANCE
    craftCost: { essence: 5, lingots: 1, credits: 10 }, // TODO-BALANCE
  },
  // R6-06 : tiers 2+ — exigent lingots puis composants puis ressources de biomes
  // profonds (mercurium, optifibre). TODO-BALANCE.
  {
    id: 'lame-mercurielle',
    name: 'Lame mercurielle',
    cost: 0,
    attackBonus: 6, // TODO-BALANCE
    hpBonus: 0,
    craftCost: { lingots: 3, mercurium: 2, mineraiBrut: 4 }, // TODO-BALANCE — tier 2 (biome 3)
  },
  {
    id: 'armure-optifibre',
    name: 'Armure d’optifibre',
    cost: 0,
    attackBonus: 0,
    hpBonus: 14, // TODO-BALANCE
    craftCost: { lingots: 3, optifibre: 2, essence: 4 }, // TODO-BALANCE — tier 3 (biome 4)
  },
  {
    id: 'orbe-donnees',
    name: 'Orbe de données',
    cost: 0,
    attackBonus: 3, // TODO-BALANCE
    hpBonus: 8, // TODO-BALANCE
    craftCost: { lingots: 2, donnees: 2, essence: 3 }, // TODO-BALANCE — tier 2 (biome 2)
  },
];
