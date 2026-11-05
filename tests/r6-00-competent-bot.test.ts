import { describe, it, expect } from 'vitest';
// R6-00 : bot de simulation COMPÉTENT (joue comme un humain correct) + re-mesure du biome 1.
// - fabrique les modules de soin dès que possible (Sève synthétique, Condensation)
// - récolte orbes / coffres / spores en chemin (BFS), affronte les monstres au contact
// - exploite les faiblesses d'affinité (choisit le module dont l'élément correspond)
// - soigne sous 30 % PV (module de soin, puis gélule), fuit sous 15 % sans soin
// - PV persistants entre les combats (comme l'UI : playerHp transmis à EXIT_COMBAT)
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce, moduleEnergyCost, type CombatState } from '../src/core/combat/combat';
import { monsterAt, pickEncounter } from '../src/core/run/encounter';
import { isWall, type LevelMap } from '../src/core/run/generate';
import { MONSTERS, MONSTER_BY_ID } from '../src/data/monsters';
import { BOSS_BY_ID } from '../src/data/bosses';
import { RECIPES, RECIPE_BY_ID } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';
import { affinityMultiplier } from '../src/data/affinities';
import { craftAndFuseAll } from './helpers/modules';
import { BIOME_1_STRUCTURE } from '../src/data/biomes';
import type { ElementId, Orb } from '../src/core/types';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);

// Priorité de fabrication entre les combats : soins d'abord, puis dégâts (AoE feu = faiblesse
// principale de la famille spore), puis utilitaires.
const CRAFT_PRIORITY = [
  'seve-synthetique',
  'condensation',
  'deflagration',
  'combustion',
  'souffle-thermique',
  'obsidienne',
  'magma',
  'brume-corrosive',
  'trait-incandescent',
  'jet-pression',
  'vapeur',
  'plaque-blindee',
  'ecran-gravats',
  'souffle',
];

function craftAll(s: ReturnType<typeof initialState>) {
  return craftAndFuseAll(s, CRAFT_PRIORITY);
}

