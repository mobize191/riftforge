import type { GameState } from '../types';

export const SAVE_VERSION = 5;
export const SAVE_KEY = 'riftforge-save';

export interface SaveFile {
  version: number;
  state: GameState;
}

export class UnknownSaveVersionError extends Error {
  readonly version: number;
  constructor(version: number) {
    super(`Version de sauvegarde inconnue : ${version}`);
    this.version = version;
  }
}

// R8 : champs de lien ajoutés en v5 — remplissage par défaut pour toute save < v5.
function withBondDefaults(save: SaveFile): SaveFile {
  const f = save.state.forge as Partial<typeof save.state.forge>;
  return {
    ...save,
    version: 5,
    state: {
      ...save.state,
      forge: {
        ...f,
        bondXp: f.bondXp ?? {},
        bondTier: f.bondTier ?? {},
        evolved: f.evolved ?? {},
        killCounts: f.killCounts ?? {},
        liaisonQuests: f.liaisonQuests ?? {},
      } as typeof save.state.forge,
    },
  };
}

export function migrate(save: SaveFile): SaveFile {
  if (save.version === 4) return withBondDefaults(save);
  // v1 -> v2 (R6-01/R6-03) : nouvelles ressources de Forge (donnees, mercurium,
  // optifibre), flags runCompleted/allBiomesCleared, et champs de run multi-biomes.
  // v3 -> v4 (R7-01) : modificateurs de Faille (forge.riftModifiers).
  if (save.version === 3) {
    const prevForge = save.state.forge as Partial<typeof save.state.forge>;
    const forge = { ...prevForge, riftModifiers: prevForge.riftModifiers ?? {} } as typeof save.state.forge;
    return { version: 4, state: { ...save.state, forge } };
  }
  // v2 -> v3 (R6-07) : Maison du héros (homeEquipment, defeatedBosses, lastHomeEvent).
  if (save.version === 1 || save.version === 2) {
    if (save.version === 2) {
      const prevForge = save.state.forge as Partial<typeof save.state.forge>;
      const forge = {
        ...prevForge,
        homeEquipment: prevForge.homeEquipment ?? [],
        defeatedBosses: prevForge.defeatedBosses ?? [],
        lastHomeEvent: prevForge.lastHomeEvent ?? null,
      } as typeof save.state.forge;
      return { version: 3, state: { ...save.state, forge } };
    }
    // les champs v1 peuvent manquer les nouvelles clés : on les remplit par défaut
    const prevForge = save.state.forge as Partial<typeof save.state.forge>;
    const prevRun = save.state.run as Partial<NonNullable<typeof save.state.run>> | null;
    const forge = {
      ...prevForge,
      donnees: prevForge.donnees ?? 0,
      mercurium: prevForge.mercurium ?? 0,
      optifibre: prevForge.optifibre ?? 0,
      runCompleted: prevForge.runCompleted ?? false,
      allBiomesCleared: prevForge.allBiomesCleared ?? false,
    } as typeof save.state.forge;
    const run = prevRun
      ? ({
          ...prevRun,
          biomeIndex: prevRun.biomeIndex ?? 0,
          lootBiome: prevRun.lootBiome ?? {},
          moveCount: prevRun.moveCount ?? 0,
          runCompleted: prevRun.runCompleted ?? false,
          activeModifiers: prevRun.activeModifiers ?? [], // R7-01
          instability: prevRun.instability ?? 0, // R7-02
          elitePending: prevRun.elitePending ?? false, // R7-02
        } as NonNullable<typeof save.state.run>)
      : save.state.run;
    return withBondDefaults({
      version: 4,
      state: {
        ...save.state,
        forge: {
          ...forge,
          homeEquipment: (forge as Partial<typeof forge>).homeEquipment ?? [],
          defeatedBosses: (forge as Partial<typeof forge>).defeatedBosses ?? [],
          lastHomeEvent: (forge as Partial<typeof forge>).lastHomeEvent ?? null,
          riftModifiers: (forge as Partial<typeof forge>).riftModifiers ?? {},
        },
        run,
      },
    });
  }
  return save;
}

export function serialize(state: GameState): string {
  const file: SaveFile = { version: SAVE_VERSION, state };
  return JSON.stringify(file);
}

export function deserialize(json: string): GameState {
  const parsed = JSON.parse(json) as SaveFile;
  if (typeof parsed?.version !== 'number') {
    throw new Error('Sauvegarde invalide : champ version absent');
  }
  if (parsed.version > SAVE_VERSION || parsed.version < 1) {
    throw new UnknownSaveVersionError(parsed.version);
  }
  return migrate(parsed).state;
}

export function exportSave(state: GameState): string {
  return serialize(state);
}

export function importSave(json: string): GameState {
  return deserialize(json);
}
