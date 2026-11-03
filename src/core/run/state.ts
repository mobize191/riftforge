import type { GameState } from '../types';
import { BALANCE } from '../../data/balance';

export type GameAction =
  | { type: 'START_RUN'; seed: number }
  | { type: 'ENTER_COMBAT' }
  | { type: 'EXIT_COMBAT'; victory: boolean }
  | { type: 'DIE' }
  | { type: 'END_BIOME' }
  | { type: 'RETURN_FORGE' };

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
    default:
      return state;
  }
}
