import { describe, it, expect } from 'vitest';
// R7-04 — Récompenses exclusives : bonus de butin UNIQUEMENT avec modificateurs actifs,
// élite capturable = compagnon à stats supérieures (distingué en data).
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { RIFT_REWARD_PER_MODIFIER } from '../src/data/riftModifiers';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { BIOME_ORDER } from '../src/data/biomes';

describe('R7-04 récompenses exclusives de Faille', () => {
  it('bonus de fin de run UNIQUEMENT si des modificateurs étaient actifs', () => {
    // sans modificateur : aucun bonus
    let s = reduce(initialState(), { type: 'START_RUN', seed: 5 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    const creditsSans = s.forge.credits;
    const optiSans = s.forge.optifibre;
    // avec 2 modificateurs actifs sur le biome 1
    let s2 = initialState();
    s2 = { ...s2, forge: { ...s2.forge, allBiomesCleared: true, riftModifiers: { [BIOME_ORDER[0]]: ['elites', 'orbes-rares'] } } };
    s2 = reduce(s2, { type: 'START_RUN', seed: 5 });
    s2 = reduce(s2, { type: 'DIE' });
    s2 = reduce(s2, { type: 'RETURN_FORGE' });
    expect(s2.forge.credits).toBe(creditsSans + 2 * (RIFT_REWARD_PER_MODIFIER.credits ?? 0));
    expect(s2.forge.essence).toBe(2 * (RIFT_REWARD_PER_MODIFIER.essence ?? 0));
    expect(s2.forge.optifibre).toBe(optiSans + 2);
  });

  it('élite capturée = compagnon distingué, à stats supérieures (data)', () => {
    // capture d'une élite en combat (PV abaissés -> chance élevée, on réessaie seedé)
    let captured: string[] = [];
    for (let seed = 1; seed <= 20 && captured.length === 0; seed++) {
      let c = startCombat(seed, 50, 50, 3, ['elite-mousse'], [], null, {}, false, [], undefined, ['elites']);
      let guard = 0;
      while (c.phase === 'player' && guard++ < 40 && captured.length === 0) {
        const alive = c.enemies.findIndex((e) => e.hp > 0);
        c = combatReduce(c, { type: 'CAPTURE', target: alive });
        captured = c.captured;
      }
    }
    expect(captured.some((id) => id.startsWith('elite-'))).toBe(true);
    // le compagnon élite existe en data avec des soins supérieurs au compagnon de base
    const elite = COMPANION_BY_MONSTER['elite-mousse'];
    const base = COMPANION_BY_MONSTER['mousse'];
    expect(elite).toBeDefined();
    expect(elite!.name).toContain('Élite');
    const eliteHeal = elite!.skills.reduce((a, s) => a + s.healPerLevel, 0);
    const baseHeal = base!.skills.reduce((a, s) => a + s.healPerLevel, 0);
    expect(eliteHeal).toBeGreaterThan(baseHeal);
  });
});
