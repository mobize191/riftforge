import type { ElementId } from '../core/types';

export interface BossAttack {
  id: string;
  name: string;
  damage: number;
}

export interface BossPhase {
  atHpRatioBelow: number; // phase active quand hp/maxHp < ce seuil
  pattern: string[]; // ids d'attaques télégraphiées
}

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  weaknesses: ElementId[];
  resistances: ElementId[];
  attacks: BossAttack[];
  phases: BossPhase[];
}

// Boss des Failles Vertes : pattern télégraphié (idle + annonce de l'attaque), 3 phases,
// faiblesses explicites. Aucun verrou de stats : vainquable avec le kit de départ (§SPEC-2).
// TODO-BALANCE: PV et dégâts de dev.
export const BOSS_BIOME_1: BossDef = {
  id: 'racine-mere',
  name: 'Racine-Mère',
  hp: 30, // TODO-BALANCE
  weaknesses: ['feu'], // TODO-BALANCE
  resistances: ['terre'], // TODO-BALANCE
  attacks: [
    { id: 'frappe-lourde', name: 'Frappe lourde', damage: 4 }, // TODO-BALANCE
    { id: 'crachat-spore', name: 'Crachat de spores', damage: 2 }, // TODO-BALANCE
    { id: 'nuee', name: 'Nuée de spores', damage: 2 }, // TODO-BALANCE (AoE = touche aussi le compagnon)
    { id: 'rage', name: 'Rage racinaire', damage: 5 }, // TODO-BALANCE
  ],
  phases: [
    { atHpRatioBelow: 1.01, pattern: ['frappe-lourde', 'crachat-spore', 'crachat-spore'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.66, pattern: ['frappe-lourde', 'nuee', 'crachat-spore'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.33, pattern: ['rage', 'rage', 'nuee'] }, // TODO-BALANCE
  ],
};

export const BOSS_BY_ID: Record<string, BossDef> = { [BOSS_BIOME_1.id]: BOSS_BIOME_1 };