function bfsNextStep(
  map: LevelMap,
  from: { x: number; y: number },
  isTarget: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
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

// Multiplicateur d'affinité contre une cible (monstre ou boss).
function multOf(element: ElementId, enemy: CombatState['enemies'][number]): number {
  if (enemy.id.startsWith('boss:')) {
    const boss = BOSS_BY_ID[enemy.id.slice(5).replace(/-\d+$/, '')];
    if (!boss) return 1;
    if (boss.weaknesses.includes(element)) return 1.5;
    if (boss.resistances.includes(element)) return 0.5;
    return 1;
  }
  const def = MONSTER_BY_ID[enemy.id.split('-')[0]];
  return def ? affinityMultiplier(element, def) : 1;
}

// Bot de combat compétent.
function botCombat(c: CombatState, moduleUsage: Record<string, number>): CombatState {
  let guard = 0;
  while (c.phase === 'player' && guard++ < 300) {
    const hpRatio = c.player.maxHp > 0 ? c.player.hp / c.player.maxHp : 1;
    // 1) Soin sous 30 % PV : module de soin créé > gélule de soin.
    if (hpRatio < 0.3) {
      const healModuleId = c.modules.find((id) => {
        const r = RECIPE_BY_ID[id];
        return r && (r.effect.kind === 'heal' || r.effect.kind === 'purify');
      });
      if (healModuleId && c.energy >= moduleEnergyCost(RECIPE_BY_ID[healModuleId])) {
        moduleUsage[healModuleId] = (moduleUsage[healModuleId] ?? 0) + 1;
        c = combatReduce(c, { type: 'CAST_MODULE', moduleId: healModuleId });
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
    // 2) Bouclier si PV moyens et bouclier disponible.
    if (hpRatio < 0.5 && c.player.shield === 0) {
      const shieldModuleId = c.modules.find((id) => RECIPE_BY_ID[id]?.effect.kind === 'shield');
      if (shieldModuleId && c.energy >= moduleEnergyCost(RECIPE_BY_ID[shieldModuleId])) {
        moduleUsage[shieldModuleId] = (moduleUsage[shieldModuleId] ?? 0) + 1;
        c = combatReduce(c, { type: 'CAST_MODULE', moduleId: shieldModuleId });
        continue;
      }
    }
    // 3) Meilleur coup offensif en exploitant les affinités.
    const alive = c.enemies.map((e, i) => ({ e, i })).filter(({ e }) => e.hp > 0);
    if (alive.length === 0) break;
    let best: { value: number; action: Parameters<typeof combatReduce>[1] } | null = null;
    const consider = (value: number, action: Parameters<typeof combatReduce>[1]) => {
      if (!best || value > best.value) best = { value, action };
    };
    // Attaque de base (cible : le plus faible PV pour finir vite).
    {
      const weakest = alive.reduce((a, b) => (b.e.hp < a.e.hp ? b : a));
      consider(c.player.attack, { type: 'ATTACK', target: weakest.i });
    }
    // Modules : solo (orbe tenue, gratuit) + créés (présents dans state.modules).
    for (const recipe of RECIPES) {
      const isSolo = recipe.inputs.length === 1;
      if (isSolo) {
        if (!c.orbs.includes(recipe.inputs[0])) continue;
      } else if (!c.modules.includes(recipe.id)) {
        continue;
      }
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
        const total = alive.reduce((acc, { e }) => acc + eff.power * multOf(el, e), 0);
        const bi = alive.reduce((a, b) => (multOf(el, b.e) > multOf(el, a.e) ? b : a)).i;
        consider(total, { type: 'CAST_MODULE', moduleId: recipe.id, target: bi });
      } else if (eff.kind === 'dot') {
        const el = recipe.inputs[0];
        let bv = -1;
        let bi = alive[0].i;
        for (const { e, i } of alive) {
          const d = eff.power * (eff.duration ?? 1) * multOf(el, e);
          if (d > bv) {
            bv = d;
            bi = i;
          }
        }
        consider(bv * 0.5, { type: 'CAST_MODULE', moduleId: recipe.id, target: bi }); // dégâts différés : peu prioritaires
      }
    }
    // R10-02 (D1) : le bot tient compte de l'énergie — une action inabordable
    // est ignorée (retombe sur l'attaque de base, coût 1).
    const coutAction = (a: Parameters<typeof combatReduce>[1]): number =>
      a.type === 'ATTACK' ? BALANCE.ENERGY_COST_ATTACK : a.type === 'CAST_MODULE' ? moduleEnergyCost(RECIPE_BY_ID[a.moduleId]) : 0;
    const abordable = best && coutAction(best.action) <= c.energy;
    if (abordable && best) {
      const action = best.action;
      if (action.type === 'CAST_MODULE') moduleUsage[action.moduleId] = (moduleUsage[action.moduleId] ?? 0) + 1;
      c = combatReduce(c, action);
      continue;
    }
    if (c.energy >= BALANCE.ENERGY_COST_ATTACK) {
      c = combatReduce(c, { type: 'ATTACK', target: alive[0].i });
    } else {
      c = combatReduce(c, { type: 'CAPTURE', target: alive[0].i }); // pass gratuit (avance le round)
    }
  }
  return c;
}

function mkCombat(s: ReturnType<typeof initialState>): CombatState {
  return startCombat(
    (s.run!.seed ^ (s.run!.floor * 7919)) >>> 0,
    s.run!.playerHp,
    s.run!.playerMaxHp,
    s.run!.playerAttack,
    s.run!.encounter!,
    s.run!.orbs.map((o: Orb) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
    s.forge.team[0] ? (COMPANION_BY_MONSTER[s.forge.team[0]] ?? null) : null,
    s.run!.companionSkills,
    s.run!.companionKo,
    s.run!.modules.map((m) => m.id),
    s.run!.challengeId ?? undefined,
  );
}

function competentBiome1Run(seed: number, moduleUsage: Record<string, number>) {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  s = craftAll(s);
  let turns = 0;
  const deathFloor = { v: 0 };
  let guard = 0;
  while ((s.mode === 'RUN' || s.mode === 'COMBAT') && guard++ < 2000) {
    if (s.mode === 'COMBAT') {
      const c = botCombat(mkCombat(s), moduleUsage);
      turns += c.turn;
      if (c.phase === 'lost') {
        deathFloor.v = s.run!.floor;
        return { won: false, turns, deathFloor: deathFloor.v };
      }
      s = reduce(s, {
        type: 'EXIT_COMBAT',
        victory: c.phase === 'won',
        loot: c.loot ?? undefined,
        companionKo: c.companion?.ko,
        playerHp: c.player.hp,
      });
      // R6-04 : vaincre le boss du biome 1 ouvre le biome 2 dans la même run = biome 1 gagné
      if (s.mode === 'RUN' && s.run!.biomeIndex === 1) return { won: true, turns, deathFloor: 0 };
      s = craftAll(s);
      continue;
    }
    // mode RUN : navigation
    const run = s.run!;
    const map = run.level!;
    // Un joueur correct évite le combat quand ses PV sont bas (hors boss, inévitable).
    const hpLow = run.playerHp < run.playerMaxHp * 0.35;
    // monstre au contact -> combat
    let idx = hpLow ? -1 : monsterAt(map, run.playerPos);
    if (idx < 0 && !hpLow) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        idx = monsterAt(map, { x: run.playerPos.x + dx, y: run.playerPos.y + dy });
        if (idx >= 0) break;
      }
    }
    if (idx >= 0) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: pickEncounter(run.seed, run.floor, idx, FAMILY), fromMap: true });
      continue;
    }
    // sur la sortie -> INTERACT (sol suivant ou boss)
    if (run.playerPos.x === map.exit.x && run.playerPos.y === map.exit.y) {
      s = reduce(s, { type: 'INTERACT' });
      continue;
    }
    // sinon : cible la plus proche (monstre > orbe > coffre > spore), BFS
    const step = bfsNextStep(map, run.playerPos, (x, y) => {
      if (!hpLow && map.monsters.some((m) => m.pos.x === x && m.pos.y === y)) return true;
      if (map.orbs.some((o) => o.pos.x === x && o.pos.y === y)) return true;
      if (map.chests.some((c) => c.x === x && c.y === y)) return true;
      if (map.sporeNodes.some((p) => p.x === x && p.y === y)) return true;
      return false;
    });
    if (step) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step });
      // coffre sur la case atteinte -> INTERACT
      const onChest = map.chests.some((c) => c.x === s.run!.playerPos.x && c.y === s.run!.playerPos.y);
      if (onChest) s = reduce(s, { type: 'INTERACT' });
      continue;
    }
    // rien à récolter : direction la sortie
    const step2 = bfsNextStep(map, run.playerPos, (x, y) => x === map.exit.x && y === map.exit.y);
    if (step2) {
      s = reduce(s, { type: 'MOVE_PLAYER', to: step2 });
      continue;
    }
    return { won: false, turns, deathFloor: run.floor }; // bloqué (ne devrait pas arriver)
  }
  return { won: false, turns, deathFloor: s.run?.floor ?? 0 };
}

