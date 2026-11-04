import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

const MOUSSE = COMPANION_BY_MONSTER['mousse'];

describe('R3-02 compagnon générique & support soins', () => {
  it('le compagnon agit à son initiative et soigne, sans consommer d’orbes', () => {
    let c = startCombat(1, 6, 20, 4, ['mousse'], ['feu'], MOUSSE, { 'soin-simple': 2 });
    const orbsBefore = [...c.orbs];
    c = combatReduce(c, { type: 'ATTACK', target: 0 }); // riposte -> PV perdus, puis le compagnon agit
    expect(c.player.hp).toBeGreaterThanOrEqual(6); // soigné (niv 2 x 2 = +4) malgré la riposte éventuelle
    expect(c.orbs).toEqual(orbsBefore); // aucune consommation d'orbes
    expect(c.log.some((l) => l.includes('Soin'))).toBe(true);
  });

  it('arbre de 5 compétences, support = soin', () => {
    expect(MOUSSE.support).toBe('soin');
    expect(MOUSSE.skills).toHaveLength(5);
  });

  it('un compagnon K.O. n’agit plus', () => {
    let c = startCombat(1, 20, 20, 4, ['amas', 'amas'], [], MOUSSE, { 'soin-simple': 3 }, true);
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
    expect(c.companion!.ko).toBe(true);
    expect(c.log.some((l) => l.includes('Soin'))).toBe(false);
  });
});
