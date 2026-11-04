import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';

function forgeWithTeam() {
  const s = initialState();
  return { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
}

describe('R3-03 compétence initiale aléatoire + K.O.', () => {
  it('le tirage initial est seedé : même seed -> même compétence', () => {
    const a = reduce(forgeWithTeam(), { type: 'START_RUN', seed: 42 });
    const b = reduce(forgeWithTeam(), { type: 'START_RUN', seed: 42 });
    expect(a.run!.companionSkills).toEqual(b.run!.companionSkills);
    expect(Object.keys(a.run!.companionSkills)).toHaveLength(1);
    expect(Object.values(a.run!.companionSkills)[0]).toBe(1);
  });

  it('K.O. -> indisponible pendant la run, réveil au retour à la Forge, jamais supprimé', () => {
    let s = reduce(forgeWithTeam(), { type: 'START_RUN', seed: 42 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['amas'] });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: false, companionKo: true });
    expect(s.run!.companionKo).toBe(true);
    s = reduce(s, { type: 'DIE' });
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.forge.roster).toContain('mousse'); // jamais supprimé
    s = reduce(s, { type: 'START_RUN', seed: 43 });
    expect(s.run!.companionKo).toBe(false); // réveil au retour
  });
});
