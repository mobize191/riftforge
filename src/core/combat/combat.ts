import { createRng, type Rng } from '../rng';
import { MONSTER_BY_ID } from '../../data/monsters';
import { COMBAT_ITEMS, type ItemDef } from '../../data/items';
import { RECIPES, type RecipeDef } from '../../data/recipes';
import { CAPTURE } from '../../data/capture';
import { COMPANION_BY_MONSTER, type CompanionDef } from '../../data/companions';
import type { ElementId } from '../types';

export interface CompanionState {
  defId: string;
  name: string;
  hp: number;
  maxHp: number;
  ko: boolean;
  skills: Record<string, number>;
}

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  isPlayer: boolean;
  shield: number;
  stunned: boolean;
}

export interface CombatItem {
  def: ItemDef;
  usesLeft: number;
}

export type CombatPhase = 'player' | 'won' | 'lost' | 'fled';

export interface CombatLoot {
  credits: number;
  orbs: ElementId[];
  kills: number;
  essence: number;
  minerai: number;
  captured: string[];
}

export interface CapturedMonster {
  monsterId: string;
}

export interface CombatState {
  seed: number;
  turn: number;
  phase: CombatPhase;
  player: Combatant;
  enemies: Combatant[];
  captured: string[];
  companion: CompanionState | null;
  items: CombatItem[];
  orbs: ElementId[];
  loot: CombatLoot | null;
  log: string[];
}

export type CombatAction =
  | { type: 'ATTACK'; target: number }
  | { type: 'USE_ITEM'; itemId: string; target?: number }
  | { type: 'CAST_MODULE'; moduleId: string; target?: number }
  | { type: 'CAPTURE'; target: number }
  | { type: 'FLEE' };

// Probabilité de capture : augmente quand les PV restants baissent (monotone, §R3-01).
export function captureChance(hp: number, maxHp: number): number {
  const missing = maxHp > 0 ? 1 - hp / maxHp : 0;
  return Math.min(1, CAPTURE.baseChance + missing * CAPTURE.missingHpWeight);
}

export function availableSoloModules(orbs: ElementId[]): RecipeDef[] {
  const held = new Set(orbs);
  return RECIPES.filter((r) => r.inputs.length === 1 && held.has(r.inputs[0]));
}

const FLEE_CHANCE = 0.6; // TODO-BALANCE (sera déplacé en data à l'équilibrage)

export function startCombat(
  seed: number,
  playerHp: number,
  playerMaxHp: number,
  playerAttack: number,
  enemyIds: string[],
  orbs: ElementId[] = [],
  companionDef: CompanionDef | null = null,
  companionSkills: Record<string, number> = {},
  companionKo = false,
): CombatState {
  const companion: CompanionState | null = companionDef
    ? {
        defId: companionDef.id,
        name: companionDef.name,
        hp: companionKo ? 0 : (MONSTER_BY_ID[companionDef.monsterId]?.hp ?? 5),
        maxHp: MONSTER_BY_ID[companionDef.monsterId]?.hp ?? 5,
        ko: companionKo,
        skills: { ...companionSkills },
      }
    : null;
  const enemies: Combatant[] = enemyIds.map((id, i) => {
    const def = MONSTER_BY_ID[id];
    return {
      id: `${id}-${i}`,
      name: def?.name ?? id,
      hp: def?.hp ?? 5,
      maxHp: def?.hp ?? 5,
      attack: def?.attack ?? 1,
      isPlayer: false,
      shield: 0,
      stunned: false,
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
      shield: 0,
      stunned: false,
    },
    enemies,
    captured: [],
    companion,
    items: COMBAT_ITEMS.map((def) => ({ def, usesLeft: def.usesPerCombat })),
    orbs,
    loot: null,
    log: ['Un combat éclate !'],
  };
}

function companionAct(state: CombatState): CombatState {
  const comp = state.companion;
  if (!comp || comp.ko) return state;
  const def = Object.values(COMPANION_BY_MONSTER).find((d) => d.id === comp.defId);
  if (!def) return state;
  const unlocked = def.skills.filter((s) => (comp.skills[s.id] ?? 0) > 0);
  const best = unlocked.sort((a, b) => (comp.skills[b.id] * b.healPerLevel) - (comp.skills[a.id] * a.healPerLevel))[0];
  if (!best || best.healPerLevel <= 0) return state;
  const heal = best.healPerLevel * comp.skills[best.id];
  const player = { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + heal) };
  return {
    ...state,
    player,
    log: [...state.log, `${comp.name} (${def.support}) : ${best.name} +${heal} PV.`],
  };
}

