import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { MERCHANT_ITEMS } from '../src/data/equipment';

describe('retours playtest (2)', () => {
  it('les PV restants du combat persistent à la sortie de combat (pas de soin full gratuit)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
    s = reduce(s, {
      type: 'EXIT_COMBAT',
      victory: true,
      playerHp: 7,
      loot: { credits: 5, orbs: [], kills: 1, essence: 1, minerai: 1, captured: [] },
    });
    expect(s.run!.playerHp).toBe(7); // pas re-soigné à fond
  });

  it('pas d’équipement en double (achat ou craft)', () => {
    const s0 = initialState();
    let s = { ...s0, forge: { ...s0.forge, credits: 1000 } };
    s = reduce(s, { type: 'BUY_ITEM', defId: MERCHANT_ITEMS[0].id });
    const before = s;
    s = reduce(s, { type: 'BUY_ITEM', defId: MERCHANT_ITEMS[0].id });
    expect(s).toBe(before); // refusé : déjà possédé
    expect(s.forge.equipment).toHaveLength(1);
  });

  it('un coffre donne de l’essence (ressource obtenable)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const chest = s.run!.level!.chests[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: chest.x, y: chest.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.lootEssence).toBeGreaterThan(0);
    expect(s.run!.lastEvent).toContain('essence');
  });
});
