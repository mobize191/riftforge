import { createRng, type Rng } from '../rng';
import { MONSTER_BY_ID } from '../../data/monsters';
import { COMBAT_ITEMS, type ItemDef } from '../../data/items';
import { RECIPES, RECIPE_BY_ID, type RecipeDef } from '../../data/recipes';
import { CAPTURE } from '../../data/capture';
import { applyFusion } from './fuse';
import { fuseModules } from './fuseModules';
import { MODULE_FUSION_BY_ID } from '../../data/moduleFusions';
import { affinityMultiplier } from '../../data/affinities';
import { BOSS_BY_ID } from '../../data/bosses';
import { bossDefOf, isBossCombat, nextBossAttack } from './boss';
import { CHALLENGE_BY_ID, type ChallengeDef } from '../../data/challenges';
import { BALANCE } from '../../data/balance';
import { COMPANION_BY_MONSTER, type CompanionDef, type CompanionSkill } from '../../data/companions';
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
  atkDown: number; // R11-02 — debuff-atk des compétences de compagnon (ATQ effective = max(1, attack - atkDown))
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
  captureBonus: number; // R11-02 — bonus de capture accumulé (compétences capture-bonus du compagnon)
  modifiers: string[];
  energy: number; // R10-02 (D1) : énergie de combat (régénérée à chaque round, remise à zéro à chaque combat)
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
  | { type: 'FUSE_MODULES'; fusionId: string } // R11-01 (E1) — fusion module + module, coûte le tour
  | { type: 'FLEE' };

// Probabilité de capture : augmente quand les PV restants baissent (monotone, §R3-01).
export function captureChance(hp: number, maxHp: number): number {
  const missing = maxHp > 0 ? 1 - hp / maxHp : 0;
  return Math.min(1, CAPTURE.baseChance + missing * CAPTURE.missingHpWeight);
}

