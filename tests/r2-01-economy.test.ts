import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { spendResources } from '../src/core/forge/forge';

function withPurse(credits: number, essence: number, mineraiBrut: number) {
  const s = initialState();
  return { ...s, forge: { ...s.forge, credits, essence, mineraiBrut, lingots: 0, equipment: [], unlockedRecipes: [], buildings: {}, pendingTicks: {} } };
}

describe('R2-01 persistent resource economy', () => {
  it('gains from a run land in the persistent purse at RETURN_FORGE', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 8 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    s = reduce(s, {
      type: 'EXIT_COMBAT',
      victory: true,
      loot: { credits: 10, orbs: [], kills: 1, essence: 2, minerai: 3 },
    });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.credits).toBe(10);
    expect(s.forge.essence).toBe(2);
    expect(s.forge.mineraiBrut).toBe(3);
  });

  it('spend is atomic and never goes negative', () => {
    let s = withPurse(10, 5, 3);
    s = spendResources(s, { credits: 4, essence: 5 });
    expect(s.forge.credits).toBe(6);
    expect(s.forge.essence).toBe(0);
    const before = s;
    s = spendResources(s, { mineraiBrut: 4 });
    expect(s).toBe(before); // refus propre
    expect(s.forge.mineraiBrut).toBe(3);
  });

  it('purse persists across two runs', () => {
    let s = withPurse(30, 0, 0);
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.credits).toBe(30);
  });
});
