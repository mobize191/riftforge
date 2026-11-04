import type { Purse } from '../core/forge/forge';

export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  type: 'survive' | 'kill-in';
  turns: number;
  reward: Purse;
}

// Défis à tours limités (§SPEC-4.3) : 1 par niveau au choix (autel). TODO-BALANCE.
export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'autel-garde',
    name: 'Autel de garde',
    description: 'Survivez 15 tours à la garde.',
    type: 'survive',
    turns: 15, // TODO-BALANCE
    reward: { credits: 20, essence: 3 }, // TODO-BALANCE — ressource rare
  },
];

export const CHALLENGE_BY_ID: Record<string, ChallengeDef> = Object.fromEntries(
  CHALLENGES.map((c) => [c.id, c]),
);
