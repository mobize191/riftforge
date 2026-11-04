import type { GameState } from '../types';

export const SAVE_VERSION = 2;
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

export function migrate(save: SaveFile): SaveFile {
  // v1 -> v2 (R6-01/R6-03) : nouvelles ressources de Forge (donnees, mercurium,
  // optifibre), flags runCompleted/allBiomesCleared, et champs de run multi-biomes.
  if (save.version === 1) {
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
        } as NonNullable<typeof save.state.run>)
      : save.state.run;
    return { version: 2, state: { ...save.state, forge, run } };
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
