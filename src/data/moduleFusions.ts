import type { ElementId } from '../core/types';

// R11-01 (décision E1) — fusion module + module : les paliers supérieurs se
// construisent en fusionnant des modules ENTRE EUX (plus jamais depuis les orbes).
// - tier 2 = fusion de 2 modules tier 1 distincts ;
// - tier 3 = fusion de 1 module tier 2 + 1 module tier 1 (+ orbes, data).
// La fusion CONSOMME les modules sources et les orbes exigées. Les modules sont
// uniques par id (B24) : toute fusion prend des sources distinctes.
// TODO-BALANCE : appariements et coûts d'orbes.
export interface ModuleFusionDef {
  id: string;
  resultId: string; // module produit (id de recette dans recipes.ts)
  inputs: string[]; // modules sources consommés (distincts)
  orbs: ElementId[]; // orbes primordiales supplémentaires consommées
  tier: number; // palier du résultat (2 ou 3)
  exclusive?: boolean; // R11-05 : fusion EXCLUSIVE du Labo — refusée tant que non débloquée à la Forge (persisté)
}

export const MODULE_FUSIONS: ModuleFusionDef[] = [
  // --- tier 2 : 2 modules tier 1 distincts ---
  { id: 'fusion-vapeur', resultId: 'vapeur', inputs: ['trait-incandescent', 'jet-pression'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-magma', resultId: 'magma', inputs: ['trait-incandescent', 'ecran-gravats'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-souffle-thermique', resultId: 'souffle-thermique', inputs: ['trait-incandescent', 'souffle'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-boue', resultId: 'boue', inputs: ['jet-pression', 'ecran-gravats'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-cryo-brume', resultId: 'cryo-brume', inputs: ['jet-pression', 'souffle'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-poussiere', resultId: 'poussiere', inputs: ['ecran-gravats', 'souffle'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-combustion', resultId: 'combustion', inputs: ['trait-incandescent', 'condensation'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-plaque-blindee', resultId: 'plaque-blindee', inputs: ['ecran-gravats', 'condensation'], orbs: [], tier: 2 }, // TODO-BALANCE
  { id: 'fusion-cyclone', resultId: 'cyclone', inputs: ['souffle', 'condensation'], orbs: [], tier: 2 }, // TODO-BALANCE
  // --- tier 3 : 1 module tier 2 + 1 module tier 1 (+ orbes) ---
  { id: 'fusion-seve-synthetique', resultId: 'seve-synthetique', inputs: ['boue', 'jet-pression'], orbs: ['eau'], tier: 3 }, // TODO-BALANCE
  { id: 'fusion-brume-corrosive', resultId: 'brume-corrosive', inputs: ['vapeur', 'ecran-gravats'], orbs: [], tier: 3 }, // TODO-BALANCE
  { id: 'fusion-obsidienne', resultId: 'obsidienne', inputs: ['magma', 'jet-pression'], orbs: ['eau'], tier: 3 }, // TODO-BALANCE
  { id: 'fusion-deflagration', resultId: 'deflagration', inputs: ['combustion', 'ecran-gravats'], orbs: ['terre'], tier: 3 }, // TODO-BALANCE
  // --- R11-05 : fusions EXCLUSIVES du Labo (débloquables uniquement à la Forge, persistées en save) ---
  { id: 'fusion-nova', resultId: 'nova', inputs: ['combustion', 'souffle'], orbs: ['air', 'terre'], tier: 3, exclusive: true }, // TODO-BALANCE
  { id: 'fusion-abime', resultId: 'abime', inputs: ['boue', 'jet-pression'], orbs: ['air'], tier: 3, exclusive: true }, // TODO-BALANCE
  { id: 'fusion-singularite', resultId: 'singularite', inputs: ['magma', 'jet-pression'], orbs: ['air', 'eau'], tier: 3, exclusive: true }, // TODO-BALANCE
];

export const MODULE_FUSION_BY_ID: Record<string, ModuleFusionDef> = Object.fromEntries(
  MODULE_FUSIONS.map((f) => [f.id, f]),
);

export const MODULE_FUSION_BY_RESULT: Record<string, ModuleFusionDef> = Object.fromEntries(
  MODULE_FUSIONS.map((f) => [f.resultId, f]),
);
