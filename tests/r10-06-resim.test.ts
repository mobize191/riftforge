import { describe, it, expect } from 'vitest';
// R10-06 — Re-simulation V1.1 (décisions D1-D4) : 1000 runs complètes avec le bot
// compétent (économe en énergie depuis R10-02). Assert : bande première-run 0,1-0,2 %
// tenue (§SPEC-2), morts étalées (<= 50 % au biome 1), les 4 biomes visités.
import { initialState, reduce, biomeStructureOf } from '../src/core/run/state';
import { startCombat, combatReduce, moduleEnergyCost, type CombatState } from '../src/core/combat/combat';
import { monsterAt, pickEncounter } from '../src/core/run/encounter';
import { isWall, type LevelMap } from '../src/core/run/generate';
import { MONSTERS_BY_FAMILY, MONSTER_BY_ID } from '../src/data/monsters';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';
import { BOSS_BY_ID } from '../src/data/bosses';
import { affinityMultiplier } from '../src/data/affinities';
import { craftAndFuseAll } from './helpers/modules';
import type { ElementId } from '../src/core/types';

const CRAFT_PRIORITY = ['seve-synthetique', 'condensation', 'deflagration', 'combustion', 'souffle-thermique', 'obsidienne', 'magma', 'trait-incandescent', 'jet-pression', 'ecran-gravats', 'souffle', 'plaque-blindee'];

function craftAll(s: ReturnType<typeof initialState>) {
  return craftAndFuseAll(s, CRAFT_PRIORITY);
}

function bfsNextStep(map: LevelMap, from: { x: number; y: number }, isTarget: (x: number, y: number) => boolean) {
  const prev = new Map<string, string>();
  const q: [number, number][] = [[from.x, from.y]];
  const seen = new Set([`${from.x},${from.y}`]);
  let found: [number, number] | null = null;
  while (q.length) {
    const [x, y] = q.shift()!;
    if (isTarget(x, y) && !(x === from.x && y === from.y)) {
      found = [x, y];
      break;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (!seen.has(k) && !isWall(map, nx, ny)) {
        seen.add(k);
        prev.set(k, `${x},${y}`);
        q.push([nx, ny]);
      }
    }
  }
  if (!found) return null;
  let cur = `${found[0]},${found[1]}`;
  while (prev.get(cur) && prev.get(cur) !== `${from.x},${from.y}`) cur = prev.get(cur)!;
  const [sx, sy] = cur.split(',').map(Number);
  return { x: sx, y: sy };
}

function multOf(element: ElementId, enemy: CombatState['enemies'][number]): number {
  if (enemy.id.startsWith('boss:')) {
    const b = BOSS_BY_ID[enemy.id.slice(5).replace(/-\d+$/, '')];
    if (!b) return 1;
    if (b.weaknesses.includes(element)) return 1.5;
    if (b.resistances.includes(element)) return 0.5;
    return 1;
  }
  const def = MONSTER_BY_ID[enemy.id.split('-')[0]];
  return def ? affinityMultiplier(element, def) : 1;
}

function botCombat(c: CombatState): CombatState {
  let guard = 0;
  while (c.phase === 'player' && guard++ < 300) {
    const hpRatio = c.player.hp / c.player.maxHp;
    if (hpRatio < 0.3) {
      const heal = c.modules.find((id) => ['heal', 'purify'].includes(RECIPE_BY_ID[id]?.effect.kind ?? ''));
      if (heal && c.energy >= moduleEnergyCost(RECIPE_BY_ID[heal])) {
        c = combatReduce(c, { type: 'CAST_MODULE', moduleId: heal });
        continue;
      }
      const gel = c.items.find((i) => i.def.kind === 'heal' && i.usesLeft > 0);
      if (gel) {
        c = combatReduce(c, { type: 'USE_ITEM', itemId: gel.def.id });
        continue;
      }
      if (hpRatio < 0.15) {
        c = combatReduce(c, { type: 'FLEE' });
        continue;
      }
    }
    const alive = c.enemies.map((e, i) => ({ e, i })).filter(({ e }) => e.hp > 0);
    if (!alive.length) break;
    let best: { value: number; action: Parameters<typeof combatReduce>[1] } | null = null;
    const consider = (value: number, action: Parameters<typeof combatReduce>[1]) => {
      if (!best || value > best.value) best = { value, action };
    };
    consider(c.player.attack, { type: 'ATTACK', target: alive.reduce((a, b) => (b.e.hp < a.e.hp ? b : a)).i });
    for (const recipe of RECIPES) {
      const isSolo = recipe.inputs.length === 1;
      if (isSolo) {
        if (!c.orbs.includes(recipe.inputs[0])) continue;
      } else if (!c.modules.includes(recipe.id)) continue;
      const eff = recipe.effect;
      if (eff.kind === 'damage') {
        const el = recipe.inputs[0];
        let bv = -1;
        let bi = alive[0].i;
        for (const { e, i } of alive) {
          const d = eff.power * multOf(el, e);
          if (d > bv) {
            bv = d;
            bi = i;
          }
        }
        consider(bv, { type: 'CAST_MODULE', moduleId: recipe.id, target: bi });
      } else if (eff.kind === 'aoe') {
        const el = recipe.inputs[0];
        consider(alive.reduce((a, { e }) => a + eff.power * multOf(el, e), 0), { type: 'CAST_MODULE', moduleId: recipe.id, target: alive[0].i });
      }
    }
    // R10-02 (D1) : action inabordable ignorée (retombe sur l'attaque / pass gratuit).
    const coutBest = best ? (best.action.type === 'CAST_MODULE' ? moduleEnergyCost(RECIPE_BY_ID[best.action.moduleId]) : BALANCE.ENERGY_COST_ATTACK) : 0;
    if (best && coutBest <= c.energy) {
      c = combatReduce(c, best.action);
    } else if (c.energy >= BALANCE.ENERGY_COST_ATTACK) {
      c = combatReduce(c, { type: 'ATTACK', target: alive[0].i });
    } else {
      c = combatReduce(c, { type: 'CAPTURE', target: alive[0].i }); // tour passé (gratuit)
    }
  }
  return c;
}

