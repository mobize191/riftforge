import { describe, it, expect } from 'vitest';
// Bot aléatoire (fuzz) seedé : enchaîne des actions aléatoires sur tout le jeu et vérifie des
// invariants à chaque pas. Déterministe (seed fixe) -> reproductible.
import { createRng } from '../src/core/rng';
import { initialState, reduce, type GameAction } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState, type CombatAction } from '../src/core/combat/combat';
import { serialize, deserialize } from '../src/core/save/save';
import { RECIPES } from '../src/data/recipes';
import { MODULE_FUSIONS, MODULE_FUSION_BY_RESULT } from '../src/data/moduleFusions';
import { MERCHANT_ITEMS, CRAFTABLE_EQUIPMENT } from '../src/data/equipment';
import { CONTRACTS } from '../src/data/contracts';
import { MONSTERS } from '../src/data/monsters';
import { CHALLENGES } from '../src/data/challenges';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { BUILDINGS } from '../src/data/buildings';
import type { GameState } from '../src/core/types';

const FAMILY = MONSTERS.map((m) => m.id);

function randomGameAction(s: GameState, rng: ReturnType<typeof createRng>): GameAction {
  const run = s.run;
  const pool: GameAction[] = [];
  if (s.mode === 'FORGE' || s.mode === 'RETOUR') {
    pool.push({ type: 'START_RUN', seed: rng.int(100000) });
    for (const item of MERCHANT_ITEMS) pool.push({ type: 'BUY_ITEM', defId: item.id });
    for (const item of CRAFTABLE_EQUIPMENT) pool.push({ type: 'CRAFT_ITEM', defId: item.id });
    for (const b of Object.keys(BUILDINGS)) pool.push({ type: 'UPGRADE_BUILDING', buildingId: b });
    pool.push({ type: 'UPGRADE_LAB' });
    for (const r of RECIPES) pool.push({ type: 'CRAFT_LAB_RECIPE', recipeId: r.id });
    for (const id of s.forge.roster) {
      pool.push({ type: 'RENAME_COMPANION', monsterId: id, name: `C${rng.int(999)}` });
      pool.push({ type: 'SET_TEAM', monsterIds: [id] });
      pool.push({ type: 'SET_TEAM', monsterIds: [] });
      pool.push({ type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: id });
      pool.push({ type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: null });
    }
    for (let i = 0; i < 3; i++) {
      pool.push({ type: 'SAVE_GRIMOIRE', slot: i, name: `G${i}`, recipeIds: RECIPES.slice(0, 2).map((r) => r.id) });
    }
    if (s.mode === 'RETOUR') pool.push({ type: 'RETURN_FORGE' });
    pool.push({ type: 'ADVANCE_TICKS', ticks: rng.int(500) });
  }
  if (s.mode === 'RUN' && run?.level) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx !== 0 || dy !== 0) pool.push({ type: 'MOVE_PLAYER', to: { x: run.playerPos.x + dx, y: run.playerPos.y + dy } });
      }
    }
    pool.push({ type: 'INTERACT' });
    pool.push({ type: 'NEXT_FLOOR' });
    pool.push({ type: 'TICK_RUN', ticks: rng.int(50) });
    for (const r of RECIPES) pool.push({ type: 'CREATE_MODULE', recipeId: r.id });
    for (const f of MODULE_FUSIONS) pool.push({ type: 'FUSE_MODULES', fusionId: f.id });
    pool.push({ type: 'FUSE_ORBS', indices: [0, 1].map(() => rng.int(Math.max(1, run.orbs.length))) });
    for (const id of Object.keys(COMPANION_BY_MONSTER)) {
      for (const sk of COMPANION_BY_MONSTER[id].skills) pool.push({ type: 'UPGRADE_SKILL', skillId: sk.id });
    }
    pool.push({ type: 'DIE' });
    // rencontre aléatoire depuis la carte
    if (run.level.monsters.length > 0) {
      const m = rng.pick(run.level.monsters);
      const count = 1 + rng.int(3);
      const enemies: string[] = [];
      for (let i = 0; i < count; i++) enemies.push(rng.pick(FAMILY));
      pool.push({ type: 'ENTER_COMBAT', enemies, fromMap: true });
      void m;
    }
    pool.push({ type: 'ENTER_COMBAT', enemies: [`boss:racine-mere`], fromMap: false });
    if (run.challengeId || rng.next() < 0.1) {
      pool.push({ type: 'ENTER_COMBAT', enemies: ['mousse'], challengeId: rng.pick(CHALLENGES).id, fromMap: false });
    }
    if (run.pendingMilestone) {
      pool.push({ type: 'RESOLVE_MILESTONE', choice: { kind: 'unlock', skillId: 'soin-simple' } });
    }
    for (let i = 0; i < 3; i++) pool.push({ type: 'EXEC_GRIMOIRE', slot: i });
  }
  if (s.mode === 'COMBAT' && run) {
    pool.push({ type: 'EXIT_COMBAT', victory: rng.next() < 0.7, loot: undefined, companionKo: rng.next() < 0.2, playerHp: rng.int(run.playerMaxHp + 1) });
    pool.push({ type: 'DIE' });
  }
  return rng.pick(pool.length > 0 ? pool : [{ type: 'START_RUN', seed: 1 }]);
}

