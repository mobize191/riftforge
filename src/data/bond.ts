// --- P6-C : paliers de lien 1-5 (§SPEC-7.3) et conditions d'évolution par type (§SPEC-7.4) ---
// Données uniquement, aucune logique (itération 8 non codée pendant la nuit).

export type BondTierId = 'etincelle' | 'flamme' | 'brasier' | 'fournaise' | 'fusion';

export interface BondTier {
  tier: number;
  id: BondTierId;
  name: string;
  effect: string;
  visualMarker: string; // marqueur visuel sur le sprite (V1 : teinte/insigne/aura)
}

export const BOND_TIERS: BondTier[] = [
  { tier: 1, id: 'etincelle', name: 'Étincelle', effect: 'Recruté·e ; jouable, dialogues de base', visualMarker: 'aucun' },
  { tier: 2, id: 'flamme', name: 'Flamme', effect: '+stats, ligne de dialogue, 1er bonus passif d’équipe', visualMarker: 'teinte chaude' }, // TODO-BALANCE stats
  { tier: 3, id: 'brasier', name: 'Brasier', effect: 'Nouvelle branche de support, quête de lien', visualMarker: 'insigne' },
  { tier: 4, id: 'fournaise', name: 'Fournaise', effect: 'Évolution (apparence nette), bonus passif majeur, cadeaux x2', visualMarker: 'aura + nouvelle apparence' },
  { tier: 5, id: 'fusion', name: 'Fusion', effect: 'Capacité signature, symbiose (romance post-V1 pour les humanoïdes)', visualMarker: 'aura signature' },
];

export type CompanionType = 'monstre' | 'robot' | 'humanoide' | 'fee';

// Conditions d'évolution au palier 4, propres au type (§SPEC-7.4). TODO-BALANCE.
export const EVOLUTION_CONDITIONS: Record<CompanionType, string[]> = {
  monstre: [
    'Vaincre X monstres de la même race',
    'Offrir un équipement précis',
    'Accomplir une tâche',
    'Fusionner avec un autre monstre (façon DQ Monsters)',
    'Accouplement dirigé (post-V1)',
  ],
  robot: [
    'Installer un module rare',
    'Réparation spéciale',
    'Récupérer des données en Faille',
    'Atelier de niveau suffisant',
  ],
  humanoide: [
    'Quête personnelle',
    'Dialogues récurrents',
    'Cadeaux préférés',
    'Romance (post-V1)',
  ],
  fee: [
    'Rituel de fusion d’essences',
    'Lieu spécial en Faille',
  ],
};

// --- R8 : mécanique de lien (V1) — toutes les valeurs TODO-BALANCE ---

// Sources d'XP de lien (R8-01) et seuils des paliers 1-5 (R8-02).
export const BOND_XP = {
  perSharedVictory: 5, // TODO-BALANCE — victoire avec le compagnon vivant en équipe
  perGift: 8, // TODO-BALANCE — cadeau offert (coût en data)
  perForgeMoment: 4, // TODO-BALANCE — moment à la Forge (repos) avec le compagnon en équipe
  giftCost: { essence: 2 }, // TODO-BALANCE — coût d'un cadeau
  tierXpThresholds: [0, 10, 25, 50, 90], // TODO-BALANCE — XP cumulé pour atteindre le palier n
} as const;

// Effets mécaniques par palier (R8-02) : bonus de PV du joueur en run si le compagnon
// d'équipe est à ce palier ; palier 4 = évolution, palier 5 = capacité signature (skills +1).
export const BOND_TIER_EFFECTS: { tier: number; playerHpBonus: number }[] = [
  { tier: 1, playerHpBonus: 0 }, // TODO-BALANCE
  { tier: 2, playerHpBonus: 4 }, // TODO-BALANCE — 1er bonus passif d'équipe
  { tier: 3, playerHpBonus: 8 }, // TODO-BALANCE — nouvelle branche
  { tier: 4, playerHpBonus: 12 }, // TODO-BALANCE — évolution + bonus majeur
  { tier: 5, playerHpBonus: 16 }, // TODO-BALANCE — capacité signature
];

// Évolution au palier 4 (R8-03) : condition concrète V1 pour le type monstre =
// vaincre X monstres de la même race (comptés persistants à la Forge). TODO-BALANCE.
export const EVOLUTION_KILLS_SAME_RACE = 3; // TODO-BALANCE
