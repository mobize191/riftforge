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
  // Scaling des modules avec l'attaque du joueur (R9) : dégâts module = power + ATQ x ce
  // facteur, pour que les modules restent utiles quand l'attaque de base one-shote.
  MODULE_ATK_SCALING: 0.2, // ajusté R9-01 // TODO-BALANCE

  // R10-02 (décision D1) : énergie de combat — régénérée à chaque nouveau round,
  // conservée au sein d'un même combat, remise au niveau de départ à chaque combat.
  // Identité conservée : les orbes restent sacrifiées à la CRÉATION ; le compagnon
  // n'est pas soumis à l'énergie (ses compétences sont déjà payées en orbes).
  COMBAT_ENERGY_START: 16, // TODO-BALANCE (égal au plafond au premier round)
  COMBAT_ENERGY_MAX: 16, // plafond intra-combat
  COMBAT_ENERGY_REGEN: 4, // régénéré à chaque nouveau round
  ENERGY_COST_ATTACK: 1, // attaque de base
  // Coût de lancement d'un module par palier. Invariant D1 : aucun tier >= 2 ne
  // peut être lancé chaque tour (cost > regen, testé sur toute la table).
  ENERGY_COST_MODULE_TIER: { 1: 2, 2: 5, 3: 8 } as Record<number, number>, // TODO-BALANCE
} as const;
