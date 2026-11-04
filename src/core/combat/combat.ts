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
import { BALANCE } from '../../data/balance';
import { COMPANION_BY_MONSTER, type CompanionDef } from '../../data/companions';
import { ELITE, MONSTER_LEVEL_BONUS, BLURRED_AFFINITY_VALUES, RARE_ORBS } from '../../data/riftModifiers';
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
  turn: number; // numéro de round
  actorIdx: number; // index dans order[] de l'acteur courant
  order: string[]; // ids d'acteurs : 'player', 'companion', ids d'ennemis — façon FF, chacun agit à son tour
  phase: CombatPhase;
  player: Combatant;
  enemies: Combatant[];
  captured: string[];
  companion: CompanionState | null;
  modules: string[];
  telegraph: string | null;
  challenge: ChallengeState | null;
  usedSkillsThisTurn: string[];
  items: CombatItem[];
  orbs: ElementId[];
  loot: CombatLoot | null;
  modifiers: string[]; // R7-03 — modificateurs de Faille actifs (élites, niveaux, affinités brouillées, orbes rares)
  log: string[];
}

export type CombatAction =
  | { type: 'ATTACK'; target: number }
  | { type: 'USE_ITEM'; itemId: string; target?: number }
  | { type: 'CAST_MODULE'; moduleId: string; target?: number }
  | { type: 'CAPTURE'; target: number }
  | { type: 'CRAFT_MODULE'; recipeId: string }
  | { type: 'USE_COMPANION_SKILL'; skillId: string }
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
  modifiers: string[] = [],
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
    // R7-02/R7-03 : élite = monstre buffé, visible (préfixe + stats x2/+2)
    const isElite = id.startsWith(ELITE.idPrefix);
    const baseId = isElite ? id.slice(ELITE.idPrefix.length) : id;
    const def = MONSTER_BY_ID[baseId];
    // R7-03 : modificateur « monstres-niveaux » = +PV/+ATQ
    const lvl = modifiers.includes('monstres-niveaux') ? MONSTER_LEVEL_BONUS.levels : 0;
    const hp = (def?.hp ?? 5) * (isElite ? ELITE.hpMultiplier : 1) + lvl * MONSTER_LEVEL_BONUS.hpPerLevel;
    const attack = (def?.attack ?? 1) + (isElite ? ELITE.attackBonus : 0) + lvl * MONSTER_LEVEL_BONUS.atkPerLevel;
    return {
      id: `${id}-${i}`,
      name: (isElite ? ELITE.namePrefix : '') + (def?.name ?? baseId),
      hp,
      maxHp: hp,
      attack,
      isPlayer: false,
      ...mkStatuses(),
    };
  });
  const order = createRng((seed ^ 0x51f15e) >>> 0).shuffle([
    'player',
    ...(companion && !companion.ko ? ['companion'] : []),
    ...enemies.filter((e) => e.hp > 0).map((e) => e.id),
  ]);
  const initial: CombatState = {
    seed,
    turn: 1,
    actorIdx: 0,
    order,
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
    usedSkillsThisTurn: [],
    items: COMBAT_ITEMS.map((def) => ({ def, usesLeft: def.usesPerCombat })),
    orbs,
    loot: null,
    modifiers,
    log: ['Un combat éclate !'],
  };
  // Si un ennemi est premier à l'initiative, il agit avant le premier choix du joueur.
  return advance(initial, createRng((seed ^ 0xa77a6e) >>> 0));
}

export function currentActorId(state: CombatState): string {
  return state.order[state.actorIdx % state.order.length];
}

// Libellé du HUD « Au tour de : … » (testé : le tour du compagnon doit être visible).
export function actorLabel(state: CombatState): string {
  const id = currentActorId(state);
  if (id === 'companion') return `🧝 ${state.companion?.name ?? 'compagnon'}`;
  if (id === 'player') return '🧑‍🔧 vous';
  const enemy = state.enemies.find((e) => e.id === id);
  return enemy ? enemy.name : id;
}

