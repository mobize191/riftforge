export interface ItemDef {
  id: string;
  name: string;
  kind: 'heal' | 'damage';
  power: number;
  usesPerCombat: number;
}

// Consommables de combat (itération 1). TODO-BALANCE: valeurs de dev.
export const COMBAT_ITEMS: ItemDef[] = [
  { id: 'gelule-soin', name: 'Gélule de soin', kind: 'heal', power: 6, usesPerCombat: 1 }, // TODO-BALANCE
  { id: 'bombe-brisante', name: 'Bombe brisante', kind: 'damage', power: 5, usesPerCombat: 1 }, // TODO-BALANCE
];
