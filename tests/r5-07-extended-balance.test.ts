import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { pickEncounter } from '../src/core/run/encounter';
import { MONSTERS } from '../src/data/monsters';
import { RECIPES } from '../src/data/recipes';
import { craftOrFuseOnce } from './helpers/modules';
import { BIOME_1_STRUCTURE } from '../src/data/biomes';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);

function botCombat(c: ReturnType<typeof startCombat>, moduleUsage: Record<string, number>) {
  let guard = 0;
  while (c.phase === 'player' && guard++ < 200) {
    if (c.player.hp < c.player.maxHp * 0.15) {
      c = combatReduce(c, { type: 'FLEE' });
      continue;
    }
    const heal = c.items.find((i) => i.def.kind === 'heal' && i.usesLeft > 0);
    if (c.player.hp < c.player.maxHp * 0.4 && heal) {
      c = combatReduce(c, { type: 'USE_ITEM', itemId: heal.def.id });
      continue;
    }
    const dmgModule = c.modules
      .map((id) => RECIPES.find((r) => r.id === id))
      .find((r) => r && (r.effect.kind === 'damage' || r.effect.kind === 'aoe'));
    if (dmgModule) {
      moduleUsage[dmgModule.id] = (moduleUsage[dmgModule.id] ?? 0) + 1;
      const alive = c.enemies.findIndex((e) => e.hp > 0);
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: dmgModule.id, target: alive >= 0 ? alive : 0 });
      continue;
    }
    const alive = c.enemies.findIndex((e) => e.hp > 0);
    c = combatReduce(c, { type: 'ATTACK', target: alive >= 0 ? alive : 0 });
  }
  return c;
}

function fullBiome1Run(seed: number, moduleUsage: Record<string, number>) {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  const tryCraft = (st: typeof s) => craftOrFuseOnce(st);
  s = tryCraft(s);
  let turns = 0;
  while (s.run && s.mode === 'RUN') {
    const floor = s.run.floor;
    for (let i = 0; i < s.run.level!.monsters.length; i++) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: pickEncounter(s.run.seed, floor, i, FAMILY) });
      const c = botCombat(
        startCombat(
          (s.run!.seed ^ (floor * 7919) ^ i) >>> 0,
          s.run!.playerHp,
          s.run!.playerMaxHp,
          s.run!.playerAttack,
          s.run!.encounter!,
          s.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
          null,
          {},
          false,
          s.run!.modules.map((m) => m.id),
        ),
        moduleUsage,
      );
      turns += c.turn;
      if (c.phase === 'won') s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      else if (c.phase === 'fled') s = reduce(s, { type: 'EXIT_COMBAT', victory: false });
      else return { won: false, turns };
      s = tryCraft(s);
    }
    if (floor >= BIOME_1_STRUCTURE.floors) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: [`boss:${BIOME_1_STRUCTURE.bossId}`] });
      const c = botCombat(
        startCombat(
          (s.run!.seed ^ 999) >>> 0,
          s.run!.playerHp,
          s.run!.playerMaxHp,
          s.run!.playerAttack,
          s.run!.encounter!,
          s.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
          null,
          {},
          false,
          s.run!.modules.map((m) => m.id),
        ),
        moduleUsage,
      );
      turns += c.turn;
      if (c.phase !== 'won') return { won: false, turns };
      s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      return { won: s.mode === 'RETOUR', turns };
    }
    s = reduce(s, { type: 'NEXT_FLOOR' });
  }
  return { won: false, turns };
}

describe('R5-07 équilibrage étendu (1000 runs complètes du biome 1)', () => {
  it('taux de victoire, durée moyenne en tours, modules utilisés — affichés', () => {
    const N = 1000;
    let wins = 0;
    let totalTurns = 0;
    const moduleUsage: Record<string, number> = {};
    for (let seed = 1; seed <= N; seed++) {
      const r = fullBiome1Run((seed * 2654435761) >>> 0, moduleUsage);
      if (r.won) wins++;
      totalTurns += r.turns;
    }
    const sorted = Object.entries(moduleUsage).sort((a, b) => b[1] - a[1]);
    console.log(
      `[R5-07] runs=${N} victoires=${wins} taux=${((wins / N) * 100).toFixed(2)}% tours moyens=${(totalTurns / N).toFixed(1)}`,
    );
    console.log(`[R5-07] modules utilisés (top): ${sorted.slice(0, 5).map(([k, v]) => `${k}=${v}`).join(', ') || 'aucun'}`);
    expect(wins / N).toBeGreaterThanOrEqual(0);
  });
});
