import { initialState, reduce } from '../../src/core/run/state';
import type { GameState } from '../../src/core/types';
import { createModule } from '../../src/core/combat/createModule';
import { achievableFusions } from '../../src/core/combat/fuseModules';
import { RECIPES, RECIPE_BY_ID } from '../../src/data/recipes';
import { MODULE_FUSIONS } from '../../src/data/moduleFusions';

// Fusions que le bot applique : résultats qu'il utilise en combat (dégâts, zone,
// DoT, soin, bouclier) OU résultats-ingrédients d'autres fusions (ex. boue ->
// Sève synthétique). slow/blind/push non ingrédients ne sont jamais lancés par
// le bot — les fusionner détruirait ses sources sans gain.
const BOT_FUSION_KINDS = new Set(['damage', 'aoe', 'dot', 'heal', 'shield']);
const FUSION_INGREDIENT_IDS = new Set(MODULE_FUSIONS.flatMap((f) => f.inputs));

// Helper de bot partagé (R11-01, E1) : fabrique les modules tier 1 depuis les orbes
// puis FUSIONNE les modules entre eux (paliers 2-3), jusqu'à fixpoint (borné — chaque
// création/fusion ne peut fire qu'une fois par id, modules dédupliqués).
export function craftAndFuseAll(s: GameState, priority: string[] = RECIPES.map((r) => r.id), allowedFusions?: ReadonlySet<string>): GameState {
  for (let guard = 0; guard < 40; guard++) {
    const before = s;
    for (const id of priority) {
      if (!s.run || s.run.modules.some((m) => m.id === id)) continue;
      if (createModule(s.run.orbs, id).ok) s = reduce(s, { type: 'CREATE_MODULE', recipeId: id });
    }
    if (!s.run) return s;
    for (const f of achievableFusions(s.run.modules.map((m) => m.id), s.run.orbs, allowedFusions)) {
      if (!BOT_FUSION_KINDS.has(RECIPE_BY_ID[f.resultId]?.effect.kind ?? '') && !FUSION_INGREDIENT_IDS.has(f.resultId)) continue;
      s = reduce(s, { type: 'FUSE_MODULES', fusionId: f.id });
    }
    if (s === before) break;
  }
  return s;
}

export function newRunState(seed: number): GameState {
  return reduce(initialState(), { type: 'START_RUN', seed });
}

// Variante « une action par appel » (remplace les tryCraft locaux des bots) :
// une création d'orbe OU une fusion de modules par appel, appelé en boucle par le bot.
export function craftOrFuseOnce(s: GameState, priority: string[] = RECIPES.map((r) => r.id), allowedFusions?: ReadonlySet<string>): GameState {
  for (const id of priority) {
    if (!s.run || s.run.modules.some((m) => m.id === id)) continue;
    if (createModule(s.run.orbs, id).ok) return reduce(s, { type: 'CREATE_MODULE', recipeId: id });
  }
  if (!s.run) return s;
  const fusions = achievableFusions(s.run.modules.map((m) => m.id), s.run.orbs, allowedFusions);
  if (fusions.length > 0) return reduce(s, { type: 'FUSE_MODULES', fusionId: fusions[0].id });
  return s;
}
