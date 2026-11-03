import { createRng, type Rng } from '../rng';
import { MONSTER_BY_ID } from '../../data/monsters';
import { COMBAT_ITEMS, type ItemDef } from '../../data/items';
import type { ElementId } from '../types';

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  isPlayer: boolean;
}

export interface CombatItem {
  def: ItemDef;
  usesLeft: number;
}

export type CombatPhase = 'player' | 'won' | 'lost' | 'fled';

export interface CombatLoot {
  credits: number;
  orbs: ElementId[];
}

export interface CombatState {
  seed: number;
  turn: number;
  phase: CombatPhase;
  player: Combatant;
  enemies: Combatant[];
  items: CombatItem[];
  loot: CombatLoot | null;
  log: string[];
}

export type CombatAction =
  | { type: 'ATTACK'; target: number }
  | { type: 'USE_ITEM'; itemId: string; target?: number }
  | { type: 'FLEE' };

const FLEE_CHANCE = 0.6; // TODO-BALANCE (sera déplacé en data à l'équilibrage)

export function startCombat(
  seed: number,
  playerHp: number,
  playerMaxHp: number,
  playerAttack: number,
  enemyIds: string[],
): CombatState {
  const enemies: Combatant[] = enemyIds.map((id, i) => {
    const def = MONSTER_BY_ID[id];
    return {
      id: `${id}-${i}`,
      name: def?.name ?? id,
      hp: def?.hp ?? 5,
      maxHp: def?.hp ?? 5,
      attack: def?.attack ?? 1,
      isPlayer: false,
    };
  });
  return {
    seed,
    turn: 1,
    phase: 'player',
    player: {
      id: 'player',
      name: 'Technomancien·ne',
      hp: playerHp,
      maxHp: playerMaxHp,
      attack: playerAttack,
      isPlayer: true,
    },
    enemies,
    items: COMBAT_ITEMS.map((def) => ({ def, usesLeft: def.usesPerCombat })),
    loot: null,
    log: ['Un combat éclate !'],
  };
}

function enemyTurn(state: CombatState, rng: Rng): CombatState {
  const log = [...state.log];
  let player = state.player;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const dmg = e.attack;
    player = { ...player, hp: Math.max(0, player.hp - dmg) };
    log.push(`${e.name} attaque : -${dmg} PV.`);
  }
  if (player.hp <= 0) {
    return { ...state, player, log, phase: 'lost' };
  }
  return { ...state, player, log, phase: 'player', turn: state.turn + 1 };
}

function checkVictory(state: CombatState, rng: Rng): CombatState {
  if (state.enemies.every((e) => e.hp <= 0)) {
    const credits = 5 + rng.int(10); // TODO-BALANCE
    const orbCount = 1 + rng.int(2); // TODO-BALANCE
    const elements: ElementId[] = ['feu', 'eau', 'terre', 'air'];
    const orbs: ElementId[] = Array.from({ length: orbCount }, () => rng.pick(elements));
    return {
      ...state,
      phase: 'won',
      loot: { credits, orbs },
      log: [...state.log, `Victoire ! Butin : ${credits} crédits, ${orbs.length} orbe(s).`],
    };
  }
  return state;
}

export function combatReduce(state: CombatState, action: CombatAction): CombatState {
  if (state.phase !== 'player') return state;
  const rng = createRng((state.seed ^ (state.turn * 7919)) >>> 0);
  const log = [...state.log];

  switch (action.type) {
    case 'ATTACK': {
      const target = state.enemies[action.target];
      if (!target || target.hp <= 0) return state;
      const dmg = Math.max(1, state.player.attack + (rng.next() < 0.25 ? 1 : 0)); // TODO-BALANCE variance
      const enemies = state.enemies.map((e, i) => (i === action.target ? { ...e, hp: Math.max(0, e.hp - dmg) } : e));
      log.push(`Vous attaquez ${target.name} : -${dmg} PV.`);
      let next: CombatState = { ...state, enemies, log };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return enemyTurn(next, rng);
    }
    case 'USE_ITEM': {
      const idx = state.items.findIndex((it) => it.def.id === action.itemId && it.usesLeft > 0);
      if (idx < 0) return state;
      const item = state.items[idx];
      const items = state.items.map((it, i) => (i === idx ? { ...it, usesLeft: it.usesLeft - 1 } : it));
      if (item.def.kind === 'heal') {
        const player = { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + item.def.power) };
        log.push(`${item.def.name} : +${item.def.power} PV.`);
        return enemyTurn({ ...state, player, items, log }, rng);
      }
      const target = action.target ?? 0;
      const enemy = state.enemies[target];
      if (!enemy || enemy.hp <= 0) return state;
      const enemies = state.enemies.map((e, i) => (i === target ? { ...e, hp: Math.max(0, e.hp - item.def.power) } : e));
      log.push(`${item.def.name} sur ${enemy.name} : -${item.def.power} PV.`);
      let next: CombatState = { ...state, enemies, items, log };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return enemyTurn(next, rng);
    }
    case 'FLEE': {
      if (rng.next() < FLEE_CHANCE) {
        return { ...state, phase: 'fled', log: [...log, 'Vous fuyez le combat.'] };
      }
      log.push('Fuite ratée !');
      return enemyTurn({ ...state, log }, rng);
    }
    default:
      return state;
  }
}
