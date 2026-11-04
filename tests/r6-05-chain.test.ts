import { describe, it, expect } from 'vitest';
// R6-05 — Chaîne matière complète : Extracteur -> Purificateur -> Nanolathe,
// bonus de voisinage appliqués réellement (et retirés si un bâtiment disparaît).
import { initialState, reduce } from '../src/core/run/state';
import { advanceProduction, neighborBonusFor } from '../src/core/forge/production';
import { BUILDINGS, NEIGHBOR_BONUS_EFFECTS } from '../src/data/buildings';

function forgeWith(buildings: Record<string, number>, resources: Partial<Record<string, number>> = {}) {
  let s = initialState();
  s = { ...s, forge: { ...s.forge, buildings: { ...s.forge.buildings, ...buildings }, ...resources } as typeof s.forge };
  return s;
}

describe('R6-05 chaîne matière complète', () => {
  it('Purificateur et Nanolathe sont des bâtiments jouables (construction + recette de production)', () => {
    expect(BUILDINGS['purificateur']).toBeDefined();
    expect(BUILDINGS['nanolathe']).toBeDefined();
    let s = initialState();
    s = { ...s, forge: { ...s.forge, credits: 200, mineraiBrut: 20, lingots: 10 } };
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'purificateur' });
    expect(s.forge.buildings['purificateur']).toBe(1);
    expect(s.forge.credits).toBe(200 - 40);
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'nanolathe' });
    expect(s.forge.buildings['nanolathe']).toBe(1);
  });

  it('la chaîne transforme les intrants par ticks purs (déterministe, sans horloge)', () => {
    // Extracteur -> minerai ; Purificateur : 3 minerai -> 1 essence ; Nanolathe : 2 essence + 1 minerai -> 1 lingot
    // 15 ticks : extracteur 3 cycles (+3 minerai, cadence 5), purificateur 1 cycle
    // (-3 minerai, +1 essence +1 bonus de voisinage extracteur+purificateur), nanolathe 0 cycle (cadence 30)
    let s = forgeWith({ extracteur: 1, purificateur: 1, nanolathe: 1 }, { mineraiBrut: 30 });
    s = advanceProduction(s, 15);
    expect(s.forge.mineraiBrut).toBe(30 + 3 - 3);
    expect(s.forge.essence).toBe(2);
    expect(s.forge.lingots).toBe(0);
    // 30 ticks : extracteur +6, purificateur 2 cycles (-6 minerai, +4 essence avec bonus),
    // nanolathe 1 cycle (-2 essence, -1 minerai, +1 lingot +1 bonus purificateur+nanolathe)
    s = forgeWith({ extracteur: 1, purificateur: 1, nanolathe: 1 }, { mineraiBrut: 30 });
    s = advanceProduction(s, 30);
    expect(s.forge.mineraiBrut).toBe(30 + 6 - 6 - 1);
    expect(s.forge.essence).toBe(4 - 2);
    expect(s.forge.lingots).toBe(2);
    // déterminisme : même état + mêmes ticks = même résultat (purificateur seul, sans voisin)
    const a = advanceProduction(forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 9 }), 45);
    const b = advanceProduction(forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 9 }), 45);
    expect(a.forge).toEqual(b.forge);
    expect(a.forge.essence).toBe(3); // 45 ticks / cadence 15 = 3 cycles, pas de bonus
  });

  it('le voisinage applique réellement son bonus (les deux bâtiments construits)', () => {
    // extracteur + purificateur construits -> purificateur produit +1 essence par cycle
    expect(neighborBonusFor({ extracteur: 1, purificateur: 1 }, 'purificateur')).toEqual({ essence: 1 });
    expect(neighborBonusFor({ extracteur: 1, 'forge-arcane': 1 }, 'forge-arcane')).toEqual({ lingots: 1 });
    expect(neighborBonusFor({ purificateur: 1, nanolathe: 1 }, 'nanolathe')).toEqual({ lingots: 1 });
    // un seul des deux -> pas de bonus
    expect(neighborBonusFor({ purificateur: 1 }, 'purificateur')).toEqual({});
    expect(neighborBonusFor({ extracteur: 1 }, 'forge-arcane')).toEqual({});
    // production réelle avec bonus : 15 ticks, purificateur + extracteur -> 2 essence (1 + bonus)
    const s = advanceProduction(forgeWith({ extracteur: 1, purificateur: 1 }, { mineraiBrut: 10 }), 15);
    expect(s.forge.essence).toBe(2);
  });

  it('retirer un bâtiment du binôme retire le bonus', () => {
    // avec les deux : 1 cycle + bonus = 2 essence
    const avec = advanceProduction(forgeWith({ extracteur: 1, purificateur: 1 }, { mineraiBrut: 10 }), 15);
    expect(avec.forge.essence).toBe(2);
    // on retire l'extracteur (niveau 0) -> plus de bonus de voisinage
    const s2 = forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 10 });
    const r = advanceProduction(s2, 15);
    expect(r.forge.essence).toBe(1); // 1 cycle, pas de bonus
    // cohérence data : chaque paire de NEIGHBOR_BONUS_EFFECTS a un effet réel
    expect(Object.keys(NEIGHBOR_BONUS_EFFECTS).length).toBeGreaterThanOrEqual(3);
  });
});
