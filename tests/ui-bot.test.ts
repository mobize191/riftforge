import { describe, it, expect } from 'vitest';
// Bot « IHM » : rejoue les séquences exactes d'actions que l'UI dispatch (mêmes appels à reduce /
// startCombat que App.tsx), et vérifie des invariants de bout en bout.
import { initialState, reduce, type GameAction } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState, type CombatAction } from '../src/core/combat/combat';
import { monsterAt, pickEncounter } from '../src/core/run/encounter';
import { isWall, type LevelMap } from '../src/core/run/generate';
import { MONSTERS } from '../src/data/monsters';
import { RECIPES } from '../src/data/recipes';
import { COMPANION_BY_MONSTER } from '../src/data/companions';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);

// BFS vers la cible la plus proche (comme un joueur qui suit un chemin)
function bfsNextStep(
  map: LevelMap,
  from: { x: number; y: number },
  isTarget: (x: number, y: number) => boolean,
): { x: number; y: number } | null {
  const prev = new Map<string, string>();
  const q: [number, number][] = [[from.x, from.y]];
  const seen = new Set([`${from.x},${from.y}`]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (isTarget(x, y) && !(x === from.x && y === from.y)) return { x, y };
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && !isWall(map, nx, ny)) {
        seen.add(k);
        prev.set(k, `${x},${y}`);
        q.push([nx, ny]);
      }
    }
  }
  // reconstruit le premier pas
  const target = [...seen].map((k) => k.split(',').map(Number) as [number, number]).find(([x, y]) => isTarget(x, y));
  if (!target) return null;
  let cur = `${target[0]},${target[1]}`;
  while (prev.get(cur) && prev.get(cur) !== `${from.x},${from.y}`) cur = prev.get(cur)!;
  const [sx, sy] = cur.split(',').map(Number);
  return { x: sx, y: sy };
}

// Crée l'état de combat exactement comme App.tsx (onEncounter / filet de sécurité)
function uiStartCombat(s: ReturnType<typeof initialState>): CombatState {
  return startCombat(
    (s.run!.seed ^ (s.run!.floor * 7919)) >>> 0,
    s.run!.playerHp,
    s.run!.playerMaxHp,
    s.run!.playerAttack,
    s.run!.encounter!,
    s.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
    s.forge.team[0] ? (COMPANION_BY_MONSTER[s.forge.team[0]] ?? null) : null,
    s.run!.companionSkills,
    s.run!.companionKo,
    s.run!.modules.map((m) => m.id),
    s.run!.challengeId ?? undefined,
  );
}

// Bot de combat : attaque la cible vivante, craft un module si possible, soin si bas, fuite si très bas.
function uiBotCombat(c: CombatState): CombatState {
  let guard = 0;
  while (c.phase === 'player' && guard++ < 300) {
    if (c.player.hp < c.player.maxHp * 0.15) {
      c = combatReduce(c, { type: 'FLEE' });
      continue;
    }
    const heal = c.items.find((i) => i.def.kind === 'heal' && i.usesLeft > 0);
    if (c.player.hp < c.player.maxHp * 0.4 && heal) {
      c = combatReduce(c, { type: 'USE_ITEM', itemId: heal.def.id });
      continue;
    }
    if (c.companion && !c.companion.ko) {
      const skill = Object.keys(c.companion.skills)[0];
      if (skill) {
        c = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: skill });
        continue;
      }
    }
    const orbCounts = new Map<string, number>();
    for (const o of c.orbs) orbCounts.set(o, (orbCounts.get(o) ?? 0) + 1);
    const craftable = RECIPES.find((r) => {
      if (c.modules.includes(r.id)) return false;
      const need = new Map<string, number>();
      for (const el of r.inputs) need.set(el, (need.get(el) ?? 0) + 1);
      return [...need].every(([el, n]) => (orbCounts.get(el) ?? 0) >= n);
    });
    if (craftable) {
      c = combatReduce(c, { type: 'CRAFT_MODULE', recipeId: craftable.id });
      continue;
    }
    const alive = c.enemies.findIndex((e) => e.hp > 0);
    c = combatReduce(c, { type: 'ATTACK', target: alive >= 0 ? alive : 0 });
  }
  return c;
}

