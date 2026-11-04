import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, deserialize } from '../src/core/save/save';
import { advanceProduction } from '../src/core/forge/production';
import { BUILDINGS, WORKER_BONUS } from '../src/data/buildings';

function forgeWithRoster() {
  const s = initialState();
  return { ...s, forge: { ...s.forge, roster: ['mousse'], team: [] } };
}

describe('R3-06 écurie, nommage, workers', () => {
  it('le nommage persiste (y compris via save/load)', () => {
    let s = reduce(forgeWithRoster(), { type: 'RENAME_COMPANION', monsterId: 'mousse', name: 'Brindille' });
    expect(s.forge.companionNames['mousse']).toBe('Brindille');
    const reloaded = deserialize(serialize(s));
    expect(reloaded.forge.companionNames['mousse']).toBe('Brindille');
  });

  it('assignation à l’équipe : 1 slot max en V1, seulement depuis le roster', () => {
    let s = reduce(forgeWithRoster(), { type: 'SET_TEAM', monsterIds: ['mousse', 'sporeling'] });
    expect(s.forge.team).toEqual(['mousse']);
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['inconnu'] });
    expect(s.forge.team).toEqual([]);
  });

  it('un worker assigné applique son bonus de production', () => {
    let s = reduce(forgeWithRoster(), { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: 'mousse' });
    s = advanceProduction(s, BUILDINGS.extracteur.cadenceTicks); // 1 cycle extracteur
    expect(s.forge.mineraiBrut).toBe(1 + WORKER_BONUS.extracteur);
    s = reduce(s, { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: null });
    s = advanceProduction(s, BUILDINGS.extracteur.cadenceTicks);
    expect(s.forge.mineraiBrut).toBe(1 + WORKER_BONUS.extracteur + 1);
  });
});
