import type { MonsterFamily } from '../core/types';

export type SupportKind = 'soin' | 'zone' | 'affaiblissement' | 'capture';

export interface CompanionSkill {
  id: string;
  name: string;
  maxLevel: number;
  healPerLevel: number; // TODO-BALANCE
  requires?: string; // compétence prérequise (niveau 1)
}

export interface CompanionDef {
  id: string;
  name: string;
  monsterId: string;
  family: MonsterFamily;
  support: SupportKind;
  skills: CompanionSkill[];
}

// 1 compagnon générique de type monstre, support soins, arbre de 5 compétences (§SPEC-7.2, V1).
// TODO-BALANCE: soins par niveau de dev.
export const COMPANIONS: CompanionDef[] = [
  {
    id: 'mousse-recrue',
    name: 'Mousse recrue',
    monsterId: 'mousse',
    family: 'spore',
    support: 'soin',
    skills: [
      { id: 'soin-simple', name: 'Soin simple', maxLevel: 3, healPerLevel: 2 }, // TODO-BALANCE
      { id: 'bouclier-ally', name: 'Barrière', maxLevel: 2, healPerLevel: 0 }, // TODO-BALANCE (bouclier, it. 3+)
      { id: 'antidote', name: 'Antidote', maxLevel: 1, healPerLevel: 0 }, // TODO-BALANCE
      { id: 'soin-rapide', name: 'Soin rapide', maxLevel: 2, healPerLevel: 1, requires: 'soin-simple' }, // TODO-BALANCE
      { id: 'soin-majeur', name: 'Soin majeur', maxLevel: 5, healPerLevel: 4, requires: 'soin-rapide' }, // TODO-BALANCE
    ],
  },
];

export const COMPANION_BY_MONSTER: Record<string, CompanionDef> = Object.fromEntries(
  COMPANIONS.map((c) => [c.monsterId, c]),
);

// Coûts en orbes pour monter une compétence du niveau n au niveau n+1 (§SPEC-7.2).
// TODO-BALANCE: ~3 puis 5 puis 10.
export const SKILL_UPGRADE_ORB_COSTS: Record<number, number> = {
  1: 3, // TODO-BALANCE
  2: 5, // TODO-BALANCE
  3: 10, // TODO-BALANCE
  4: 10, // TODO-BALANCE
};

export const SKILL_MAX_LEVEL = 5; // TODO-BALANCE
