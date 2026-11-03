import { describe, it, expect } from 'vitest';
import { initialState, reduce, type GameAction } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState } from '../src/core/combat/combat';
import { pickEncounter } from '../src/core/run/encounter';
import { MONSTERS } from '../src/data/monsters';
import type { GameState } from '../src/core/types';

const FAMILY = MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id);
const TARGET_FLOOR = 3;

// Bot simple : attaque la première cible vivante, soigne si PV < 40 %, fuit si PV < 15 %.
function botCombat(seed: number, state: GameState): CombatState {
  let c = startCombat(
    seed,
    state.run!.playerHp,
    state.run!.playerMaxHp,
    state.run!.playerAttack,
    state.run!.encounter ?? ['mousse'],
    state.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
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
    const target = c.enemies.findIndex((e) => e.hp > 0);
    c = combatReduce(c, { type: 'ATTACK', target });
  }
  return c;
}

function simulateRun(seed: number): { won: boolean; floorsCleared: number } {
  let s = reduce(initialState(), { type: 'START_RUN', seed });
  let floorsCleared = 0;
  while (s.run && s.mode === 'RUN') {
    const floor = s.run.floor;
    const map = s.run.level!;
    // Le bot affronte chaque monstre du niveau (contact inévitable en explorant).
    for (let i = 0; i < map.monsters.length; i++) {
      const enemies = pickEncounter(s.run.seed, floor, i, FAMILY);
      let actions: GameAction[] = [{ type: 'ENTER_COMBAT', enemies }];
      s = actions.reduce(reduce, s);
      const combatSeed = (s.run!.seed ^ (s.run!.floor * 7919) ^ i) >>> 0;
      const c = botCombat(combatSeed, s);
      if (c.phase === 'won') {
        s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: c.loot ?? undefined });
      } else if (c.phase === 'fled') {
        s = reduce(s, { type: 'EXIT_COMBAT', victory: false });
      } else {
        s = reduce(s, { type: 'DIE' });
        return { won: false, floorsCleared };
      }
    }
    floorsCleared = floor;
    if (floor >= TARGET_FLOOR) return { won: true, floorsCleared };
    s = reduce(s, { type: 'NEXT_FLOOR' });
  }
  return { won: false, floorsCleared };
}

describe('R1-07 balance simulation (1000 runs, kit de départ)', () => {
  it('mesure le taux de victoire du sol 3 du biome 1', () => {
    const N = 1000;
    let wins = 0;
    let totalFloors = 0;
    for (let seed = 1; seed <= N; seed++) {
      const r = simulateRun(seed * 2654435761 >>> 0);
      if (r.won) wins++;
      totalFloors += r.floorsCleared;
    }
    const winRate = wins / N;
    console.log(
      `[R1-07] runs=${N} victoires(sol ${TARGET_FLOOR})=${wins} taux=${(winRate * 100).toFixed(1)}% sol moyen cleare=${(totalFloors / N).toFixed(2)}`,
    );
    expect(winRate).toBeGreaterThan(0); // victoire possible
    expect(winRate).toBeLessThan(1); // mais pas garantie
  });
});