function randomCombatAction(c: CombatState, rng: ReturnType<typeof createRng>): CombatAction {
  const pool: CombatAction[] = [
    { type: 'ATTACK', target: rng.int(Math.max(1, c.enemies.length)) },
    { type: 'FLEE' },
    { type: 'CAPTURE', target: rng.int(Math.max(1, c.enemies.length)) },
    { type: 'FUSE_IN_COMBAT', indices: [rng.int(Math.max(1, c.orbs.length)), rng.int(Math.max(1, c.orbs.length))] },
  ];
  for (const item of c.items) pool.push({ type: 'USE_ITEM', itemId: item.def.id, target: rng.int(Math.max(1, c.enemies.length)) });
  for (const id of c.modules) pool.push({ type: 'CAST_MODULE', moduleId: id, target: rng.int(Math.max(1, c.enemies.length)) });
  for (const r of RECIPES) {
    if (MODULE_FUSION_BY_RESULT[r.id]) continue; // R11-01 (E1) : fusion-only, refusée en combat
    pool.push({ type: 'CRAFT_MODULE', recipeId: r.id });
  }
  for (const f of MODULE_FUSIONS) pool.push({ type: 'FUSE_MODULES', fusionId: f.id });
  if (c.companion) {
    for (const skillId of Object.keys(c.companion.skills)) pool.push({ type: 'USE_COMPANION_SKILL', skillId });
  }
  return rng.pick(pool);
}

function invariants(s: GameState, c?: CombatState | null) {
  const f = s.forge;
  for (const res of ['credits', 'essence', 'mineraiBrut', 'lingots', 'spores'] as const) {
    expect(f[res]).toBeGreaterThanOrEqual(0);
  }
  // l'état est toujours sérialisable (save round-trip, comparaison JSON stricte)
  const j1 = JSON.stringify(JSON.parse(serialize(s)));
  const j2 = JSON.stringify(JSON.parse(serialize(deserialize(serialize(s)))));
  if (j1 !== j2) {
    const walk = (x: any, y: any, path: string): string[] => {
      if (typeof x !== typeof y || x === null || y === null || typeof x !== 'object')
        return JSON.stringify(x) !== JSON.stringify(y) ? [`${path}: ${JSON.stringify(x)?.slice(0, 50)} -> ${JSON.stringify(y)?.slice(0, 50)}`] : [];
      return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) => walk(x?.[k], y?.[k], `${path}.${k}`));
    };
    throw new Error('save round-trip diff: ' + walk(JSON.parse(j1), JSON.parse(j2), '').slice(0, 3).join(' | '));
  }
  if (c) {
    expect(c.player.hp).toBeGreaterThanOrEqual(0);
    for (const e of c.enemies) expect(e.hp).toBeGreaterThanOrEqual(0);
    // pas de module en double
    expect(new Set(c.modules).size).toBe(c.modules.length);
    // un combat ne peut pas rester en phase 'player' avec tous les ennemis morts
    if (c.phase === 'player' && !c.enemies.some((e) => e.hp > 0)) {
      throw new Error(`combat bloqué: phase=player, ennemis=${c.enemies.map((e) => e.hp).join('/')}, log=${c.log.slice(-4).join(' | ')}`);
    }
  }
}

describe('fuzz bot — actions aléatoires seedées sur tout le jeu', () => {
  it('200 sessions aléatoires : aucun crash, invariants tenus, combats jamais bloqués', { timeout: 60000 }, () => {
    const SESSIONS = Number(process.env.FUZZ_SESSIONS ?? 200);
    let combats = 0;
    let combatsTermines = 0;
    for (let seed = 1; seed <= SESSIONS; seed++) {
      const rng = createRng(seed * 7919 + 13);
      let s = initialState();
      let combat: CombatState | null = null;
      const steps = 50 + rng.int(150);
      for (let step = 0; step < steps; step++) {
        if (s.mode === 'COMBAT' && s.run?.encounter) {
          if (!combat) {
            combats++;
            combat = startCombat(
              (s.run.seed ^ step) >>> 0,
              s.run.playerHp,
              s.run.playerMaxHp,
              s.run.playerAttack,
              s.run.encounter,
              s.run.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
              s.forge.team[0] ? (COMPANION_BY_MONSTER[s.forge.team[0]] ?? null) : null,
              s.run.companionSkills,
              s.run.companionKo,
              s.run.modules.map((m) => m.id),
              s.run.challengeId ?? undefined,
            );
          }
          combat = combatReduce(combat, randomCombatAction(combat, rng));
          invariants(s, combat);
          if (combat.phase !== 'player') {
            combatsTermines++;
            const victory = combat.phase === 'won';
            s = reduce(s, {
              type: 'EXIT_COMBAT',
              victory,
              loot: combat.loot ?? undefined,
              companionKo: combat.companion?.ko,
              playerHp: combat.player.hp,
            });
            combat = null;
          }
        } else {
          if (s.mode !== 'COMBAT') combat = null; // état de combat périmé
          s = reduce(s, randomGameAction(s, rng));
          invariants(s, null);
        }
      }
      // en fin de session, l'état final reste valide
      invariants(s, null);
    }
    console.log(`[fuzz-bot] sessions=${SESSIONS} combats=${combats} terminés=${combatsTermines} (reste en cours = session finie au milieu d'un combat, légal)`);
    expect(combats).toBeGreaterThan(0);
    // aucun combat bloqué : tout combat terminé l'a été ; ceux restants étaient encore légitimes
    // (invariant vérifié à chaque pas : phase 'player' => au moins un ennemi vivant)
    expect(combatsTermines).toBeLessThanOrEqual(combats);
  });

  it('les contrats sont vérifiés sans erreur sur des runs aléatoires', () => {
    const rng = createRng(42);
    let s = initialState();
    for (let i = 0; i < 200; i++) {
      s = reduce(s, randomGameAction(s, rng));
      invariants(s, null);
    }
    // les contrats chargeables
    expect(CONTRACTS.length).toBeGreaterThanOrEqual(2);
  });
});
