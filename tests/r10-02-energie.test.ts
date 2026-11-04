import { describe, it, expect } from 'vitest';
import { startCombat, combatReduce, moduleEnergyCost } from '../src/core/combat/combat';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';

// R10-02 (décision D1) — énergie de combat : régénération par round, plafond,
// conservation intra-combat, reset à chaque combat, coûts par action/palier,
// refus propre, compagnon non soumis.

function mkCombat(overrides: Partial<Parameters<typeof startCombat>> = {}) {
  const o = overrides as Record<string, unknown>;
  return startCombat(
    (o.seed as number) ?? 42,
    (o.playerHp as number) ?? 20,
    (o.playerMaxHp as number) ?? 20,
    (o.playerAttack as number) ?? 4,
    (o.enemyIds as string[]) ?? ['mousse'],
    (o.orbs as never) ?? [],
    (o.companionDef as never) ?? null,
    (o.companionSkills as never) ?? {},
    (o.companionKo as never) ?? false,
    (o.modules as string[]) ?? [],
  );
}

describe('R10-02 — énergie de combat (D1)', () => {
  it('démarre au niveau de départ, plafond respecté, régénération par round', () => {
    const c = mkCombat();
    expect(c.energy).toBe(BALANCE.COMBAT_ENERGY_START);
    // Attaques à répétition : l'énergie ne dépasse jamais le plafond et remonte par round.
    let s = c;
    for (let i = 0; i < 12 && s.phase === 'player'; i++) {
      s = combatReduce(s, { type: 'ATTACK', target: 0 });
      expect(s.energy).toBeLessThanOrEqual(BALANCE.COMBAT_ENERGY_MAX);
      expect(s.energy).toBeGreaterThanOrEqual(0);
    }
  });

  it('reset à chaque nouveau combat (startCombat remet au niveau de départ)', () => {
    const c = mkCombat();
    let s = c;
    for (let i = 0; i < 6 && s.phase === 'player'; i++) s = combatReduce(s, { type: 'ATTACK', target: 0 });
    const again = mkCombat();
    expect(again.energy).toBe(BALANCE.COMBAT_ENERGY_START);
  });

  it('invariant D1 : aucun module de tier >= 2 ne peut être lancé à chaque tour', () => {
    // cost(tier) > regen pour tout tier >= 2, sur toute la table des recettes.
    for (const r of RECIPES) {
      const cost = moduleEnergyCost(r);
      if (r.tier >= 2) expect(cost, `${r.id} (tier ${r.tier})`).toBeGreaterThan(BALANCE.COMBAT_ENERGY_REGEN);
    }
    expect(moduleEnergyCost(RECIPE_BY_ID['deflagration'])).toBeGreaterThan(BALANCE.COMBAT_ENERGY_REGEN);
  });

  it('rotation forcée : Déflagration (tier 3) ne peut pas être lancée à chaque tour', () => {
    let c = mkCombat({ modules: ['deflagration'], enemyIds: ['amas'] }); // amas (11 PV) survit au blast
    const cost = moduleEnergyCost(RECIPE_BY_ID['deflagration']);
    // Premier cast : OK (énergie suffisante).
    let s = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
    expect(s.log.some((l) => l.includes('Déflagration'))).toBe(true);
    // Boucle : le refus finit par tomber (cost > regen), avec message FR et sans avancer le tour.
    let refused = false;
    for (let i = 0; i < 8 && !refused && s.phase === 'player'; i++) {
      const before = s;
      const next = combatReduce(s, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
      if (next.log.some((l) => l.includes("Pas assez d'énergie"))) {
        expect(next.actorIdx).toBe(before.actorIdx); // le tour n'avance pas
        expect(next.energy).toBe(before.energy); // aucune dépense
        refused = true;
      } else {
        s = next;
      }
    }
    expect(refused).toBe(true);
    expect(cost).toBeGreaterThan(BALANCE.COMBAT_ENERGY_REGEN);
  });

  it('refus propre : attaque à 0 énergie -> message FR, aucun effet', () => {
    let c = mkCombat();
    c = { ...c, energy: 0 };
    const before = c;
    const after = combatReduce(c, { type: 'ATTACK', target: 0 });
    expect(after.log.some((l) => l.includes("Pas assez d'énergie"))).toBe(true);
    expect(after.actorIdx).toBe(before.actorIdx);
    expect(after.enemies).toEqual(before.enemies); // pas de dégâts
    expect(after.energy).toBe(0);
  });

  it('le compagnon n\'est pas soumis à l\'énergie', () => {
    const c = mkCombat();
    // force un tour de compagnon avec 0 énergie
    let s = {
      ...c,
      energy: 0,
      order: ['companion', 'player', ...c.enemies.map((e) => e.id)],
      actorIdx: 0,
    };
    // le compagnon attaque gratuitement même à 0 énergie
    const hpBefore = s.enemies[0].hp;
    const s2 = combatReduce(s, { type: 'ATTACK', target: 0 });
    expect(s2.enemies[0].hp).toBeLessThanOrEqual(hpBefore);
    expect(s2.log.some((l) => l.includes("Pas assez d'énergie"))).toBe(false);
  });

  it('fusion en combat : coûte le tour mais pas d\'énergie', () => {
    let c = mkCombat({ orbs: ['feu', 'feu'] }); // feu+feu = combustion (feu/eau s'annulent)
    const e0 = c.energy;
    const s = combatReduce(c, { type: 'FUSE_IN_COMBAT', indices: [0, 1] });
    expect(s.log.some((l) => l.includes('Fusion en combat'))).toBe(true);
    expect(s.energy).toBeLessThanOrEqual(e0); // pas de coût énergie (le tour passe via advance)
  });
});
