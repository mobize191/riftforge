import type { GameState, Position } from '../types';
import { BALANCE } from '../../data/balance';

export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 24;

export type GameAction =
  | { type: 'START_RUN'; seed: number }
  | { type: 'ENTER_COMBAT' }
  | { type: 'EXIT_COMBAT'; victory: boolean }
  | { type: 'DIE' }
  | { type: 'END_BIOME' }
  | { type: 'RETURN_FORGE' }
  | { type: 'MOVE_PLAYER'; to: Position };

export function initialState(): GameState {
  return {
    mode: 'FORGE',
    forge: { credits: 0, essence: 0, mineraiBrut: 0 },
    run: null,
  };
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_RUN': {
      if (state.mode !== 'FORGE' && state.mode !== 'RETOUR') return state;
      return {
        ...state,
        mode: 'RUN',
        run: {
          seed: action.seed,
          floor: BALANCE.START_FLOOR,
          playerPos: { x: 1, y: 1 },
          playerLevel: BALANCE.START_PLAYER_LEVEL,
          playerHp: BALANCE.START_PLAYER_HP,
          playerMaxHp: BALANCE.START_PLAYER_HP,
          orbs: [],
          modules: [],
        },
      };
    }
    case 'ENTER_COMBAT': {
      if (state.mode !== 'RUN') return state;
      return { ...state, mode: 'COMBAT' };
    }
    case 'EXIT_COMBAT': {
      if (state.mode !== 'COMBAT') return state;
      return { ...state, mode: 'RUN' };
    }
    case 'DIE':
    case 'END_BIOME': {
      if (state.mode !== 'RUN' && state.mode !== 'COMBAT') return state;
      return { ...state, mode: 'RETOUR' };
    }
    case 'RETURN_FORGE': {
      if (state.mode !== 'RETOUR') return state;
      return { ...state, mode: 'FORGE', run: null };
    }
    case 'MOVE_PLAYER': {
      if (state.mode !== 'RUN' || !state.run) return state;
      const { x, y } = action.to;
      if (x < 0 || y < 0 || x >= MAP_WIDTH || y >= MAP_HEIGHT) return state;
      return { ...state, run: { ...state.run, playerPos: { x, y } } };
    }
    default:
      return state;
  }
}
