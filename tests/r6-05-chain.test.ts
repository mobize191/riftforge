import { describe, it, expect } from 'vitest';
// R6-05 — Chaîne matière complète : Extracteur -> Purificateur -> Nanolathe,
// bonus de voisinage appliqués réellement (et retirés si un bâtiment disparaît).
// R10-05 : attentes dérivées des cadences en data (BUILDINGS), pas de chiffres en dur.
import { initialState, reduce } from '../src/core/run/state';
import { advanceProduction, neighborBonusFor } from '../src/core/forge/production';
import { BUILDINGS, NEIGHBOR_BONUS_EFFECTS, UPGRADE_COSTS } from '../src/data/buildings';

const CAD_EXT = BUILDINGS.extracteur.cadenceTicks;
const CAD_PUR = BUILDINGS['purificateur'].cadenceTicks;
const CAD_NANO = BUILDINGS['nanolathe'].cadenceTicks;

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
    s = { ...s, forge: { ...s.forge, credits: 600, mineraiBrut: 30, lingots: 20 } };
    const costPur = UPGRADE_COSTS['purificateur'].credits ?? 0;
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'purificateur' });
    expect(s.forge.buildings['purificateur']).toBe(1);
    expect(s.forge.credits).toBe(600 - costPur);
    s = reduce(s, { type: 'UPGRADE_BUILDING', buildingId: 'nanolathe' });
    expect(s.forge.buildings['nanolathe']).toBe(1);
  });

  it('la chaîne transforme les intrants par ticks purs (déterministe, sans horloge)', () => {
    // T1 = 1 cycle purificateur : extracteur produit floor(T1/CAD_EXT) minerai ; purificateur
    // consomme 3 minerai, produit 1 essence +1 bonus de voisinage (extracteur présent).
    let s = forgeWith({ extracteur: 1, purificateur: 1, nanolathe: 1 }, { mineraiBrut: 30 });
    s = advanceProduction(s, CAD_PUR);
    expect(s.forge.mineraiBrut).toBe(30 + Math.floor(CAD_PUR / CAD_EXT) - 3);
    expect(s.forge.essence).toBe(2); // 1 cycle + 1 bonus voisinage
    expect(s.forge.lingots).toBe(0); // nanolathe : 0 cycle à ce stade
    // T2 = 1 cycle nanolathe : purificateur 2 cycles, etc.
    s = forgeWith({ extracteur: 1, purificateur: 1, nanolathe: 1 }, { mineraiBrut: 30 });
    s = advanceProduction(s, CAD_NANO);
    expect(s.forge.mineraiBrut).toBe(30 + Math.floor(CAD_NANO / CAD_EXT) - 2 * 3 - 1);
    expect(s.forge.essence).toBe(2 * 2 - 2); // 2 cycles purif (+bonus) - 2 essence nanolathe
    expect(s.forge.lingots).toBe(2); // 1 cycle nanolathe + 1 bonus voisinage
    // déterminisme : même état + mêmes ticks = même résultat
    const a = advanceProduction(forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 9 }), 3 * CAD_PUR);
    const b = advanceProduction(forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 9 }), 3 * CAD_PUR);
    expect(a.forge).toEqual(b.forge);
    expect(a.forge.essence).toBe(3); // 3 cycles, pas de bonus (pas d'extracteur)
  });

  it('le voisinage applique réellement son bonus (les deux bâtiments construits)', () => {
    // extracteur + purificateur construits -> purificateur produit +1 essence par cycle
    expect(neighborBonusFor({ extracteur: 1, purificateur: 1 }, 'purificateur')).toEqual({ essence: 1 });
    expect(neighborBonusFor({ extracteur: 1, 'forge-arcane': 1 }, 'forge-arcane')).toEqual({ lingots: 1 });
    expect(neighborBonusFor({ purificateur: 1, nanolathe: 1 }, 'nanolathe')).toEqual({ lingots: 1 });
    // un seul des deux -> pas de bonus
    expect(neighborBonusFor({ purificateur: 1 }, 'purificateur')).toEqual({});
    expect(neighborBonusFor({ extracteur: 1 }, 'forge-arcane')).toEqual({});
    // production réelle avec bonus : 1 cycle purificateur, extracteur présent -> 2 essence (1 + bonus)
    const s = advanceProduction(forgeWith({ extracteur: 1, purificateur: 1 }, { mineraiBrut: 10 }), CAD_PUR);
    expect(s.forge.essence).toBe(2);
  });

  it('retirer un bâtiment du binôme retire le bonus', () => {
    // avec les deux : 1 cycle + bonus = 2 essence
    const avec = advanceProduction(forgeWith({ extracteur: 1, purificateur: 1 }, { mineraiBrut: 10 }), CAD_PUR);
    expect(avec.forge.essence).toBe(2);
    // on retire l'extracteur (niveau 0) -> plus de bonus de voisinage
    const s2 = forgeWith({ extracteur: 0, purificateur: 1 }, { mineraiBrut: 10 });
    const r = advanceProduction(s2, CAD_PUR);
    expect(r.forge.essence).toBe(1); // 1 cycle, pas de bonus
  });
});
