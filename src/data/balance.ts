// Valeurs d'équilibrage de dev — à calibrer en simulation (voir tickets R1-07, R4-08, R5-07).
// TODO-BALANCE: aucune de ces valeurs n'est un arbitrage final.

export const BALANCE = {
  START_PLAYER_HP: 21, // TODO-BALANCE (R11-05 : réajusté pour tenir <= 50 % de morts au biome 1)
  START_PLAYER_LEVEL: 1, // TODO-BALANCE
  START_FLOOR: 1, // TODO-BALANCE
  PLAYER_ATTACK: 2, // TODO-BALANCE (R11-04/E4 : ratios relevés -> ATQ de base ajustée pour tenir la bande §SPEC-2)
  // Progression de run : seuils d'XP pour atteindre chaque niveau, gains par niveau.
  // R11-03 (E3) : niveau max 12, courbe croissante étalée sur les 4 biomes (~3 niveaux/biome).
  LEVEL_XP_THRESHOLDS: [0, 6, 14, 26, 42, 62, 86, 114, 146, 182, 222, 266], // TODO-BALANCE (12 entrées -> niveau max 12 ; XP cumulée pour passer au niveau n+1)
  HP_PER_LEVEL: 6, // TODO-BALANCE (E3 : gains relevés, x1.5)
  ATK_PER_LEVEL: 2, // TODO-BALANCE (E3 : x2)
  // R11-03 (E3) : XP gagnée croissante en profondeur (par ennemi tué, et bonus boss par biome).
  XP_PER_KILL_BY_BIOME: [2, 3, 4, 5], // TODO-BALANCE (index = biome 1..4)
  XP_BOSS_BONUS_BY_BIOME: [6, 12, 20, 32], // TODO-BALANCE
  CHEST_CREDITS_MIN: 4, // TODO-BALANCE
  CHEST_CREDITS_SPREAD: 8, // TODO-BALANCE
  // Entretien léger de la Forge, prélevé au retour de run (§SPEC-6.4). TODO-BALANCE.
  MAINTENANCE_PER_100_TICKS: 1, // TODO-BALANCE (crédits)
  // Cibles de simulation « première run gagnable » (§SPEC-2, §R4-08). TODO-BALANCE.
  FIRST_RUN_WIN_TARGET_MIN: 0.001, // TODO-BALANCE — 1/1000 au minimum
  FIRST_RUN_WIN_TARGET_MAX: 0.002, // TODO-BALANCE — 1/500 au maximum
  // R10-03 (décision D2) : les modules scalent avec l'attaque du joueur, ratio PAR
  // PALIER (base + ATQ x ratio[tier]) — un module haut palier profite plus de l'ATQ.
  MODULE_ATK_SCALING_BY_TIER: { 1: 0.6, 2: 1.0, 3: 1.5 } as Record<number, number>, // TODO-BALANCE (R11-04/E4 : ratios relevés ~0,6/1,0/1,5 — le lien ATK↔dégâts doit se voir)

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
  // Butin de combat en crédits/essence/minerai (R10-05 D4 : ralenti, en data).
  COMBAT_LOOT_CREDITS_MIN: 2, // TODO-BALANCE
  COMBAT_LOOT_CREDITS_SPREAD: 4, // TODO-BALANCE
  COMBAT_LOOT_ESSENCE_MIN: 1, // TODO-BALANCE
  COMBAT_LOOT_ESSENCE_SPREAD: 1, // TODO-BALANCE
  COMBAT_LOOT_MINERAI_MIN: 1, // TODO-BALANCE
  COMBAT_LOOT_MINERAI_SPREAD: 2, // TODO-BALANCE
  ENERGY_COST_MODULE_TIER: { 1: 2, 2: 5, 3: 8 } as Record<number, number>, // TODO-BALANCE
} as const;
