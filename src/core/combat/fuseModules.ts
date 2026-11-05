import type { Module, Orb } from '../types';
import { RECIPE_BY_ID } from '../../data/recipes';
import { MODULE_FUSION_BY_ID, type ModuleFusionDef } from '../../data/moduleFusions';

export type FuseModulesResult =
  | { ok: true; module: Module; modules: string[]; orbs: Orb[] }
  | { ok: false; reason: 'unknown-fusion' | 'missing-modules' | 'missing-orbs' | 'duplicate' };

export function fuseModules(modules: string[], orbs: Orb[], fusionId: string): FuseModulesResult {
  const def = MODULE_FUSION_BY_ID[fusionId];
  if (!def) return { ok: false, reason: 'unknown-fusion' };
  if (modules.includes(def.resultId)) return { ok: false, reason: 'duplicate' };
  const counts = new Map<string, number>();
  for (const m of modules) counts.set(m, (counts.get(m) ?? 0) + 1);
  for (const id of def.inputs) {
    const n = counts.get(id) ?? 0;
    if (n <= 0) return { ok: false, reason: 'missing-modules' };
    counts.set(id, n - 1);
  }
  const consumedModules = new Set<number>();
  for (const id of def.inputs) {
    for (let i = 0; i < modules.length; i++) {
      if (modules[i] === id && !consumedModules.has(i)) { consumedModules.add(i); break; }
    }
  }
  const consumedOrbs = new Set<string>();
  for (const el of def.orbs) {
    let found = false;
    for (const o of orbs) {
      if (o.kind === 'primordial' && o.element === el && !consumedOrbs.has(o.id)) {
        consumedOrbs.add(o.id); found = true; break;
      }
    }
    if (!found) return { ok: false, reason: 'missing-orbs' };
  }
  const recipe = RECIPE_BY_ID[def.resultId];
  const created: Module = {
    id: def.resultId,
    name: recipe?.name ?? def.resultId,
    tier: def.tier,
    effect: recipe!.effect,
  };
  return {
    ok: true,
    module: created,
    modules: modules.filter((_, i) => !consumedModules.has(i)),
    orbs: orbs.filter((o) => !consumedOrbs.has(o.id)),
  };
}

export function achievableFusions(
  modules: string[],
  orbs: Orb[],
  allowed?: ReadonlySet<string>,
): ModuleFusionDef[] {
  const owned = new Set(modules);
  const counts = new Map<string, number>();
  for (const m of modules) counts.set(m, (counts.get(m) ?? 0) + 1);
  const orbCounts = new Map<string, number>();
  for (const o of orbs) {
    if (o.kind === 'primordial' && o.element) orbCounts.set(o.element, (orbCounts.get(o.element) ?? 0) + 1);
  }
  return Object.values(MODULE_FUSION_BY_ID).filter((f) => {
    if (allowed && !allowed.has(f.id)) return false;
    if (owned.has(f.resultId)) return false;
    const need = new Map<string, number>();
    for (const id of f.inputs) need.set(id, (need.get(id) ?? 0) + 1);
    for (const [id, n] of need) if ((counts.get(id) ?? 0) < n) return false;
    const orbNeed = new Map<string, number>();
    for (const el of f.orbs) orbNeed.set(el, (orbNeed.get(el) ?? 0) + 1);
    for (const [el, n] of orbNeed) if ((orbCounts.get(el) ?? 0) < n) return false;
    return true;
  });
}
