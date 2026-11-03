import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';

describe('R1-05 harvest & progression', () => {
  it('walking onto an orb increments the stock and removes it from the map', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const orb = s.run!.level!.orbs[0];
    const before = s.run!.orbs.length;
    s = reduce(s, { type: 'MOVE_PLAYER', to: orb.pos });
    expect(s.run!.orbs.length).toBe(before + 1);
    expect(s.run!.level!.orbs.find((o) => o.pos.x === orb.pos.x && o.pos.y === orb.pos.y)).toBeUndefined();
    expect(s.run!.playerPos).toEqual(orb.pos);
  });

  it('opening a chest grants credits + an orb and removes the chest', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const chest = s.run!.level!.chests[0];
    const creditsBefore = s.run!.lootCredits;
    const chestsBefore = s.run!.level!.chests.length;
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: chest.x, y: chest.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.lootCredits).toBeGreaterThan(creditsBefore);
    expect(s.run!.level!.chests).toHaveLength(chestsBefore - 1);
  });

  it('crossing the exit generates the next floor reproducibly', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    const exit = s.run!.level!.exit;
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: exit.x, y: exit.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.floor).toBe(2);
    expect(s.run!.playerPos).toEqual({ x: 1, y: 1 });
    const again = reduce(reduce(initialState(), { type: 'START_RUN', seed: 42 }), { type: 'NEXT_FLOOR' });
    expect(s.run!.level).toEqual(again.run!.level);
  });

  it('combat victories grant XP and level-ups within the run', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    const lvl0 = s.run!.playerLevel;
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse', 'sporeling'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 5, orbs: [], kills: 2 } });
    expect(s.run!.xp).toBe(2);
    expect(s.run!.playerLevel).toBeGreaterThan(lvl0);
    expect(s.run!.playerMaxHp).toBeGreaterThan(20);
  });
});
