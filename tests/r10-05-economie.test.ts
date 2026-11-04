import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { CRAFTABLE_EQUIPMENT, MERCHANT_ITEMS } from '../src/data/equipment';
import { STORAGE_CAPS } from '../src/data/buildings';
import { storageCap } from '../src/core/forge/caps';

// R10-05 (décision D4) — économie ralentie, data uniquement.
// Simu : un bot qui meurt au biome 1 pendant 20 runs ne peut PAS acheter
// tout le meilleur équipement (haut de gamme exige mercurium/optifibre,
// inaccessibles sans biomes 3-4) ; le tier 1 reste accessible aux communs.

function runQuiMeurtAuBiome1(s: ReturnType<typeof initialState>, seed: number) {
  s = reduce(s, { type: 'START_RUN', seed });
  s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
  let c = startCombat(
    (s.run!.seed ^ (s.run!.floor * 7919)) >>> 0,
    s.run!.playerHp, s.run!.playerMaxHp, s.run!.playerAttack,
    s.run!.encounter!, [], null, {}, false, [],
  );
  let guard = 0;
  while (c.phase === 'player' && guard++ < 60) {
    c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) >= 0 ? c.enemies.findIndex((e) => e.hp > 0) : 0 });
  }
  s = reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined, playerHp: c.player.hp });
  s = reduce(s, { type: 'DIE' });
  s = reduce(s, { type: 'RETURN_FORGE' });
  // 10 minutes de production à la Forge entre deux runs
  s = reduce(s, { type: 'ADVANCE_TICKS', ticks: 600 });
  return s;
}

describe('R10-05 — économie ralentie (D4)', () => {
  it('20 morts au biome 1 : haut de gamme inaccessible, tier 1 accessible aux communs', () => {
    let s = initialState();
    for (let i = 1; i <= 20; i++) s = runQuiMeurtAuBiome1(s, i * 7919);
    const f = s.forge;
    console.log(
      `[R10-05] 20 runs mortes au biome 1 : crédits=${f.credits} essence=${f.essence} minerai=${f.mineraiBrut} lingots=${f.lingots} mercurium=${f.mercurium} optifibre=${f.optifibre}`,
    );
    // Jamais atteint les biomes 3-4 -> aucune ressource profonde.
    expect(f.mercurium).toBe(0);
    expect(f.optifibre).toBe(0);
    // Le haut de gamme (mercure/optifibre) est inaccessible : ces recettes ne sont pas craftables.
    const hautDeGamme = CRAFTABLE_EQUIPMENT.filter((e) => e.craftCost.mercurium || e.craftCost.optifibre);
    expect(hautDeGamme.length).toBeGreaterThan(0);
    for (const item of hautDeGamme) {
      const affordable = Object.entries(item.craftCost).every(
        ([k, v]) => ((f as unknown as Record<string, number>)[k] ?? 0) >= (v ?? 0),
      );
      expect(affordable, `${item.id} ne doit pas être craftable après 20 morts au biome 1`).toBe(false);
    }
    // Le tier 1 (Marchand, crédits = commun) reste accessible : on peut acheter la lame rouillée.
    const lame = MERCHANT_ITEMS.find((i) => i.id === 'lame-rustique')!;
    const before = s;
    const after = reduce(s, { type: 'BUY_ITEM', defId: lame.id });
    expect(after).not.toBe(before); // achat accepté
    expect(after.forge.equipment.some((e) => e.defId === lame.id)).toBe(true);
  });

  it('caps de stockage plus stricts appliqués', () => {
    // caps de base (avant multiplicateur d'entrepôt) resserrés en data
    expect(STORAGE_CAPS.credits).toBeLessThanOrEqual(200); // 500 -> 150
    expect(STORAGE_CAPS.mercurium).toBeLessThanOrEqual(10); // 20 -> 8
    expect(STORAGE_CAPS.lingots).toBeLessThanOrEqual(12); // 25 -> 10
    const s = initialState();
    expect(storageCap(s, 'credits')).toBe(STORAGE_CAPS.credits * 2); // entrepot niv 1 = x2
  });
});
