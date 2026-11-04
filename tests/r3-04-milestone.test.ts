import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/rng';
import { validChoices, pickMilestoneChoices, applyChoice } from '../src/core/run/milestone';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { initialState, reduce } from '../src/core/run/state';

const DEF = COMPANION_BY_MONSTER['mousse'];

describe('R3-04 jalon à 3 choix', () => {
  it('toujours 3 options valides au départ', () => {
    const rng = createRng(1);
    const choices = pickMilestoneChoices(DEF, {}, rng);
    expect(choices).toHaveLength(3);
    for (const c of choices) expect(c.kind).toBe('unlock');
  });

  it('contrainte de prérequis : niveau 2 jamais proposé sans le niveau 1', () => {
    // soin-simple débloqué niv 1 -> soin-rapide (requires soin-simple) devient valide
    const withBase = { 'soin-simple': 1 };
    const valid = validChoices(DEF, withBase);
    expect(valid.some((c) => c.skillId === 'soin-rapide' && c.kind === 'unlock')).toBe(true);
    expect(valid.some((c) => c.skillId === 'soin-majeur')).toBe(false); // requiert soin-rapide
    const upgraded = applyChoice(withBase, { kind: 'upgrade', skillId: 'soin-simple' }, DEF);
    expect(upgraded['soin-simple']).toBe(2);
  });

  it('le choix est seedé et appliqué via RESOLVE_MILESTONE après le 2e niveau', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 42 });
    s = reduce(s, { type: 'NEXT_FLOOR' }); // sol 2
    expect(s.run!.pendingMilestone).toBe(false);
    s = reduce(s, { type: 'NEXT_FLOOR' }); // sol 3 -> jalon
    expect(s.run!.pendingMilestone).toBe(true);
    const rng = createRng(42);
    const choices = pickMilestoneChoices(DEF, s.run!.companionSkills, rng);
    const before = { ...s.run!.companionSkills };
    s = reduce(s, { type: 'RESOLVE_MILESTONE', choice: choices[0] });
    expect(s.run!.pendingMilestone).toBe(false);
    expect(s.run!.companionSkills).toEqual(applyChoice(before, choices[0], DEF));
  });
});
