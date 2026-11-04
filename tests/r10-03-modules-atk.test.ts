import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';
import { MERCHANT_ITEMS } from '../src/data/equipment';
import { MONSTERS_BY_FAMILY, MONSTER_BY_ID } from '../src/data/monsters';
import { AFFINITY } from '../src/data/affinities';

// R10-03 (décision D2) — modules indexés sur l'ATK par palier, nerf des armes
// (jamais de one-shot d'un trash du biome 1 avec la meilleure arme tier 1),
// retours d'affinité « Résisté ! » / « Faiblesse ! » dans le log.

describe('R10-03 — modules indexés sur ATK + retours d\'affinité (D2)', () => {
  it('un module lancé avec ATQ 12 inflige strictement plus qu\'avec ATQ 4', () => {
    const recipe = RECIPE_BY_ID['combustion']; // tier 2, dégâts 9, feu
    const low = startCombat(3, 20, 20, 4, ['cuirasse'], ['feu', 'feu'], null, {}, false, ['combustion']); // 13 PV : pas de cap
    const high = startCombat(3, 20, 20, 12, ['cuirasse'], ['feu', 'feu'], null, {}, false, ['combustion']);
    const dmgOf = (c: typeof low) => {
      const c2 = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'combustion', target: 0 });
      return c.enemies[0].maxHp - c2.enemies[0].hp;
    };
    const dLow = dmgOf(low);
    const dHigh = dmgOf(high);
    expect(dHigh).toBeGreaterThan(dLow);
    // et conforme à la formule data : base + ATQ x ratio[palier]
    expect(dLow).toBe(Math.round((recipe.effect.power + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[2]) * 1));
    expect(dHigh).toBeGreaterThan(dLow);
  });

  it('le ratio ATK augmente avec le palier (tier 3 scale plus que tier 1)', () => {
    const t = BALANCE.MODULE_ATK_SCALING_BY_TIER;
    expect(t[2]).toBeGreaterThan(t[1]);
    expect(t[3]).toBeGreaterThan(t[2]);
    // toute la table des recettes a un ratio défini
    for (const r of RECIPES) expect(t[r.tier]).toBeGreaterThan(0);
  });

  it('aucune arme tier 1 (commune) ne one-shot un trash du biome 1', () => {
    const trash = MONSTERS_BY_FAMILY['spore'];
    const minTrashHp = Math.min(...trash.map((m) => m.hp));
    // meilleur équipement tier 1 = somme des attackBonus du set marchand (1 par slot)
    const slots = ['arme', 'armure', 'bouclier', 'accessoire'] as const;
    const bestSetAtk = slots.reduce(
      (acc, slot) => acc + Math.max(0, ...MERCHANT_ITEMS.filter((i) => i.slot === slot).map((i) => i.attackBonus)),
      0,
    );
    const maxHit = BALANCE.PLAYER_ATTACK + bestSetAtk + 1; // +1 = variance maxi du core
    expect(maxHit).toBeLessThan(minTrashHp);
  });

  it('retours d\'affinité dans le log : Faiblesse ! (feu sur mousse) et Résisté ! (eau sur mousse)', () => {
    // mousse : faible feu, résistante eau
    let c = startCombat(1, 20, 20, 4, ['mousse'], ['feu']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.log.some((l) => l.includes('Faiblesse !'))).toBe(true);

    c = startCombat(2, 20, 20, 4, ['mousse'], ['eau']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'jet-pression', target: 0 });
    expect(c.log.some((l) => l.includes('Résisté !'))).toBe(true);

    // neutre : aucun marqueur
    c = startCombat(3, 20, 20, 4, ['mousse'], ['terre']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'ecran-gravats', target: 0 }); // bouclier, pas de dégâts
    void c;
    c = startCombat(4, 20, 20, 4, ['sporeling'], ['feu']); // sporeling neutre au feu
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(c.log.some((l) => l.includes('Faiblesse !') || l.includes('Résisté !'))).toBe(false);
  });

  it('les dégâts respectent toujours le multiplicateur d\'affinité (weakness x1.5)', () => {
    const mousse = MONSTER_BY_ID['mousse'];
    const expected = Math.round((5 + 4 * BALANCE.MODULE_ATK_SCALING_BY_TIER[1]) * AFFINITY.weakness);
    const c = startCombat(1, 20, 20, 4, ['mousse'], ['feu']);
    const c2 = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'trait-incandescent', target: 0 });
    expect(mousse.hp - c2.enemies[0].hp).toBe(expected);
  });
});
