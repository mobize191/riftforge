import type { GameState, Position } from '../types';
import { BALANCE } from '../../data/balance';
import { MAP_WIDTH, MAP_HEIGHT } from './grid';
import { generateLevel, type LevelMap } from './generate';
import type { CombatLoot } from '../combat/combat';
import { createRng } from '../rng';
import { PRIMORDIAL_ELEMENTS } from '../../data/elements';
import { buyEquipment, craftEquipment, equipmentBonuses, upgradeBuilding } from '../forge/forge';
import { STARTING_BUILDINGS } from '../../data/buildings';
import { LAB } from '../../data/lab';
import { craftLabRecipe, upgradeLab } from '../forge/lab';
import { advanceProduction } from '../forge/production';
import { COMPANION_BY_MONSTER } from '../../data/companions';

export { MAP_WIDTH, MAP_HEIGHT };

export type GameAction =
  | { type: 'START_RUN'; seed: number }
  | { type: 'ENTER_COMBAT'; enemies: string[] }
  | { type: 'EXIT_COMBAT'; victory: boolean; loot?: CombatLoot; companionKo?: boolean }
  | { type: 'DIE' }
  | { type: 'END_BIOME' }
  | { type: 'RETURN_FORGE' }
  | { type: 'MOVE_PLAYER'; to: Position }
  | { type: 'INTERACT' }
  | { type: 'BUY_ITEM'; defId: string }
  | { type: 'CRAFT_ITEM'; defId: string }
  | { type: 'UPGRADE_BUILDING'; buildingId: string }
  | { type: 'CRAFT_LAB_RECIPE'; recipeId: string }
  | { type: 'UPGRADE_LAB' }
  | { type: 'ADVANCE_TICKS'; ticks: number }
  | { type: 'TICK_RUN'; ticks: number }
  | { type: 'NEXT_FLOOR' };

