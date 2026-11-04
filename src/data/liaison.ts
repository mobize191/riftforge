// R8-04 — La Liaiseuse, PNJ permanent de la Forge : quêtes de lien à dialogues minimaux
// (2-3 lignes FR par événement, aucune histoire — Q6-2 tranchée). TODO-BALANCE.

export type LiaisonQuestCondition = 'tier2-any' | 'boss-killed-any' | 'rest-home';

export interface LiaisonQuest {
  id: string;
  name: string;
  lines: string[]; // 2-3 lignes FR
  condition: LiaisonQuestCondition;
  bondXpReward: number; // TODO-BALANCE — XP de lien versé au compagnon d'équipe
}

export const LIAISON_QUESTS: LiaisonQuest[] = [
  {
    id: 'quest-accueil',
    name: 'Un premier lien',
    lines: [
      'Bienvenue à la Forge, voyageur·euse.',
      'Un compagnon qui vous accompagne gagne ma confiance à chaque victoire partagée.',
      'Revenez me voir quand votre lien aura grandi.',
    ],
    condition: 'tier2-any',
    bondXpReward: 10, // TODO-BALANCE
  },
  {
    id: 'quest-boss',
    name: 'La gloire du boss',
    lines: [
      'Vous avez vaincu un boss de la Faille.',
      'La Liaiseuse admire cela : votre compagnon s’en trouve renforcé.',
      'Continuez ainsi.',
    ],
    condition: 'boss-killed-any',
    bondXpReward: 15, // TODO-BALANCE
  },
  {
    id: 'quest-repos',
    name: 'Un moment de calme',
    lines: [
      'Vous vous êtes reposé·e à la Maison.',
      'Ces moments de calme resserrent les liens.',
      'Prenez soin de vous, et de votre compagnon.',
    ],
    condition: 'rest-home',
    bondXpReward: 6, // TODO-BALANCE
  },
];

export const LIAISON_BY_ID: Record<string, LiaisonQuest> = Object.fromEntries(
  LIAISON_QUESTS.map((q) => [q.id, q]),
);
