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
