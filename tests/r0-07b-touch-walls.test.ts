import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { isWall } from '../src/core/run/generate';

describe('contrôles tactiles : MOVE_PLAYER respecte les murs', () => {
  it('un déplacement vers un mur est ignoré (même sans passer par la scène)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    // trouve un mur adjacent à la position de départ (1,1)
    const level = s.run!.level!;
    let wallDir: [number, number] | null = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (isWall(level, 1 + dx, 1 + dy)) wallDir = [dx, dy];
    }
    if (wallDir) {
      const before = s.run!.playerPos;
      s = reduce(s, { type: 'MOVE_PLAYER', to: { x: 1 + wallDir[0], y: 1 + wallDir[1] } });
      expect(s.run!.playerPos).toEqual(before); // bloqué par le mur
    }
    // déplacement libre toujours OK
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
    const ok = free.find(([dx, dy]) => !isWall(level, 1 + dx, 1 + dy));
    if (ok) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: { x: 1 + ok[0], y: 1 + ok[1] } });
      expect(s.run!.playerPos).toEqual({ x: 1 + ok[0], y: 1 + ok[1] });
    }
  });
});
