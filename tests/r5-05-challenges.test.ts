import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { initialState, reduce } from '../src/core/run/state';
import { CHALLENGE_BY_ID } from '../src/data/challenges';

const ALTAR = CHALLENGE_BY_ID['autel-garde'];

describe('R5-05 défis à tours limités', () => {
  it('limite de tours respectée : échec du défi sans mort', () => {
    let c = startCombat(1, 100, 100, 0, ['mousse', 'sporeling'], [], null, {}, false, [], 'autel-garde');
    let guard = 0;
    while (c.phase === 'player' && guard++ < 100) {
      c = combatReduce(c, { type: 'FLEE' }); // le bot fuit en boucle -> le compteur descend
      if (c.phase === 'fled') break;
    }
    // rejoue contre une garde résistante : attaque jusqu'à épuisement des tours
    c = startCombat(1, 10000, 10000, 0, ['cuirasse', 'cuirasse', 'amas'], [], null, {}, false, [], 'autel-garde');
    guard = 0;
    while (c.phase === 'player' && guard++ < 100) {
      const alive = c.enemies.findIndex((e) => e.hp > 0);
      c = combatReduce(c, { type: 'ATTACK', target: alive >= 0 ? alive : 0 });
    }
    expect(c.phase).toBe('challenge-failed'); // 15 tours écoulés, ennemis vivants
    expect(c.phase).not.toBe('lost'); // aucun état de mort
    expect(c.loot).toBeNull(); // pas de récompense
    expect(ALTAR.turns).toBeGreaterThanOrEqual(10);
    expect(ALTAR.turns).toBeLessThanOrEqual(20);
  });

  it('succès avant la limite -> récompense rare ajoutée au butin', () => {
    let c = startCombat(2, 100, 100, 6, ['mousse'], ['feu'], null, {}, false, [], 'autel-garde');
    let guard = 0;
    while (c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    }
    expect(c.phase).toBe('won');
    expect(c.loot).not.toBeNull();
    expect(c.loot!.credits).toBeGreaterThanOrEqual(ALTAR.reward.credits ?? 0);
  });

  it('l’autel du niveau déclenche un combat avec défi (INTERACT)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 6 });
    const altar = s.run!.level!.altars[0];
    expect(altar).toBeDefined();
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: altar.x, y: altar.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    expect(s.run!.challengeId).toBe('autel-garde');
  });
});
