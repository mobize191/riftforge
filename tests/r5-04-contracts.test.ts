import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { checkContract, CONTRACTS } from '../src/core/forge/contracts';
import { CONTRACTS as DATA } from '../src/data/contracts';

const bossSolo = DATA.find((c) => c.id === 'boss-solo')!;
const profondeur = DATA.find((c) => c.id === 'profondeur-3')!;

describe('R5-04 contrats du Marchand', () => {
  it('condition remplie -> prime versée au retour ; échouée -> rien', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 3 }); // sans compagnon -> journal 'no-companion'
    // simule une victoire de boss
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['boss:racine-mere'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 50, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    expect(s.mode).toBe('RETOUR');
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.claimedContracts).toContain('boss-solo');
    expect(s.forge.credits).toBe(50 + (bossSolo.reward.credits ?? 0));
  });

  it('condition échouée (boss tué AVEC compagnon) -> pas de prime', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['boss:racine-mere'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 50, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.claimedContracts).not.toContain('boss-solo');
  });

  it('journal complet : floor-N journalisé, contrat profondeur vérifiable', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'NEXT_FLOOR' });
    s = reduce(s, { type: 'NEXT_FLOOR' });
    expect(s.run!.journal).toContain('floor-3');
    expect(checkContract({ events: s.run!.journal, lootSpores: 0 }, profondeur)).toBe(true);
    expect(checkContract({ events: ['start'], lootSpores: 0 }, profondeur)).toBe(false);
    expect(CONTRACTS.length).toBeGreaterThanOrEqual(2);
  });
});