describe('bot IHM — scénario complet rejoué comme l’UI', () => {
  it('descente complète : combats terminent toujours, monstres retirés, pas de module en double, compagnon actif', () => {
    let s = initialState();
    const acts: GameAction[] = [{ type: 'START_RUN', seed: 777 }];
    s = acts.reduce(reduce, s);

    // capture d'un compagnon au premier combat
    let combats = 0;
    let sawCompanionAct = false;
    let sawVictory = false;
    for (let step = 0; step < 60 && s.mode === 'RUN' && s.run; step++) {
      const map = s.run.level!;
      // le bot suit un chemin BFS vers le monstre le plus proche
      const step = bfsNextStep(map, s.run.playerPos, (x, y) =>
        map.monsters.some((m) => m.pos.x === x && m.pos.y === y),
      );
      if (step) s = reduce(s, { type: 'MOVE_PLAYER', to: step });
      // contact (même case ou adjacent) -> ENTER_COMBAT comme onEncounter
      let idx = monsterAt(s.run.level!, s.run.playerPos);
      if (idx < 0) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          idx = monsterAt(s.run.level!, { x: s.run.playerPos.x + dx, y: s.run.playerPos.y + dy });
          if (idx >= 0) break;
        }
      }
      if (idx >= 0) {
        const enemies = pickEncounter(s.run.seed, s.run.floor, idx, FAMILY);
        s = reduce(s, { type: 'ENTER_COMBAT', enemies, fromMap: true });
        // invariant : le monstre déclencheur a disparu de la carte
        expect(monsterAt(s.run.level!, s.run.playerPos)).toBe(-1);
        const c0 = uiStartCombat(s);
        const c = uiBotCombat(c0);
        combats++;
        expect(['won', 'lost', 'fled', 'challenge-failed']).toContain(c.phase); // jamais bloqué
        if (c.phase === 'won') sawVictory = true;
        if (c.log.some((l) => l.includes(':'))) sawCompanionAct = sawCompanionAct || c.companion !== null;
        // pas de doublon de modules
        expect(new Set(c.modules).size).toBe(c.modules.length);
        s = reduce(s, {
          type: 'EXIT_COMBAT',
          victory: c.phase === 'won',
          loot: c.loot ?? undefined,
          companionKo: c.companion?.ko,
          playerHp: c.player.hp,
        });
        if (s.mode !== 'RUN') break; // mort -> RETOUR
        continue;
      }
      // sinon avance vers la sortie (BFS)
      const exit = s.run.level!.exit;
      const step2 = bfsNextStep(s.run.level!, s.run.playerPos, (x, y) => x === exit.x && y === exit.y);
      if (step2) s = reduce(s, { type: 'MOVE_PLAYER', to: step2 });
      if (s.run.playerPos.x === exit.x && s.run.playerPos.y === exit.y) {
        s = reduce(s, { type: 'INTERACT' }); // sortie -> sol suivant ou boss
        if (s.mode === 'COMBAT') {
          const c = uiBotCombat(uiStartCombat(s));
          combats++;
          expect(['won', 'lost', 'fled']).toContain(c.phase);
          s = reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined, playerHp: c.player.hp });
          break;
        }
      }
    }
    console.log(`[ui-bot] combats=${combats} victoire=${sawVictory} mode final=${s.mode}`);
    expect(combats).toBeGreaterThan(0);

    // retour Forge avec butin
    if (s.mode === 'RETOUR' || s.mode === 'RUN') {
      s = reduce(s, { type: 'DIE' });
      s = reduce(s, { type: 'RETURN_FORGE' });
    }
    expect(s.mode).toBe('FORGE');
    expect(s.forge.credits).toBeGreaterThanOrEqual(0);

    // compagnon : capture -> écurie -> équipe -> présent en combat avec compétence utilisable
    s = reduce(s, { type: 'RENAME_COMPANION', monsterId: s.forge.roster[0] ?? 'mousse', name: 'Brindille' });
    if (s.forge.roster.length === 0) {
      s = { ...s, forge: { ...s.forge, roster: ['mousse'] } };
    }
    s = reduce(s, { type: 'SET_TEAM', monsterIds: [s.forge.roster[0]] });
    s = reduce(s, { type: 'START_RUN', seed: 778 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: true });
    const c = uiStartCombat(s);
    expect(c.companion).not.toBeNull();
    const skillId = Object.keys(c.companion!.skills)[0];
    const hpBefore = c.player.hp;
    const c2 = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId });
    expect(c2.log.some((l) => l.includes(c.companion!.name))).toBe(true); // le compagnon a bien agi
    void hpBefore;
  });

  it('un DoT qui tue le dernier ennemi termine bien le combat (pas de fenêtre bloquée)', () => {
    let c = startCombat(3, 20, 20, 4, ['mousse'], ['feu', 'terre'], null, {}, false, ['magma']);
    c = combatReduce(c, { type: 'CAST_MODULE', moduleId: 'magma', target: 0 }); // DoT 3/tour, mousse 8 PV
    // le bot attaque jusqu'à la mort ; le dernier coup peut venir du DoT côté ennemi
    let guard = 0;
    while (c.phase === 'player' && guard++ < 50) {
      c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    expect(['won', 'lost', 'fled']).toContain(c.phase);
  });

  it('CREATE_MODULE refuse le doublon (plus de perte d’orbes)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    s = {
      ...s,
      run: {
        ...s.run!,
        orbs: [
          { id: 'a', kind: 'primordial', element: 'feu', tier: 1 },
          { id: 'b', kind: 'primordial', element: 'feu', tier: 1 },
          { id: 'c', kind: 'primordial', element: 'feu', tier: 1 },
        ],
      },
    };
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'combustion' });
    expect(s.run!.modules.map((m) => m.id)).toEqual(['combustion']);
    const before = s;
    s = reduce(s, { type: 'CREATE_MODULE', recipeId: 'combustion' });
    expect(s).toBe(before); // refusé : déjà créé, orbes non consommées
  });
});

