import { describe, it, expect } from 'vitest';
import { initialState } from '../src/core/run/state';
import { advanceProduction } from '../src/core/forge/production';
import { storageCap } from '../src/core/forge/caps';

describe('R2-08 simulation économique (24 h = 86400 ticks)', () => {
  it('aucun enrichissement infini : caps tenus, soldes jamais négatifs', () => {
    let s = initialState();
    // un peu d'essence initiale pour laisser tourner la forge
    s = { ...s, forge: { ...s.forge, essence: 20 } };
    const HOUR = 3600;
    for (let h = 0; h < 24; h++) {
      s = advanceProduction(s, HOUR);
    }
    const f = s.forge;
    console.log(
      `[R2-08] 24h simulées : minerai=${f.mineraiBrut}/${storageCap(s, 'mineraiBrut')} essence=${f.essence}/${storageCap(s, 'essence')} lingots=${f.lingots}/${storageCap(s, 'lingots')} crédits=${f.credits}`,
    );
    for (const res of ['credits', 'essence', 'mineraiBrut', 'lingots'] as const) {
      expect(f[res]).toBeGreaterThanOrEqual(0);
      expect(f[res]).toBeLessThanOrEqual(storageCap(s, res));
    }
    // la forge a consommé de l'essence -> des lingots ont été produits, mais le minerai est
    // resté borné par le cap : pas d'enrichissement infini
    expect(f.lingots).toBeGreaterThan(0);
    expect(f.mineraiBrut).toBeLessThanOrEqual(storageCap(s, 'mineraiBrut'));
  });
});
