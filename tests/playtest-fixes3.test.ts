import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { advanceProduction } from '../src/core/forge/production';
import { WORKER_BONUS } from '../src/data/buildings';

describe('retours playtest (3)', () => {
  it('combat lancé depuis une case adjacente : le monstre est quand même retiré de la carte', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    // place un monstre artificiellement à côté du joueur (1,1)
    const m = s.run!.level!.monsters[0];
    m.pos = { x: 2, y: 1 };
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    expect(s.run!.level!.monsters.find((x) => x.pos.x === 2 && x.pos.y === 1)).toBeUndefined();
  });

  it('l’autel de défi est à usage unique (disparaît du niveau)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 6 });
    const altar = s.run!.level!.altars[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: altar.x, y: altar.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    // retour en run (fuite) : l'autel n'est plus là
    s = reduce(s, { type: 'EXIT_COMBAT', victory: false });
    expect(s.run!.level!.altars.find((a) => a.x === altar.x && a.y === altar.y)).toBeUndefined();
  });

  it('plusieurs workers sur un bâtiment : bonus cumulé', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse', 'sporeling'] } };
    s = reduce(s, { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: 'mousse' });
    s = reduce(s, { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: 'sporeling' });
    expect(s.forge.workers['extracteur']).toHaveLength(2);
    s = advanceProduction(s, 5); // 1 cycle
    expect(s.forge.mineraiBrut).toBe(1 + 2 * WORKER_BONUS.extracteur);
  });

  it('quitter une run en cours = abandon propre : butin conservé à la Forge', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, playerHp: 10, loot: { credits: 9, orbs: [], kills: 1, essence: 1, minerai: 1, captured: [] } });
    // abandon depuis la run (DIE puis RETURN_FORGE, comme le bouton Quitter)
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.forge.credits).toBe(9);
  });
});
