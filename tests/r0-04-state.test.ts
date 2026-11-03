import { describe, it, expect } from 'vitest';
import { initialState, reduce, type GameAction } from '../src/core/run/state';

const SCRIPT: GameAction[] = [
  { type: 'START_RUN', seed: 1234 },
  { type: 'ENTER_COMBAT' },
  { type: 'EXIT_COMBAT', victory: true },
  { type: 'ENTER_COMBAT' },
  { type: 'DIE' },
  { type: 'RETURN_FORGE' },
];

describe('R0-04 loop state machine', () => {
  it('replay from a fixed initial state is deterministic', () => {
    const run1 = SCRIPT.reduce(reduce, initialState());
    const run2 = SCRIPT.reduce(reduce, initialState());
    expect(run1).toEqual(run2);
  });

  it('follows the FORGE -> RUN -> COMBAT -> RETOUR -> FORGE loop', () => {
    let s = initialState();
    expect(s.mode).toBe('FORGE');
    s = reduce(s, { type: 'START_RUN', seed: 1234 });
    expect(s.mode).toBe('RUN');
    expect(s.run?.seed).toBe(1234);
    s = reduce(s, { type: 'ENTER_COMBAT' });
    expect(s.mode).toBe('COMBAT');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true });
    expect(s.mode).toBe('RUN');
    s = reduce(s, { type: 'DIE' });
    expect(s.mode).toBe('RETOUR');
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.run).toBeNull();
  });

  it('illegal transitions are ignored', () => {
    const s = initialState();
    expect(reduce(s, { type: 'ENTER_COMBAT' })).toBe(s);
    expect(reduce(s, { type: 'DIE' })).toBe(s);
  });
});
