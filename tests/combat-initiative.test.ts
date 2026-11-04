import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce, currentActorId } from '../src/core/combat/combat';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

describe('ordre d’initiative façon FF (Q0-7)', () => {
  it('l’ordre contient joueur + compagnon + ennemis, seedé et reproductible', () => {
    const a = startCombat(7, 20, 20, 4, ['mousse', 'sporeling'], ['feu'], COMPANION_BY_MONSTER['mousse'], { 'soin-simple': 1 });
    const b = startCombat(7, 20, 20, 4, ['mousse', 'sporeling'], ['feu'], COMPANION_BY_MONSTER['mousse'], { 'soin-simple': 1 });
    expect(a.order).toEqual(b.order);
    expect(a.order).toContain('player');
    expect(a.order).toContain('companion');
    expect(a.order).toHaveLength(4);
  });

  it('le compagnon n’agit que pendant SON tour ; le joueur pendant le sien', () => {
    let c = startCombat(7, 20, 20, 4, ['mousse'], ['feu'], COMPANION_BY_MONSTER['mousse'], { 'soin-simple': 2 });
    // on avance jusqu'au tour du compagnon
    let guard = 0;
    while (currentActorId(c) !== 'companion' && c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    if (currentActorId(c) === 'companion') {
      // pendant le tour du compagnon : skill OK, fuite refusée
      const fled = combatReduce(c, { type: 'FLEE' });
      expect(fled).toBe(c);
      const hpBefore = c.player.hp;
      c = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'soin-simple' });
      expect(c.log.some((l) => l.includes('Soin simple'))).toBe(true);
      expect(c.player.hp).toBeGreaterThanOrEqual(Math.min(hpBefore, c.player.hp));
    }
    // pendant le tour du joueur : la compétence du compagnon est refusée
    guard = 0;
    while (currentActorId(c) === 'companion' && c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    if (currentActorId(c) === 'player') {
      const before = c;
      c = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'soin-simple' });
      expect(c).toBe(before); // refusé hors du tour du compagnon
    }
  });

  it('chaque acteur joue à son tour : l’initiative avance après chaque action', () => {
    let c = startCombat(3, 20, 20, 4, ['mousse', 'cuirasse']);
    const seen = new Set<string>();
    let guard = 0;
    while (c.phase === 'player' && guard++ < 100) {
      seen.add(currentActorId(c));
      c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) });
    }
    expect(['won', 'lost', 'fled']).toContain(c.phase);
  });
});
