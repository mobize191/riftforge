import { describe, it, expect } from 'vitest';
// B27 + R9 : HUD « Au tour de » (compagnon visible) + effets des modules affichés +
// modules scalés avec l'attaque du joueur (BALANCE.MODULE_ATK_SCALING_BY_TIER, en data).
import { startCombat, combatReduce, actorLabel, moduleEffectLabel } from '../src/core/combat/combat';
import { RECIPES } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

describe('HUD combat : acteur courant et effets de modules', () => {
  it('actorLabel affiche le compagnon quand c’est son tour', () => {
    // trouve un seed où le compagnon joue en premier
    let found = false;
    for (let seed = 1; seed <= 50 && !found; seed++) {
      const c = startCombat(seed, 20, 20, 4, ['mousse'], [], COMPANION_BY_MONSTER['mousse'], { 'soin-simple': 1 });
      if (c.phase === 'player' && c.order[c.actorIdx % c.order.length] === 'companion') {
        expect(actorLabel(c)).toContain('Mousse sporulée');
        found = true;
      }
    }
    expect(found).toBe(true);
    const c2 = startCombat(1, 20, 20, 4, ['mousse']);
    if (c2.order[c2.actorIdx % c2.order.length] === 'player') expect(actorLabel(c2)).toContain('vous');
  });

  it('moduleEffectLabel décrit chaque effet en FR (affiché dans l’UI)', () => {
    expect(moduleEffectLabel(RECIPES.find((r) => r.id === 'trait-incandescent')!)).toBe('dégâts 5');
    expect(moduleEffectLabel(RECIPES.find((r) => r.id === 'condensation')!)).toBe('soin 6 PV');
    expect(moduleEffectLabel(RECIPES.find((r) => r.id === 'ecran-gravats')!)).toBe('bouclier 6');
    expect(moduleEffectLabel(RECIPES.find((r) => r.id === 'magma')!)).toContain('poison');
  });

  it('les modules scalent avec l’attaque du joueur (valeur en data)', () => {
    const recipe = RECIPES.find((r) => r.id === 'trait-incandescent')!; // dégâts 5, feu
    const low = startCombat(3, 20, 20, 4, ['sporeling'], ['feu'], null, {}, false, ['trait-incandescent']); // ATQ 4, sporeling neutre feu
    const high = startCombat(3, 20, 20, 12, ['sporeling'], ['feu'], null, {}, false, ['trait-incandescent']); // ATQ 12
    const dmgOf = (c: typeof low) => {
      const c2 = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
      return c.enemies[0].maxHp - c2.enemies[0].hp;
    };
    const dLow = dmgOf(low);
    const dHigh = dmgOf(high);
    expect(dLow).toBe(Math.round(5 + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1])); // power + ATQ x scaling
    expect(dHigh).toBe(Math.round(5 + 12 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]));
    expect(dHigh).toBeGreaterThan(dLow);
  });
});
