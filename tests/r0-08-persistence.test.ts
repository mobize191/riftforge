import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, deserialize } from '../src/core/save/save';

describe('R0-08 session persistence (core level)', () => {
  it('position du joueur survit à un cycle save -> reload -> load', () => {
    let s = initialState();
    s = reduce(s, { type: 'START_RUN', seed: 5 });
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: 7, y: 9 } });
    const reloaded = deserialize(serialize(s));
    expect(reloaded.run?.playerPos).toEqual({ x: 7, y: 9 });
    expect(reloaded.mode).toBe('RUN');
  });
});
