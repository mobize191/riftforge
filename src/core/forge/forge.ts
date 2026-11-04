import type { GameState } from '../types';
import { CRAFTABLE_EQUIPMENT, EQUIPMENT_BY_ID, type EquipmentDef } from '../../data/equipment';
import { UPGRADE_COSTS } from '../../data/buildings';
import { EQUIPMENT_SLOT_LIMITS, type EquipmentSlot } from '../../data/equipment';

// Nombre d'objets d'un emplacement possédés (portés + rangés à la Maison) — B28.
export function ownedCount(state: GameState, slot: EquipmentSlot): number {
  const all = [...Object.values(EQUIPMENT_BY_ID), ...CRAFTABLE_EQUIPMENT];
  const owned = [...state.forge.equipment, ...state.forge.homeEquipment];
  return owned.filter((e) => all.find((d) => d.id === e.defId)?.slot === slot).length;
}

// B28 : un achat/craft est refusé si l'emplacement est plein (limite en data).
export function slotFull(state: GameState, slot: EquipmentSlot): boolean {
  return ownedCount(state, slot) >= (EQUIPMENT_SLOT_LIMITS[slot] ?? 99);
}

export interface Purse {
  credits?: number;
  essence?: number;
  mineraiBrut?: number;
  lingots?: number;
  spores?: number;
  donnees?: number; // R6-06 — ressources de biomes profonds
  mercurium?: number;
  optifibre?: number;
}

const PURSE_KEYS = ['credits', 'essence', 'mineraiBrut', 'lingots', 'spores', 'donnees', 'mercurium', 'optifibre'] as const;

// Dépense atomique : jamais de solde négatif, tout ou rien.
export function spendResources(state: GameState, cost: Purse): GameState {
  const f = state.forge;
  for (const k of PURSE_KEYS) {
    if (f[k] < (cost[k] ?? 0)) return state;
  }
  const forge = { ...f };
  for (const k of PURSE_KEYS) {
    const n = cost[k] ?? 0;
    if (n > 0) forge[k] = forge[k] - n;
  }
  return { ...state, forge };
}

// Achat chez le Marchand : débite les crédits, l'équipement persiste entre les runs (§SPEC-2).
export function buyEquipment(state: GameState, defId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const def: EquipmentDef | undefined = EQUIPMENT_BY_ID[defId];
  if (!def) return state;
  if (state.forge.credits < def.cost) return state;
  if (state.forge.equipment.some((e) => e.defId === defId)) return state; // pas de doublon
  if (state.forge.homeEquipment.some((e) => e.defId === defId)) return state; // déjà possédé (rangé)
  if (slotFull(state, def.slot)) return state; // B28 — limite par emplacement
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

// Amélioration d'un bâtiment : débite le coût, niveau +1. Refus propre si insuffisant.
export function upgradeBuilding(state: GameState, buildingId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const cost = UPGRADE_COSTS[buildingId];
  if (!cost) return state;
  const current = state.forge.buildings[buildingId] ?? 0;
  if (state.forge.credits < (cost.credits ?? 0)) return state;
  return {
    ...state,
    forge: {
      ...state.forge,
      credits: state.forge.credits - (cost.credits ?? 0),
      buildings: { ...state.forge.buildings, [buildingId]: current + 1 },
    },
  };
}

// Craft d'équipement à la Forge Arcane : débite les ressources, l'équipement persiste (§R2-05).
export function craftEquipment(state: GameState, defId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const def = CRAFTABLE_EQUIPMENT.find((e) => e.id === defId);
  if (!def) return state;
  if (state.forge.equipment.some((e) => e.defId === defId)) return state; // pas de doublon
  if (state.forge.homeEquipment.some((e) => e.defId === defId)) return state; // déjà possédé (rangé)
  if (slotFull(state, def.slot)) return state; // B28 — limite par emplacement
  const next = spendResources(state, def.craftCost);
  if (next === state) return next;
  return {
    ...next,
    forge: {
      ...next.forge,
      equipment: [
        ...next.forge.equipment,
        { id: `craft-${next.forge.equipment.length}-${defId}`, defId },
      ],
    },
  };
}

export function equipmentBonuses(state: GameState): { attack: number; hp: number } {
  const all = [...Object.values(EQUIPMENT_BY_ID), ...CRAFTABLE_EQUIPMENT];
  let attack = 0;
  let hp = 0;
  for (const item of state.forge.equipment) {
    const def = all.find((d) => d.id === item.defId);
    if (def) {
      attack += def.attackBonus;
      hp += def.hpBonus;
    }
  }
  return { attack, hp };
}
