import { describe, it, expect } from 'vitest';
// R7-01 — Déblocage et activation par biome des modificateurs de Faille :
// sans allBiomesCleared -> aucun modificateur possible, jeu inchangé ;
// avec le flag -> activation persistante par biome.
import { initialState, reduce } from '../src/core/run/state';
import { RIFT_MODIFIERS } from '../src/data/riftModifiers';
import { SAVE_VERSION, serialize, deserialize } from '../src/core/save/save';

describe('R7-01 déblocage modificateurs de Faille', () => {
  it('sans allBiomesCleared : SET_RIFT_MODIFIERS refusé, aucun modificateur actif en run', () => {
    let s = initialState();
    expect(s.forge.allBiomesCleared).toBe(false);
    const before = s;
    s = reduce(s, { type: 'SET_RIFT_MODIFIERS', biomeId: 'fibration', modifiers: ['elites'] });
    expect(s).toBe(before); // refusé
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(s.run!.activeModifiers).toEqual([]);
    expect(s.run!.instability).toBe(0);
  });

  it('avec allBiomesCleared : activation par biome persistante, reprise en run', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, allBiomesCleared: true } };
    s = reduce(s, { type: 'SET_RIFT_MODIFIERS', biomeId: 'fibration', modifiers: ['elites', 'orbes-rares'] });
    expect(s.forge.riftModifiers['fibration']).toEqual(['elites', 'orbes-rares']);
    // modificateur inconnu ignoré
    s = reduce(s, { type: 'SET_RIFT_MODIFIERS', biomeId: 'datacathedrales', modifiers: ['elites', 'bidon'] });
    expect(s.forge.riftModifiers['datacathedrales']).toEqual(['elites']);
    // biome inconnu refusé
    const b = s;
    s = reduce(s, { type: 'SET_RIFT_MODIFIERS', biomeId: 'nulle-part', modifiers: ['elites'] });
    expect(s).toBe(b);
    // en run : les modificateurs du biome 1 (aucun) sont actifs ; persistance via save
    s = reduce(s, { type: 'START_RUN', seed: 2 });
    expect(s.run!.activeModifiers).toEqual([]);
    const back = deserialize(serialize(s));
    expect(back.forge.riftModifiers['fibration']).toEqual(['elites', 'orbes-rares']);
    expect(SAVE_VERSION).toBe(4);
  });

  it('tous les modificateurs sont des ids valides en data', () => {
    expect(RIFT_MODIFIERS.length).toBe(5);
    for (const m of RIFT_MODIFIERS) expect(m.id).toBeTruthy();
  });
});