export function initialState(): GameState {
  return {
    mode: 'FORGE',
    forge: {
      credits: 0,
      essence: 0,
      mineraiBrut: 0,
      lingots: 0,
      equipment: [],
      unlockedRecipes: [],
      roster: [],
      team: [],
      buildings: { ...STARTING_BUILDINGS, [LAB.id]: 1 },
      pendingTicks: {},
    },
    run: null,
  };
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_RUN': {
      if (state.mode !== 'FORGE' && state.mode !== 'RETOUR') return state;
      // 3-4 orbes aléatoires offertes en entrant dans la Faille (§SPEC-5.2), tirage seedé.
      const rng = createRng((action.seed ^ 0x9e3779b9) >>> 0);
      const startOrbs = Array.from({ length: 3 + rng.int(2) }, (_, i) => ({
        id: `start-${i}`,
        kind: 'primordial' as const,
        element: rng.pick(PRIMORDIAL_ELEMENTS),
        tier: 1,
      }));
      // L'équipement forgé/acheté à la Forge se porte à la run suivante (§SPEC-2).
      const bonus = equipmentBonuses(state);
      const maxHp = BALANCE.START_PLAYER_HP + bonus.hp;
      const attack = BALANCE.PLAYER_ATTACK + bonus.attack;
      return {
        ...state,
        mode: 'RUN',
        run: {
          seed: action.seed,
          floor: BALANCE.START_FLOOR,
          level: generateLevel(action.seed, BALANCE.START_FLOOR),
          encounter: null,
          playerPos: { x: 1, y: 1 },
          playerLevel: BALANCE.START_PLAYER_LEVEL,
          playerHp: maxHp,
          playerMaxHp: maxHp,
          playerAttack: attack,
          xp: 0,
          lootCredits: 0,
          lootEssence: 0,
          lootMinerai: 0,
          elapsedTicks: 0,
          orbs: startOrbs,
          modules: [],
          companions: [],
          companionSkills: {},
          companionKo: false,
        },
      };
    }
    case 'ENTER_COMBAT': {
      if (state.mode !== 'RUN' || !state.run) return state;
      return { ...state, mode: 'COMBAT', run: { ...state.run, encounter: action.enemies } };
    }
    case 'NEXT_FLOOR': {
      if (state.mode !== 'RUN' || !state.run) return state;
      const floor = state.run.floor + 1;
      return {
        ...state,
        run: {
          ...state.run,
          floor,
          level: generateLevel(state.run.seed, floor),
          playerPos: { x: 1, y: 1 },
        },
      };
    }
    case 'EXIT_COMBAT': {
      if (state.mode !== 'COMBAT' || !state.run) return state;
      let run = {
        ...state.run,
        encounter: null,
        companionKo: action.companionKo ?? state.run.companionKo,
      };
      if (action.victory && action.loot) {
        run = {
          ...run,
          lootCredits: run.lootCredits + action.loot.credits,
          lootEssence: run.lootEssence + action.loot.essence,
          lootMinerai: run.lootMinerai + action.loot.minerai,
          xp: run.xp + action.loot.kills,
          companions: [...run.companions, ...action.loot.captured],
          orbs: [
            ...run.orbs,
            ...action.loot.orbs.map((el, i) => ({
              id: `loot-${state.run!.floor}-${run.lootCredits}-${i}`,
              kind: 'primordial' as const,
              element: el,
              tier: 1,
            })),
          ],
        };
        // Montées de niveau de la run (perdues à la mort, §SPEC-3).
        while (
          run.playerLevel < BALANCE.LEVEL_XP_THRESHOLDS.length &&
          run.xp >= BALANCE.LEVEL_XP_THRESHOLDS[run.playerLevel]
        ) {
          run = {
            ...run,
            playerLevel: run.playerLevel + 1,
            playerMaxHp: run.playerMaxHp + BALANCE.HP_PER_LEVEL,
            playerAttack: run.playerAttack + BALANCE.ATK_PER_LEVEL,
          };
        }
        run = { ...run, playerHp: run.playerMaxHp };
      }
      return { ...state, mode: 'RUN', run };
    }
    case 'DIE':
    case 'END_BIOME': {
      if (state.mode !== 'RUN' && state.mode !== 'COMBAT') return state;
      return { ...state, mode: 'RETOUR' };
    }
    case 'RETURN_FORGE': {
      if (state.mode !== 'RETOUR') return state;
      // Mort = fin de run, 100 % du butin conservé (§SPEC-3). La production accumulée pendant
      // la run est créditée au retour, moins l'entretien (§SPEC-6.4).
      const run = state.run;
      // Les compagnons capturés rejoignent l'écurie (persistant) ; le compagnon K.O. se réveille.
      const roster = [...new Set([...state.forge.roster, ...(run?.companions ?? [])])];
      const withProduction = run
        ? advanceProduction(
            { ...state, forge: { ...state.forge, credits: state.forge.credits + run.lootCredits, essence: state.forge.essence + run.lootEssence, mineraiBrut: state.forge.mineraiBrut + run.lootMinerai } },
            run.elapsedTicks,
          )
        : state;
      const maintenance = Math.floor((run?.elapsedTicks ?? 0) / 100) * BALANCE.MAINTENANCE_PER_100_TICKS;
      return {
        ...withProduction,
        mode: 'FORGE',
        forge: {
          ...withProduction.forge,
          credits: Math.max(0, withProduction.forge.credits - maintenance),
          roster,
        },
        run: null,
      };
    }
    case 'MOVE_PLAYER': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      const { x, y } = action.to;
      if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return state;
      const level = state.run.level;
      let run = { ...state.run, playerPos: { x, y } };
      // Ramassage automatique des orbes au sol en marchant dessus.
      const orbIdx = level.orbs.findIndex((o) => o.pos.x === x && o.pos.y === y);
      if (orbIdx >= 0) {
        const orb = level.orbs[orbIdx];
        run = {
          ...run,
          level: { ...level, orbs: level.orbs.filter((_, i) => i !== orbIdx) },
          orbs: [
            ...run.orbs,
            {
              id: `sol-${run.floor}-${x}-${y}`,
              kind: 'primordial' as const,
              element: orb.element,
              tier: 1,
            },
          ],
        };
      }
      return { ...state, run };
    }
    case 'INTERACT': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      const { playerPos: pos, level, seed, floor } = state.run;
      // Sortie du niveau -> niveau suivant (générateur identique, difficulté montante via le seed).
      if (pos.x === level.exit.x && pos.y === level.exit.y) {
        return reduce(state, { type: 'NEXT_FLOOR' });
      }
      const chestIdx = level.chests.findIndex((c) => c.x === pos.x && c.y === pos.y);
      if (chestIdx >= 0) {
        const rng = createRng((seed ^ (floor * 31) ^ (chestIdx * 101)) >>> 0);
        const credits = BALANCE.CHEST_CREDITS_MIN + rng.int(BALANCE.CHEST_CREDITS_SPREAD);
        const orb = rng.pick(PRIMORDIAL_ELEMENTS);
        return {
          ...state,
          run: {
            ...state.run,
            level: { ...level, chests: level.chests.filter((_, i) => i !== chestIdx) },
            lootCredits: state.run.lootCredits + credits,
            orbs: [
              ...state.run.orbs,
              { id: `coffre-${floor}-${chestIdx}`, kind: 'primordial' as const, element: orb, tier: 1 },
            ],
          },
        };
      }
      return state;
    }
    case 'BUY_ITEM': {
      return buyEquipment(state, action.defId);
    }
    case 'CRAFT_ITEM': {
      return craftEquipment(state, action.defId);
    }
    case 'UPGRADE_BUILDING': {
      return upgradeBuilding(state, action.buildingId);
    }
    case 'CRAFT_LAB_RECIPE': {
      return craftLabRecipe(state, action.recipeId);
    }
    case 'UPGRADE_LAB': {
      return upgradeLab(state);
    }
    case 'ADVANCE_TICKS': {
      // L'UI fournit les ticks écoulés (dérivés de l'horloge réelle hors du core).
      return advanceProduction(state, action.ticks);
    }
    case 'TICK_RUN': {
      // Production en temps réel bornée pendant la run (§SPEC-6.4) : les ticks s'accumulent,
      // la production n'est créditée qu'au retour.
      if (state.mode !== 'RUN' || !state.run) return state;
      return {
        ...state,
        run: { ...state.run, elapsedTicks: state.run.elapsedTicks + Math.max(0, action.ticks) },
      };
    }
    default:
      return state;
  }
}
