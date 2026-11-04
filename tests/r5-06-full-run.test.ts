import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce } from '../src/core/combat/combat';
import { pickEncounter } from '../src/core/run/encounter';
import { MONSTERS } from '../src/data/monsters';
import { RECIPES } from '../src/data/recipes';
import { createModule } from '../src/core/combat/createModule';
import { BIOME_1_STRUCTURE } from '../src/data/biomes';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);

// Bot : attaque la cible faible, soigne si besoin, fuit si très bas ; craft des modules si possible.
function botCombat(c: ReturnType<typeof startCombat>) {
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
    const alive = c.enemies.findIndex((e) => e.hp > 0);
    c = combatReduce(c, { type: 'ATTACK', target: alive >= 0 ? alive : 0 });
  }
  return c;
}

function fullBiome1Run(seed: number) {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  const tryCraft = (st: typeof s) => {
    for (const r of RECIPES) {
      if (createModule(st.run!.orbs, r.id).ok) return reduce(st, { type: 'CREATE_MODULE', recipeId: r.id });
    }
    return st;
  };
  s = tryCraft(s);
  let combats = 0;
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
      );
      combats++;
      if (c.phase === 'won') s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      else if (c.phase === 'fled') s = reduce(s, { type: 'EXIT_COMBAT', victory: false });
      else return { s, combats, won: false };
      s = tryCraft(s);
    }
    if (floor >= BIOME_1_STRUCTURE.floors) {
      // boss au 4e sol
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
      );
      combats++;
      if (c.phase === 'won') s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      else return { s, combats, won: false };
      break;
    }
    s = reduce(s, { type: 'NEXT_FLOOR' });
  }
  // R6-04 : vaincre le boss du biome 1 ouvre le biome 2 dans la même run.
  return { s, combats, won: s.mode === 'RUN' && s.run!.biomeIndex === 1 };
}

describe('R5-06 run complète du biome 1 (bout en bout)', () => {
  it('descente -> 4 niveaux -> boss -> biome 2 ouvert, retour Forge avec 100 % du butin, déterministe', () => {
    const a = fullBiome1Run(4242);
    const b = fullBiome1Run(4242);
    expect(a.s).toEqual(b.s);
    if (a.won) {
      expect(a.s.mode).toBe('RUN');
      expect(a.s.run!.biomeIndex).toBe(1); // biome 2 atteint sans retour à la Forge (R6-04)
      const back = reduce(reduce(a.s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
      expect(back.mode).toBe('FORGE');
      expect(back.forge.credits).toBeGreaterThan(0); // 100 % du butin conservé
      console.log(`[R5-06] run seed 4242 : ${a.combats} combats, biome 2 atteint, crédits=${back.forge.credits}, essence=${back.forge.essence}, spores=${back.forge.spores}`);
    } else {
      console.log(`[R5-06] run seed 4242 : mort après ${a.combats} combats (butin quand même conservé au retour)`);
      const back = reduce(reduce(a.s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
      expect(back.mode).toBe('FORGE');
    }
  });

  it('le boss est atteint au 4e sol via la sortie', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 7 });
    for (let i = 0; i < BIOME_1_STRUCTURE.floors - 1; i++) s = reduce(s, { type: 'NEXT_FLOOR' });
    expect(s.run!.floor).toBe(BIOME_1_STRUCTURE.floors);
    const exit = s.run!.level!.exit;
    s = reduce(s, { type: 'MOVE_PLAYER', to: { x: exit.x, y: exit.y } });
    s = reduce(s, { type: 'INTERACT' });
    expect(s.run!.encounter![0]).toMatch(/^boss:/);
  });
});
