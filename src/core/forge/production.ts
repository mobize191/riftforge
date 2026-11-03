import type { GameState } from '../types';
import { BUILDINGS } from '../../data/buildings';

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
      const hasInput =
        (forge.credits >= (input.credits ?? 0)) &&
        (forge.essence >= (input.essence ?? 0)) &&
        (forge.mineraiBrut >= (input.mineraiBrut ?? 0)) &&
        (forge.lingots >= (input.lingots ?? 0));
      if (!hasInput) {
        pending = 0; // machine à l'arrêt sans intrants : pas de backlog accumulé
        break;
      }
      forge = {
        ...forge,
        credits: forge.credits - (input.credits ?? 0),
        essence: forge.essence - (input.essence ?? 0),
        mineraiBrut: forge.mineraiBrut - (input.mineraiBrut ?? 0),
        lingots: forge.lingots - (input.lingots ?? 0),
      };
      const output = def.output ?? {};
      forge = {
        ...forge,
        credits: forge.credits + (output.credits ?? 0),
        essence: forge.essence + (output.essence ?? 0),
        mineraiBrut: forge.mineraiBrut + (output.mineraiBrut ?? 0),
        lingots: forge.lingots + (output.lingots ?? 0),
      };
      pending -= def.cadenceTicks;
    }
    forge = { ...forge, pendingTicks: { ...forge.pendingTicks, [buildingId]: pending } };
  }
  return { ...state, forge };
}
