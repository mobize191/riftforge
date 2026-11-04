import { createRng, type Rng } from '../rng';
import { BOSS_BY_ID, type BossDef } from '../../data/bosses';
import type { CombatState } from './combat';

export function bossPhase(def: BossDef, hp: number, maxHp: number) {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  return def.phases.find((p) => ratio < p.atHpRatioBelow) ?? def.phases[def.phases.length - 1];
}

// Prochaine attaque télégraphiée du boss pour la phase courante (tirage seedé).
export function nextBossAttack(def: BossDef, hp: number, maxHp: number, rng: Rng) {
  const phase = bossPhase(def, hp, maxHp);
  const id = rng.pick(phase.pattern);
  return def.attacks.find((a) => a.id === id) ?? def.attacks[0];
}

// Combat de boss : l'ennemi unique est le boss ; chaque tour il télégraphie puis exécute.
export function isBossCombat(state: CombatState): boolean {
  return state.enemies.length === 1 && state.enemies[0].id.startsWith('boss:');
}

export function bossDefOf(state: CombatState): BossDef | undefined {
  const e = state.enemies[0];
  if (!e || !e.id.startsWith('boss:')) return undefined;
  return BOSS_BY_ID[e.id.slice(5).replace(/-\d+$/, '')];
}
