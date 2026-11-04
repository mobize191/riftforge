import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce, type CombatState, type CombatAction } from '../src/core/combat/combat';
import { initialState, reduce } from '../src/core/run/state';

function playCombat(seed: number, script: CombatAction[]): CombatState {
  let c = startCombat(seed, 20, 20, 4, ['mousse']);
  for (const a of script) c = combatReduce(c, a);
  return c;
}

describe('R1-03 full menu combat', () => {
  it('a full combat is reproducible from a seed', () => {
    const script: CombatAction[] = [
      { type: 'ATTACK', target: 0 },
      { type: 'ATTACK', target: 0 },
      { type: 'ATTACK', target: 0 },
      { type: 'ATTACK', target: 0 },
    ];
    const a = playCombat(11, script);
    const b = playCombat(11, script);
    expect(a).toEqual(b);
    expect(a.phase).toBe('won');
    expect(a.loot).not.toBeNull();
    expect(a.loot!.credits).toBeGreaterThan(0);
  });

  it('defeat ends the run but keeps the loot (100%)', () => {
    let s = initialState();
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['amas'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 12, orbs: ["feu"], kills: 1, essence: 0, minerai: 0, captured: [] } });
    expect(s.run?.lootCredits).toBe(12);
    s = reduce(s, { type: 'DIE' });
    expect(s.mode).toBe('RETOUR');
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.forge.credits).toBe(12);
  });

  it('items heal / damage and consume a use', () => {
    let c = startCombat(5, 5, 20, 4, ['cuirasse']);
    c = combatReduce(c, { type: 'USE_ITEM', itemId: 'gelule-soin' });
    // soin +6 -> 11, puis riposte du cuirassé (ATK 2) -> 9
    expect(c.player.hp).toBe(9);
    expect(c.items.find((i) => i.def.id === 'gelule-soin')!.usesLeft).toBe(0);
  });

  it('flee is seeded: same seed same outcome', () => {
    const a = combatReduce(startCombat(9, 20, 20, 4, ['mousse']), { type: 'FLEE' });
    const b = combatReduce(startCombat(9, 20, 20, 4, ['mousse']), { type: 'FLEE' });
    expect(a.phase).toBe(b.phase);
  });
});
