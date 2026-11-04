import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import type { Orb } from '../src/core/types';

const primordial = (element: 'feu' | 'eau' | 'terre' | 'air', id: string): Orb => ({
  id, kind: 'primordial', element, tier: 1,
});
const composite: Orb = { id: 'composite-feu-feu', kind: 'composite', element: null, tier: 2 };

describe('R4-05 orbes composites auto-conservées', () => {
  it('fin de combat : les composites restent dans la run (conservées auto)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = { ...s, run: { ...s.run!, orbs: [primordial('feu', 'a'), composite] } };
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 1, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    expect(s.run!.orbs.some((o) => o.kind === 'composite')).toBe(true);
  });

  it('mort : primordiales perdues, composites transférées au stock de la Forge', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = { ...s, run: { ...s.run!, orbs: [primordial('feu', 'a'), primordial('eau', 'b'), composite] } };
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.orbStock).toHaveLength(1);
    expect(s.forge.orbStock[0].kind).toBe('composite');
    // la run suivante repart avec les composites de la Forge
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    expect(s.run!.orbs.some((o) => o.kind === 'composite')).toBe(true);
  });
});
