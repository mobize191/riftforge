import type { GameState } from '../types';

export const SAVE_VERSION = 1;
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
  // Migration no-op : version 1 est la première version.
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
