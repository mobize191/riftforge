import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { createRng } from '../src/core/rng';
import { pickMilestoneChoices } from '../src/core/run/milestone';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { serialize, deserialize } from '../src/core/save/save';

// Rejeu complet déterministe : capture -> recrutement -> compétence initiale -> jalon ->
// montée de niveau -> K.O. -> retour Forge, depuis un seul seed.
function fullJourney(seed: number) {
  let s = initialState();
  s = reduce(s, { type: 'START_RUN', seed });
  // 1. capture en combat
  s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'] });
  let c = startCombat(seed, s.run!.playerHp, s.run!.playerMaxHp, s.run!.playerAttack, ['mousse'], ['feu']);
  c = combatReduce(c, { type: 'ATTACK', target: 0 });
  c = combatReduce(c, { type: 'CAPTURE', target: 0 });
  s = reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined });
  // 2. recrutement à la Forge (simule la mort -> retour)
  s = reduce(s, { type: 'DIE' });
  s = reduce(s, { type: 'RETURN_FORGE' });
  s = reduce(s, { type: 'RENAME_COMPANION', monsterId: s.forge.roster[0], name: 'Brindille' });
  s = reduce(s, { type: 'SET_TEAM', monsterIds: [s.forge.roster[0]] });
  // 3. nouvelle run : compétence initiale aléatoire
  s = reduce(s, { type: 'START_RUN', seed });
  const initialSkill = Object.keys(s.run!.companionSkills)[0];
  // 4. jalon après le 2e niveau
  s = reduce(s, { type: 'NEXT_FLOOR' });
  s = reduce(s, { type: 'NEXT_FLOOR' });
  const choices = pickMilestoneChoices(COMPANION_BY_MONSTER['mousse'], s.run!.companionSkills, createRng(seed));
  s = reduce(s, { type: 'RESOLVE_MILESTONE', choice: choices[0] });
  // 5. montée de niveau par orbes
  s = {
    ...s,
    run: {
      ...s.run!,
      orbs: Array.from({ length: 10 }, (_, i) => ({ id: `o${i}`, kind: 'primordial' as const, element: 'feu' as const, tier: 1 })),
    },
  };
  s = reduce(s, { type: 'UPGRADE_SKILL', skillId: initialSkill });
  // 6. K.O. puis retour Forge
  s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['amas', 'amas', 'cuirasse'] });
  s = reduce(s, { type: 'EXIT_COMBAT', victory: false, companionKo: true });
  s = reduce(s, { type: 'DIE' });
  s = reduce(s, { type: 'RETURN_FORGE' });
  return s;
}

describe('R3-07 intégration compagnon (rejeu complet)', () => {
  it('est déterministe depuis un seul seed et couvre tout le parcours', () => {
    const a = fullJourney(2024);
    const b = fullJourney(2024);
    expect(a).toEqual(b);
    expect(a.mode).toBe('FORGE');
    expect(a.forge.roster).toContain('mousse');
    expect(a.forge.companionNames['mousse']).toBe('Brindille');
    expect(a.forge.team).toEqual(['mousse']);
  });

  it('l’état final survit à une sauvegarde', () => {
    const a = fullJourney(2024);
    expect(deserialize(serialize(a))).toEqual(a);
  });
});
