import { describe, it, expect } from 'vitest';
// R7-02 — Jauge d'instabilité : monte à chaque action (combat, récolte) en data,
// monotone et seedée ; seuils -> danger puis élites qui traquent ; purge aux sanctuaires ;
// aucun effet sans le modificateur.
import { initialState, reduce } from '../src/core/run/state';
import { INSTABILITY } from '../src/data/riftModifiers';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { BIOME_ORDER } from '../src/data/biomes';

function stateWithModifiers(mods: string[]) {
  let s = initialState();
  s = { ...s, forge: { ...s.forge, allBiomesCleared: true, riftModifiers: { [BIOME_ORDER[0]]: mods } } };
  return reduce(s, { type: 'START_RUN', seed: 42 });
}

function winCombat(s: ReturnType<typeof initialState>) {
  s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
  s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 5, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] } });
  return s;
}

describe('R7-02 jauge d’instabilité', () => {
  it('monotone et seedée : +par combat, +par récolte, seuils danger/élite', () => {
    let s = stateWithModifiers(['instabilite']);
    expect(s.run!.activeModifiers).toContain('instabilite');
    expect(s.run!.instability).toBe(0);
    s = winCombat(s);
    expect(s.run!.instability).toBe(INSTABILITY.perCombat);
    s = winCombat(s);
    s = winCombat(s);
    expect(s.run!.instability).toBe(3 * INSTABILITY.perCombat); // 30 = seuil danger
    expect(s.run!.journal).toContain('danger');
    // 6 combats -> 60 = seuil élite
    for (let i = 0; i < 3; i++) s = winCombat(s);
    expect(s.run!.instability).toBe(6 * INSTABILITY.perCombat);
    expect(s.run!.journal).toContain('elite');
    expect(s.run!.elitePending).toBe(true);
    // déterminisme : même seed -> même jauge
    let s2 = stateWithModifiers(['instabilite']);
    for (let i = 0; i < 6; i++) s2 = winCombat(s2);
    expect(s2.run!.instability).toBe(s.run!.instability);
  });

  it('l’élite traque le joueur : ajoutée au prochain combat de carte', () => {
    let s = stateWithModifiers(['instabilite']);
    for (let i = 0; i < 6; i++) s = winCombat(s);
    expect(s.run!.elitePending).toBe(true);
    const family = MONSTERS_BY_FAMILY['spore'].map((m) => m.id);
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: true });
    expect(s.run!.encounter!.length).toBe(2);
    expect(s.run!.encounter![1]).toMatch(/^elite-/);
    expect(family.some((f) => s.run!.encounter![1] === `elite-${f}`)).toBe(true);
    expect(s.run!.elitePending).toBe(false); // consommée
    expect(s.run!.journal).toContain('elite-spawn');
  });

  it('purge complète au sanctuaire (usage unique)', () => {
    let s = stateWithModifiers(['instabilite']);
    for (let i = 0; i < 4; i++) s = winCombat(s);
    expect(s.run!.instability).toBeGreaterThan(0);
    const sanct = s.run!.level!.sanctuaries[0];
    expect(sanct).toBeDefined(); // nœud généré car modificateur actif
    s = reduce(s, { type: 'MOVE_PLAYER', to: sanct });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.instability).toBe(0);
    expect(s.run!.journal).toContain('sanctuaire');
    expect(s.run!.level!.sanctuaries.length).toBe(0); // usage unique
  });

  it('AUCUN effet sans le modificateur (jauge à 0, pas de sanctuaire, pas d’élite)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 42 });
    expect(s.run!.activeModifiers).toEqual([]);
    for (let i = 0; i < 8; i++) s = winCombat(s);
    expect(s.run!.instability).toBe(0);
    expect(s.run!.elitePending).toBe(false);
    expect(s.run!.level!.sanctuaries.length).toBe(0);
    expect(s.run!.journal).not.toContain('danger');
  });
});
