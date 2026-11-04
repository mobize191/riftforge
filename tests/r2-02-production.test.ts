import { describe, it, expect } from 'vitest';
import { initialState } from '../src/core/run/state';
import { advanceProduction } from '../src/core/forge/production';
import { BUILDINGS } from '../src/data/buildings';

function forgeWith(essence: number, mineraiBrut: number) {
  const s = initialState();
  return { ...s, forge: { ...s.forge, essence, mineraiBrut } };
}

describe('R2-02 extracteur -> forge arcane (ticks purs)', () => {
  it('N ticks -> production exacte et reproductible', () => {
    const a = advanceProduction(forgeWith(0, 0), 50);
    const b = advanceProduction(forgeWith(0, 0), 50);
    expect(a).toEqual(b);
    // extracteur seul (pas d'essence) : 50 ticks / cadence (data) = floor(50/cadence) minerai
    expect(a.forge.mineraiBrut).toBe(Math.floor(50 / BUILDINGS.extracteur.cadenceTicks));
  });

  it('forge arcane consomme essence + minerai et produit des lingots', () => {
    // cadence de la forge = 1 cycle ; l'extracteur fournit le minerai en parallèle (data)
    let s = advanceProduction(forgeWith(10, 0), BUILDINGS['forge-arcane'].cadenceTicks);
    const mineraiFromExtractor = Math.floor(BUILDINGS['forge-arcane'].cadenceTicks / BUILDINGS.extracteur.cadenceTicks);
    expect(s.forge.mineraiBrut).toBe(mineraiFromExtractor - 2);
    expect(s.forge.essence).toBe(9);
    // R6-05 : bonus de voisinage extracteur+forge-arcane -> +1 lingot par cycle
    expect(s.forge.lingots).toBe(2);
  });

  it('la forge se bloque sans intrants (pending conservé, rien perdu)', () => {
    let s = advanceProduction(forgeWith(0, 0), 100);
    expect(s.forge.lingots).toBe(0);
    expect(s.forge.mineraiBrut).toBe(Math.floor(100 / BUILDINGS.extracteur.cadenceTicks)); // extracteur tourne quand même
    // on fournit l'essence : la forge repart au bout d'un cycle complet (cadence en data)
    s = { ...s, forge: { ...s.forge, essence: 5 } };
    s = advanceProduction(s, BUILDINGS['forge-arcane'].cadenceTicks);
    expect(s.forge.lingots).toBe(2); // R6-05 : +1 lingot de voisinage (extracteur présent)
  });
});
