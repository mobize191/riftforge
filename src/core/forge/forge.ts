import type { GameState } from '../types';
import { EQUIPMENT_BY_ID, type EquipmentDef } from '../../data/equipment';

export interface Purse {
  credits?: number;
  essence?: number;
  mineraiBrut?: number;
}

// Dépense atomique : jamais de solde négatif, tout ou rien.
export function spendResources(state: GameState, cost: Purse): GameState {
  const f = state.forge;
  const credits = cost.credits ?? 0;
  const essence = cost.essence ?? 0;
  const mineraiBrut = cost.mineraiBrut ?? 0;
  if (f.credits < credits || f.essence < essence || f.mineraiBrut < mineraiBrut) return state;
  return {
    ...state,
    forge: {
      ...f,
      credits: f.credits - credits,
      essence: f.essence - essence,
      mineraiBrut: f.mineraiBrut - mineraiBrut,
    },
  };
}

// Achat chez le Marchand : débite les crédits, l'équipement persiste entre les runs (§SPEC-2).
export function buyEquipment(state: GameState, defId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const def: EquipmentDef | undefined = EQUIPMENT_BY_ID[defId];
  if (!def) return state;
  if (state.forge.credits < def.cost) return state;
  return {
    ...state,
    forge: {
      ...state.forge,
      credits: state.forge.credits - def.cost,
      equipment: [
        ...state.forge.equipment,
        { id: `equip-${state.forge.equipment.length}-${defId}`, defId },
      ],
    },
  };
}

export function equipmentBonuses(state: GameState): { attack: number; hp: number } {
  let attack = 0;
  let hp = 0;
  for (const item of state.forge.equipment) {
    const def = EQUIPMENT_BY_ID[item.defId];
    if (def) {
      attack += def.attackBonus;
      hp += def.hpBonus;
    }
  }
  return { attack, hp };
}
