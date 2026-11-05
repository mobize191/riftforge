import type { ElementId, MonsterFamily } from '../core/types';

// R11-02 (E2) — arbres de compagnons selon docs/COMPANIONS-R11.md (design autoritatif).
// Une compétence par palier de lien 1→5 (palier 5 = signature ⬔) ; `unlockTier`
// remplace l'ancien champ `requires`.

export type SupportKind = 'soin' | 'zone' | 'affaiblissement' | 'capture';

// Kinds de compétences : les existants (heal, shield, damage, aoe, dot) + purify
// + les nouveaux R11-02 (stun, drain, debuff-atk, buff-energy, capture-bonus).
export type CompanionSkillKind =
  | 'heal'
  | 'shield'
  | 'damage'
  | 'aoe'
  | 'dot'
  | 'purify'
  | 'stun'
  | 'drain'
  | 'debuff-atk'
  | 'buff-energy'
  | 'capture-bonus';

export interface CompanionSkill {
  id: string;
  name: string;
  kind: CompanionSkillKind;
  element?: ElementId; // compétences offensives : affinité appliquée comme pour les modules
  powerPerLevel: number; // TODO-BALANCE
  maxLevel: number;
  unlockTier: number; // 1-5 — la compétence N se débloque au palier de lien N
}

export interface CompanionDef {
  id: string;
  name: string;
  monsterId: string;
  family: MonsterFamily;
  support: SupportKind;
  skills: CompanionSkill[]; // exactement 5, une par palier 1→5
}

