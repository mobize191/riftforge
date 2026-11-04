import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce, captureChance } from '../src/core/combat/combat';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import type { GameState } from '../src/core/types';

// R10-01 — parcours complet du compagnon en core (miroir du flux UI, mêmes appels
// que App.tsx) : capture en combat -> retour Forge -> mise en équipe -> présence
// du compagnon au combat suivant avec sa compétence initiale.

function combatDepuis(s: GameState, compDef: ReturnType<() => (typeof COMPANION_BY_MONSTER)[string] | null>) {
  return startCombat(
    (s.run!.seed ^ (s.run!.floor * 7919)) >>> 0,
    s.run!.playerHp,
    s.run!.playerMaxHp,
    s.run!.playerAttack,
    s.run!.encounter!,
    s.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
    compDef,
    s.run!.companionSkills,
    s.run!.companionKo,
    s.run!.modules.map((m) => m.id),
    s.run!.challengeId ?? undefined,
    s.run!.activeModifiers,
  );
}

describe('R10-01 — parcours complet compagnon (unitaire)', () => {
  it('capture -> écurie -> équipe -> compagnon présent au combat suivant', () => {
    let s: GameState = initialState();
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(s.mode).toBe('RUN');

    // 1) Combat contre un mousse : affaiblir puis capturer (comme le joueur).
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    let c = combatDepuis(s, null);
    let guard = 0;
    while (c.phase === 'player' && c.captured.length === 0 && guard++ < 40) {
      const hp = c.enemies[0].hp;
      c = hp > 4
        ? combatReduce(c, { type: 'ATTACK', target: 0 })
        : combatReduce(c, { type: 'CAPTURE', target: 0 });
    }
    expect(c.captured).toContain('mousse');

    // 2) Fin de run (DIE puis RETURN_FORGE) : 100 % du butin, capturé à l'écurie.
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined, playerHp: c.player.hp });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.forge.roster).toContain('mousse');

    // 3) Mise en équipe (le bouton « Mettre en équipe » réduit SET_TEAM).
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['mousse'] });
    expect(s.forge.team).toEqual(['mousse']);

    // 4) Descente suivante : le compagnon est dans l'ordre d'initiative, pas K.O.
    s = reduce(s, { type: 'START_RUN', seed: 1 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    const combat = combatDepuis(s, COMPANION_BY_MONSTER[s.forge.team[0]] ?? null);
    expect(combat.companion).not.toBeNull();
    expect(combat.companion!.ko).toBe(false);
    expect(combat.order).toContain('companion');
    expect(Object.keys(combat.companion!.skills)).toHaveLength(1); // compétence initiale
  });

  it('la chance de capture est monotone en PV manquants', () => {
    expect(captureChance(0, 10)).toBeGreaterThanOrEqual(captureChance(5, 10));
    expect(captureChance(5, 10)).toBeGreaterThanOrEqual(captureChance(10, 10));
  });
});
