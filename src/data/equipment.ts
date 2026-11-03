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
