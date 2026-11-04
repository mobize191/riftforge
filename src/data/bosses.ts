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

// --- R6-01..R6-03 : boss des biomes 2-4 (télégraphiés, faiblesses explicites). TODO-BALANCE ---

// Biome 2 — Les Datacathédrales.
export const BOSS_BIOME_2: BossDef = {
  id: 'grand-index',
  name: 'Le Grand Index',
  hp: 270, // TODO-BALANCE
  weaknesses: ['eau'], // TODO-BALANCE
  resistances: ['air'], // TODO-BALANCE
  attacks: [
    { id: 'frappe-index', name: 'Frappe d’index', damage: 7 }, // TODO-BALANCE
    { id: 'requete', name: 'Requête vorace', damage: 5 }, // TODO-BALANCE
    { id: 'surcharge', name: 'Surcharge de données', damage: 6 }, // TODO-BALANCE
  ],
  phases: [
    { atHpRatioBelow: 1.01, pattern: ['frappe-index', 'requete', 'requete'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.5, pattern: ['surcharge', 'frappe-index', 'requete'] }, // TODO-BALANCE
  ],
};

// Biome 3 — Les Hauts-Fourneaux.
export const BOSS_BIOME_3: BossDef = {
  id: 'coeur-fournaise',
  name: 'Cœur de Fournaise',
  hp: 337, // TODO-BALANCE
  weaknesses: ['eau'], // TODO-BALANCE
  resistances: ['feu'], // TODO-BALANCE
  attacks: [
    { id: 'jet-magma', name: 'Jet de magma', damage: 8 }, // TODO-BALANCE
    { id: 'explosion', name: 'Explosion thermique', damage: 6 }, // TODO-BALANCE
    { id: 'brasier', name: 'Brasier', damage: 5 }, // TODO-BALANCE (AoE compagnon)
  ],
  phases: [
    { atHpRatioBelow: 1.01, pattern: ['jet-magma', 'explosion', 'brasier'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.5, pattern: ['jet-magma', 'jet-magma', 'explosion'] }, // TODO-BALANCE
  ],
};

// Biome 4 — La Fibration (sa victoire = victoire de run, R6-03).
export const BOSS_BIOME_4: BossDef = {
  id: 'noeud-final',
  name: 'Le Nœud Final',
  hp: 405, // TODO-BALANCE
  weaknesses: ['feu', 'air'], // TODO-BALANCE
  resistances: ['terre'], // TODO-BALANCE
  attacks: [
    { id: 'lame-fibre', name: 'Lame de fibre', damage: 8 }, // TODO-BALANCE
    { id: 'siphon', name: 'Siphon de données', damage: 6 }, // TODO-BALANCE
    { id: 'surcharge-reseau', name: 'Surcharge du réseau', damage: 7 }, // TODO-BALANCE
  ],
  phases: [
    { atHpRatioBelow: 1.01, pattern: ['lame-fibre', 'siphon', 'siphon'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.66, pattern: ['surcharge-reseau', 'lame-fibre', 'siphon'] }, // TODO-BALANCE
    { atHpRatioBelow: 0.33, pattern: ['lame-fibre', 'surcharge-reseau', 'surcharge-reseau'] }, // TODO-BALANCE
  ],
};

BOSS_BY_ID[BOSS_BIOME_2.id] = BOSS_BIOME_2;
BOSS_BY_ID[BOSS_BIOME_3.id] = BOSS_BIOME_3;
BOSS_BY_ID[BOSS_BIOME_4.id] = BOSS_BIOME_4;
