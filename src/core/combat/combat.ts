import { createRng, type Rng } from '../rng';
import { MONSTER_BY_ID } from '../../data/monsters';
import { COMBAT_ITEMS, type ItemDef } from '../../data/items';
import { RECIPES, type RecipeDef } from '../../data/recipes';
import { CAPTURE } from '../../data/capture';
import { applyFusion } from './fuse';
import { affinityMultiplier } from '../../data/affinities';
import { BOSS_BY_ID } from '../../data/bosses';
import { bossDefOf, isBossCombat, nextBossAttack } from './boss';
import { CHALLENGE_BY_ID, type ChallengeDef } from '../../data/challenges';
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

export type CombatPhase = 'player' | 'won' | 'lost' | 'fled' | 'challenge-failed';

export interface ChallengeState {
  def: ChallengeDef;
  turnsLeft: number;
}

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
  telegraph: string | null;
  challenge: ChallengeState | null;
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
  | { type: 'CRAFT_MODULE'; recipeId: string }
  | { type: 'FUSE_IN_COMBAT'; indices: number[] }
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
  challengeId?: string,
): CombatState {
  const challenge = challengeId ? CHALLENGE_BY_ID[challengeId] : undefined;
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
    if (id.startsWith('boss:')) {
      const boss = BOSS_BY_ID[id.slice(5)];
      return {
        id: `boss:${id.slice(5)}-0`,
        name: boss?.name ?? id,
        hp: boss?.hp ?? 30,
        maxHp: boss?.hp ?? 30,
        attack: 0,
        isPlayer: false,
        ...mkStatuses(),
      };
    }
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
    telegraph: null,
    challenge: challenge ? { def: challenge, turnsLeft: challenge.turns } : null,
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
    // Boss : télégraphie l'attaque un tour, l'exécute le suivant (§SPEC-5.1).
    if (e.id.startsWith('boss:')) {
      const boss = bossDefOf({ ...state, enemies: state.enemies.map((x, j) => (j === i ? e : x)) });
      if (!boss) continue;
      if (state.telegraph) {
        const atk = boss.attacks.find((a) => a.name === state.telegraph) ?? boss.attacks[0];
        const absorbed = Math.min(player.shield, atk.damage);
        const dmg = atk.damage - absorbed;
        player = { ...player, hp: Math.max(0, player.hp - dmg), shield: player.shield - absorbed };
        log.push(`${boss.name} exécute ${atk.name} : -${dmg} PV.`);
        state = { ...state, telegraph: null };
        if (player.hp <= 0) return { ...state, player, log, phase: 'lost' };
        continue;
      }
      const next = nextBossAttack(boss, e.hp, e.maxHp, rng);
      log.push(`${boss.name} prépare ${next.name}…`);
      state = { ...state, telegraph: next.name };
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
  const nextTurn = { ...state, player, companion, log, phase: 'player' as const, turn: state.turn + 1 };
  if (nextTurn.challenge) {
    const turnsLeft = nextTurn.challenge.turnsLeft - 1;
    if (turnsLeft <= 0 && nextTurn.enemies.some((e) => e.hp > 0)) {
      // Échec du défi : pas de mort, juste pas de récompense (§SPEC-4.3).
      return {
        ...nextTurn,
        challenge: { ...nextTurn.challenge, turnsLeft: 0 },
        phase: 'challenge-failed',
        log: [...log, `Échec du défi ${nextTurn.challenge.def.name} : plus de tours.`],
      };
    }
    nextTurn.challenge = { ...nextTurn.challenge, turnsLeft };
  }
  return companionAct(nextTurn);
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
      loot: {
        credits: credits + (state.challenge?.def.reward.credits ?? 0),
        orbs,
        kills: state.enemies.length,
        essence: essence + (state.challenge?.def.reward.essence ?? 0),
        minerai,
        captured: state.captured,
      },
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
      // Auto-ciblage : si la cible est morte, on frappe la première cible vivante.
      let ti = action.target;
      if (!state.enemies[ti] || state.enemies[ti].hp <= 0) {
        const firstAlive = state.enemies.findIndex((e) => e.hp > 0);
        if (firstAlive < 0) return state;
        ti = firstAlive;
      }
      const target = state.enemies[ti];
      const dmg = Math.max(1, state.player.attack + (rng.next() < 0.25 ? 1 : 0)); // TODO-BALANCE variance
      const enemies = state.enemies.map((e, i) => (i === ti ? { ...e, hp: Math.max(0, e.hp - dmg), stunned: false } : e));
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
      if (effect.kind === 'damage' || effect.kind === 'aoe') {
        const element = recipe.inputs[0];
        const hit = (e: Combatant, i: number): Combatant => {
          if (e.hp <= 0) return e;
          if (effect.kind === 'damage' && i !== target) return e;
          const def = MONSTER_BY_ID[e.id.split('-')[0]];
          const mult = def && element ? affinityMultiplier(element, def) : 1;
          const dmg = Math.round(effect.power * mult);
          return { ...e, hp: Math.max(0, e.hp - dmg) };
        };
        enemies = enemies.map(hit);
        log.push(
          effect.kind === 'damage'
            ? `${recipe.name} sur ${enemies[target]?.name} : -${Math.round(effect.power * (MONSTER_BY_ID[enemies[target]?.id.split('-')[0] ?? ''] ? affinityMultiplier(element, MONSTER_BY_ID[enemies[target].id.split('-')[0]]) : 1))} PV.`
            : `${recipe.name} : zone, -${effect.power} PV à tous.`,
        );
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
    case 'CRAFT_MODULE': {
      // Création d'un module en combat : consomme les orbes requises, le module est gardé.
      const recipe = RECIPES.find((r) => r.id === action.recipeId);
      if (!recipe) return state;
      if (state.modules.includes(recipe.id)) return state;
      const needed = [...recipe.inputs];
      const orbs = [...state.orbs];
      for (const el of needed) {
        const i = orbs.indexOf(el);
        if (i < 0) return state;
        orbs.splice(i, 1);
      }
      log.push(`${recipe.name} créé (orbes consommées).`);
      return { ...state, orbs, modules: [...state.modules, recipe.id], log };
    }
    case 'FUSE_IN_COMBAT': {
      // En combat, la fusion coûte 1 tour (§SPEC-5.2) : on fusionne puis les ennemis jouent.
      const res = applyFusion(
        state.orbs.map((el, i) => ({ id: `c${i}`, kind: 'primordial' as const, element: el, tier: 1 })),
        action.indices,
      );
      if (!res.ok) return state;
      const compositeElement = res.orbs.find((o) => o.kind === 'composite');
      log.push(
        compositeElement
          ? `Fusion en combat : orbe composite obtenue (coûte le tour).`
          : 'Fusion en combat (coûte le tour).',
      );
      const newOrbs = res.orbs
        .filter((o) => o.kind === 'primordial')
        .map((o) => o.element as ElementId);
      return enemyTurn({ ...state, orbs: newOrbs, log }, rng);
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