// Les 16 arbres (docs/COMPANIONS-R11.md §3) — 4 monstres capturables par famille.
// Toutes les valeurs chiffrées sont TODO-BALANCE.
export const COMPANIONS: CompanionDef[] = [
  // --- Famille spore (biome 1) — support soin ---
  {
    id: 'mousse-recrue',
    name: 'Mousse sporulée',
    monsterId: 'mousse',
    family: 'spore',
    support: 'soin',
    skills: [
      { id: 'soin-simple', name: 'Soin simple', kind: 'heal', powerPerLevel: 2, maxLevel: 3, unlockTier: 1 }, // TODO-BALANCE
      { id: 'antidote', name: 'Antidote', kind: 'purify', powerPerLevel: 1, maxLevel: 1, unlockTier: 2 }, // TODO-BALANCE
      { id: 'bouclier-ally', name: 'Barrière', kind: 'shield', powerPerLevel: 3, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'soin-rapide', name: 'Soin rapide', kind: 'heal', powerPerLevel: 3, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'soin-majeur', name: 'Soin majeur ⬔', kind: 'heal', powerPerLevel: 8, maxLevel: 5, unlockTier: 5 }, // TODO-BALANCE (signature)
    ],
  },
  {
    id: 'sporeling',
    name: 'Sporeling',
    monsterId: 'sporeling',
    family: 'spore',
    support: 'soin',
    skills: [
      { id: 'etreinte-spores', name: 'Étreinte de spores', kind: 'heal', powerPerLevel: 2, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE (régénération)
      { id: 'baume-vegetal', name: 'Baume végétal', kind: 'shield', powerPerLevel: 2, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (soin + bouclier léger)
      { id: 'nuage-apaisant', name: 'Nuage apaisant', kind: 'purify', powerPerLevel: 1, maxLevel: 1, unlockTier: 3 }, // TODO-BALANCE
      { id: 'pousse-vitale', name: 'Pousse vitale', kind: 'heal', powerPerLevel: 3, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'jardin-reconstitue', name: 'Jardin reconstitué ⬔', kind: 'heal', powerPerLevel: 6, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (soin + bouclier, duo)
    ],
  },
  {
    id: 'cuirasse',
    name: 'Champignon cuirassé',
    monsterId: 'cuirasse',
    family: 'spore',
    support: 'soin',
    skills: [
      { id: 'carapace', name: 'Carapace', kind: 'shield', powerPerLevel: 4, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'provocation', name: 'Provocation', kind: 'shield', powerPerLevel: 3, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (tank)
      { id: 'epine-defensive', name: 'Épine défensive', kind: 'damage', element: 'terre', powerPerLevel: 3, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (riposte)
      { id: 'mur-sporifere', name: 'Mur sporifère', kind: 'shield', powerPerLevel: 6, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'bastion', name: 'Bastion ⬔', kind: 'shield', powerPerLevel: 10, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (gros bouclier duo + provocation)
    ],
  },
  {
    id: 'amas',
    name: 'Amas de spores',
    monsterId: 'amas',
    family: 'spore',
    support: 'soin',
    skills: [
      { id: 'sporulation', name: 'Sporulation', kind: 'dot', element: 'terre', powerPerLevel: 2, maxLevel: 3, unlockTier: 1 }, // TODO-BALANCE (poison)
      { id: 'trait-spores', name: 'Trait de spores', kind: 'damage', element: 'terre', powerPerLevel: 3, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'contagion', name: 'Contagion', kind: 'aoe', element: 'terre', powerPerLevel: 2, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (propagation)
      { id: 'souche-robuste', name: 'Souche robuste', kind: 'shield', powerPerLevel: 4, maxLevel: 1, unlockTier: 4 }, // TODO-BALANCE (PV max compagnon)
      { id: 'eclosion', name: 'Éclosion ⬔', kind: 'aoe', element: 'terre', powerPerLevel: 6, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (burst poison, tous)
    ],
  },
  // --- Famille gremlin (biome 2) — support affaiblissement ---
  {
    id: 'fouineur',
    name: 'Fouineur de données',
    monsterId: 'fouineur',
    family: 'gremlin',
    support: 'affaiblissement',
    skills: [
      { id: 'sondage', name: 'Sondage', kind: 'damage', element: 'air', powerPerLevel: 2, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE (+ révèle faiblesses)
      { id: 'extraction', name: 'Extraction', kind: 'debuff-atk', powerPerLevel: 2, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (vole ATQ)
      { id: 'corruption-legere', name: 'Corruption légère', kind: 'damage', element: 'air', powerPerLevel: 3, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (baisse défense)
      { id: 'vidage-memoire', name: 'Vidage mémoire', kind: 'debuff-atk', powerPerLevel: 4, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'root-kit', name: 'Root kit ⬔', kind: 'aoe', element: 'air', powerPerLevel: 5, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (vole ATQ/PV à tous)
    ],
  },
  {
    id: 'sapeur',
    name: 'Sapeur de circuits',
    monsterId: 'sapeur',
    family: 'gremlin',
    support: 'affaiblissement',
    skills: [
      { id: 'cable-coupe', name: 'Câble coupé', kind: 'stun', powerPerLevel: 1, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE (dégâts air + étourdit 1 tour)
      { id: 'court-circuit', name: 'Court-circuit', kind: 'debuff-atk', element: 'air', powerPerLevel: 2, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'mine-sapeur', name: 'Mine de sapeur', kind: 'damage', element: 'terre', powerPerLevel: 4, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'sabotage-lourd', name: 'Sabotage lourd', kind: 'debuff-atk', powerPerLevel: 3, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (tous)
      { id: 'panne-generale', name: 'Panne générale ⬔', kind: 'stun', powerPerLevel: 2, maxLevel: 2, unlockTier: 5 }, // TODO-BALANCE (stun général, power 2 = tous)
    ],
  },
  {
    id: 'arroseur',
    name: 'Arroseur de bugs',
    monsterId: 'arroseur',
    family: 'gremlin',
    support: 'affaiblissement',
    skills: [
      { id: 'jet-eau', name: "Jet d'eau", kind: 'damage', element: 'eau', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'refroidissement', name: 'Refroidissement', kind: 'purify', powerPerLevel: 1, maxLevel: 1, unlockTier: 2 }, // TODO-BALANCE (purge brûlure + soigne compagnon)
      { id: 'bouclier-liquide', name: 'Bouclier liquide', kind: 'shield', powerPerLevel: 4, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (eau)
      { id: 'deluge', name: 'Déluge', kind: 'aoe', element: 'eau', powerPerLevel: 4, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'crue-purificatrice', name: 'Crue purificatrice ⬔', kind: 'aoe', element: 'eau', powerPerLevel: 7, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (zone + purge malus)
    ],
  },
  {
    id: 'horloge-cassee',
    name: 'Horloge cassée',
    monsterId: 'horloge-cassee',
    family: 'gremlin',
    support: 'affaiblissement',
    skills: [
      { id: 'tic', name: 'Tic', kind: 'damage', element: 'air', powerPerLevel: 1, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE (dégât garanti)
      { id: 'sursis', name: 'Sursis', kind: 'buff-energy', powerPerLevel: 3, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'hate', name: 'Hâte', kind: 'buff-energy', powerPerLevel: 4, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (double action)
      { id: 'remontee', name: 'Remontée', kind: 'buff-energy', powerPerLevel: 5, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (+régén 3 tours)
      { id: 'boucle-temporelle', name: 'Boucle temporelle ⬔', kind: 'buff-energy', powerPerLevel: 10, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (tour rejoué)
    ],
  },
  // --- Famille élémentaire (biome 3) — support zone ---
  {
    id: 'brasero',
    name: 'Brasero vivant',
    monsterId: 'brasero',
    family: 'elementaire',
    support: 'zone',
    skills: [
      { id: 'trait-braise', name: 'Trait de braise', kind: 'damage', element: 'feu', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'enflammer', name: 'Enflammer', kind: 'dot', element: 'feu', powerPerLevel: 2, maxLevel: 3, unlockTier: 2 }, // TODO-BALANCE (brûlure)
      { id: 'fournaise', name: 'Fournaise', kind: 'aoe', element: 'feu', powerPerLevel: 4, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'aura-ardente', name: 'Aura ardente', kind: 'dot', element: 'feu', powerPerLevel: 3, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (attaques du héros enflammantes)
      { id: 'surchauffe', name: 'Surchauffe ⬔', kind: 'aoe', element: 'feu', powerPerLevel: 8, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (grosse zone + brûlure tous)
    ],
  },
  {
    id: 'geyser',
    name: 'Geyser',
    monsterId: 'geyser',
    family: 'elementaire',
    support: 'zone',
    skills: [
      { id: 'jet-pression-comp', name: 'Jet sous pression', kind: 'damage', element: 'eau', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'giclage', name: 'Giclage', kind: 'damage', element: 'eau', powerPerLevel: 4, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (+ mouille)
      { id: 'eruption', name: 'Éruption', kind: 'aoe', element: 'eau', powerPerLevel: 5, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'brume-epaisse', name: 'Brume épaisse', kind: 'debuff-atk', element: 'air', powerPerLevel: 2, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (ATQ ennemis, tous)
      { id: 'eruption-phreatique', name: 'Éruption phréatique ⬔', kind: 'aoe', element: 'eau', powerPerLevel: 8, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (zone + repousse)
    ],
  },
  {
    id: 'cendre',
    name: 'Spectre de cendre',
    monsterId: 'cendre',
    family: 'elementaire',
    support: 'zone',
    skills: [
      { id: 'voile-cendre', name: 'Voile de cendre', kind: 'damage', element: 'terre', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'suffocation', name: 'Suffocation', kind: 'dot', element: 'air', powerPerLevel: 3, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'ensevelissement', name: 'Ensevelissement', kind: 'stun', powerPerLevel: 1, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'nuee-cendres', name: 'Nuée de cendres', kind: 'aoe', element: 'air', powerPerLevel: 4, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (DoT zone)
      { id: 'tombe-ardente', name: 'Tombe ardente ⬔', kind: 'damage', element: 'terre', powerPerLevel: 12, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (exécution < 30 % PV)
    ],
  },
  {
    id: 'magmaton',
    name: 'Magmaton',
    monsterId: 'magmaton',
    family: 'elementaire',
    support: 'zone',
    skills: [
      { id: 'poing-magma', name: 'Poing de magma', kind: 'damage', element: 'feu', powerPerLevel: 6, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'carapace-lave', name: 'Carapace de lave', kind: 'shield', powerPerLevel: 5, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (brûlure en riposte)
      { id: 'eruption-localisee', name: 'Éruption localisée', kind: 'dot', element: 'feu', powerPerLevel: 4, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (dégâts différés)
      { id: 'fissure', name: 'Fissure', kind: 'damage', element: 'feu', powerPerLevel: 8, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (ignore résistances)
      { id: 'colere-noyau', name: 'Colère du noyau ⬔', kind: 'aoe', element: 'feu', powerPerLevel: 10, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (énorme burst + éclats)
    ],
  },
  // --- Famille vermine (biome 4) — support capture ---
  {
    id: 'wyrm',
    name: 'Wyrm de fibre',
    monsterId: 'wyrm',
    family: 'vermine',
    support: 'capture',
    skills: [
      { id: 'morsure-fibreuse', name: 'Morsure fibreuse', kind: 'damage', element: 'terre', powerPerLevel: 4, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'enchevetrement', name: 'Enchevêtrement', kind: 'stun', powerPerLevel: 1, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (ne cible plus le héros)
      { id: 'broiement', name: 'Broiement', kind: 'damage', element: 'terre', powerPerLevel: 6, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (détruit bouclier)
      { id: 'tunnels', name: 'Tunnels', kind: 'shield', powerPerLevel: 5, maxLevel: 1, unlockTier: 4 }, // TODO-BALANCE (esquive)
      { id: 'devoration', name: 'Dévoration ⬔', kind: 'drain', element: 'terre', powerPerLevel: 8, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (vole PV pour le héros)
    ],
  },
  {
    id: 'vampire-reseau',
    name: 'Vampire du réseau',
    monsterId: 'vampire-reseau',
    family: 'vermine',
    support: 'capture',
    skills: [
      { id: 'gorgee', name: 'Gorgée', kind: 'drain', element: 'air', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE (vole PV compagnon)
      { id: 'sang-sucre', name: 'Sang sucré', kind: 'heal', powerPerLevel: 3, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE (soigne le héros)
      { id: 'drain-massif', name: 'Drain massif', kind: 'drain', element: 'air', powerPerLevel: 6, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (vers le héros)
      { id: 'transfusion', name: 'Transfusion', kind: 'heal', powerPerLevel: 6, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (compagnon donne ses PV)
      { id: 'consommation-totale', name: 'Consommation totale ⬔', kind: 'drain', element: 'air', powerPerLevel: 10, maxLevel: 3, unlockTier: 5 }, // TODO-BALANCE (soin complet du duo)
    ],
  },
  {
    id: 'drone-corrompu',
    name: 'Drone corrompu',
    monsterId: 'drone-corrompu',
    family: 'vermine',
    support: 'capture',
    skills: [
      { id: 'laser-parasite', name: 'Laser parasite', kind: 'damage', element: 'air', powerPerLevel: 3, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'scan-faille', name: 'Scan de faille', kind: 'capture-bonus', powerPerLevel: 1, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'drone-reparateur', name: 'Drone réparateur', kind: 'shield', powerPerLevel: 5, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE
      { id: 'reprogrammation', name: 'Reprogrammation', kind: 'stun', powerPerLevel: 1, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE (ennemi attaque un autre)
      { id: 'prise-controle', name: 'Prise de contrôle ⬔', kind: 'capture-bonus', powerPerLevel: 3, maxLevel: 2, unlockTier: 5 }, // TODO-BALANCE (capture garantie < 20 % PV)
    ],
  },
  {
    id: 'tisseuse',
    name: 'Tisseuse de fil',
    monsterId: 'tisseuse',
    family: 'vermine',
    support: 'capture',
    skills: [
      { id: 'fil-coupant', name: 'Fil coupant', kind: 'damage', element: 'air', powerPerLevel: 4, maxLevel: 2, unlockTier: 1 }, // TODO-BALANCE
      { id: 'toile', name: 'Toile', kind: 'stun', powerPerLevel: 1, maxLevel: 2, unlockTier: 2 }, // TODO-BALANCE
      { id: 'piege-soie', name: 'Piège de soie', kind: 'shield', powerPerLevel: 5, maxLevel: 2, unlockTier: 3 }, // TODO-BALANCE (contre-attaque)
      { id: 'cocon', name: 'Cocon', kind: 'shield', powerPerLevel: 8, maxLevel: 2, unlockTier: 4 }, // TODO-BALANCE
      { id: 'metatissure', name: 'Métatissure ⬔', kind: 'stun', powerPerLevel: 2, maxLevel: 2, unlockTier: 5 }, // TODO-BALANCE (toile de zone, power 2 = tous)
    ],
  },
];

// R7-04 : élites capturables = compagnons à stats supérieures (mêmes arbres, valeurs x2).
export const ELITE_COMPANIONS: CompanionDef[] = COMPANIONS.map((c) => ({
  ...c,
  id: `elite-${c.id}`,
  name: `Élite ${c.name}`,
  monsterId: `elite-${c.monsterId}`,
  skills: c.skills.map((s) => ({ ...s, powerPerLevel: s.powerPerLevel * 2 })), // TODO-BALANCE
}));

export const COMPANION_BY_MONSTER: Record<string, CompanionDef> = Object.fromEntries(
  [...COMPANIONS, ...ELITE_COMPANIONS].map((c) => [c.monsterId, c]),
);

// R11-02 (E2) : compétences débloquées = palier de lien >= unlockTier (jamais de null silencieux :
// un monsterId sans def n'apparaît tout simplement pas dans cette table, et le départ en run est refusé).
export function unlockedSkillsOf(def: CompanionDef, bondTier: number): CompanionSkill[] {
  return def.skills.filter((s) => bondTier >= s.unlockTier);
}

// Coûts en orbes pour monter une compétence du niveau n au niveau n+1 (§SPEC-7.2).
// TODO-BALANCE: ~3 puis 5 puis 10.
export const SKILL_UPGRADE_ORB_COSTS: Record<number, number> = {
  1: 3, // TODO-BALANCE
  2: 5, // TODO-BALANCE
  3: 10, // TODO-BALANCE
  4: 10, // TODO-BALANCE
};

export const SKILL_MAX_LEVEL = 5; // TODO-BALANCE
