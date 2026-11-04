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
import { BIOME_1_STRUCTURE, BIOME_ORDER, BIOME_BY_ID, BIOME_STRUCTURES, type BiomeStructure } from '../../data/biomes';
import { MONSTERS_BY_FAMILY } from '../../data/monsters';
import { RIFT_MODIFIER_BY_ID, INSTABILITY, ELITE } from '../../data/riftModifiers';

// R7-02 : la jauge d'instabilité monte à chaque action (combat, récolte) quand le
// modificateur « instabilite » est actif ; monotone seedée (déterministe), seuils en data.
function addInstability(run: import('../types').RunState, amount: number): import('../types').RunState {
  if (!run.activeModifiers.includes('instabilite') || amount <= 0) return run;
  const before = run.instability;
  const instability = before + amount;
  const journal = [...run.journal];
  let elitePending = run.elitePending;
  if (before < INSTABILITY.dangerThreshold && instability >= INSTABILITY.dangerThreshold) journal.push('danger');
  if (before < INSTABILITY.eliteThreshold && instability >= INSTABILITY.eliteThreshold) {
    journal.push('elite');
    elitePending = true; // une élite traque le joueur -> prochain combat de carte
  }
  return { ...run, instability, elitePending, journal };
}
import { attractMonsters } from './encounter';
import { settleContracts } from '../forge/contracts';

export { MAP_WIDTH, MAP_HEIGHT };

// Biome courant d'une run + options de génération de niveau associées.
export function biomeStructureOf(biomeIndex: number): { id: string; def: BiomeStructure } {
  const id = BIOME_ORDER[Math.min(biomeIndex, BIOME_ORDER.length - 1)];
  return { id, def: BIOME_STRUCTURES[id] };
}

function levelOpts(def: BiomeStructure, floor: number, activeModifiers: string[] = []) {
  return {
    roots: def.rootsEnabled,
    monsterCount: def.monsterCountBase + (floor - 1) * def.monsterCountPerFloor,
    sporeNodes: def.resourceId === 'spores' ? def.resourceNodesPerFloor : 0,
    resourceNodes: def.resourceId === 'spores' ? 0 : def.resourceNodesPerFloor,
    altars: def.altarsPerFloor,
    circuits: def.circuits,
    burnZones: def.burnZonesPerFloor ? { count: def.burnZonesPerFloor, damage: def.burnDamage ?? 3 } : undefined,
    speedZones: def.speedZonesPerFloor ? { count: def.speedZonesPerFloor } : undefined,
    // R7-02 : sanctuaires sur la carte uniquement si le modificateur « instabilite » est actif
    sanctuaries: activeModifiers.includes('instabilite') ? INSTABILITY.sanctuariesPerFloor : 0,
  };
}

export type GameAction =
  | { type: 'START_RUN'; seed: number; biomeIndex?: number }
  | { type: 'ENTER_COMBAT'; enemies: string[]; challengeId?: string; fromMap?: boolean }
  | { type: 'EXIT_COMBAT'; victory: boolean; loot?: CombatLoot; companionKo?: boolean; playerHp?: number }
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
  | { type: 'ASSIGN_WORKER'; buildingId: string; monsterId: string | null } // null = retire TOUS les workers du bâtiment
  | { type: 'NEXT_FLOOR' }
  | { type: 'EQUIP_ITEM'; instanceId: string } // R6-07 — Maison : équiper un objet rangé
  | { type: 'UNEQUIP_ITEM'; instanceId: string } // R6-07 — Maison : ranger l'objet porté
  | { type: 'REST_AT_HOME' } // R6-07 — repos à la Maison (texte léger)
  | { type: 'SET_RIFT_MODIFIERS'; biomeId: string; modifiers: string[] }; // R7-01 — activation par biome (si allBiomesCleared)

