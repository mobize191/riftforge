import { describe, it, expect } from 'vitest';
import type { ElementId, GameState, Orb, Recipe } from '../src/core/types';

describe('R0-02 core types', () => {
  it('types are usable under strict mode', () => {
    const el: ElementId = 'feu';
    const orb: Orb = { id: 'feu-1', kind: 'primordial', element: el, tier: 1 };
    const recipe: Recipe = { id: 'vapeur', moduleId: 'vapeur', inputs: ['feu', 'eau'], tier: 2 };
    const state: GameState = {
      mode: 'FORGE',
      forge: { credits: 0, essence: 0, mineraiBrut: 0 },
      run: null,
    };
    expect(orb.element).toBe('feu');
    expect(recipe.inputs).toHaveLength(2);
    expect(state.mode).toBe('FORGE');
  });
});
