import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { BOSS_BIOME_1 } from '../src/data/bosses';

function botBoss(seed: number) {
  let c = startCombat(seed, 20, 20, 4, ['boss:racine-mere'], ['feu', 'feu', 'feu']);
  let guard = 0;
  while (c.phase === 'player' && guard++ < 100) {
    const heal = c.items.find((i) => i.def.kind === 'heal' && i.usesLeft > 0);
    if (c.player.hp < 8 && heal) {
      c = combatReduce(c, { type: 'USE_ITEM', itemId: heal.def.id });
      continue;
    }
    // le boss est faible au feu : trait incandescent (5 x1.5 = 8)
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
  }
  return c;
}

describe('R5-01 boss du biome 1', () => {
  it('le pattern est reproductible depuis un seed (télégraphies identiques)', () => {
    const a = botBoss(7);
    const b = botBoss(7);
    expect(a.log).toEqual(b.log);
    expect(a.phase).toBe(b.phase);
    // le boss télégraphie bien avant d'attaquer
    expect(a.log.some((l) => l.includes('prépare'))).toBe(true);
  });

  it('3 phases selon les PV', () => {
    expect(BOSS_BIOME_1.phases).toHaveLength(3);
  });

  it('vainquable avec le kit de départ (au moins 1 victoire sur 200 seeds)', () => {
    let wins = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (botBoss(seed * 97).phase === 'won') wins++;
    }
    console.log(`[R5-01] boss battu avec le kit de départ dans ${wins}/200 combats simulés`);
    expect(wins).toBeGreaterThan(0);
  });
});
