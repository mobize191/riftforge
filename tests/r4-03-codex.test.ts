import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, deserialize } from '../src/core/save/save';
import { craftableRecipes } from '../src/core/combat/createModule';
import { RECIPES } from '../src/data/recipes';
import type { Orb } from '../src/core/types';

const orb = (element: 'feu' | 'eau' | 'terre' | 'air', id: string): Orb => ({
  id, kind: 'primordial', element, tier: 1,
});

describe('R4-03 codex permanent', () => {
  it('découverte -> sauvegarde -> connue dans la run suivante', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: { ...s.run!, orbs: [orb('feu', 'a'), orb('feu', 'b'), orb('eau', 'c')] },
    };
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'combustion' });
    expect(s.run!.modules.map((m) => m.id)).toContain('combustion');
    expect(s.run!.discoveredRecipes).toContain('combustion');
    expect(s.run!.orbs).toHaveLength(1); // orbes consommées à la création
    // retour Forge : le codex persiste
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.discoveredRecipes).toContain('combustion');
    const reloaded = deserialize(serialize(s));
    expect(reloaded.forge.discoveredRecipes).toContain('combustion');
    // run suivante : la recette reste connue
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.discoveredRecipes).toContain('combustion');
  });

  it('en run, seules les recettes découvertes ET réalisables sont listées', () => {
    const orbs = [orb('feu', 'a'), orb('feu', 'b')];
    const all = craftableRecipes(orbs, RECIPES.map((r) => r.id)).map((r) => r.id);
    const onlyDiscovered = craftableRecipes(orbs, ['combustion']).map((r) => r.id);
    expect([...onlyDiscovered].sort()).toEqual(['combustion', 'trait-incandescent']);
    expect(all.length).toBeGreaterThan(onlyDiscovered.length);
  });
});
