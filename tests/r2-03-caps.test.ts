import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { advanceProduction } from '../src/core/forge/production';
import { storageCap } from '../src/core/forge/caps';
import { STORAGE_CAPS, ENTREPOS, UPGRADE_COSTS } from '../src/data/buildings';

function forgeWith(credits: number) {
  const s = initialState();
  return { ...s, forge: { ...s.forge, credits } };
}

describe('R2-03 storage caps', () => {
  it('la production est plafonnée au cap (rien de perdu silencieusement)', () => {
    // cap minerai = 50 * multiplier(entrepot niv 1 = 2) = 100 ; 1000 ticks produiraient 200
    let s = forgeWith(0);
    s = { ...s, forge: { ...s.forge, essence: 0 } }; // forge arcane bloquée
    s = advanceProduction(s, 1000);
    expect(s.forge.mineraiBrut).toBe(storageCap(s, 'mineraiBrut'));
    expect(s.forge.mineraiBrut).toBe(STORAGE_CAPS.mineraiBrut * ENTREPOS.capMultiplierPerLevel);
  });

  it('améliorer l’entrepôt augmente le cap', () => {
    let s = forgeWith(UPGRADE_COSTS.entrepot.credits);
    const capBefore = storageCap(s, 'mineraiBrut');
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'entrepot' });
    expect(s.forge.buildings.entrepot).toBe(2);
    expect(storageCap(s, 'mineraiBrut')).toBeGreaterThan(capBefore);
    expect(s.forge.credits).toBe(0);
  });

  it('amélioration refusée sans crédits', () => {
    let s = forgeWith(0);
    const before = s;
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'entrepot' });
    expect(s).toBe(before);
  });
});
