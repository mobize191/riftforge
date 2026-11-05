import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { serialize, deserialize } from '../src/core/save/save';
import type { Orb } from '../src/core/types';

const orb = (element: 'feu' | 'eau' | 'terre' | 'air', id: string): Orb => ({
  id, kind: 'primordial', element, tier: 1,
});

describe('R4-07 grimoire pré-enregistré', () => {
  it('3 slots max, persistants via la save', () => {
    let s = initialState();
    for (let i = 0; i < 3; i++) {
      s = reduce(s, { type: 'SAVE_GRIMOIRE', slot: i, name: `Comp ${i}`, recipeIds: ['combustion'] });
    }
    expect(s.forge.grimoire).toHaveLength(3);
    expect(deserialize(serialize(s)).forge.grimoire).toHaveLength(3);
    // slot 3 refusé
    const before = s;
    s = reduce(s, { type: 'SAVE_GRIMOIRE', slot: 3, name: 'x', recipeIds: [] });
    expect(s).toBe(before);
  });

  it('exécution en un clic : crée les modules tier 1 puis fusionne la composition (E1)', () => {
    let s = initialState();
    s = reduce(s, { type: 'SAVE_GRIMOIRE', slot: 0, name: 'Burn', recipeIds: ['trait-incandescent', 'condensation', 'combustion'] });
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: { ...s.run!, orbs: [orb('feu', 'a'), orb('feu', 'b'), orb('eau', 'c'), orb('eau', 'd')] },
    };
    s = reduce(s, { type: 'EXEC_GRIMOIRE', slot: 0 });
    // la fusion consomme trait-incandescent + condensation, ne reste que combustion
    expect(s.run!.modules.map((m) => m.id)).toEqual(['combustion']);
    expect(s.run!.orbs).toHaveLength(1); // 1 feu + 2 eau consommés
  });

  it('exécution en un clic : la fusion ne touche jamais les modules déjà possédés', () => {
    let s = initialState();
    s = reduce(s, { type: 'SAVE_GRIMOIRE', slot: 0, name: 'Burn', recipeIds: ['combustion'] });
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: {
        ...s.run!,
        orbs: [orb('feu', 'a'), orb('feu', 'b'), orb('eau', 'c'), orb('eau', 'd')],
        modules: [{ id: 'trait-incandescent', name: 'Trait incandescent', tier: 1, effect: { kind: 'damage', power: 5 } }],
      },
    };
    s = reduce(s, { type: 'EXEC_GRIMOIRE', slot: 0 });
    // combustion est fusion-only : rien n'est créé, le trait déjà possédé n'est PAS consommé
    expect(s.run!.modules.map((m) => m.id)).toEqual(['trait-incandescent']);
    expect(s.run!.orbs).toHaveLength(4);
  });

  it('exécution stoppée si orbes insuffisantes', () => {
    let s = initialState();
    s = reduce(s, { type: 'SAVE_GRIMOIRE', slot: 0, name: 'Burn', recipeIds: ['trait-incandescent', 'condensation'] });
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = { ...s, run: { ...s.run!, orbs: [orb('feu', 'a'), orb('feu', 'b')] } };
    s = reduce(s, { type: 'EXEC_GRIMOIRE', slot: 0 });
    expect(s.run!.modules.map((m) => m.id)).toEqual(['trait-incandescent']); // condensation (2 eau) impossible
  });
});
