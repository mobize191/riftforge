import type { GameState } from '../types';
import { CONTRACTS, type ContractDef } from '../../data/contracts';

export interface RunJournal {
  events: string[];
  lootSpores: number;
  lootBiome?: Record<string, number>; // R6-08 — ressources de biomes 2-4 récoltées
}

// Vérification automatique d'un contrat depuis le journal de la run.
export function checkContract(journal: RunJournal, contract: ContractDef): boolean {
  switch (contract.condition.type) {
    case 'boss-killed-no-companion':
      return journal.events.includes('boss-killed') && journal.events.includes('no-companion');
    case 'boss-killed':
      return journal.events.includes(`boss:${contract.condition.bossId}`);
    case 'reach-floor':
      return journal.events.includes(`floor-${contract.condition.floor}`);
    case 'reach-biome':
      return journal.events.includes(`biome-${contract.condition.biomeId}`);
    case 'no-burn-crossing':
      // traverser les Hauts-Fourneaux (boss atteint) sans aucune brûlure journalisée
      return journal.events.includes('boss:coeur-fournaise') && !journal.events.includes('brulure');
    case 'harvest-resource': {
      const got = contract.condition.resource === 'spores' ? journal.lootSpores : (journal.lootBiome?.[contract.condition.resource] ?? 0);
      return got >= contract.condition.min;
    }
    default:
      return false;
  }
}

// Au retour à la Forge : primes versées pour les contrats remplis et non encore réclamés.
export function settleContracts(state: GameState, journal: RunJournal): GameState {
  let next = state;
  const claimed = new Set(state.forge.claimedContracts);
  for (const contract of CONTRACTS) {
    if (claimed.has(contract.id)) continue;
    if (!checkContract(journal, contract)) continue;
    // prime = ajout de ressources (jamais de débit) — R6-08 : toutes les ressources possibles
    const f = next.forge;
    const r = contract.reward;
    next = {
      ...next,
      forge: {
        ...f,
        credits: f.credits + (r.credits ?? 0),
        essence: f.essence + (r.essence ?? 0),
        mineraiBrut: f.mineraiBrut + (r.mineraiBrut ?? 0),
        lingots: f.lingots + (r.lingots ?? 0),
        spores: f.spores + (r.spores ?? 0),
        donnees: f.donnees + (r.donnees ?? 0),
        mercurium: f.mercurium + (r.mercurium ?? 0),
        optifibre: f.optifibre + (r.optifibre ?? 0),
        claimedContracts: [...f.claimedContracts, contract.id],
      },
    };
  }
  return next;
}

export { CONTRACTS };
