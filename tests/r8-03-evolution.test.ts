import { describe, it, expect } from 'vitest';
// R8-03 — Évolution au palier 4 : condition évaluable depuis l'état réel (kills de la
// même race), irréversible, marqueur mis à jour.
import { initialState, reduce } from '../src/core/run/state';
import { canEvolve, evolveCompanion } from '../src/core/forge/bond';
import { EVOLUTION_KILLS_SAME_RACE, BOND_TIERS } from '../src/data/bond';

function forgeWithCompanion(tier: number, kills = 0) {
  const xp = [0, 10, 25, 50, 90][tier - 1];
  let s = initialState();
  s = {
    ...s,
    forge: {
      ...s.forge,
      roster: ['mousse'],
      team: ['mousse'],
      bondXp: { mousse: xp },
      bondTier: { mousse: tier },
      killCounts: { mousse: kills },
    },
  };
  return s;
}

describe('R8-03 évolution au palier 4', () => {
  it('condition évaluable depuis l’état : palier >= 4 + X kills de la même race', () => {
    expect(canEvolve(forgeWithCompanion(3, 99), 'mousse')).toBe(false); // palier 3 insuffisant
    expect(canEvolve(forgeWithCompanion(4, EVOLUTION_KILLS_SAME_RACE - 1), 'mousse')).toBe(false);
    expect(canEvolve(forgeWithCompanion(4, EVOLUTION_KILLS_SAME_RACE), 'mousse')).toBe(true);
    expect(canEvolve(forgeWithCompanion(5, EVOLUTION_KILLS_SAME_RACE), 'mousse')).toBe(true);
  });

  it('évolution irréversible, marqueur palier 4 (aura + nouvelle apparence en data)', () => {
    let s = forgeWithCompanion(4, EVOLUTION_KILLS_SAME_RACE);
    s = reduce(s, { type: 'EVOLVE_COMPANION', monsterId: 'mousse' });
    expect(s.forge.evolved['mousse']).toBe(true);
    // irréversible : plus évolvable ensuite
    expect(canEvolve(s, 'mousse')).toBe(false);
    const again = reduce(s, { type: 'EVOLVE_COMPANION', monsterId: 'mousse' });
    expect(again.forge.evolved['mousse']).toBe(true);
    expect(BOND_TIERS.find((t) => t.tier === 4)!.visualMarker).toContain('aura');
  });

  it('les kills de la run alimentent le compteur persistant (via le journal)', () => {
    let s = forgeWithCompanion(4, 0);
    s = reduce(s, { type: 'START_RUN', seed: 8 });
    for (let i = 0; i < EVOLUTION_KILLS_SAME_RACE; i++) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
      s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 5, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] }, companionKo: false });
    }
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.killCounts['mousse']).toBe(EVOLUTION_KILLS_SAME_RACE);
    expect(canEvolve(s, 'mousse')).toBe(true);
  });
});
