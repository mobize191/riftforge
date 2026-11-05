import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/rng';
import { validChoices, pickMilestoneChoices, applyChoice } from '../src/core/run/milestone';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { initialState, reduce } from '../src/core/run/state';

const DEF = COMPANION_BY_MONSTER['mousse'];

describe('R3-04 jalon à 3 choix (R11-02 : déblocage par palier de lien)', () => {
  it('palier 1 : seule la compétence de palier 1 est débloquable', () => {
    const rng = createRng(1);
    const choices = pickMilestoneChoices(DEF, {}, rng, 1);
    expect(choices.length).toBeGreaterThan(0);
    for (const c of choices) {
      expect(c.kind).toBe('unlock');
      expect(c.skillId).toBe('soin-simple'); // unlockTier 1
    }
  });

  it('contrainte de palier : une compétence de palier N n\'est jamais proposée avant le palier N', () => {
    const withBase = { 'soin-simple': 1 };
    // palier 1 : soin-rapide (palier 4) et soin-majeur (palier 5) verrouillés
    const validT1 = validChoices(DEF, withBase, 1);
    expect(validT1.some((c) => c.skillId === 'soin-rapide')).toBe(false);
    expect(validT1.some((c) => c.skillId === 'soin-majeur')).toBe(false);
    // palier 4 : soin-rapide devient débloquable, soin-majeur (5) toujours verrouillé
    const validT4 = validChoices(DEF, withBase, 4);
    expect(validT4.some((c) => c.skillId === 'soin-rapide' && c.kind === 'unlock')).toBe(true);
    expect(validT4.some((c) => c.skillId === 'soin-majeur')).toBe(false);
    const upgraded = applyChoice(withBase, { kind: 'upgrade', skillId: 'soin-simple' }, DEF, 1);
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
    const choices = pickMilestoneChoices(DEF, s.run!.companionSkills, rng, s.forge.bondTier['mousse'] ?? 1);
    const before = { ...s.run!.companionSkills };
    s = reduce(s, { type: 'RESOLVE_MILESTONE', choice: choices[0] });
    expect(s.run!.pendingMilestone).toBe(false);
    expect(s.run!.companionSkills).toEqual(
      applyChoice(before, choices[0], DEF, s.forge.bondTier['mousse'] ?? 1),
    );
  });
});
