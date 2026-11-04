import { describe, it, expect } from 'vitest';
// B29 — Plan de la Forge : placement des bâtiments sur une grille, bonus de voisinage
// par adjacence (Manhattan = 1) quand les deux sont placés ; fallback « les deux
// construits » sans placement (rétrocompatible R6-05).
import { initialState, reduce } from '../src/core/run/state';
import { advanceProduction, neighborBonusFor } from '../src/core/forge/production';
import { FORGE_GRID } from '../src/data/buildings';

function forgeWith(buildings: Record<string, number>, resources: Record<string, number> = {}) {
  let s = initialState();
  s = { ...s, forge: { ...s.forge, ...resources, buildings: { ...s.forge.buildings, ...buildings } } };
  return s;
}

describe('B29 placement des bâtiments', () => {
  it('PLACE_BUILDING : bâtiment construit, grille bornée, une case par bâtiment', () => {
    let s = forgeWith({ extracteur: 1, 'forge-arcane': 1 });
    s = reduce(s, { type: 'PLACE_BUILDING', buildingId: 'extracteur', x: 0, y: 0 });
    s = reduce(s, { type: 'PLACE_BUILDING', buildingId: 'forge-arcane', x: 1, y: 0 });
    expect(s.forge.buildingPos['extracteur']).toEqual({ x: 0, y: 0 });
    expect(s.forge.buildingPos['forge-arcane']).toEqual({ x: 1, y: 0 });
    // hors grille -> refusé
    const b = s;
    s = reduce(s, { type: 'PLACE_BUILDING', buildingId: 'extracteur', x: FORGE_GRID.width, y: 0 });
    expect(s).toBe(b);
    // case occupée par un autre -> refusé
    s = reduce(s, { type: 'PLACE_BUILDING', buildingId: 'extracteur', x: 1, y: 0 });
    expect(s.forge.buildingPos['extracteur']).toEqual({ x: 0, y: 0 });
    // bâtiment non construit -> refusé
    s = reduce(s, { type: 'PLACE_BUILDING', buildingId: 'nanolathe', x: 2, y: 2 });
    expect(s.forge.buildingPos['nanolathe']).toBeUndefined();
  });

  it('bonus de voisinage = adjacence si placés, « les deux construits » sinon', () => {
    const b = { extracteur: 1, 'forge-arcane': 1 };
    // sans placement : fallback (rétrocompatible)
    expect(neighborBonusFor(b, 'forge-arcane')).toEqual({ lingots: 1 });
    // placés adjacents -> bonus
    expect(neighborBonusFor(b, 'forge-arcane', { extracteur: { x: 0, y: 0 }, 'forge-arcane': { x: 1, y: 0 } })).toEqual({ lingots: 1 });
    // placés non adjacents -> plus de bonus
    expect(neighborBonusFor(b, 'forge-arcane', { extracteur: { x: 0, y: 0 }, 'forge-arcane': { x: 3, y: 2 } })).toEqual({});
    // production réelle : adjacents = +1 lingot, non adjacents = 0
    const sAdj = forgeWith({ extracteur: 1, 'forge-arcane': 1 }, { mineraiBrut: 10, essence: 5 });
    sAdj.forge.buildingPos = { extracteur: { x: 0, y: 0 }, 'forge-arcane': { x: 0, y: 1 } };
    const rAdj = advanceProduction(sAdj, 20);
    const sLoin = forgeWith({ extracteur: 1, 'forge-arcane': 1 }, { mineraiBrut: 10, essence: 5 });
    sLoin.forge.buildingPos = { extracteur: { x: 0, y: 0 }, 'forge-arcane': { x: 3, y: 2 } };
    const rLoin = advanceProduction(sLoin, 20);
    expect(rAdj.forge.lingots).toBe(rLoin.forge.lingots + 1);
  });
});
