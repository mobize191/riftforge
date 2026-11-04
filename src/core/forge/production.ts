import type { GameState } from '../types';
import { BUILDINGS, WORKER_BONUS, NEIGHBOR_BONUS_EFFECTS, type ResourceKey } from '../../data/buildings';
import { canHold } from './caps';

// R6-05 : bonus de voisinage réel — si les deux bâtiments du binôme sont construits
// (niveau >= 1), le bâtiment bénéficiaire produit son bonus. Retirer l'un des deux
// retire le bonus (recalculé à chaque tick depuis l'état courant).
export function neighborBonusFor(buildings: Record<string, number>, buildingId: string): Partial<Record<ResourceKey, number>> {
  const bonus: Partial<Record<ResourceKey, number>> = {};
  for (const [pair, eff] of Object.entries(NEIGHBOR_BONUS_EFFECTS)) {
    if (eff.buildingId !== buildingId) continue;
    const [a, b] = pair.split('+');
    if ((buildings[a] ?? 0) >= 1 && (buildings[b] ?? 0) >= 1) {
      for (const [res, n] of Object.entries(eff.outputBonus) as [ResourceKey, number][]) {
        bonus[res] = (bonus[res] ?? 0) + n;
      }
    }
  }
  return bonus;
}

// Production par ticks purs : aucun Date.now dans le core, l'appelant (UI) fournit
// le nombre de ticks écoulés. Déterministe.
export function advanceProduction(state: GameState, ticks: number): GameState {
  if (ticks <= 0) return state;
  let forge = { ...state.forge, buildings: { ...state.forge.buildings }, pendingTicks: { ...state.forge.pendingTicks } };
  for (const [buildingId, level] of Object.entries(forge.buildings)) {
    if (level <= 0) continue;
    const def = BUILDINGS[buildingId];
    if (!def) continue;
    let pending = (forge.pendingTicks[buildingId] ?? 0) + ticks * level;
    while (pending >= def.cadenceTicks) {
      const input = def.input ?? {};
      const hasInput = (Object.entries(input) as [ResourceKey, number][]).every(([res, n]) => forge[res] >= n);
      if (!hasInput) {
        pending = 0; // machine à l'arrêt sans intrants : pas de backlog accumulé
        break;
      }
      // R6-05 : le voisinage ajoute réellement son bonus à la production du cycle.
      const output: Partial<Record<ResourceKey, number>> = { ...(def.output ?? {}) };
      for (const [res, n] of Object.entries(neighborBonusFor(forge.buildings, buildingId)) as [ResourceKey, number][]) {
        output[res] = (output[res] ?? 0) + n;
      }
      const fits = (Object.entries(output) as [ResourceKey, number][]).every(([res, amount]) => canHold(forge, res, amount));
      if (!fits) {
        pending = 0; // stockage plein : la production s'arrête, rien n'est perdu silencieusement
        break;
      }
      for (const [res, n] of Object.entries(input) as [ResourceKey, number][]) {
        forge = { ...forge, [res]: forge[res] - n };
      }
      // Worker assigné au bâtiment : petit bonus de production (données TODO-BALANCE).
      const workerCount = state.forge.workers[buildingId]?.length ?? 0;
      const workerBonus = workerCount * (WORKER_BONUS[buildingId] ?? 0);
      for (const [res, n] of Object.entries(output) as [ResourceKey, number][]) {
        forge = { ...forge, [res]: forge[res] + n };
      }
      if (workerBonus > 0) {
        const res: ResourceKey = buildingId === 'extracteur' ? 'mineraiBrut' : 'lingots';
        forge = { ...forge, [res]: forge[res] + workerBonus };
      }
      pending -= def.cadenceTicks;
    }
    forge = { ...forge, pendingTicks: { ...forge.pendingTicks, [buildingId]: pending } };
  }
  return { ...state, forge };
}
