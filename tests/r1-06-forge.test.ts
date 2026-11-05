import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { BALANCE } from '../src/data/balance';
import { MERCHANT_ITEMS } from '../src/data/equipment';

function stateWithCredits(credits: number) {
  let s = initialState();
  s = { ...s, forge: { ...s.forge, credits, lingots: 0, unlockedRecipes: [], buildings: {}, pendingTicks: {} } };
  return s;
}

describe('R1-06 minimal forge + merchant', () => {
  it('buying debits credits and adds equipment', () => {
    const item = MERCHANT_ITEMS[0];
    let s = stateWithCredits(item.cost + 10);
    s = reduce(s, { type: 'BUY_ITEM', defId: item.id });
    expect(s.forge.credits).toBe(10);
    expect(s.forge.equipment).toHaveLength(1);
  });

  it('cannot buy without enough credits', () => {
    let s = stateWithCredits(1);
    const before = s;
    s = reduce(s, { type: 'BUY_ITEM', defId: MERCHANT_ITEMS[0].id });
    expect(s).toBe(before);
  });

  it('equipment survives two runs and is worn on the next one', () => {
    let s = stateWithCredits(100);
    s = reduce(s, { type: 'BUY_ITEM', defId: 'lame-rustique' }); // +1 ATK (R10-03 : jamais de one-shot)
    const baseAtk = BALANCE.PLAYER_ATTACK;
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(s.run!.playerAttack).toBe(baseAtk + 1);
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.equipment).toHaveLength(1);
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    expect(s.run!.playerAttack).toBe(baseAtk + 1);
  });
});