function enemyTurn(state: CombatState, rng: Rng): CombatState {
  const log = [...state.log];
  let player = state.player;
  let companion = state.companion;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (e.stunned) {
      log.push(`${e.name} est projeté·e et perd son tour.`);
      continue;
    }
    // 30 % des attaques visent le compagnon (tirage seedé).
    if (companion && !companion.ko && rng.next() < 0.3) { // TODO-BALANCE
      const dmg = e.attack;
      const hp = Math.max(0, companion.hp - dmg);
      companion = { ...companion, hp, ko: hp <= 0 };
      log.push(`${e.name} attaque ${companion.name} : -${dmg} PV${hp <= 0 ? ' — K.O. !' : '.'}`);
      continue;
    }
    const absorbed = Math.min(player.shield, e.attack);
    const dmg = e.attack - absorbed;
    player = { ...player, hp: Math.max(0, player.hp - dmg), shield: player.shield - absorbed };
    log.push(`${e.name} attaque : -${dmg} PV${absorbed > 0 ? ` (${absorbed} absorbés)` : ''}.`);
  }
  if (player.hp <= 0) {
    return { ...state, player, companion, log, phase: 'lost' };
  }
  const afterComp = companionAct({ ...state, player, companion, log, phase: 'player', turn: state.turn + 1 });
  return afterComp;
}

function checkVictory(state: CombatState, rng: Rng): CombatState {
  if (state.enemies.every((e) => e.hp <= 0)) {
    const credits = 5 + rng.int(10); // TODO-BALANCE
    const orbCount = 1 + rng.int(2); // TODO-BALANCE
    const essence = 1 + rng.int(2); // TODO-BALANCE
    const minerai = 1 + rng.int(3); // TODO-BALANCE
    const elements: ElementId[] = ['feu', 'eau', 'terre', 'air'];
    const orbs: ElementId[] = Array.from({ length: orbCount }, () => rng.pick(elements));
    return {
      ...state,
      phase: 'won',
      loot: { credits, orbs, kills: state.enemies.length, essence, minerai, captured: state.captured },
      log: [...state.log, `Victoire ! Butin : ${credits} crédits, ${essence} essence, ${minerai} minerai, ${orbs.length} orbe(s).`],
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
      const enemies = state.enemies.map((e, i) => (i === action.target ? { ...e, hp: Math.max(0, e.hp - dmg), stunned: false } : e));
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
    case 'CAST_MODULE': {
      const recipe = RECIPES.find((r) => r.id === action.moduleId);
      if (!recipe || recipe.inputs.length !== 1) return state;
      if (!state.orbs.includes(recipe.inputs[0])) return state;
      const target = action.target ?? 0;
      const enemy = state.enemies[target];
      if (recipe.effect.kind === 'damage') {
        if (!enemy || enemy.hp <= 0) return state;
        const dmg = recipe.effect.power;
        const enemies = state.enemies.map((e, i) =>
          i === target ? { ...e, hp: Math.max(0, e.hp - dmg) } : e,
        );
        log.push(`${recipe.name} sur ${enemy.name} : -${dmg} PV. (lancement gratuit)`);
        let next: CombatState = { ...state, enemies, log };
        next = checkVictory(next, rng);
        if (next.phase === 'won') return next;
        return enemyTurn(next, rng);
      }
      if (recipe.effect.kind === 'shield') {
        const player = { ...state.player, shield: state.player.shield + recipe.effect.power };
        log.push(`${recipe.name} : +${recipe.effect.power} bouclier. (lancement gratuit)`);
        return enemyTurn({ ...state, player, log }, rng);
      }
      if (recipe.effect.kind === 'push') {
        if (!enemy || enemy.hp <= 0) return state;
        const enemies = state.enemies.map((e, i) => (i === target ? { ...e, stunned: true } : e));
        log.push(`${recipe.name} projette ${enemy.name} ! (lancement gratuit)`);
        let next: CombatState = { ...state, enemies, log };
        next = checkVictory(next, rng);
        if (next.phase === 'won') return next;
        const after = enemyTurn(next, rng);
        return {
          ...after,
          enemies: after.enemies.map((e) => ({ ...e, stunned: false })),
        };
      }
      return state;
    }
    case 'CAPTURE': {
      const target = state.enemies[action.target];
      if (!target || target.hp <= 0) return state;
      if (rng.next() < captureChance(target.hp, target.maxHp)) {
        const monsterId = target.id.split('-')[0];
        log.push(`Capturé : ${target.name} !`);
        const enemies = state.enemies.map((e, i) => (i === action.target ? { ...e, hp: 0 } : e));
        let next: CombatState = {
          ...state,
          enemies,
          captured: [...state.captured, monsterId],
          log,
        };
        next = checkVictory(next, rng);
        if (next.phase === 'won') return next;
        return enemyTurn(next, rng);
      }
      log.push(`Échec de la capture sur ${target.name}.`);
      return enemyTurn({ ...state, log }, rng);
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
