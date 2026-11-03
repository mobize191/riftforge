import type { GameState, Position } from '../types';
import { BALANCE } from '../../data/balance';
import { MAP_WIDTH, MAP_HEIGHT } from './grid';
import { generateLevel, type LevelMap } from './generate';

export { MAP_WIDTH, MAP_HEIGHT };

export type GameAction =
  | { type: 'START_RUN'; seed: number }
  | { type: 'ENTER_COMBAT'; enemies: string[] }
  | { type: 'EXIT_COMBAT'; victory: boolean }
  | { type: 'DIE' }
  | { type: 'END_BIOME' }
  | { type: 'RETURN_FORGE' }
  | { type: 'MOVE_PLAYER'; to: Position }
  | { type: 'ENTER_COMBAT'; enemies: string[] }
  | { type: 'NEXT_FLOOR' };

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
          level: generateLevel(action.seed, BALANCE.START_FLOOR),
          encounter: null,
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
