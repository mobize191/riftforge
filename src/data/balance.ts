// Valeurs d'équilibrage de dev — à calibrer en simulation (voir tickets R1-07, R4-08, R5-07).
// TODO-BALANCE: aucune de ces valeurs n'est un arbitrage final.

export const BALANCE = {
  START_PLAYER_HP: 20, // TODO-BALANCE
  START_PLAYER_LEVEL: 1, // TODO-BALANCE
  START_FLOOR: 1, // TODO-BALANCE
  PLAYER_ATTACK: 4, // TODO-BALANCE
  // Progression de run : seuils d'XP pour atteindre chaque niveau, gains par niveau.
  LEVEL_XP_THRESHOLDS: [0, 2, 5, 9, 14], // TODO-BALANCE (XP cumulée pour passer au niveau n+1)
  HP_PER_LEVEL: 4, // TODO-BALANCE
  ATK_PER_LEVEL: 1, // TODO-BALANCE
  CHEST_CREDITS_MIN: 4, // TODO-BALANCE
  CHEST_CREDITS_SPREAD: 8, // TODO-BALANCE
  // Entretien léger de la Forge, prélevé au retour de run (§SPEC-6.4). TODO-BALANCE.
  MAINTENANCE_PER_100_TICKS: 1, // TODO-BALANCE (crédits)
  // Cibles de simulation « première run gagnable » (§SPEC-2, §R4-08). TODO-BALANCE.
  FIRST_RUN_WIN_TARGET_MIN: 0.001, // TODO-BALANCE — 1/1000 au minimum
  FIRST_RUN_WIN_TARGET_MAX: 0.002, // TODO-BALANCE — 1/500 au maximum
} as const;
