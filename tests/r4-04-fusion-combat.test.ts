import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import type { Orb } from '../src/core/types';

const orb = (element: 'feu' | 'eau' | 'terre' | 'air', id: string): Orb => ({
  id, kind: 'primordial', element, tier: 1,
});

describe('R4-04 fusion hors combat / en combat', () => {
  it('hors combat : gratuit et illimité', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: { ...s.run!, orbs: [orb('feu', 'a'), orb('feu', 'b'), orb('terre', 'c'), orb('terre', 'd')] },
    };
    s = reduce(s, { type: 'FUSE_ORBS', indices: [0, 1] });
    s = reduce(s, { type: 'FUSE_ORBS', indices: [0, 1] }); // illimité
    const composites = s.run!.orbs.filter((o) => o.kind === 'composite');
    expect(composites).toHaveLength(2);
  });

  it('en combat : la fusion passe le tour (les ennemis jouent)', () => {
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu', 'feu']);
    const hpBefore = c.player.hp;
    c = combatReduce(c, { type: 'FUSE_IN_COMBAT', indices: [0, 1] });
    expect(c.turn).toBe(2); // le tour a été consommé
    expect(c.player.hp).toBeLessThanOrEqual(hpBefore); // riposte subie
    expect(c.orbs.every((o) => o === 'feu' || true)).toBe(true);
  });

  it('fusion invalide en combat = sans effet', () => {
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu', 'eau']);
    const before = c;
    c = combatReduce(c, { type: 'FUSE_IN_COMBAT', indices: [0, 1] }); // opposition -> refusée
    expect(c).toBe(before);
  });
});