function fullRun(seed: number) {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  s = craftAll(s);
  let guard = 0;
  let turns = 0;
  let deathBiome = -1;
  while ((s.mode === 'RUN' || s.mode === 'COMBAT') && guard++ < 4000) {
    if (s.mode === 'COMBAT') {
      const run = s.run!;
      const c = botCombat(
        startCombat(
          (run.seed ^ (run.floor * 7919) ^ (run.biomeIndex * 131)) >>> 0,
          run.playerHp,
          run.playerMaxHp,
          run.playerAttack,
          run.encounter!,
          run.orbs.map((o) => o.element).filter((e): e is ElementId => e !== null),
          null,
          {},
          false,
          run.modules.map((m) => m.id),
        ),
      );
      turns += c.turn;
      if (c.phase === 'lost') {
        deathBiome = s.run!.biomeIndex;
        return { won: false, turns, deathBiome };
      }
      s = reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined, playerHp: c.player.hp });
      if (s.mode === 'RETOUR') return { won: s.run?.runCompleted ?? false, turns, deathBiome: -1 };
      s = craftAll(s);
      continue;
    }
    const run = s.run!;
    const map = run.level!;
    const { def } = biomeStructureOf(run.biomeIndex);
    const family = MONSTERS_BY_FAMILY[def.family].map((m) => m.id);
    const hpLow = run.playerHp < run.playerMaxHp * 0.35;
    let idx = hpLow ? -1 : monsterAt(map, run.playerPos);
    if (idx < 0 && !hpLow) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        idx = monsterAt(map, { x: run.playerPos.x + dx, y: run.playerPos.y + dy });
        if (idx >= 0) break;
      }
    }
    if (idx >= 0) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: pickEncounter(run.seed, run.floor, idx, family), fromMap: true });
      continue;
    }
    if (run.playerPos.x === map.exit.x && run.playerPos.y === map.exit.y) {
      s = reduce(s, { type: 'INTERACT' });
      continue;
    }
    const step = bfsNextStep(map, run.playerPos, (x, y) =>
      (!hpLow && map.monsters.some((m) => m.pos.x === x && m.pos.y === y)) ||
      map.orbs.some((o) => o.pos.x === x && o.pos.y === y) ||
      map.chests.some((c) => c.x === x && c.y === y) ||
      map.sporeNodes.some((p) => p.x === x && p.y === y) ||
      map.resourceNodes.some((p) => p.x === x && p.y === y),
    );
    if (step) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step });
      if (s.mode === 'RUN' && s.run!.level!.chests.some((c) => c.x === s.run!.playerPos.x && c.y === s.run!.playerPos.y)) {
        s = reduce(s, { type: 'INTERACT' });
      }
      continue;
    }
    const step2 = bfsNextStep(map, run.playerPos, (x, y) => x === map.exit.x && y === map.exit.y);
    if (step2) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step2 });
      continue;
    }
    deathBiome = run.biomeIndex;
    return { won: false, turns, deathBiome };
  }
  return { won: false, turns, deathBiome: s.run?.biomeIndex ?? -1 };
}

describe('R10-06 re-simulation V1.1 (1000 runs, bot compétent économe en énergie)', () => {
  it('bande 0,1-0,2 % tenue, morts étalées (<= 50 % biome 1), 4 biomes visités', { timeout: 900000 }, () => {
    const N = process.env.SIM_RUNS_FINAL ? parseInt(process.env.SIM_RUNS_FINAL, 10) : 1000; // bande §SPEC-2 : N=1000 requis — SIM_RUNS (250 en CI) ne peut pas la mesurer
    let wins = 0;
    let totalTurns = 0;
    const deathBiomes = [0, 0, 0, 0];
    for (let seed = 1; seed <= N; seed++) {
      const r = fullRun((seed * 2654435761) >>> 0);
      totalTurns += r.turns;
      if (r.won) wins++;
      else if (r.deathBiome >= 0 && r.deathBiome < 4) deathBiomes[r.deathBiome]++;
    }
    const rate = wins / N;
    const morts = deathBiomes.reduce((a, b) => a + b, 0);
    console.log(
      `[R10-06] runs=${N} victoires=${wins} taux=${(rate * 100).toFixed(3)}% tours moyens=${(totalTurns / N).toFixed(1)} morts=${morts} par biome: ${deathBiomes.map((d, i) => `biome${i + 1}=${d}`).join(' ')}`,
    );
    // Bande §SPEC-2 conservée.
    expect(rate).toBeGreaterThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MIN);
    expect(rate).toBeLessThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MAX);
    // Distribution étalée : <= 50 % des morts au biome 1, et les 4 biomes sont visités.
    expect(deathBiomes[0]).toBeLessThanOrEqual(morts * 0.5);
    expect(deathBiomes[1] + deathBiomes[2] + deathBiomes[3] + wins).toBeGreaterThan(0);
    expect(deathBiomes[3]).toBeGreaterThan(0); // biome 4 atteint par le bot
  });
});
