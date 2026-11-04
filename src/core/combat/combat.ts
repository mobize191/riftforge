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
  dot: number;
  slowed: boolean;
  blinded: boolean;
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
  modules: string[];
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
  modules: string[] = [],
): CombatState {
  const mkStatuses = () => ({ shield: 0, stunned: false, dot: 0, slowed: false, blinded: false });
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
      ...mkStatuses(),
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
      ...mkStatuses(),
    },
    enemies,
    captured: [],
    companion,
    modules,
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
  for (let i = 0; i < state.enemies.length; i++) {
    let e = state.enemies[i];
    if (e.hp <= 0) continue;
    if (e.stunned) {
      log.push(`${e.name} est projeté·e et perd son tour.`);
      continue;
    }
    if (e.dot > 0) {
      const hp = Math.max(0, e.hp - e.dot);
      log.push(`${e.name} subit ${e.dot} dégâts de poison.`);
      e = { ...e, hp, dot: e.dot - 1 };
      state.enemies[i] = e;
      if (hp <= 0) continue;
    }
    if (e.slowed && rng.next() < 0.5) { // TODO-BALANCE
      log.push(`${e.name} est ralenti·e et perd son tour.`);
      continue;
    }
    if (e.blinded && rng.next() < 0.5) { // TODO-BALANCE
      log.push(`L'attaque de ${e.name} manque sa cible (aveuglé).`);
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
      if (!recipe) return state;
      // Modules solo (tier 1, 1 orbe) : lançables gratuitement tant que l'orbe est tenue (R1-04).
      // Autres modules : doivent avoir été créés (présents dans state.modules).
      const isSolo = recipe.inputs.length === 1;
      if (isSolo) {
        if (!state.orbs.includes(recipe.inputs[0])) return state;
      } else if (!state.modules.includes(recipe.id)) {
        return state;
      }
      const target = action.target ?? 0;
      const effect = recipe.effect;
      let player = state.player;
      let enemies = state.enemies;
      if (effect.kind === 'damage') {
        const enemy = enemies[target];
        if (!enemy || enemy.hp <= 0) return state;
        enemies = enemies.map((e, i) => (i === target ? { ...e, hp: Math.max(0, e.hp - effect.power) } : e));
        log.push(`${recipe.name} sur ${enemy.name} : -${effect.power} PV.`);
      } else if (effect.kind === 'aoe') {
        enemies = enemies.map((e) => (e.hp > 0 ? { ...e, hp: Math.max(0, e.hp - effect.power) } : e));
        log.push(`${recipe.name} : zone, -${effect.power} PV à tous.`);
      } else if (effect.kind === 'shield') {
        player = { ...player, shield: player.shield + effect.power };
        log.push(`${recipe.name} : +${effect.power} bouclier.`);
      } else if (effect.kind === 'heal' || effect.kind === 'purify') {
        player = { ...player, hp: Math.min(player.maxHp, player.hp + effect.power) };
        log.push(`${recipe.name} : +${effect.power} PV.`);
      } else if (effect.kind === 'push') {
        enemies = enemies.map((e, i) => (effect.power >= 2 || i === target ? { ...e, stunned: e.hp > 0 } : e));
        log.push(`${recipe.name} : projection${effect.power >= 2 ? ' de tous les ennemis' : ''} !`);
      } else if (effect.kind === 'dot') {
        const enemy = enemies[target];
        if (!enemy || enemy.hp <= 0) return state;
        enemies = enemies.map((e, i) => (i === target ? { ...e, dot: effect.power } : e));
        log.push(`${recipe.name} sur ${enemy.name} : poison ${effect.power}/tour.`);
      } else if (effect.kind === 'slow') {
        enemies = enemies.map((e, i) => (i === target || effect.power >= 2 ? { ...e, slowed: e.hp > 0 } : e));
        log.push(`${recipe.name} : ralenti${effect.power >= 2 ? ' (tous)' : ''}.`);
      } else if (effect.kind === 'blind') {
        enemies = enemies.map((e, i) => (i === target ? { ...e, blinded: true } : e));
        log.push(`${recipe.name} : ${enemies[target]?.name} aveuglé.`);
      }
      let next: CombatState = { ...state, enemies, player, log };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return enemyTurn(next, rng);
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
