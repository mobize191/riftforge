// Table de capture (§SPEC-5.4). TODO-BALANCE: valeurs de dev.
export const CAPTURE = {
  baseChance: 0.3, // TODO-BALANCE — probabilité de base
  missingHpWeight: 0.6, // TODO-BALANCE — pondération des PV manquants (monstre affaibli = mieux)
  weaknessBonus: 0.2, // TODO-BALANCE — bonus si la cible est dans les faiblesses du lanceur
  bonusPerPower: 0.15, // TODO-BALANCE — R11-02 : bonus de capture par point de power d'une compétence capture-bonus
} as const;
