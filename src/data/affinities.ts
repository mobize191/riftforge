import type { ElementId, MonsterDef } from '../core/types';

// Multiplicateurs d'affinité. TODO-BALANCE: valeurs de dev.
export const AFFINITY = {
  weakness: 1.5, // TODO-BALANCE — cible faible contre l'élément
  resistance: 0.5, // TODO-BALANCE — cible résistante
  neutral: 1, // TODO-BALANCE
} as const;

// Cycle simple à mémoriser + opposition Feu <-> Eau (§SPEC-5.3).
// Exceptions cyber (V2, en commentaire pour ne pas les coder) :
//   virus > machines, acide > blindés — à introduire avec les éléments V2 (Acide, Virus...).
export function affinityMultiplier(attackElement: ElementId, target: MonsterDef): number {
  if (target.weaknesses.includes(attackElement)) return AFFINITY.weakness;
  if (target.resistances.includes(attackElement)) return AFFINITY.resistance;
  return AFFINITY.neutral;
}
