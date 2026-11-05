import { describe, it, expect } from 'vitest';
// R7-03 — Modificateurs restants : chacun change exactement ce qu'il annonce,
// combinables et reproductibles par seed.
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { MONSTER_BY_ID } from '../src/data/monsters';
import { MONSTER_LEVEL_BONUS, ELITE, RARE_ORBS, BLURRED_AFFINITY_VALUES } from '../src/data/riftModifiers';
import { BALANCE } from '../src/data/balance';
import { affinityMultiplier } from '../src/data/affinities';

describe('R7-03 modificateurs de Faille', () => {
  it('monstres-niveaux : +PV/+ATQ exacts selon la data', () => {
    const base = startCombat(1, 20, 20, 4, ['mousse'], [], null, {}, false, [], undefined, []);
    const buffed = startCombat(1, 20, 20, 4, ['mousse'], [], null, {}, false, [], undefined, ['monstres-niveaux']);
    const m = MONSTER_BY_ID['mousse'];
    expect(base.enemies[0].hp).toBe(m.hp);
    expect(buffed.enemies[0].hp).toBe(m.hp + MONSTER_LEVEL_BONUS.levels * MONSTER_LEVEL_BONUS.hpPerLevel);
    expect(buffed.enemies[0].attack).toBe(m.attack + MONSTER_LEVEL_BONUS.levels * MONSTER_LEVEL_BONUS.atkPerLevel);
  });

  it('élites : monstre buffé et visible (nom préfixé, stats ELITE)', () => {
    const c = startCombat(1, 20, 20, 4, ['elite-mousse'], [], null, {}, false, [], undefined, ['elites']);
    const e = c.enemies[0];
    expect(e.name).toContain(ELITE.namePrefix);
    expect(e.maxHp).toBe(MONSTER_BY_ID['mousse'].hp * ELITE.hpMultiplier);
    expect(e.attack).toBe(MONSTER_BY_ID['mousse'].attack + ELITE.attackBonus);
  });

  it('affinités brouillées : multiplicateur tiré dans les valeurs mélangées (seedé)', () => {
    // mousse faible contre feu (x1.5) ; brouillé -> valeur du tableau, reproductible
    const cast = (seed: number) => {
      let c = startCombat(seed, 20, 20, 4, ['mousse'], ['feu'], null, {}, false, [], undefined, ['affinites-brouillees']);
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
      return c.enemies[0].hp;
    };
    const a = cast(7);
    const b = cast(7);
    expect(a).toBe(b); // reproductible par seed
    const normal = 8 - Math.round(5 * affinityMultiplier('feu', MONSTER_BY_ID['mousse']));
    const possible = BLURRED_AFFINITY_VALUES.map((v) => Math.max(0, 9 - Math.round((5 + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]) * v)));
    expect(possible).toContain(a);
    void normal;
  });

  it('orbes-rares : drops d’orbes divisés (en data), combinables avec les autres', () => {
    const lootOf = (seed: number, mods: string[]) => {
      let c = startCombat(seed, 99, 99, 99, ['mousse'], [], null, {}, false, ['deflagration'], undefined, mods);
      let guard = 0;
      while (c.phase === 'player' && guard++ < 20) c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
      return c.loot;
    };
    const normal = lootOf(5, []);
    const rare = lootOf(5, ['orbes-rares']);
    expect(rare).not.toBeNull();
    expect(normal).not.toBeNull();
    expect(rare!.orbs.length).toBe(Math.floor(normal!.orbs.length / RARE_ORBS.lootOrbCountDivisor));
    // combinable : orbes-rares + monstres-niveaux en même temps
    const both = startCombat(5, 99, 99, 99, ['mousse'], [], null, {}, false, [], undefined, ['orbes-rares', 'monstres-niveaux']);
    expect(both.modifiers).toEqual(['orbes-rares', 'monstres-niveaux']);
    expect(both.enemies[0].maxHp).toBe(MONSTER_BY_ID['mousse'].hp + MONSTER_LEVEL_BONUS.levels * MONSTER_LEVEL_BONUS.hpPerLevel);
  });
});