// Libellé FR de l'effet d'un module (affiché dans l'UI de combat).
export function moduleEffectLabel(recipe: RecipeDef): string {
  const e = recipe.effect;
  switch (e.kind) {
    case 'damage':
      return `dégâts ${e.power}`;
    case 'aoe':
      return `dégâts de zone ${e.power}`;
    case 'heal':
    case 'purify':
      return `soin ${e.power} PV`;
    case 'shield':
      return `bouclier ${e.power}`;
    case 'dot':
      return `poison ${e.power}/tour x${e.duration ?? 1}`;
    case 'push':
      return e.power >= 2 ? 'projection de tous' : 'projection';
    case 'slow':
      return e.power >= 2 ? 'ralentit tous' : 'ralentit';
    case 'blind':
      return 'aveugle';
    default:
      return e.kind;
  }
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

// Un ennemi agit (attaque, DoT, boss télégraphié, etc.). Renvoie l'état mis à jour.
function enemyAct(state: CombatState, i: number, rng: Rng): CombatState {
  let e = state.enemies[i];
  if (e.hp <= 0) return state;
  const log = [...state.log];
  let player = state.player;
  let companion = state.companion;
  let enemies = state.enemies;
  let telegraph = state.telegraph;
  if (e.stunned) {
    log.push(`${e.name} est projeté·e et perd son tour.`);
    return { ...state, log };
  }
  if (e.id.startsWith('boss:')) {
    const boss = bossDefOf({ ...state, enemies: state.enemies.map((x, j) => (j === i ? e : x)) });
    if (!boss) return state;
    if (telegraph) {
      const atk = boss.attacks.find((a) => a.name === telegraph) ?? boss.attacks[0];
      const absorbed = Math.min(player.shield, atk.damage);
      const dmg = atk.damage - absorbed;
      player = { ...player, hp: Math.max(0, player.hp - dmg), shield: player.shield - absorbed };
      log.push(`${boss.name} exécute ${atk.name} : -${dmg} PV.`);
      telegraph = null;
      if (player.hp <= 0) return { ...state, player, log, telegraph, phase: 'lost' };
      return { ...state, player, log, telegraph };
    }
    const next = nextBossAttack(boss, e.hp, e.maxHp, rng);
    log.push(`${boss.name} prépare ${next.name}…`);
    return { ...state, log, telegraph: next.name };
  }
  if (e.dot > 0) {
    const hp = Math.max(0, e.hp - e.dot);
    log.push(`${e.name} subit ${e.dot} dégâts de poison.`);
    e = { ...e, hp, dot: e.dot - 1 };
    enemies = enemies.map((x, j) => (j === i ? e : x));
    if (hp <= 0) return { ...state, enemies, log };
  }
  if (e.slowed && rng.next() < 0.5) { // TODO-BALANCE
    log.push(`${e.name} est ralenti·e et perd son tour.`);
    return { ...state, enemies, log };
  }
  if (e.blinded && rng.next() < 0.5) { // TODO-BALANCE
    log.push(`L'attaque de ${e.name} manque sa cible (aveuglé).`);
    return { ...state, enemies, log };
  }
  // 30 % des attaques visent le compagnon (tirage seedé).
  if (companion && !companion.ko && rng.next() < 0.3) { // TODO-BALANCE
    const dmg = e.attack;
    const hp = Math.max(0, companion.hp - dmg);
    companion = { ...companion, hp, ko: hp <= 0 };
    log.push(`${e.name} attaque ${companion.name} : -${dmg} PV${hp <= 0 ? ' — K.O. !' : '.'}`);
    return { ...state, player, companion, enemies, log };
  }
  const absorbed = Math.min(player.shield, e.attack);
  const dmg = e.attack - absorbed;
  player = { ...player, hp: Math.max(0, player.hp - dmg), shield: player.shield - absorbed };
  log.push(`${e.name} attaque : -${dmg} PV${absorbed > 0 ? ` (${absorbed} absorbés)` : ''}.`);
  return { ...state, player, companion, enemies, log };
}

// Avance l'initiative jusqu'au prochain acteur allié (joueur ou compagnon vivant) ou la fin.
function advance(state: CombatState, rng: Rng): CombatState {
  let s: CombatState = { ...state, usedSkillsThisTurn: [] };
  for (let guard = 0; guard < 1000; guard++) {
    s = checkVictory(s, rng);
    if (s.phase !== 'player') return s;
    if (s.player.hp <= 0) return { ...s, phase: 'lost' };
    const actorId = currentActorId(s);
    if (actorId === 'player') {
      return { ...s, phase: 'player' }; // au joueur de choisir son action
    }
    if (actorId === 'companion') {
      if (s.companion && !s.companion.ko) return { ...s, phase: 'player' }; // au joueur de choisir pour le compagnon
      s = { ...s, actorIdx: s.actorIdx + 1 };
      continue;
    }
    const ei = s.enemies.findIndex((e) => e.id === actorId);
    if (ei >= 0) s = enemyAct(s, ei, rng);
    // nouveau round ?
    const newIdx = s.actorIdx + 1;
    if (newIdx % s.order.length === 0) {
      s = { ...s, actorIdx: newIdx, turn: s.turn + 1 };
      if (s.challenge) {
        const turnsLeft = s.challenge.turnsLeft - 1;
        if (turnsLeft <= 0 && s.enemies.some((e) => e.hp > 0)) {
          return {
            ...s,
            challenge: { ...s.challenge, turnsLeft: 0 },
            phase: 'challenge-failed',
            log: [...s.log, `Échec du défi ${s.challenge.def.name} : plus de tours.`],
          };
        }
        s = { ...s, challenge: { ...s.challenge, turnsLeft } };
      }
    } else {
      s = { ...s, actorIdx: newIdx };
    }
  }
  return s;
}

function checkVictory(state: CombatState, rng: Rng): CombatState {
  if (state.enemies.every((e) => e.hp <= 0)) {
    const credits = 5 + rng.int(10); // TODO-BALANCE
    const baseOrbCount = 1 + rng.int(2); // TODO-BALANCE
    // R7-03 : modificateur « orbes-rares » = drops d'orbes réduits (en data)
    const orbCount = state.modifiers.includes('orbes-rares')
      ? Math.floor(baseOrbCount / RARE_ORBS.lootOrbCountDivisor)
      : baseOrbCount;
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
  const rng = createRng((state.seed ^ (state.turn * 7919) ^ (state.actorIdx * 104729)) >>> 0);
  // Garde anti-blocage : plus aucun ennemi vivant -> victoire, quoi qu'il arrive.
  if (state.enemies.every((e) => e.hp <= 0)) return checkVictory(state, rng);
  const log = [...state.log];
  const actorId = currentActorId(state);
  const isCompanionTurn = actorId === 'companion';
  // Le compagnon n'agit que pendant SON tour ; le joueur pendant le sien.
  if (isCompanionTurn && action.type !== 'ATTACK' && action.type !== 'USE_COMPANION_SKILL') return state;
  if (!isCompanionTurn && action.type === 'USE_COMPANION_SKILL') return state;
  if (isCompanionTurn && action.type === 'FLEE') return state;
  // L'acteur courant vient de jouer : on avance l'initiative d'un cran avant de résoudre la suite.
  const afterActor = (st: CombatState): CombatState => advance({ ...st, actorIdx: st.actorIdx + 1 }, rng);

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
      const attacker = isCompanionTurn ? state.companion : null;
      const atkStat = attacker
        ? (MONSTER_BY_ID[Object.values(COMPANION_BY_MONSTER).find((d) => d.id === attacker.defId)?.monsterId ?? '']?.attack ?? 1)
        : state.player.attack;
      const dmg = Math.max(1, atkStat + (rng.next() < 0.25 ? 1 : 0)); // TODO-BALANCE variance
      const enemies = state.enemies.map((e, i) => (i === ti ? { ...e, hp: Math.max(0, e.hp - dmg), stunned: false } : e));
      log.push(`${attacker ? attacker.name : 'Vous'} attaque ${target.name} : -${dmg} PV.`);
      let next: CombatState = { ...state, enemies, log };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return afterActor(next);
    }
    case 'USE_ITEM': {
      const idx = state.items.findIndex((it) => it.def.id === action.itemId && it.usesLeft > 0);
      if (idx < 0) return state;
      const item = state.items[idx];
      const items = state.items.map((it, i) => (i === idx ? { ...it, usesLeft: it.usesLeft - 1 } : it));
      if (item.def.kind === 'heal') {
        const player = { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + item.def.power) };
        log.push(`${item.def.name} : +${item.def.power} PV.`);
        return afterActor({ ...state, player, items, log });
      }
      const target = action.target ?? 0;
      const enemy = state.enemies[target];
      if (!enemy || enemy.hp <= 0) return state;
      const enemies = state.enemies.map((e, i) => (i === target ? { ...e, hp: Math.max(0, e.hp - item.def.power) } : e));
      log.push(`${item.def.name} sur ${enemy.name} : -${item.def.power} PV.`);
      let next: CombatState = { ...state, enemies, items, log };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return afterActor(next);
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
      const effect = recipe.effect;
      // Auto-ciblage comme pour l'attaque : cible morte -> première cible vivante.
      let ti = action.target ?? 0;
      if (!state.enemies[ti] || state.enemies[ti].hp <= 0) {
        const firstAlive = state.enemies.findIndex((e) => e.hp > 0);
        if (firstAlive < 0 && effect.kind !== 'shield' && effect.kind !== 'heal' && effect.kind !== 'purify') return state;
        ti = Math.max(0, firstAlive);
      }
      const target = ti;
      let player = state.player;
      let enemies = state.enemies;
      if (effect.kind === 'damage' || effect.kind === 'aoe') {
        const element = recipe.inputs[0];
        const blurred = state.modifiers.includes('affinites-brouillees'); // R7-03 : multiplicateurs mélangés, seedés
        const hit = (e: Combatant, i: number): Combatant => {
          if (e.hp <= 0) return e;
          if (effect.kind === 'damage' && i !== target) return e;
          const baseId = e.id.split('-')[0].replace(/^elite-/, '');
          const def = MONSTER_BY_ID[baseId];
          let mult = def && element ? affinityMultiplier(element, def) : 1;
          if (blurred) mult = BLURRED_AFFINITY_VALUES[Math.floor(rng.next() * BLURRED_AFFINITY_VALUES.length)];
          // R9 : les modules scalent avec l'attaque du joueur (valeur en data) pour rester
          // utiles quand l'attaque de base one-shotte.
          const power = effect.power + state.player.attack * BALANCE.MODULE_ATK_SCALING;
          const dmg = Math.round(power * mult);
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
        const dotPower = Math.round(effect.power + state.player.attack * BALANCE.MODULE_ATK_SCALING);
        enemies = enemies.map((e, i) => (i === target ? { ...e, dot: dotPower } : e));
        log.push(`${recipe.name} sur ${enemy.name} : poison ${dotPower}/tour.`);
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
      return afterActor(next);
    }
    case 'CAPTURE': {
      const target = state.enemies[action.target];
      if (!target || target.hp <= 0) return state;
      if (rng.next() < captureChance(target.hp, target.maxHp)) {
        // R7-04 : capture d'élite -> compagnon à stats supérieures (id « elite-<base> »)
        const monsterId = target.id.split('-').slice(0, -1).join('-');
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
        return afterActor(next);
      }
      log.push(`Échec de la capture sur ${target.name}.`);
      return afterActor({ ...state, log });
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
    case 'USE_COMPANION_SKILL': {
      // Le joueur déclenche une compétence du compagnon (gratuite, 1 fois par compétence et par tour).
      const comp = state.companion;
      if (!comp || comp.ko) return state;
      const def = Object.values(COMPANION_BY_MONSTER).find((d) => d.id === comp.defId);
      const skill = def?.skills.find((sk) => sk.id === action.skillId);
      if (!def || !skill) return state;
      const level = comp.skills[skill.id] ?? 0;
      if (level <= 0) return state;
      if ((state.usedSkillsThisTurn ?? []).includes(skill.id)) return state;
      let player = state.player;
      if (skill.healPerLevel > 0) {
        player = { ...player, hp: Math.min(player.maxHp, player.hp + skill.healPerLevel * level) };
      }
      log.push(`${comp.name} : ${skill.name} niv ${level}${skill.healPerLevel > 0 ? ` (+${skill.healPerLevel * level} PV)` : ''}.`);
      return afterActor({ ...state, player, log, usedSkillsThisTurn: [...(state.usedSkillsThisTurn ?? []), skill.id] });
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
      return afterActor({ ...state, orbs: newOrbs, log });
    }
    case 'FLEE': {
      if (rng.next() < FLEE_CHANCE) {
        return { ...state, phase: 'fled', log: [...log, 'Vous fuyez le combat.'] };
      }
      log.push('Fuite ratée !');
      return afterActor({ ...state, log });
    }
    default:
      return state;
  }
}
