import type { Purse } from '../core/forge/forge';

// R7 — Modificateurs de Faille (challenge volontaire, débloqués après une première
// complétion des 4 biomes). Toutes les valeurs chiffrées sont TODO-BALANCE.

export interface RiftModifierDef {
  id: string;
  name: string;
  description: string;
}

export const RIFT_MODIFIERS: RiftModifierDef[] = [
  { id: 'instabilite', name: 'Instabilité', description: 'Une jauge monte à chaque action ; seuils = dangers puis élites ; purge aux sanctuaires.' }, // TODO-BALANCE
  { id: 'monstres-niveaux', name: 'Monstres surentraînés', description: '+2 niveaux de monstres (PV/ATQ augmentés).' }, // TODO-BALANCE
  { id: 'elites', name: 'Élites', description: 'Des élites (monstres buffés, visibles) apparaissent.' }, // TODO-BALANCE
  { id: 'affinites-brouillees', name: 'Affinités brouillées', description: 'Les multiplicateurs d’affinité sont mélangés (tirage seedé).' }, // TODO-BALANCE
  { id: 'orbes-rares', name: 'Orbes rares', description: 'Les drops d’orbes sont réduits.' }, // TODO-BALANCE
];

export const RIFT_MODIFIER_BY_ID: Record<string, RiftModifierDef> = Object.fromEntries(
  RIFT_MODIFIERS.map((m) => [m.id, m]),
);

// Jauge d'instabilité (R7-02). TODO-BALANCE.
export const INSTABILITY = {
  perCombat: 10, // TODO-BALANCE — par combat (victoire ou fuite)
  perHarvest: 5, // TODO-BALANCE — par récolte de ressource
  dangerThreshold: 30, // TODO-BALANCE — seuil « danger » (journal)
  eliteThreshold: 60, // TODO-BALANCE — seuil « élites qui traquent »
  sanctuaryPurge: 100, // TODO-BALANCE — purge complète au sanctuaire
  sanctuariesPerFloor: 1, // TODO-BALANCE — nœuds de sanctuaire par niveau (si modificateur actif)
} as const;

// Bonus de niveaux des monstres (R7-03). TODO-BALANCE.
export const MONSTER_LEVEL_BONUS = {
  levels: 2, // TODO-BALANCE
  hpPerLevel: 2, // TODO-BALANCE
  atkPerLevel: 1, // TODO-BALANCE
} as const;

// Élites : monstres buffés visibles (R7-03/R7-04). TODO-BALANCE.
export const ELITE = {
  idPrefix: 'elite-',
  hpMultiplier: 2, // TODO-BALANCE
  attackBonus: 2, // TODO-BALANCE
  namePrefix: 'Élite ', // TODO-BALANCE
} as const;

// Affinités brouillées : multiplicateurs mélangés seedés (R7-03). TODO-BALANCE.
export const BLURRED_AFFINITY_VALUES = [0.5, 1, 1.5] as const; // TODO-BALANCE

// Orbes plus rares (R7-03). TODO-BALANCE.
export const RARE_ORBS = {
  lootOrbCountDivisor: 2, // TODO-BALANCE — 1-2 orbes -> divisé par 2 (min 0)
} as const;

// Récompenses exclusives de fin de run (R7-04) : bonus par modificateur actif. TODO-BALANCE.
export const RIFT_REWARD_PER_MODIFIER: Purse = { credits: 20, essence: 2 }; // TODO-BALANCE