// R10-02 (D1) : coût d'énergie du lancement d'un module, lu en data (TODO-BALANCE).
// Accepte une recette ou un tier ; recette inconnue -> coût d'un tier 1.
export function moduleEnergyCost(recipeOrTier: RecipeDef | number | undefined): number {
  const tier = typeof recipeOrTier === 'number' ? recipeOrTier : recipeOrTier?.tier ?? 1;
  return BALANCE.ENERGY_COST_MODULE_TIER[tier] ?? BALANCE.ENERGY_COST_MODULE_TIER[1];
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
  const mkStatuses = () => ({ shield: 0, stunned: false, dot: 0, slowed: false, blinded: false, atkDown: 0 });
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
    captureBonus: 0, // R11-02
    modifiers,
    energy: BALANCE.COMBAT_ENERGY_START, // R10-02 (D1) : énergie de départ du combat
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

// Libellé FR de l'effet d'une compétence de compagnon (partagé UI + tests).
export function companionSkillLabel(skill: CompanionSkill): string {
  const el = skill.element ? ` ${skill.element}` : '';
  switch (skill.kind) {
    case 'heal':
      return `soigne ${skill.powerPerLevel} PV/niv`;
    case 'shield':
      return `bouclier ${skill.powerPerLevel}/niv`;
    case 'damage':
      return `dégâts${el} ${skill.powerPerLevel}/niv`;
    case 'aoe':
      return `dégâts de zone${el} ${skill.powerPerLevel}/niv`;
    case 'dot':
      return `poison${el} ${skill.powerPerLevel}/tour/niv`;
    case 'purify':
      return 'purifie les malus du héros';
    case 'stun':
      return skill.powerPerLevel >= 2 ? 'étourdit tous les ennemis (1 tour)' : 'étourdit la cible (1 tour)';
    case 'drain':
      return `dégâts${el} ${skill.powerPerLevel}/niv, volés en PV`;
    case 'debuff-atk':
      return `réduit l'ATQ ennemie de ${skill.powerPerLevel}/niv`;
    case 'buff-energy':
      return `+${skill.powerPerLevel} énergie/niv`;
    case 'capture-bonus':
      return `+${Math.round(CAPTURE.bonusPerPower * skill.powerPerLevel * 100)} % capture`;
    default:
      return skill.kind;
  }
}

// Action automatique du compagnon à son tour quand le joueur ne choisit rien :
// soigne si le héros est blessé, sinon la meilleure compétence offensive débloquée.
// R11-04 (E4) : dégâts PRÉvus d'un module, calculés avec l'ATK courante et la
// faiblesse de la cible — MÊME formule que CAST_MODULE (testé : affiché == infligé).
export function predictedModuleDamage(recipe: RecipeDef, attack: number, targetEnemyId: string | null): number {
  const effect = recipe.effect;
  if (effect.kind !== 'damage' && effect.kind !== 'aoe') return 0;
  const element = recipe.inputs[0];
  const power = effect.power + attack * (BALANCE.MODULE_ATK_SCALING_BY_TIER[recipe.tier] ?? 0);
  let mult = 1;
  if (targetEnemyId) {
    const baseId = targetEnemyId.split('-')[0].replace(/^elite-/, '');
    const def = MONSTER_BY_ID[baseId];
    if (def && element) mult = affinityMultiplier(element, def);
  }
  return Math.round(power * mult);
}

function companionAct(state: CombatState): CombatState {
  const comp = state.companion;
  if (!comp || comp.ko) return state;
  const def = Object.values(COMPANION_BY_MONSTER).find((d) => d.id === comp.defId);
  if (!def) return state;
  const unlocked = def.skills.filter((s) => (comp.skills[s.id] ?? 0) > 0);
  if (unlocked.length === 0) return state;
  const hurt = state.player.hp < state.player.maxHp * 0.7;
  const heals = unlocked.filter((s) => s.kind === 'heal');
  const offensives = unlocked.filter((s) => s.kind === 'damage' || s.kind === 'aoe' || s.kind === 'drain' || s.kind === 'dot');
  let skill = hurt && heals.length > 0
    ? heals.sort((a, b) => comp.skills[b.id] * b.powerPerLevel - comp.skills[a.id] * a.powerPerLevel)[0]
    : offensives.sort((a, b) => comp.skills[b.id] * b.powerPerLevel - comp.skills[a.id] * a.powerPerLevel)[0];
  if (!skill) skill = unlocked[0];
  const level = comp.skills[skill.id] ?? 1;
  const power = skill.powerPerLevel * level;
  const log = [...state.log];
  if (skill.kind === 'heal') {
    const heal = Math.min(state.player.maxHp, state.player.hp + power) - state.player.hp;
    return {
      ...state,
      player: { ...state.player, hp: state.player.hp + heal },
      log: [...log, `${comp.name} (${def.support}) : ${skill.name} +${heal} PV.`],
    };
  }
  const target = state.enemies.find((e) => e.hp > 0);
  if (!target) return state;
  if (skill.kind === 'damage' || skill.kind === 'aoe' || skill.kind === 'drain' || skill.kind === 'dot') {
    const idx = state.enemies.indexOf(target);
    const baseId = target.id.split('-')[0].replace(/^elite-/, '');
    const mdef = MONSTER_BY_ID[baseId];
    const mult = skill.element && mdef ? affinityMultiplier(skill.element, mdef) : 1;
    const dmg = Math.max(1, Math.round(power * mult));
    const enemies = state.enemies.map((e, i) => (skill.kind === 'aoe' || i === idx ? { ...e, hp: Math.max(0, e.hp - dmg), dot: skill.kind === 'dot' ? power : e.dot } : e));
    log.push(`${comp.name} : ${skill.name} sur ${target.name} : -${dmg} PV.${mult > 1 ? ' Faiblesse !' : mult < 1 ? ' Résisté !' : ''}`);
    let next: CombatState = { ...state, enemies, log };
    if (skill.kind === 'drain') {
      const healed = Math.min(state.player.maxHp, state.player.hp + dmg) - state.player.hp;
      next = { ...next, player: { ...next.player, hp: next.player.hp + healed }, log: [...next.log, `${comp.name} récupère ${healed} PV.`] };
    }
    return next;
  }
  return state;
}

// ATQ effective d'un ennemi (R11-02 : debuff-atk des compétences de compagnon).
function effectiveAttack(e: Combatant): number {
  return Math.max(1, e.attack - e.atkDown);
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
    const dmg = effectiveAttack(e);
    const hp = Math.max(0, companion.hp - dmg);
    companion = { ...companion, hp, ko: hp <= 0 };
    log.push(`${e.name} attaque ${companion.name} : -${dmg} PV${hp <= 0 ? ' — K.O. !' : '.'}`);
    return { ...state, player, companion, enemies, log };
  }
  const atk = effectiveAttack(e);
  const absorbed = Math.min(player.shield, atk);
  const dmg = atk - absorbed;
  player = { ...player, hp: Math.max(0, player.hp - dmg), shield: player.shield - absorbed };
  log.push(`${e.name} attaque : -${dmg} PV${absorbed > 0 ? ` (${absorbed} absorbés)` : ''}${e.atkDown > 0 ? ` (ATQ réduite de ${e.atkDown})` : ''}.`);
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
    // nouveau round ? R10-02 (D1) : régénération d'énergie au changement de round.
    const newIdx = s.actorIdx + 1;
    if (newIdx % s.order.length === 0) {
      s = {
        ...s,
        actorIdx: newIdx,
        turn: s.turn + 1,
        energy: Math.min(BALANCE.COMBAT_ENERGY_MAX, (s.energy ?? 0) + BALANCE.COMBAT_ENERGY_REGEN),
      };
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
    // R10-05 (D4) : butin de combat ralenti, montants en data (BALANCE, TODO-BALANCE).
    const credits = BALANCE.COMBAT_LOOT_CREDITS_MIN + rng.int(BALANCE.COMBAT_LOOT_CREDITS_SPREAD);
    const baseOrbCount = 1 + rng.int(2); // TODO-BALANCE
    // R7-03 : modificateur « orbes-rares » = drops d'orbes réduits (en data)
    const orbCount = state.modifiers.includes('orbes-rares')
      ? Math.floor(baseOrbCount / RARE_ORBS.lootOrbCountDivisor)
      : baseOrbCount;
    const essence = BALANCE.COMBAT_LOOT_ESSENCE_MIN + rng.int(BALANCE.COMBAT_LOOT_ESSENCE_SPREAD);
    const minerai = BALANCE.COMBAT_LOOT_MINERAI_MIN + rng.int(BALANCE.COMBAT_LOOT_MINERAI_SPREAD);
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

  // R10-02 (D1) : coût d'énergie par action. Le compagnon n'est pas soumis
  // à l'énergie (compétences déjà payées en orbes) ; fusion, capture, objets
  // et la fuite restent gratuits (la fusion coûte déjà son tour).
  const energyCost = (a: CombatAction): number => {
    if (isCompanionTurn) return 0;
    if (a.type === 'ATTACK') return BALANCE.ENERGY_COST_ATTACK;
    if (a.type === 'CAST_MODULE') {
      const r = RECIPE_BY_ID[a.moduleId] ?? RECIPES.find((x) => x.id === a.moduleId);
      return moduleEnergyCost(r);
    }
    return 0;
  };
  const cout = energyCost(action);
  if (cout > (state.energy ?? 0)) {
    // Refus propre : aucun effet, aucun tour consommé, message FR explicite.
    log.push(`Pas assez d'énergie (${cout} requis, ${state.energy ?? 0} disponibles) — +${BALANCE.COMBAT_ENERGY_REGEN} par tour.`);
    return { ...state, log };
  }
  // Le compagnon n'agit que pendant SON tour ; le joueur pendant le sien.
  if (isCompanionTurn && action.type !== 'ATTACK' && action.type !== 'USE_COMPANION_SKILL') return state;
  if (!isCompanionTurn && action.type === 'USE_COMPANION_SKILL') return state;
  if (isCompanionTurn && action.type === 'FLEE') return state;
  // L'acteur courant vient de jouer : on avance l'initiative d'un cran avant de résoudre la suite,
  // en dépensant l'énergie du tour (0 pour compagnon/fusion/capture/objets).
  const afterActor = (st: CombatState): CombatState =>
    advance({ ...st, actorIdx: st.actorIdx + 1, energy: Math.max(0, (st.energy ?? 0) - cout) }, rng);

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
        const healed = Math.min(state.player.maxHp, state.player.hp + item.def.power) - state.player.hp; // B33
        const player = { ...state.player, hp: state.player.hp + healed };
        log.push(healed > 0 ? `${item.def.name} : +${healed} PV.` : `${item.def.name} : PV déjà au maximum.`);
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
          const power = effect.power + state.player.attack * (BALANCE.MODULE_ATK_SCALING_BY_TIER[recipe.tier] ?? 0);
          const dmg = Math.round(power * mult);
          return { ...e, hp: Math.max(0, e.hp - dmg) };
        };
        enemies = enemies.map(hit);
        // R10-03 (D2) : retour d'affinité explicite dans le log à chaque coup de module.
        const affLog: string[] = [];
        for (const [i, e] of enemies.entries()) {
          if (e.hp <= 0 && state.enemies[i]?.hp > 0) {
            // ennemi tué par ce coup — ignoré ici, le log de dégâts global suffit
          }
        }
        if (effect.kind === 'damage') {
          const before = state.enemies[target];
          const after = enemies[target];
          const dealt = before && after ? before.hp - after.hp : 0;
          const def = MONSTER_BY_ID[before?.id.split('-')[0].replace(/^elite-/, '') ?? ''];
          const mult = def ? affinityMultiplier(element, def) : 1;
          const marque = mult > 1 ? ' Faiblesse !' : mult < 1 ? ' Résisté !' : '';
          log.push(`${recipe.name} sur ${after?.name ?? '?'} : -${dealt} PV.${marque}`);
          void affLog;
        } else {
          // AoE : marqueur selon la meilleure affinité touchée.
          let best = 1;
          for (const e of state.enemies) {
            if (e.hp <= 0) continue;
            const def = MONSTER_BY_ID[e.id.split('-')[0].replace(/^elite-/, '') ?? ''];
            if (def) best = Math.max(best, affinityMultiplier(element, def));
          }
          const marque = best > 1 ? ' Faiblesse !' : '';
          log.push(`${recipe.name} : zone, -${effect.power} PV à tous.${marque}`);
        }
      } else if (effect.kind === 'shield') {
        player = { ...player, shield: player.shield + effect.power };
        log.push(`${recipe.name} : +${effect.power} bouclier.`);
      } else if (effect.kind === 'heal' || effect.kind === 'purify') {
        // B33 : on soigne jusqu'au max, et le log affiche le montant EFFECTIF (capé)
        const healed = Math.min(player.maxHp, player.hp + effect.power) - player.hp;
        player = { ...player, hp: player.hp + healed };
        log.push(healed > 0 ? `${recipe.name} : +${healed} PV.` : `${recipe.name} : PV déjà au maximum.`);
      } else if (effect.kind === 'push') {
        enemies = enemies.map((e, i) => (effect.power >= 2 || i === target ? { ...e, stunned: e.hp > 0 } : e));
        log.push(`${recipe.name} : projection${effect.power >= 2 ? ' de tous les ennemis' : ''} !`);
      } else if (effect.kind === 'dot') {
        const enemy = enemies[target];
        if (!enemy || enemy.hp <= 0) return state;
        const dotPower = Math.round(effect.power + state.player.attack * (BALANCE.MODULE_ATK_SCALING_BY_TIER[recipe.tier] ?? 0));
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
      // R11-02 : bonus de capture des compétences du compagnon (capture-bonus).
      const chance = Math.min(1, captureChance(target.hp, target.maxHp) + (state.captureBonus ?? 0));
      if (rng.next() < chance) {
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
      // R11-02 (E2) : le joueur déclenche une compétence du compagnon (gratuite, 1 fois
      // par compétence et par tour). Tous les kinds de docs/COMPANIONS-R11.md sont gérés.
      const comp = state.companion;
      if (!comp || comp.ko) return state;
      const def = Object.values(COMPANION_BY_MONSTER).find((d) => d.id === comp.defId);
      const skill = def?.skills.find((sk) => sk.id === action.skillId);
      if (!def || !skill) return state;
      const level = comp.skills[skill.id] ?? 0;
      if (level <= 0) return state; // compétence verrouillée (palier de lien insuffisant)
      if ((state.usedSkillsThisTurn ?? []).includes(skill.id)) return state;
      const power = skill.powerPerLevel * level;
      let player = state.player;
      let enemies = state.enemies;
      let captureBonus = state.captureBonus ?? 0;
      // Cible = première ennemie vivante (auto-retarget comme l'attaque).
      const ti = state.enemies.findIndex((e) => e.hp > 0);
      const el = skill.element;
      const affinityOf = (e: Combatant) => {
        const baseId = e.id.split('-')[0].replace(/^elite-/, '');
        const mdef = MONSTER_BY_ID[baseId];
        return el && mdef ? affinityMultiplier(el, mdef) : 1;
      };
      if (skill.kind === 'heal') {
        const healed = Math.min(player.maxHp, player.hp + power) - player.hp; // B33
        player = { ...player, hp: player.hp + healed };
        log.push(`${comp.name} : ${skill.name} niv ${level}${healed > 0 ? ` (+${healed} PV)` : ' (PV déjà au max)'}.`);
      } else if (skill.kind === 'shield') {
        player = { ...player, shield: player.shield + power };
        log.push(`${comp.name} : ${skill.name} niv ${level} — +${power} bouclier.`);
      } else if (skill.kind === 'purify') {
        player = { ...player, dot: 0, blinded: false, slowed: false };
        log.push(`${comp.name} : ${skill.name} niv ${level} — malus du héros purgés.`);
      } else if (skill.kind === 'buff-energy') {
        const before = state.energy ?? 0;
        const energy = Math.min(BALANCE.COMBAT_ENERGY_MAX, before + power);
        log.push(`${comp.name} : ${skill.name} niv ${level} — +${energy - before} énergie.`);
        return afterActor({ ...state, player, log, energy, usedSkillsThisTurn: [...(state.usedSkillsThisTurn ?? []), skill.id] });
      } else if (skill.kind === 'capture-bonus') {
        captureBonus += CAPTURE.bonusPerPower * power;
        log.push(`${comp.name} : ${skill.name} niv ${level} — +${Math.round(CAPTURE.bonusPerPower * power * 100)} % capture ce combat.`);
      } else if (ti >= 0 && (skill.kind === 'damage' || skill.kind === 'aoe' || skill.kind === 'drain' || skill.kind === 'dot' || skill.kind === 'stun' || skill.kind === 'debuff-atk')) {
        const target = state.enemies[ti];
        if (skill.kind === 'damage' || skill.kind === 'drain') {
          const mult = affinityOf(target);
          const dmg = Math.max(1, Math.round(power * mult));
          enemies = enemies.map((e, i) => (i === ti ? { ...e, hp: Math.max(0, e.hp - dmg) } : e));
          log.push(`${comp.name} : ${skill.name} niv ${level} sur ${target.name} : -${dmg} PV.${mult > 1 ? ' Faiblesse !' : mult < 1 ? ' Résisté !' : ''}`);
          if (skill.kind === 'drain') {
            const healed = Math.min(player.maxHp, player.hp + dmg) - player.hp;
            player = { ...player, hp: player.hp + healed };
            log.push(`${comp.name} récupère ${healed} PV.`);
          }
        } else if (skill.kind === 'aoe') {
          let best = 1;
          enemies = enemies.map((e) => {
            if (e.hp <= 0) return e;
            const mult = affinityOf(e);
            best = Math.max(best, mult);
            const dmg = Math.max(1, Math.round(power * mult));
            return { ...e, hp: Math.max(0, e.hp - dmg) };
          });
          log.push(`${comp.name} : ${skill.name} niv ${level} — zone, -${power} PV à tous.${best > 1 ? ' Faiblesse !' : ''}`);
        } else if (skill.kind === 'dot') {
          enemies = enemies.map((e, i) => (i === ti ? { ...e, dot: power } : e));
          log.push(`${comp.name} : ${skill.name} niv ${level} sur ${target.name} : poison ${power}/tour.`);
        } else if (skill.kind === 'stun') {
          enemies = enemies.map((e, i) => (skill.powerPerLevel >= 2 || i === ti ? { ...e, stunned: e.hp > 0 } : e));
          log.push(`${comp.name} : ${skill.name} niv ${level} — ${skill.powerPerLevel >= 2 ? 'tous les ennemis perdent leur tour' : `${target.name} perd son tour`}.`);
        } else if (skill.kind === 'debuff-atk') {
          enemies = enemies.map((e, i) => (i === ti ? { ...e, atkDown: e.atkDown + power } : e));
          log.push(`${comp.name} : ${skill.name} niv ${level} — ATQ de ${target.name} -${power}.`);
        }
      } else {
        return state; // kind sans cible valide (ex. damage sans ennemi vivant)
      }
      let next: CombatState = { ...state, player, enemies, captureBonus, log, usedSkillsThisTurn: [...(state.usedSkillsThisTurn ?? []), skill.id] };
      next = checkVictory(next, rng);
      if (next.phase === 'won') return next;
      return afterActor(next);
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
    case 'FUSE_MODULES': {
      // R11-01 (E1) : fusion de modules EN COMBAT — coûte le tour (comme la fusion
      // d'orbes), aucune énergie. Refus propre avec message si ingrédients absents.
      if (state.modules.includes(MODULE_FUSION_BY_ID[action.fusionId]?.resultId ?? '')) return state;
      const res = fuseModules(state.modules, state.orbs.map((el, i) => ({ id: `m${i}`, kind: 'primordial' as const, element: el, tier: 1 })), action.fusionId);
      if (!res.ok) {
        log.push('Fusion de modules impossible : ingrédients absents.');
        return { ...state, log };
      }
      log.push(`${res.module.name} obtenu par fusion de modules (coûte le tour).`);
      // R11-01 (E1) : les sources consommées sont retirées (res.modules), le résultat ajouté.
      return afterActor({ ...state, modules: [...res.modules, res.module.id], log });
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