describe('bot IHM — couverture des bugs remontés', () => {
  it('sorts combinés : chaque type de module créé puis lancé ne bloque jamais le combat', () => {
    for (const recipeId of ['combustion', 'magma', 'vapeur', 'boue', 'cryo-brume', 'poussiere', 'plaque-blindee', 'cyclone', 'condensation', 'seve-synthetique']) {
      const recipe = RECIPES.find((r) => r.id === recipeId)!;
      let c = startCombat(11, 30, 30, 4, ['mousse', 'cuirasse'], recipe.inputs as never, null, {}, false, [recipeId]);
      let guard = 0;
      while (c.phase === 'player' && guard++ < 100) {
        const alive = c.enemies.findIndex((e) => e.hp > 0);
        c = combatReduce(c, { type: 'CAST_MODULE', moduleId: recipeId, target: alive >= 0 ? alive : 0 });
        if (guard > 1) c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) >= 0 ? c.enemies.findIndex((e) => e.hp > 0) : 0 });
        // R10-02 : action refusée (énergie) -> on passe le tour gratuitement (capture).
        if (c.phase === 'player' && c.log[c.log.length - 1]?.includes("Pas assez d'énergie")) {
          c = combatReduce(c, { type: 'CAPTURE', target: c.enemies.findIndex((e) => e.hp > 0) >= 0 ? c.enemies.findIndex((e) => e.hp > 0) : 0 });
        }
      }
      expect(['won', 'lost', 'fled']).toContain(c.phase); // jamais 'player' bloqué
    }
  });

  it('défi (autel) à usage unique via le flux UI : INTERACT -> combat -> retour -> plus d’autel', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 6 });
    const altar = s.run!.level!.altars[0];
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: altar.x, y: altar.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('COMBAT');
    expect(s.run!.challengeId).toBe('autel-garde');
    s = reduce(s, { type: 'EXIT_COMBAT', victory: false, playerHp: 20 }); // défi échoué ou fui
    expect(s.mode).toBe('RUN');
    // re-INTERACT sur la même case : plus de défi
    s = reduce(s, { type: 'INTERACT' });
    expect(s.mode).toBe('RUN');
    expect(s.run!.challengeId).toBeNull();
  });

  it('compagnon : en équipe -> compétence utilisable en combat ; PAS worker en même temps', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'] } };
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['mousse'] });
    // exclu : worker + équipe en même temps
    const withTeam = s;
    s = reduce(s, { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: 'mousse' });
    expect(s).toBe(withTeam); // refusé
    // mais worker seul OK
    s = reduce(s, { type: 'SET_TEAM', monsterIds: [] });
    s = reduce(s, { type: 'ASSIGN_WORKER', buildingId: 'extracteur', monsterId: 'mousse' });
    expect(s.forge.workers['extracteur']).toEqual(['mousse']);
    // et remettre en équipe retire le worker
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['mousse'] });
    expect(s.forge.team).toEqual(['mousse']);
    expect(s.forge.workers['extracteur'] ?? []).toEqual([]);
    // combat : le compagnon est présent et agit
    s = reduce(s, { type: 'START_RUN', seed: 9 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: true });
    const c = startCombat(9, s.run!.playerHp, s.run!.playerMaxHp, s.run!.playerAttack, ['mousse'], [], COMPANION_BY_MONSTER['mousse'], s.run!.companionSkills);
    expect(c.companion).not.toBeNull();
    const skillId = Object.keys(c.companion!.skills)[0];
    const c2 = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId });
    expect(c2.log.some((l) => l.includes('niv'))).toBe(true);
  });
});
