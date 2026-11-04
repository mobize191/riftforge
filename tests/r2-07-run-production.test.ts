import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { BUILDINGS, STORAGE_CAPS } from '../src/data/buildings';
import { storageCap } from '../src/core/forge/caps';

describe('R2-07 production pendant la run', () => {
  it('X ticks simulés pendant la run -> production créditée au retour, entretien appliqué', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'TICK_RUN', ticks: 250 });
    expect(s.run!.elapsedTicks).toBe(250);
    // rien de produit tant qu'on est en run
    expect(s.forge.mineraiBrut).toBe(0);
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    // extracteur : 250 ticks / cadence (data) = floor(250/cadence) minerai, cap entrepôt x2 -> tout passe
    const attendu = Math.floor(250 / BUILDINGS.extracteur.cadenceTicks);
    expect(attendu).toBeLessThanOrEqual(storageCap(s, 'mineraiBrut'));
    expect(s.forge.mineraiBrut).toBe(attendu);
    expect(s.forge.credits).toBe(0 - 2 >= 0 ? 0 : 0); // entretien plafonné à 0 si pas de crédits
    expect(s.run).toBeNull();
  });

  it('l\'entretien est prélevé quand il y a des crédits', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, credits: 10 } };
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'TICK_RUN', ticks: 200 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.credits).toBe(10 - 2); // 200 ticks -> 2 unités d'entretien
  });
});
