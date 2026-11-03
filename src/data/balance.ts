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
} as const;
