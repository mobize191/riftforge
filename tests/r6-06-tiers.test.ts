import { describe, it, expect } from 'vitest';
// R6-06 — Tiers supérieurs Forge & Labo : tier 1 = communs seuls (jamais cassé),
// tiers 2+ = lingots puis composants puis ressources de biomes profonds ; 6 équipements
// au Marchand ; sauvegarde versionnée + migration v1 -> v2.
import { initialState, reduce } from '../src/core/run/state';
import { MERCHANT_ITEMS, CRAFTABLE_EQUIPMENT } from '../src/data/equipment';
import { RECIPES } from '../src/data/recipes';
import { SAVE_VERSION, serialize, deserialize, importSave, UnknownSaveVersionError } from '../src/core/save/save';

describe('R6-06 tiers supérieurs Forge & Labo', () => {
  it('6 équipements achetables au Marchand, 3+ craftables dont tiers 2+', () => {
    expect(MERCHANT_ITEMS.length).toBe(6);
    expect(CRAFTABLE_EQUIPMENT.length).toBeGreaterThanOrEqual(5); // 3 tier 1 + 3 tiers 2+
    const t2 = CRAFTABLE_EQUIPMENT.find((e) => e.id === 'lame-mercurielle')!;
    expect(t2.craftCost.lingots).toBeGreaterThan(0);
    expect(t2.craftCost.mercurium).toBeGreaterThan(0);
    const t3 = CRAFTABLE_EQUIPMENT.find((e) => e.id === 'armure-optifibre')!;
    expect(t3.craftCost.optifibre).toBeGreaterThan(0);
  });

  it('tier 1 toujours craftable avec les seuls communs ; tiers 2+ refusés sans les intrants', () => {
    // tier 1 (lame-arcane : essence + minerai + lingot... non, charmé) — on prend un craft tier 1 pur commun
    let s = initialState();
    s = { ...s, forge: { ...s.forge, essence: 5, mineraiBrut: 4, credits: 50, lingots: 2 } };
    const t1 = CRAFTABLE_EQUIPMENT.find((e) => e.id === 'charm-essence')!; // essence+lingots+credits
    s = reduce(s, { type: 'CRAFT_ITEM', defId: t1.id });
    expect(s.forge.equipment.some((e) => e.defId === t1.id)).toBe(true);
    // tier 2 refusé sans mercurium
    const before = s;
    s = reduce(s, { type: 'CRAFT_ITEM', defId: 'lame-mercurielle' });
    expect(s).toBe(before); // refus propre
    // avec mercurium + lingots -> OK
    s = { ...s, forge: { ...s.forge, mercurium: 2, lingots: 5, mineraiBrut: 10 } };
    s = reduce(s, { type: 'CRAFT_ITEM', defId: 'lame-mercurielle' });
    expect(s.forge.equipment.some((e) => e.defId === 'lame-mercurielle')).toBe(true);
    // tier 3 refusé sans optifibre
    const b2 = s;
    s = reduce(s, { type: 'CRAFT_ITEM', defId: 'armure-optifibre' });
    expect(s).toBe(b2);
    s = { ...s, forge: { ...s.forge, optifibre: 2, essence: 10, lingots: 5 } };
    s = reduce(s, { type: 'CRAFT_ITEM', defId: 'armure-optifibre' });
    expect(s.forge.equipment.some((e) => e.defId === 'armure-optifibre')).toBe(true);
  });

  it('recettes Labo par palier : tier 1 commun, tier 2 lingots, tier 3 ressource de biome', () => {
    const tier1 = RECIPES.find((r) => r.tier === 1)!;
    const tier2 = RECIPES.find((r) => r.tier === 2)!;
    const tier3 = RECIPES.find((r) => r.tier === 3)!;
    // tier 1 avec communs seuls
    let s = initialState();
    s = { ...s, forge: { ...s.forge, essence: 3, mineraiBrut: 3 } };
    s = reduce(s, { type: 'CRAFT_LAB_RECIPE', recipeId: tier1.id });
    expect(s.forge.unlockedRecipes).toContain(tier1.id);
    // tier 2 refusé sans lingots, OK avec
    let s2 = { ...s, forge: { ...s.forge, essence: 5, mineraiBrut: 5, unlockedRecipes: [] } };
    const before = s2;
    s2 = reduce(s2, { type: 'CRAFT_LAB_RECIPE', recipeId: tier2.id });
    expect(s2).toBe(before);
    s2 = { ...s2, forge: { ...s2.forge, lingots: 2 } };
    s2 = reduce(s2, { type: 'CRAFT_LAB_RECIPE', recipeId: tier2.id });
    expect(s2.forge.unlockedRecipes).toContain(tier2.id);
    // tier 3 exige mercurium
    let s3 = { ...s, forge: { ...s.forge, lingots: 5, essence: 5, unlockedRecipes: [] } };
    const b3 = s3;
    s3 = reduce(s3, { type: 'CRAFT_LAB_RECIPE', recipeId: tier3.id });
    expect(s3).toBe(b3);
    s3 = { ...s3, forge: { ...s3.forge, mercurium: 1 } };
    s3 = reduce(s3, { type: 'CRAFT_LAB_RECIPE', recipeId: tier3.id });
    expect(s3.forge.unlockedRecipes).toContain(tier3.id);
  });

  it('sauvegarde versionnée : round-trip v2 identique, migration v1 -> v2, version inconnue refusée', () => {
    expect(SAVE_VERSION).toBe(6); // v6 depuis B29 (placement bâtiments) // v4 depuis R7-01 (modificateurs de Faille)
    let s = reduce(initialState(), { type: 'START_RUN', seed: 5 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    const json = serialize(s);
    expect(deserialize(json)).toEqual(s); // round-trip
    // migration v1 -> v2 : champs manquants remplis
    const v1 = JSON.parse(serialize(s));
    v1.version = 1;
    delete v1.state.forge.donnees;
    delete v1.state.forge.runCompleted;
    const migrated = importSave(JSON.stringify(v1));
    expect(migrated.forge.donnees).toBe(0);
    expect(migrated.forge.mercurium).toBe(0);
    expect(migrated.forge.optifibre).toBe(0);
    expect(migrated.forge.runCompleted).toBe(false);
    expect(migrated.forge.allBiomesCleared).toBe(false);
    // version inconnue -> refus propre
    const v99 = JSON.parse(serialize(s));
    v99.version = 99;
    expect(() => importSave(JSON.stringify(v99))).toThrow(UnknownSaveVersionError);
  });
});
