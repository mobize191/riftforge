import { describe, it, expect } from 'vitest';
// R6-04 — Continuité inter-biomes : UNE SEULE run traverse les 4 biomes ; battre un boss
// ouvre le biome suivant sans retour à la Forge ; mort en biome N -> retour Forge avec
// 100 % du butin ; état final déterministe depuis un seed unique.
import { initialState, reduce, biomeStructureOf } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState } from '../src/core/combat/combat';
import { monsterAt, pickEncounter } from '../src/core/run/encounter';
import { isWall, type LevelMap } from '../src/core/run/generate';
import { MONSTERS_BY_FAMILY } from '../src/data/monsters';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { MONSTER_BY_ID } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';
import { affinityMultiplier } from '../src/data/affinities';
import { createModule } from '../src/core/combat/createModule';
import { BIOME_ORDER } from '../src/data/biomes';
import type { ElementId } from '../src/core/types';

const CRAFT_PRIORITY = ['seve-synthetique', 'condensation', 'deflagration', 'combustion', 'souffle-thermique', 'obsidienne', 'magma', 'trait-incandescent', 'jet-pression', 'plaque-blindee'];

function craftAll(s: ReturnType<typeof initialState>) {
  for (const id of CRAFT_PRIORITY) {
    if (!s.run || s.run.modules.some((m) => m.id === id)) continue;
    if (createModule(s.run.orbs, id).ok) s = reduce(s, { type: 'CREATE_MODULE', recipeId: id });
  }
  return s;
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
      if (heal) {
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
    c = combatReduce(c, best ? best.action : { type: 'ATTACK', target: alive[0].i });
  }
  return c;
}

// Run complète multi-biomes (bot compétent simplifié).
function fullRun(seed: number) {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  s = craftAll(s);
  let guard = 0;
  const biomesSeen = new Set<number>([0]);
  while ((s.mode === 'RUN' || s.mode === 'COMBAT') && guard++ < 4000) {
    if (s.mode === 'COMBAT') {
      const run = s.run!;
      const c = botCombat(
        startCombat(
          (run.seed ^ (run.floor * 7919)) >>> 0,
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
      if (c.phase === 'lost') return { s: reduce(s, { type: 'DIE' }), won: false, biomesSeen };
      s = reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined, playerHp: c.player.hp });
      if (s.mode === 'RETOUR') return { s, won: s.run?.runCompleted ?? false, biomesSeen };
      if (s.mode === 'RUN') biomesSeen.add(s.run!.biomeIndex);
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
      map.resourceNodes.some((p) => p.x === x && p.y === y) ||
      map.circuits.some((c) => c.trigger.x === x && c.trigger.y === y),
    );
    if (step) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step });
      if (s.mode === 'RUN' && s.run!.level!.chests.some((c) => c.x === s.run!.playerPos.x && c.y === s.run!.playerPos.y)) {
        s = reduce(s, { type: 'INTERACT' });
        if (s.mode === 'COMBAT') continue;
      }
      if (s.mode === 'RUN' && s.run!.level!.circuits.some((c) => c.trigger.x === s.run!.playerPos.x && c.trigger.y === s.run!.playerPos.y)) {
        s = reduce(s, { type: 'INTERACT' });
        if (s.mode === 'COMBAT') continue;
      }
      continue;
    }
    const step2 = bfsNextStep(map, run.playerPos, (x, y) => x === map.exit.x && y === map.exit.y);
    if (step2) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step2 });
      continue;
    }
    return { s: reduce(s, { type: 'DIE' }), won: false, biomesSeen }; // bloqué
  }
  return { s, won: s.run?.runCompleted ?? false, biomesSeen };
}

describe('R6-04 continuité inter-biomes (run complète 4 biomes)', () => {
  it('une run depuis un seed unique traverse les biomes dans l’ordre, état final déterministe', { timeout: 120000 }, () => {
    const seeds = [11, 202, 3003];
    for (const seed of seeds) {
      const a = fullRun((seed * 2654435761) >>> 0);
      const b = fullRun((seed * 2654435761) >>> 0);
      expect(a.s).toEqual(b.s); // déterministe
      // la séquence de biomes visités est un préfixe de l'ordre des 4 biomes
      const seen = [...a.biomesSeen].sort((x, y) => x - y);
      expect(seen).toEqual(seen.map((_, i) => i));
      console.log(`[R6-04] seed=${seed} biomes atteints=${[...a.biomesSeen].sort().join(',')} mode final=${a.s.mode} runCompleted=${a.s.run?.runCompleted ?? false}`);
    }
  });

  it('victoire du boss final -> RETOUR avec runCompleted ; mort en biome N -> Forge avec 100 % du butin', { timeout: 120000 }, () => {
    // mort volontaire en biome 2 : le butin de toute la run est conservé à 100 %
    let s = reduce(initialState(), { type: 'START_RUN', seed: 424242 });
    s = { ...s, run: { ...s.run!, biomeIndex: 2, floor: 2, lootBiome: { mercurium: 3 }, lootCredits: 25 } };
    s = reduce(s, { type: 'DIE' });
    expect(s.mode).toBe('RETOUR');
    s = reduce(s, { type: 'RETURN_FORGE' });
    expect(s.mode).toBe('FORGE');
    expect(s.forge.mercurium).toBe(3);
    expect(s.forge.credits).toBe(25);
    expect(s.forge.runCompleted).toBe(false);

    // boss final du biome 4 -> victoire de run
    s = reduce(initialState(), { type: 'START_RUN', seed: 424242 });
    s = { ...s, run: { ...s.run!, biomeIndex: 3, floor: 4, playerPos: s.run!.level!.exit } };
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.encounter![0]).toBe(`boss:${biomeStructureOf(3).def.bossId}`);
    let c = startCombat(7, 80, 80, 12, s.run!.encounter!, ['feu', 'air'], null, {}, false, ['deflagration']);
    let guard = 0;
    while (c.phase === 'player' && guard++ < 60) {
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'deflagration', target: 0 });
      if (c.phase === 'player') c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    expect(c.phase).toBe('won');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined, playerHp: c.player.hp });
    expect(s.mode).toBe('RETOUR');
    expect(s.run!.runCompleted).toBe(true);
    expect(BIOME_ORDER.length).toBe(4);
  });
});
