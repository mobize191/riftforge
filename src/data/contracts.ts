import type { Purse } from '../core/forge/forge';

export type ContractCondition =
  | { type: 'boss-killed-no-companion' }
  | { type: 'boss-killed'; bossId: string } // R6-08 — vaincre un boss précis (tout biome)
  | { type: 'reach-floor'; floor: number }
  | { type: 'reach-biome'; biomeId: string } // R6-08 — atteindre un biome dans la run
  | { type: 'no-burn-crossing' } // R6-08 — traverser les Hauts-Fourneaux sans case brûlante
  | { type: 'harvest-resource'; resource: 'spores' | 'donnees' | 'mercurium' | 'optifibre'; min: number };

export interface ContractDef {
  id: string;
  name: string;
  description: string;
  condition: ContractCondition;
  reward: Purse;
}

// 2-3 contrats à conditions du Marchand (§SPEC-6.5). TODO-BALANCE: primes de dev.
export const CONTRACTS: ContractDef[] = [
  {
    id: 'boss-solo',
    name: 'Boss en solo',
    description: 'Vaincre le boss des Failles Vertes sans compagnon en équipe.',
    condition: { type: 'boss-killed-no-companion' },
    reward: { credits: 30, spores: 3 }, // TODO-BALANCE
  },
  {
    id: 'profondeur-3',
    name: 'Jusqu’au 3e niveau',
    description: 'Atteindre le 3e niveau du biome en une seule descente.',
    condition: { type: 'reach-floor', floor: 3 }, // TODO-BALANCE
    reward: { credits: 15 }, // TODO-BALANCE
  },
  {
    id: 'moissonneur',
    name: 'Moissonneur de spores',
    description: 'Récolter au moins 5 spores en une descente.',
    condition: { type: 'harvest-resource', resource: 'spores', min: 5 }, // TODO-BALANCE
    reward: { credits: 10, essence: 4 }, // TODO-BALANCE
  },
  // --- R6-08 : contrats multi-biomes (6-8 au total), conditions vérifiables depuis le journal ---
  {
    id: 'boss-index',
    name: 'Index détruit',
    description: 'Vaincre le Grand Index (boss des Datacathédrales).',
    condition: { type: 'boss-killed', bossId: 'grand-index' }, // TODO-BALANCE
    reward: { credits: 40, donnees: 3 }, // TODO-BALANCE
  },
  {
    id: 'fournaise-propre',
    name: 'Fournaise sans brûlure',
    description: 'Atteindre le Cœur de Fournaise sans avoir marché sur une case brûlante.',
    condition: { type: 'no-burn-crossing' }, // TODO-BALANCE
    reward: { credits: 35, mercurium: 3 }, // TODO-BALANCE
  },
  {
    id: 'archiviste',
    name: 'Archiviste des données',
    description: 'Récolter au moins 5 données dans les Datacathédrales.',
    condition: { type: 'harvest-resource', resource: 'donnees', min: 5 }, // TODO-BALANCE
    reward: { credits: 25 }, // TODO-BALANCE
  },
  {
    id: 'boss-noeud-final',
    name: 'Nœud Final abattu',
    description: 'Vaincre le Nœud Final et terminer la run.',
    condition: { type: 'boss-killed', bossId: 'noeud-final' }, // TODO-BALANCE
    reward: { credits: 100, optifibre: 5 }, // TODO-BALANCE
  },
  {
    id: 'forgeron-froid',
    name: 'Forgeron du mercurium',
    description: 'Récolter au moins 5 mercurium dans les Hauts-Fourneaux.',
    condition: { type: 'harvest-resource', resource: 'mercurium', min: 5 }, // TODO-BALANCE
    reward: { credits: 30, lingots: 2 }, // TODO-BALANCE
  },
];
