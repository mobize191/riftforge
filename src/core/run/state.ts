import type { GameState, Position } from '../types';
import { BALANCE } from '../../data/balance';
import { MAP_WIDTH, MAP_HEIGHT } from './grid';
import { generateLevel, isWall } from './generate';
import type { CombatLoot } from '../combat/combat';
import { createRng } from '../rng';
import { PRIMORDIAL_ELEMENTS } from '../../data/elements';
import { buyEquipment, craftEquipment, equipmentBonuses, upgradeBuilding } from '../forge/forge';
import { STARTING_BUILDINGS } from '../../data/buildings';
import { LAB } from '../../data/lab';
import { craftLabRecipe, upgradeLab } from '../forge/lab';
import { advanceProduction } from '../forge/production';
import { COMPANION_BY_MONSTER } from '../../data/companions';
import { applyChoice, type MilestoneChoice } from './milestone';
import { createModule } from '../combat/createModule';
import { applyFusion } from '../combat/fuse';
import type { GrimoireSlot } from '../types';
import { COMPANION_BY_MONSTER as CBM, SKILL_UPGRADE_ORB_COSTS, SKILL_MAX_LEVEL } from '../../data/companions';
import { BIOME_1_STRUCTURE } from '../../data/biomes';
import { attractMonsters } from './encounter';
import { settleContracts } from '../forge/contracts';

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
  | { type: 'RESOLVE_MILESTONE'; choice: MilestoneChoice }
  | { type: 'UPGRADE_SKILL'; skillId: string }
  | { type: 'CREATE_MODULE'; recipeId: string }
  | { type: 'FUSE_ORBS'; indices: number[] }
  | { type: 'SAVE_GRIMOIRE'; slot: number; name: string; recipeIds: string[] }
  | { type: 'EXEC_GRIMOIRE'; slot: number }
  | { type: 'RENAME_COMPANION'; monsterId: string; name: string }
  | { type: 'SET_TEAM'; monsterIds: string[] }
  | { type: 'ASSIGN_WORKER'; buildingId: string; monsterId: string | null }
  | { type: 'NEXT_FLOOR' };

