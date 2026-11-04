import { describe, it, expect } from 'vitest';
// R6-08 — Contrats étendus : 6-8 contrats multi-biomes, conditions vérifiées depuis le
// journal de run, prime versée une seule fois.
import { initialState, reduce } from '../src/core/run/state';
import { checkContract, settleContracts, CONTRACTS } from '../src/core/forge/contracts';

describe('R6-08 contrats étendus multi-biomes', () => {
  it('6-8 contrats, chacun avec une condition vérifiable depuis le journal', () => {
    expect(CONTRACTS.length).toBeGreaterThanOrEqual(6);
    expect(CONTRACTS.length).toBeLessThanOrEqual(8);
    for (const c of CONTRACTS) expect(c.condition.type).toBeTruthy();
  });

  it('boss-killed-<id> évalué depuis le journal (boss des Datacathédrales)', () => {
    const c = CONTRACTS.find((x) => x.id === 'boss-index')!;
    expect(checkContract({ events: ['start', 'biome-datacathedrales', 'boss-killed', 'boss:grand-index'], lootSpores: 0 }, c)).toBe(true);
    expect(checkContract({ events: ['start', 'boss-killed', 'boss:racine-mere'], lootSpores: 0 }, c)).toBe(false);
  });

  it('no-burn-crossing : Hauts-Fourneaux traversés sans brûlure', () => {
    const c = CONTRACTS.find((x) => x.id === 'fournaise-propre')!;
    expect(checkContract({ events: ['biome-hauts-fourneaux', 'boss:coeur-fournaise'], lootSpores: 0 }, c)).toBe(true);
    expect(checkContract({ events: ['biome-hauts-fourneaux', 'brulure', 'boss:coeur-fournaise'], lootSpores: 0 }, c)).toBe(false);
    expect(checkContract({ events: ['biome-datacathedrales'], lootSpores: 0 }, c)).toBe(false);
  });

  it('harvest-resource sur les ressources de biomes 2-4 (lootBiome)', () => {
    const c = CONTRACTS.find((x) => x.id === 'archiviste')!;
    expect(checkContract({ events: [], lootSpores: 0, lootBiome: { donnees: 5 } }, c)).toBe(true);
    expect(checkContract({ events: [], lootSpores: 0, lootBiome: { donnees: 4 } }, c)).toBe(false);
    const m = CONTRACTS.find((x) => x.id === 'forgeron-froid')!;
    expect(checkContract({ events: [], lootSpores: 0, lootBiome: { mercurium: 5 } }, m)).toBe(true);
  });

  it('prime versée une seule fois au retour Forge (contrat déjà réclamé -> rien)', () => {
    let s = initialState();
    s = reduce(s, { type: 'START_RUN', seed: 9 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['boss:grand-index'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 10, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.claimedContracts).toContain('boss-index');
    const donnees = s.forge.donnees;
    expect(donnees).toBe(3); // prime du contrat
    // deuxième run remplissant la même condition : pas de double prime
    s = reduce(s, { type: 'START_RUN', seed: 10 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['boss:grand-index'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 10, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.donnees).toBe(donnees);
  });

  it('settleContracts verse les primes en ressources de biomes (donnees/mercurium/optifibre)', () => {
    let s = initialState();
    const out = settleContracts(s, { events: ['boss:noeud-final'], lootSpores: 0, lootBiome: { optifibre: 2 } });
    const c = CONTRACTS.find((x) => x.id === 'boss-noeud-final')!;
    expect(out.forge.claimedContracts).toContain(c.id);
    expect(out.forge.optifibre).toBe(c.reward.optifibre ?? 0); // lootBiome transféré à part (RETURN_FORGE)
    expect(out.forge.credits).toBe(c.reward.credits ?? 0);
  });
});
