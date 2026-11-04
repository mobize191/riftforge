export type EquipmentSlot = 'arme' | 'bouclier' | 'armure' | 'accessoire';

export interface EquipmentDef {
  id: string;
  name: string;
  cost: number;
  attackBonus: number;
  hpBonus: number;
  slot: EquipmentSlot; // B28 — un emplacement par type d'objet
}

// Limites d'objets possédés par emplacement (portés + rangés à la Maison). TODO-BALANCE.
export const EQUIPMENT_SLOT_LIMITS: Record<EquipmentSlot, number> = {
  arme: 1, // TODO-BALANCE
  bouclier: 1, // TODO-BALANCE
  armure: 1, // TODO-BALANCE
  accessoire: 2, // TODO-BALANCE
};

// Équipement achetable chez le Marchand (itération 1). TODO-BALANCE: coûts et stats de dev.
export const MERCHANT_ITEMS: EquipmentDef[] = [
  { id: 'lame-rustique', name: 'Lame rouillée', cost: 45, attackBonus: 1, hpBonus: 0 , slot: 'arme' }, // TODO-BALANCE
  { id: 'cuirasse-fer', name: 'Cuirasse de fer', cost: 60, attackBonus: 0, hpBonus: 6 , slot: 'armure' }, // TODO-BALANCE
  { id: 'bottes-faille', name: 'Bottes de Faille', cost: 75, attackBonus: 0, hpBonus: 4 , slot: 'accessoire' }, // TODO-BALANCE
  // R6-06 / Q1-1 : le Marchand passe à 6 équipements achetables. TODO-BALANCE.
  { id: 'dague-venin', name: 'Dague de venin', cost: 105, attackBonus: 1, hpBonus: 0 , slot: 'arme' }, // TODO-BALANCE (R10-03 D2 : jamais de one-shot) — coût x3 en R10-05
  { id: 'egide-lapis', name: 'Égide de lapis', cost: 120, attackBonus: 0, hpBonus: 9 , slot: 'bouclier' }, // TODO-BALANCE
  { id: 'greves-plomb', name: 'Grèves de plomb', cost: 90, attackBonus: 0, hpBonus: 5 , slot: 'armure' }, // TODO-BALANCE
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
    hpBonus: 0, slot: 'arme',
    craftCost: { essence: 6, mineraiBrut: 4, lingots: 2 }, // TODO-BALANCE
  },
  {
    id: 'armure-lingot',
    name: 'Armure de lingot',
    cost: 0,
    attackBonus: 0,
    hpBonus: 10, slot: 'armure', // TODO-BALANCE
    craftCost: { mineraiBrut: 8, lingots: 4 }, // TODO-BALANCE
  },
  {
    id: 'charm-essence',
    name: 'Charme d’essence',
    cost: 0,
    attackBonus: 2, // TODO-BALANCE
    hpBonus: 6, slot: 'accessoire', // TODO-BALANCE
    craftCost: { essence: 10, lingots: 2, credits: 30 }, // TODO-BALANCE
  },
  // R6-06 : tiers 2+ — exigent lingots puis composants puis ressources de biomes
  // profonds (mercurium, optifibre). TODO-BALANCE.
  {
    id: 'lame-mercurielle',
    name: 'Lame mercurielle',
    cost: 0,
    attackBonus: 6, // TODO-BALANCE
    hpBonus: 0, slot: 'arme',
    craftCost: { lingots: 6, mercurium: 6, mineraiBrut: 8 }, // TODO-BALANCE — tier 2 (biome 3)
  },
  {
    id: 'armure-optifibre',
    name: 'Armure d’optifibre',
    cost: 0,
    attackBonus: 0,
    hpBonus: 14, slot: 'armure', // TODO-BALANCE
    craftCost: { lingots: 6, optifibre: 6, essence: 8 }, // TODO-BALANCE — tier 3 (biome 4)
  },
  {
    id: 'orbe-donnees',
    name: 'Orbe de données',
    cost: 0,
    attackBonus: 3, // TODO-BALANCE
    hpBonus: 8, slot: 'accessoire', // TODO-BALANCE
    craftCost: { lingots: 4, donnees: 5, essence: 6 }, // TODO-BALANCE — tier 2 (biome 2)
  },
];