describe('R6-00 bot compétent — re-mesure du biome 1 (1000 runs)', () => {
  it('taux de victoire > 20 %, durée en tours et modules utilisés affichés', { timeout: 120000 }, () => {
    const N = process.env.SIM_RUNS ? parseInt(process.env.SIM_RUNS, 10) : 1000; // SIM_RUNS réduit en CI (R9-06 perf)
    let wins = 0;
    let totalTurns = 0;
    const moduleUsage: Record<string, number> = {};
    const deathFloors = [0, 0, 0, 0, 0];
    for (let seed = 1; seed <= N; seed++) {
      const r = competentBiome1Run((seed * 2654435761) >>> 0, moduleUsage);
      if (r.won) wins++;
      totalTurns += r.turns;
      if (!r.won && r.deathFloor >= 1 && r.deathFloor <= 4) deathFloors[r.deathFloor]++;
    }
    const rate = wins / N;
    const sorted = Object.entries(moduleUsage).sort((a, b) => b[1] - a[1]);
    console.log(
      `[R6-00] runs=${N} victoires=${wins} taux=${(rate * 100).toFixed(2)}% tours moyens=${(totalTurns / N).toFixed(1)}`,
    );
    console.log(`[R6-00] morts par sol: ${deathFloors.map((d, i) => `sol${i + 1}=${d}`).join(' ')}`);
    console.log(`[R6-00] modules utilisés (top): ${sorted.slice(0, 6).map(([k, v]) => `${k}=${v}`).join(', ') || 'aucun'}`);
    expect(rate).toBeGreaterThan(0.2);
  });
});
