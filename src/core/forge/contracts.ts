import type { GameState } from '../types';
import { CONTRACTS, type ContractDef } from '../../data/contracts';

export interface RunJournal {
  events: string[];
  lootSpores: number;
}

// Vérification automatique d'un contrat depuis le journal de la run.
export function checkContract(journal: RunJournal, contract: ContractDef): boolean {
  switch (contract.condition.type) {
    case 'boss-killed-no-companion':
      return journal.events.includes('boss-killed') && journal.events.includes('no-companion');
    case 'reach-floor':
      return journal.events.includes(`floor-${contract.condition.floor}`);
    case 'harvest-resource':
      return contract.condition.resource === 'spores' && journal.lootSpores >= contract.condition.min;
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
    // prime = ajout de ressources (jamais de débit)
    const f = next.forge;
    next = {
      ...next,
      forge: {
        ...f,
        credits: f.credits + (contract.reward.credits ?? 0),
        essence: f.essence + (contract.reward.essence ?? 0),
        mineraiBrut: f.mineraiBrut + (contract.reward.mineraiBrut ?? 0),
        lingots: f.lingots + (contract.reward.lingots ?? 0),
        spores: f.spores + (contract.reward.spores ?? 0),
        claimedContracts: [...f.claimedContracts, contract.id],
      },
    };
  }
  return next;
}

export { CONTRACTS };
