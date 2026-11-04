import { describe, it, expect } from 'vitest';
import { fuseOrbs, applyFusion, isOpposition } from '../src/core/combat/fuse';
import type { Orb } from '../src/core/types';

const orb = (element: 'feu' | 'eau' | 'terre' | 'air', id: string, tier = 1): Orb => ({
  id, kind: 'primordial', element, tier,
});

describe('R4-01 moteur de fusion', () => {
  it('fusion valide consomme ses orbes et produit un composite', () => {
    const orbs = [orb('feu', 'a'), orb('eau', 'b'), orb('terre', 'c')];
    // feu+terre -> composite (pas d'opposition)
    const r = applyFusion(orbs, [0, 2]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.orbs).toHaveLength(2);
      const comp = r.orbs.find((o) => o.kind === 'composite')!;
      expect(comp.tier).toBe(2);
      expect(r.orbs.find((o) => o.id === 'a')).toBeUndefined();
    }
  });

  it('opposition Feu <-> Eau : fusion refusée proprement', () => {
    expect(isOpposition('feu', 'eau')).toBe(true);
    const r = fuseOrbs([orb('feu', 'a'), orb('eau', 'b')], [0, 1]);
    expect(r).toEqual({ ok: false, reason: 'opposition' });
  });

  it('doubler une orbe l’amplifie (tier + 1)', () => {
    const r = fuseOrbs([orb('feu', 'a'), orb('feu', 'b')], [0, 1]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.orb.tier).toBe(2);
    const r2 = fuseOrbs([orb('feu', 'a'), orb('feu', 'b'), orb('feu', 'c')], [0, 1, 2]);
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.orb.tier).toBe(2); // x3 sur même élément : palier 2 aussi
  });

  it('moins de 2 orbes -> invalide', () => {
    expect(fuseOrbs([orb('feu', 'a')], [0])).toEqual({ ok: false, reason: 'invalid' });
  });
});
