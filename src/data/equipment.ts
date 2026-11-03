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
];

export const EQUIPMENT_BY_ID: Record<string, EquipmentDef> = Object.fromEntries(
  MERCHANT_ITEMS.map((e) => [e.id, e]),
);

export interface CraftableEquipmentDef extends EquipmentDef {
  craftCost: { credits?: number; essence?: number; mineraiBrut?: number; lingots?: number };
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
];
