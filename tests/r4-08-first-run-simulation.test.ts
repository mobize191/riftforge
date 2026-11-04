import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState } from '../src/core/combat/combat';
import { createModule } from '../src/core/combat/createModule';
import { pickEncounter } from '../src/core/run/encounter';
import { MONSTERS } from '../src/data/monsters';
import { RECIPES } from '../src/data/recipes';
import { BALANCE } from '../src/data/balance';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);
const TARGET_FLOOR = 3;

// Bot « première run » : crée les modules réalisables avec ses orbes, soigne, attaque la faiblesse
// quand possible, fuit si PV très bas.
function botPlay(seed: number, floor: number, state: ReturnType<typeof initialState>) {
  let c = startCombat(
    (state.run!.seed ^ (floor * 7919)) >>> 0,
    state.run!.playerHp,
    state.run!.playerMaxHp,
    state.run!.playerAttack,
    state.run!.encounter ?? ['mousse'],
    state.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
    null,
    {},
    false,
    state.run!.modules.map((m) => m.id),
  );
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
    // essaie de lancer un module créé (dégâts), priorité à la cible faible
    const dmgModule = c.modules
      .map((id) => RECIPES.find((r) => r.id === id))
      .find((r) => r && (r.effect.kind === 'damage' || r.effect.kind === 'aoe'));
    if (dmgModule) {
      const weak = c.enemies.findIndex((e) => {
        const def = MONSTERS.find((m) => e.id.startsWith(m.id));
        return e.hp > 0 && def?.weaknesses.includes(dmgModule.inputs[0]);
      });
      c = combatReduce(c, { type: 'CAST_MODULE', moduleId: dmgModule.id, target: weak >= 0 ? weak : c.enemies.findIndex((e) => e.hp > 0) });
      continue;
    }
    c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) });
  }
  return c;
}

function simulateRun(seed: number): boolean {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  // le bot fabrique des modules dès qu'il a les orbes (création consomme les orbes)
  const tryCraft = (st: typeof s) => {
    for (const r of RECIPES) {
      const res = createModule(st.run!.orbs, r.id);
      if (res.ok) {
        return reduce(st, {
          type: 'CREATE_MODULE',
          recipeId: r.id,
        });
      }
    }
    return st;
  };
  s = tryCraft(s);
  while (s.run && s.mode === 'RUN') {
    const floor = s.run.floor;
    for (let i = 0; i < s.run.level!.monsters.length; i++) {
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: pickEncounter(s.run.seed, floor, i, FAMILY) });
      const c = botPlay(seed, floor, s);
      if (c.phase === 'won') s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      else if (c.phase === 'fled') s = reduce(s, { type: 'EXIT_COMBAT', victory: false });
      else return false;
      s = tryCraft(s);
    }
    if (floor >= TARGET_FLOOR) return true;
    s = reduce(s, { type: 'NEXT_FLOOR' });
  }
  return false;
}

describe('R4-08 simulation « première run gagnable » (1000 runs, kit de départ)', () => {
  it('mesure et affiche le taux de victoire', () => {
    const N = 1000;
    let wins = 0;
    for (let seed = 1; seed <= N; seed++) {
      if (simulateRun((seed * 2654435761) >>> 0)) wins++;
    }
    const rate = wins / N;
    console.log(
      `[R4-08] runs=${N} victoires=${wins} taux=${(rate * 100).toFixed(2)}% (cibles TODO-BALANCE: ${BALANCE.FIRST_RUN_WIN_TARGET_MIN * 100}%-${BALANCE.FIRST_RUN_WIN_TARGET_MAX * 100}% pour le jeu complet)`,
    );
    expect(rate).toBeGreaterThan(0);
  });
});
