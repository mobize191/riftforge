import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { SKILL_UPGRADE_ORB_COSTS } from '../src/data/companions';

function forgeWithTeam() {
  const s = initialState();
  return { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
}

function runWithOrbs(n: number, skill: string) {
  let s = reduce(forgeWithTeam(), { type: 'START_RUN', seed: 42 });
  s = {
    ...s,
    run: {
      ...s.run!,
      companionSkills: { [skill]: 1 },
      orbs: Array.from({ length: n }, (_, i) => ({
        id: `o${i}`,
        kind: 'primordial' as const,
        element: 'feu' as const,
        tier: 1,
      })),
    },
  };
  return s;
}

describe('R3-05 montée de niveau par orbes', () => {
  it('les coûts exacts sont prélevés sur le stock d’orbes', () => {
    let s = runWithOrbs(10, 'soin-simple');
    s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'soin-simple' });
    expect(s.run!.companionSkills['soin-simple']).toBe(2);
    expect(s.run!.orbs).toHaveLength(10 - SKILL_UPGRADE_ORB_COSTS[1]);
  });

  it('plafond niveau 5', () => {
    let s = runWithOrbs(100, 'soin-simple');
    for (let i = 0; i < 10; i++) s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'soin-simple' });
    expect(s.run!.companionSkills['soin-simple']).toBeLessThanOrEqual(5);
  });

  it('refus si stock insuffisant (état inchangé)', () => {
    let s = runWithOrbs(2, 'soin-simple');
    const before = s;
    s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'soin-simple' });
    expect(s).toBe(before);
  });

  it('compétence non débloquée -> refus', () => {
    let s = runWithOrbs(10, 'antidote');
    s = { ...s, run: { ...s.run!, companionSkills: {} } };
    const before = s;
    s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'antidote' });
    expect(s).toBe(before);
  });
});