export function initialState(): GameState {
  return {
    mode: 'FORGE',
    forge: {
      credits: 0,
      essence: 0,
      mineraiBrut: 0,
      lingots: 0,
      spores: 0,
      donnees: 0,
      mercurium: 0,
      optifibre: 0,
      runCompleted: false,
      allBiomesCleared: false,
      homeEquipment: [],
      defeatedBosses: [],
      lastHomeEvent: null,
      riftModifiers: {},
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
      const biomeIndex = Math.max(0, Math.min(BIOME_ORDER.length - 1, action.biomeIndex ?? 0));
      const { id: biomeId, def: biomeDef } = biomeStructureOf(biomeIndex);
      const familyIds = MONSTERS_BY_FAMILY[biomeDef.family].map((m) => m.id);
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
          biomeIndex,
          activeModifiers: state.forge.riftModifiers[biomeId] ?? [],
          instability: 0,
          elitePending: false,
          floor: BALANCE.START_FLOOR,
          level: generateLevel(action.seed, BALANCE.START_FLOOR, familyIds, levelOpts(biomeDef, BALANCE.START_FLOOR, state.forge.riftModifiers[biomeId] ?? [])),
          encounter: null,
          challengeId: null,
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
          lootBiome: {},
          moveCount: 0,
          elapsedTicks: 0,
          modules: [],
          companions: [],
          companionSkills,
          companionKo: false,
          pendingMilestone: false,
          runCompleted: false,
          discoveredRecipes: [],
          journal: ['start', `biome-${biomeId}`, ...(state.forge.team.length === 0 ? ['no-companion'] : [])],
          lastEvent: `Vous entrez dans la Faille — ${BIOME_BY_ID[biomeId]?.name ?? biomeId}.`,
        },
      };
    }
    case 'ENTER_COMBAT': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      // Le monstre affronté quitte la carte (même case ou case adjacente) : plus de re-affrontement
      // infini. Uniquement pour un contact carte (pas pour autel/boss).
      const p = state.run.playerPos;
      const isTrigger = (m: { pos: { x: number; y: number } }) =>
        Math.abs(m.pos.x - p.x) + Math.abs(m.pos.y - p.y) <= 1;
      const level = {
        ...state.run.level,
        monsters:
          action.fromMap === false
            ? state.run.level.monsters
            : state.run.level.monsters.filter((m) => !isTrigger(m)),
      };
      // R7-02 : une élite traque le joueur -> ajoutée au prochain combat de carte.
      let enemies = action.enemies;
      let elitePending = state.run.elitePending;
      let journal = state.run.journal;
      if (elitePending && action.fromMap !== false) {
        const { def } = biomeStructureOf(state.run.biomeIndex);
        const family = MONSTERS_BY_FAMILY[def.family].map((m) => m.id);
        const rng = createRng((state.run.seed ^ (state.run.floor * 337) ^ 0xe11e) >>> 0);
        enemies = [...enemies, `${ELITE.idPrefix}${rng.pick(family)}`];
        elitePending = false;
        journal = [...journal, 'elite-spawn'];
      }
      return {
        ...state,
        mode: 'COMBAT',
        run: {
          ...state.run,
          level,
          encounter: enemies,
          elitePending,
          journal,
          challengeId: action.challengeId ?? null,
          lastEvent: 'Un combat éclate !',
        },
      };
    }
    case 'NEXT_FLOOR': {
      if (state.mode !== 'RUN' || !state.run) return state;
      const floor = state.run.floor + 1;
      const { def: biomeDef } = biomeStructureOf(state.run.biomeIndex);
      const familyIds = MONSTERS_BY_FAMILY[biomeDef.family].map((m) => m.id);
      // 1 jalon par biome, vers le milieu (après le 2e niveau, §SPEC-7.2).
      const teamMonster = state.forge.team[0];
      const hasCompanion = teamMonster ? !!COMPANION_BY_MONSTER[teamMonster] : false;
      const pendingMilestone = floor === 3 && hasCompanion && !state.run.pendingMilestone ? true : state.run.pendingMilestone;
      return {
        ...state,
        run: {
          ...state.run,
          floor,
          level: generateLevel(state.run.seed, floor, familyIds, levelOpts(biomeDef, floor, state.run.activeModifiers)),
          playerPos: { x: 1, y: 1 },
          pendingMilestone,
          // R7-03 : le modificateur « élites » fait apparaître une élite à chaque nouveau niveau.
          elitePending: state.run.activeModifiers.includes('elites') ? true : state.run.elitePending,
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
      // V1 : 1 slot d'équipe ; un compagnon ne peut pas être à la fois en équipe et worker.
      // (Mise en équipe = échange automatique : le compagnon quitte son poste de worker.)
      const team = action.monsterIds
        .filter((id) => state.forge.roster.includes(id))
        .slice(0, 1);
      // exclusivité dans l'autre sens : un nouveau membre d'équipe quitte son poste de worker
      const workers2 = Object.fromEntries(
        Object.entries(state.forge.workers).map(([b, list]) => [b, list.filter((w) => !team.includes(w))]),
      );
      for (const b of Object.keys(workers2)) if (workers2[b].length === 0) delete workers2[b];
      return { ...state, forge: { ...state.forge, team, workers: workers2 } };
    }
    case 'ASSIGN_WORKER': {
      if (state.mode !== 'FORGE') return state;
      const current = state.forge.workers[action.buildingId] ?? [];
      if (action.monsterId === null) {
        const workers = { ...state.forge.workers };
        delete workers[action.buildingId];
        return { ...state, forge: { ...state.forge, workers } };
      }
      if (!state.forge.roster.includes(action.monsterId)) return state;
      if (state.forge.team.includes(action.monsterId)) return state; // déjà en équipe
      if (current.includes(action.monsterId)) return state; // pas de doublon
      // un compagnon ne peut être worker que sur un seul bâtiment à la fois
      const workers = Object.fromEntries(
        Object.entries(state.forge.workers).map(([b, list]) => [b, list.filter((w) => w !== action.monsterId)]),
      );
      workers[action.buildingId] = [...(workers[action.buildingId] ?? []), action.monsterId];
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
        if (state.run.modules.some((m) => m.id === recipeId) || createdModules.some((m) => m.id === recipeId)) continue; // pas de doublon
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
      if (state.run.modules.some((m) => m.id === action.recipeId)) return state; // pas de doublon
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
        challengeId: null, // le défi ne dure que le combat concerné
        companionKo: action.companionKo ?? state.run.companionKo,
        // Les PV restants du combat persistent entre les combats (pas de soin gratuit).
        playerHp: Math.max(1, Math.min(state.run.playerMaxHp, action.playerHp ?? state.run.playerHp)),
        lastEvent: null,
      };
      run = addInstability(run, INSTABILITY.perCombat); // R7-02 : +jauge par combat
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
        // Montées de niveau de la run (perdues à la mort, §SPEC-3) : soigne des PV du niveau gagné.
        while (
          run.playerLevel < BALANCE.LEVEL_XP_THRESHOLDS.length &&
          run.xp >= BALANCE.LEVEL_XP_THRESHOLDS[run.playerLevel]
        ) {
          run = {
            ...run,
            playerLevel: run.playerLevel + 1,
            playerMaxHp: run.playerMaxHp + BALANCE.HP_PER_LEVEL,
            playerAttack: run.playerAttack + BALANCE.ATK_PER_LEVEL,
            playerHp: Math.min(run.playerMaxHp + BALANCE.HP_PER_LEVEL, run.playerHp + BALANCE.HP_PER_LEVEL),
          };
        }
      }
      // Victoire contre le boss -> fin du biome (R6-04 : la run continue dans le biome
      // suivant sans retour à la Forge ; seul le boss final termine la run).
      const wasBoss = (state.run.encounter ?? []).some((id) => id.startsWith('boss:'));
      if (action.victory && wasBoss) {
        const bossId = (state.run.encounter ?? []).find((id) => id.startsWith('boss:'))!.slice(5);
        const isFinalBoss = bossId === biomeStructureOf(BIOME_ORDER.length - 1).def.bossId;
        run = {
          ...run,
          runCompleted: isFinalBoss ? true : run.runCompleted,
          journal: [...run.journal, 'boss-killed', `boss:${bossId}`, ...(isFinalBoss ? ['boss-final'] : [])],
        };
        if (isFinalBoss) {
          // R6-03 : victoire de run -> retour à la Forge avec le butin.
          return { ...state, mode: 'RETOUR', run };
        }
        // R6-04 : boss intermédiaire vaincu -> biome suivant, même run, nouveau niveau.
        const nextBiomeIndex = state.run.biomeIndex + 1;
        const { id: nextBiomeId, def: nextDef } = biomeStructureOf(nextBiomeIndex);
        const nextFamily = MONSTERS_BY_FAMILY[nextDef.family].map((m) => m.id);
        const nextModifiers = state.forge.riftModifiers[nextBiomeId] ?? [];
        return {
          ...state,
          mode: 'RUN',
          run: {
            ...run,
            biomeIndex: nextBiomeIndex,
            activeModifiers: nextModifiers, // R7-01 : modificateurs du nouveau biome
            elitePending: nextModifiers.includes('elites') ? true : run.elitePending, // R7-03
            floor: 1,
            level: generateLevel(run.seed, 1, nextFamily, levelOpts(nextDef, 1, nextModifiers)),
            playerPos: { x: 1, y: 1 },
            pendingMilestone: false, // 1 jalon par biome
            journal: [...run.journal, `biome-${nextBiomeId}`],
            lastEvent: `Vous pénétrez dans ${BIOME_BY_ID[nextBiomeId]?.name ?? nextBiomeId}.`,
          },
        };
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
      // R6-07 : trophées — boss vaincus persistants (lus depuis le journal de la run).
      const defeatedBosses = [...new Set([...state.forge.defeatedBosses, ...(run?.journal ?? []).filter((e) => e.startsWith('boss:')).map((e) => e.slice(5))])];
      // Codex permanent : toute recette découverte une fois est connue pour toujours (§SPEC-5.2).
      const discovered = [...new Set([...state.forge.discoveredRecipes, ...(run?.discoveredRecipes ?? [])])];
      // À la mort : orbes primordiales non consommées perdues, composites conservées (§SPEC-3).
      const keptComposites = (run?.orbs ?? []).filter((o) => o.kind === 'composite');
      const withProduction = run
        ? advanceProduction(
            {
              ...state,
              forge: {
                ...state.forge,
                credits: state.forge.credits + run.lootCredits,
                essence: state.forge.essence + run.lootEssence,
                mineraiBrut: state.forge.mineraiBrut + run.lootMinerai,
                spores: state.forge.spores + run.lootSpores,
                // R6-01+ : les ressources des biomes 2-4 (données, mercurium, optifibre)
                // sont transférées à la Forge à 100 % au retour de run.
                donnees: state.forge.donnees + (run.lootBiome['donnees'] ?? 0),
                mercurium: state.forge.mercurium + (run.lootBiome['mercurium'] ?? 0),
                optifibre: state.forge.optifibre + (run.lootBiome['optifibre'] ?? 0),
              },
            },
            run.elapsedTicks,
          )
        : state;
      const maintenance = Math.floor((run?.elapsedTicks ?? 0) / 100) * BALANCE.MAINTENANCE_PER_100_TICKS;
      // Contrats du Marchand : vérifiés depuis le journal de la run, primes versées au retour.
      const withContracts = run
        ? settleContracts(withProduction, { events: run.journal, lootSpores: run.lootSpores, lootBiome: run.lootBiome })
        : withProduction;
      // R6-03/R7-01 : victoire de run persistante -> débloque les modificateurs de Faille.
      const runCompleted = withContracts.forge.runCompleted || (run?.runCompleted ?? false);
      return {
        ...withContracts,
        mode: 'FORGE',
        forge: {
          ...withContracts.forge,
          credits: Math.max(0, withContracts.forge.credits - maintenance),
          roster,
          discoveredRecipes: discovered,
          orbStock: [...state.forge.orbStock, ...keptComposites],
          defeatedBosses,
          runCompleted,
          allBiomesCleared: withContracts.forge.allBiomesCleared || runCompleted,
        },
        run: null,
      };
    }
    case 'MOVE_PLAYER': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      const { x, y } = action.to;
      if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return state;
      const level = state.run.level;
      if (isWall(level, x, y)) return state; // un mur bloque, même au tactile
      // R6-03 twist biome 4 : zone ralentie (speed 0) -> un déplacement sur deux est ignoré
      // ("saute un tour"), parité déterministe sur moveCount.
      const cur = state.run;
      const originZone = level.speedZones.find((z) => z.pos.x === cur.playerPos.x && z.pos.y === cur.playerPos.y);
      const moveCount = cur.moveCount + 1;
      if (originZone && originZone.speed === 0 && moveCount % 2 === 0) {
        return {
          ...state,
          run: { ...state.run, moveCount, lastEvent: 'Zone ralentie : vous sautez un tour.' },
        };
      }
      // R6-03 twist biome 4 : zone accélérée (speed 2) -> le déplacement se poursuit d'une
      // case dans la même direction si elle est libre.
      let dest = { x, y };
      const destZone = level.speedZones.find((z) => z.pos.x === x && z.pos.y === y);
      if (destZone && destZone.speed === 2) {
        const dx = x - cur.playerPos.x;
        const dy = y - cur.playerPos.y;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP_WIDTH && ny < MAP_HEIGHT && !isWall(level, nx, ny)) dest = { x: nx, y: ny };
      }
      let run = { ...state.run, playerPos: dest, moveCount };
      // R6-02 twist biome 3 : sol brûlant — dégâts exacts par tour sur la case d'arrivée.
      const burn = level.burnZones.find((z) => z.pos.x === dest.x && z.pos.y === dest.y);
      if (burn && (burn.damage ?? 0) > 0) {
        run = {
          ...run,
          playerHp: run.playerHp - (burn.damage ?? 0),
          journal: [...run.journal, 'brulure'],
          lastEvent: `Sol brûlant : -${burn.damage} PV.`,
        };
        if (run.playerHp <= 0) {
          return { ...state, mode: 'RETOUR', run: { ...run, playerHp: 0 } };
        }
      }
      // Ramassage automatique des orbes au sol en marchant dessus.
      const orbIdx = level.orbs.findIndex((o) => o.pos.x === dest.x && o.pos.y === dest.y);
      if (orbIdx >= 0) {
        const orb = level.orbs[orbIdx];
        run = {
          ...run,
          level: { ...level, orbs: level.orbs.filter((_, i) => i !== orbIdx) },
          orbs: [
            ...run.orbs,
            {
              id: `sol-${run.floor}-${dest.x}-${dest.y}`,
              kind: 'primordial' as const,
              element: orb.element,
              tier: 1,
            },
          ],
          lastEvent: `Orbe ${orb.element} ramassée.`,
        };
      }
      // Récolte d'un nœud de spores en marchant dessus : retire le nœud et attire les monstres voisins.
      const sporeIdx = level.sporeNodes.findIndex((p) => p.x === dest.x && p.y === dest.y);
      if (sporeIdx >= 0) {
        const level2 = { ...level, sporeNodes: level.sporeNodes.filter((_, i) => i !== sporeIdx) };
        attractMonsters(level2, dest, BIOME_1_STRUCTURE.attractRadius, (lx, ly) => isWall(level2, lx, ly));
        run = {
          ...run,
          level: level2,
          lootSpores: run.lootSpores + 1,
          journal: [...run.journal, 'spore'],
          lastEvent: 'Spore récoltée (les monstres voisins sont attirés…).',
        };
        run = addInstability(run, INSTABILITY.perHarvest); // R7-02 : +jauge par récolte
      }
      // R6-01+ : nœud de la ressource du biome courant (données / mercurium / optifibre).
      const resIdx = level.resourceNodes.findIndex((p) => p.x === dest.x && p.y === dest.y);
      if (resIdx >= 0) {
        const { def: biomeDef } = biomeStructureOf(run.biomeIndex);
        run = {
          ...run,
          level: { ...run.level!, resourceNodes: run.level!.resourceNodes.filter((_, i) => i !== resIdx) },
          lootBiome: { ...run.lootBiome, [biomeDef.resourceId]: (run.lootBiome[biomeDef.resourceId] ?? 0) + 1 },
          journal: [...run.journal, `resource-${biomeDef.resourceId}`],
          lastEvent: `${biomeDef.resourceId} récoltée.`,
        };
        run = addInstability(run, INSTABILITY.perHarvest); // R7-02 : +jauge par récolte
      }
      return { ...state, run };
    }
    case 'INTERACT': {
      if (state.mode !== 'RUN' || !state.run || !state.run.level) return state;
      const { playerPos: pos, level, seed, floor } = state.run;
      // Sortie du niveau -> niveau suivant, ou combat de boss au dernier sol du biome (§SPEC-4.1).
      if (pos.x === level.exit.x && pos.y === level.exit.y) {
        const { def: biomeDef } = biomeStructureOf(state.run.biomeIndex);
        if (floor >= biomeDef.floors) {
          return reduce(state, { type: 'ENTER_COMBAT', enemies: [`boss:${biomeDef.bossId}`], fromMap: false });
        }
        return reduce(state, { type: 'NEXT_FLOOR' });
      }
      // R6-01 twist biome 2 : déclencheur de circuit -> bascule les portes associées
      // (connexité BFS garantie dans les deux états, §R6-01).
      const circuitIdx = level.circuits.findIndex((c) => c.trigger.x === pos.x && c.trigger.y === pos.y);
      if (circuitIdx >= 0) {
        const circuit = level.circuits[circuitIdx];
        const walls = [...level.walls];
        for (const d of circuit.doors) walls[d.y * level.width + d.x] = !walls[d.y * level.width + d.x];
        const level2 = { ...level, walls };
        return {
          ...state,
          run: {
            ...state.run,
            level: level2,
            journal: [...state.run.journal, 'circuit'],
            lastEvent: 'Un circuit bascule : des portes s’ouvrent ou se ferment.',
          },
        };
      }
      // Autel de défi à tours limités : usage unique, l'autel disparaît du niveau (§SPEC-4.3).
      const altarIdx = level.altars.findIndex((a) => a.x === pos.x && a.y === pos.y);
      if (altarIdx >= 0) {
        const level2 = { ...level, altars: level.altars.filter((_, i) => i !== altarIdx) };
        const s2 = { ...state, run: { ...state.run, level: level2, lastEvent: 'L’autel de garde s’active…' } };
        const enemies = ['mousse', 'sporeling']; // TODO-BALANCE — garde de l'autel
        return reduce(s2, { type: 'ENTER_COMBAT', enemies, challengeId: 'autel-garde', fromMap: false });
      }
      // R7-02 : sanctuaire = purge complète de la jauge d'instabilité, usage unique.
      const sanctIdx = level.sanctuaries.findIndex((s) => s.x === pos.x && s.y === pos.y);
      if (sanctIdx >= 0 && state.run.activeModifiers.includes('instabilite')) {
        const level2 = { ...level, sanctuaries: level.sanctuaries.filter((_, i) => i !== sanctIdx) };
        return {
          ...state,
          run: {
            ...state.run,
            level: level2,
            instability: 0,
            journal: [...state.run.journal, 'sanctuaire'],
            lastEvent: 'Sanctuaire : la jauge d’instabilité retombe à zéro.',
          },
        };
      }
      const chestIdx = level.chests.findIndex((c) => c.x === pos.x && c.y === pos.y);
      if (chestIdx >= 0) {
        const rng = createRng((seed ^ (floor * 31) ^ (chestIdx * 101)) >>> 0);
        const credits = BALANCE.CHEST_CREDITS_MIN + rng.int(BALANCE.CHEST_CREDITS_SPREAD);
        const essence = 1 + rng.int(3); // TODO-BALANCE — les coffres donnent de l'essence
        const orb = rng.pick(PRIMORDIAL_ELEMENTS);
        return {
          ...state,
          run: {
            ...state.run,
            level: { ...level, chests: level.chests.filter((_, i) => i !== chestIdx) },
            lootCredits: state.run.lootCredits + credits,
            lootEssence: state.run.lootEssence + essence,
            orbs: [
              ...state.run.orbs,
              { id: `coffre-${floor}-${chestIdx}`, kind: 'primordial' as const, element: orb, tier: 1 },
            ],
            lastEvent: `Coffre ouvert : +${credits} crédits, +${essence} essence, orbe ${orb}.`,
          },
        };
      }
      return { ...state, run: { ...state.run, lastEvent: 'Rien ici.' } };
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
    case 'EQUIP_ITEM': {
      // R6-07 Maison du héros : équiper un objet rangé (déjà possédé, rangé à la Maison).
      if (state.mode !== 'FORGE') return state;
      const inst = state.forge.homeEquipment.find((e) => e.id === action.instanceId);
      if (!inst) return state;
      return {
        ...state,
        forge: {
          ...state.forge,
          homeEquipment: state.forge.homeEquipment.filter((e) => e.id !== action.instanceId),
          equipment: [...state.forge.equipment, inst],
        },
      };
    }
    case 'UNEQUIP_ITEM': {
      // R6-07 Maison du héros : ranger l'objet porté (plusieurs sets possibles).
      if (state.mode !== 'FORGE') return state;
      const inst = state.forge.equipment.find((e) => e.id === action.instanceId);
      if (!inst) return state;
      return {
        ...state,
        forge: {
          ...state.forge,
          equipment: state.forge.equipment.filter((e) => e.id !== action.instanceId),
          homeEquipment: [...state.forge.homeEquipment, inst],
        },
      };
    }
    case 'SET_RIFT_MODIFIERS': {
      // R7-01 : activation par biome, UNIQUEMENT si allBiomesCleared (déblocage §SPEC-4.4).
      // Sans le flag, le jeu de base reste strictement identique (aucune jauge visible).
      if (state.mode !== 'FORGE') return state;
      if (!state.forge.allBiomesCleared) return state;
      if (!BIOME_BY_ID[action.biomeId]) return state;
      const modifiers = [...new Set(action.modifiers)].filter((m) => RIFT_MODIFIER_BY_ID[m]);
      return {
        ...state,
        forge: { ...state.forge, riftModifiers: { ...state.forge.riftModifiers, [action.biomeId]: modifiers } },
      };
    }
    case 'REST_AT_HOME': {
      // R6-07 : repos à la Maison — texte léger, aucun effet mécanique.
      if (state.mode !== 'FORGE') return state;
      return {
        ...state,
        forge: { ...state.forge, lastHomeEvent: 'Vous vous reposez un moment à la Maison. La Faille vous attend.' },
      };
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