export function initialState(): GameState {
  return {
    mode: 'FORGE',
    forge: {
      credits: 0,
      essence: 0,
      mineraiBrut: 0,
      lingots: 0,
      spores: 0,
      equipment: [],
      unlockedRecipes: [],
      roster: [],
      discoveredRecipes: [],
      orbStock: [],
      grimoire: [],
      claimedContracts: [],
      companionNames: {},
      team: [],
      workers: {},
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
      // 1 compétence initiale débloquée aléatoirement si un compagnon est en équipe (§SPEC-7.2).
      let companionSkills: Record<string, number> = {};
      const teamMonster = state.forge.team[0];
      const teamDef = teamMonster ? COMPANION_BY_MONSTER[teamMonster] : undefined;
      if (teamDef) {
        const initial = rng.pick(teamDef.skills);
        companionSkills = { [initial.id]: 1 };
      }
      return {
        ...state,
        mode: 'RUN',
        run: {
          // Les orbes composites de la Forge se portent en run ; le reste repart de zéro (§SPEC-2).
          orbs: [...startOrbs, ...state.forge.orbStock],
          seed: action.seed,
          floor: BALANCE.START_FLOOR,
          level: generateLevel(action.seed, BALANCE.START_FLOOR, undefined, {
            roots: BIOME_1_STRUCTURE.rootsEnabled,
            monsterCount: BIOME_1_STRUCTURE.monsterCountBase + (BALANCE.START_FLOOR - 1) * BIOME_1_STRUCTURE.monsterCountPerFloor,
            sporeNodes: BIOME_1_STRUCTURE.sporeNodesPerFloor,
          }),
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
          lootSpores: 0,
          elapsedTicks: 0,
          modules: [],
          companions: [],
          companionSkills,
          companionKo: false,
          pendingMilestone: false,
          discoveredRecipes: [],
          journal: ['start', ...(state.forge.team.length === 0 ? ['no-companion'] : [])],
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
      // 1 jalon par biome, vers le milieu (après le 2e niveau, §SPEC-7.2).
      const teamMonster = state.forge.team[0];
      const hasCompanion = teamMonster ? !!COMPANION_BY_MONSTER[teamMonster] : false;
      const pendingMilestone = floor === 3 && hasCompanion && !state.run.pendingMilestone ? true : state.run.pendingMilestone;
      return {
        ...state,
        run: {
          ...state.run,
          floor,
          level: generateLevel(state.run.seed, floor, undefined, {
            roots: BIOME_1_STRUCTURE.rootsEnabled,
            monsterCount: BIOME_1_STRUCTURE.monsterCountBase + (floor - 1) * BIOME_1_STRUCTURE.monsterCountPerFloor,
            sporeNodes: BIOME_1_STRUCTURE.sporeNodesPerFloor,
          }),
          playerPos: { x: 1, y: 1 },
          pendingMilestone,
          journal: [...state.run.journal, `floor-${floor}`],
        },
      };
    }
    case 'RENAME_COMPANION': {
      if (state.mode !== 'FORGE') return state;
      if (!state.forge.roster.includes(action.monsterId)) return state;
      const name = action.name.trim().slice(0, 24);
      if (!name) return state;
      return {
        ...state,
        forge: { ...state.forge, companionNames: { ...state.forge.companionNames, [action.monsterId]: name } },
      };
    }
    case 'SET_TEAM': {
      if (state.mode !== 'FORGE') return state;
      const team = action.monsterIds.filter((id) => state.forge.roster.includes(id)).slice(0, 1); // V1 : 1 slot
      return { ...state, forge: { ...state.forge, team } };
    }
    case 'ASSIGN_WORKER': {
      if (state.mode !== 'FORGE') return state;
      if (action.monsterId !== null && !state.forge.roster.includes(action.monsterId)) return state;
      const workers = { ...state.forge.workers };
      if (action.monsterId === null) delete workers[action.buildingId];
      else workers[action.buildingId] = action.monsterId;
      return { ...state, forge: { ...state.forge, workers } };
    }
    case 'SAVE_GRIMOIRE': {
      // Jusqu'à 3 compositions favorites pré-enregistrées (§R4-07), persistantes.
      if (state.mode !== 'FORGE') return state;
      if (action.slot < 0 || action.slot >= 3) return state;
      const grimoire = [...state.forge.grimoire];
      grimoire[action.slot] = { name: action.name.slice(0, 24) || `Comp. ${action.slot + 1}`, recipeIds: action.recipeIds.slice(0, 10) };
      return { ...state, forge: { ...state.forge, grimoire } };
    }
    case 'EXEC_GRIMOIRE': {
      // Exécute la composition en un clic, hors combat, si les orbes suffisent.
      if (state.mode !== 'RUN' || !state.run) return state;
      const slot: GrimoireSlot | undefined = state.forge.grimoire[action.slot];
      if (!slot) return state;
      let orbs = state.run.orbs;
      const createdModules = [] as import('../types').Module[];
      for (const recipeId of slot.recipeIds) {
        const res = createModule(orbs, recipeId);
        if (!res.ok) break; // orbes insuffisantes : on s'arrête là
        orbs = res.orbs;
        createdModules.push(res.module);
      }
      if (createdModules.length === 0) return state;
      return {
        ...state,
        run: {
          ...state.run,
          orbs,
          modules: [...state.run.modules, ...createdModules],
          discoveredRecipes: [...new Set([...state.run.discoveredRecipes, ...createdModules.map((m) => m.id)])],
        },
      };
    }
    case 'FUSE_ORBS': {
      // Hors combat : fusion libre, gratuite et illimitée (§SPEC-5.2).
      if (state.mode !== 'RUN' || !state.run) return state;
      const res = applyFusion(state.run.orbs, action.indices);
      if (!res.ok) return state;
      return { ...state, run: { ...state.run, orbs: res.orbs } };
    }
    case 'CREATE_MODULE': {
      if (state.mode !== 'RUN' || !state.run) return state;
      const res = createModule(state.run.orbs, action.recipeId);
      if (!res.ok) return state;
      return {
        ...state,
        run: {
          ...state.run,
          orbs: res.orbs,
          modules: [...state.run.modules, res.module],
          discoveredRecipes: [...new Set([...state.run.discoveredRecipes, action.recipeId])],
        },
      };
    }
    case 'UPGRADE_SKILL': {
      if (state.mode !== 'RUN' || !state.run) return state;
      const teamMonster = state.forge.team[0];
      const def = teamMonster ? CBM[teamMonster] : undefined;
      if (!def) return state;
      const skill = def.skills.find((s) => s.id === action.skillId);
      if (!skill) return state;
      const level = state.run.companionSkills[action.skillId] ?? 0;
      if (level === 0 || level >= Math.min(skill.maxLevel, SKILL_MAX_LEVEL)) return state;
      const cost = SKILL_UPGRADE_ORB_COSTS[level];
      if (cost === undefined) return state;
      const primordial = state.run.orbs.filter((o) => o.kind === 'primordial');
      if (primordial.length < cost) return state; // refus si stock insuffisant
      // Consomme `cost` orbes primordiales (les composites sont épargnées, §SPEC-5.2).
      const consumed = new Set(primordial.slice(0, cost).map((o) => o.id));
      return {
        ...state,
        run: {
          ...state.run,
          orbs: state.run.orbs.filter((o) => !consumed.has(o.id)),
          companionSkills: { ...state.run.companionSkills, [action.skillId]: level + 1 },
        },
      };
    }
    case 'RESOLVE_MILESTONE': {
      if (state.mode !== 'RUN' || !state.run || !state.run.pendingMilestone) return state;
      const teamMonster = state.forge.team[0];
      const def = teamMonster ? COMPANION_BY_MONSTER[teamMonster] : undefined;
      if (!def) return state;
      return {
        ...state,
        run: {
          ...state.run,
          pendingMilestone: false,
          companionSkills: applyChoice(state.run.companionSkills, action.choice, def),
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
      // Victoire contre le boss -> fin du biome -> retour à la Forge.
      const wasBoss = (state.run.encounter ?? []).some((id) => id.startsWith('boss:'));
      if (action.victory && wasBoss) {
        run = { ...run, journal: [...run.journal, 'boss-killed'] };
        return { ...state, mode: 'RETOUR', run };
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
      // Codex permanent : toute recette découverte une fois est connue pour toujours (§SPEC-5.2).
      const discovered = [...new Set([...state.forge.discoveredRecipes, ...(run?.discoveredRecipes ?? [])])];
      // À la mort : orbes primordiales non consommées perdues, composites conservées (§SPEC-3).
      const keptComposites = (run?.orbs ?? []).filter((o) => o.kind === 'composite');
      const withProduction = run
        ? advanceProduction(
            { ...state, forge: { ...state.forge, credits: state.forge.credits + run.lootCredits, essence: state.forge.essence + run.lootEssence, mineraiBrut: state.forge.mineraiBrut + run.lootMinerai, spores: state.forge.spores + run.lootSpores } },
            run.elapsedTicks,
          )
        : state;
      const maintenance = Math.floor((run?.elapsedTicks ?? 0) / 100) * BALANCE.MAINTENANCE_PER_100_TICKS;
      // Contrats du Marchand : vérifiés depuis le journal de la run, primes versées au retour.
      const withContracts = run
        ? settleContracts(withProduction, { events: run.journal, lootSpores: run.lootSpores })
        : withProduction;
      return {
        ...withContracts,
        mode: 'FORGE',
        forge: {
          ...withContracts.forge,
          credits: Math.max(0, withContracts.forge.credits - maintenance),
          roster,
          discoveredRecipes: discovered,
          orbStock: [...state.forge.orbStock, ...keptComposites],
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
      // Récolte d'un nœud de spores en marchant dessus : retire le nœud et attire les monstres voisins.
      const sporeIdx = level.sporeNodes.findIndex((p) => p.x === x && p.y === y);
      if (sporeIdx >= 0) {
        const level2 = { ...level, sporeNodes: level.sporeNodes.filter((_, i) => i !== sporeIdx) };
        attractMonsters(level2, { x, y }, BIOME_1_STRUCTURE.attractRadius, (lx, ly) => isWall(level2, lx, ly));
        run = { ...run, level: level2, lootSpores: run.lootSpores + 1, journal: [...run.journal, 'spore'] };
      }
      return { ...state, run };
    }
    case 'INTERACT': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      const { playerPos: pos, level, seed, floor } = state.run;
      // Sortie du niveau -> niveau suivant, ou combat de boss au dernier sol (§SPEC-4.1).
      if (pos.x === level.exit.x && pos.y === level.exit.y) {
        if (floor >= BIOME_1_STRUCTURE.floors) {
          return reduce(state, { type: 'ENTER_COMBAT', enemies: [`boss:${BIOME_1_STRUCTURE.bossId}`] });
        }
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
