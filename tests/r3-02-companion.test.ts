import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

const MOUSSE = COMPANION_BY_MONSTER['mousse'];

describe('R3-02 compagnon générique & support soins', () => {
  it('le joueur déclenche la compétence du compagnon (gratuite, sans orbes), 1 fois/tour', () => {
    let c = startCombat(1, 6, 20, 4, ['mousse'], ['feu'], MOUSSE, { 'soin-simple': 2 });
    const orbsBefore = [...c.orbs];
    const hpBefore = c.player.hp;
    c = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'soin-simple' }); // +4 PV, puis riposte
    expect(c.player.hp).toBeGreaterThan(hpBefore - 2); // soigné malgré la riposte
    expect(c.orbs).toEqual(orbsBefore); // aucune consommation d'orbes
    expect(c.log.some((l) => l.includes('Soin'))).toBe(true);
    // compétence non débloquée -> refusée
    const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'soin-majeur' });
    expect(after).toBe(c);
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
