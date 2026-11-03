'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GameState, Position } from '../core/types';
import { initialState, reduce } from '../core/run/state';
import { serialize, deserialize, SAVE_KEY } from '../core/save/save';
import { loadFromPort, saveToPort } from '../core/save/storage';
import { createLocalStoragePort } from './storage';
import TitleScreen from './screens/TitleScreen';
import GameCanvas from './GameCanvas';

type View = 'title' | 'game';

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('title');

  const persist = useCallback((next: GameState) => {
    setState(next);
    saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
  }, []);

  useEffect(() => {
    const raw = loadFromPort(createLocalStoragePort(), SAVE_KEY);
    if (!raw) return;
    try {
      setState(deserialize(raw));
    } catch {
      // save illisible ou version inconnue : ignorée, le titre proposera une nouvelle descente
    }
  }, []);

  useEffect(() => {
    if (!state) return;
    const onHide = () => saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(state));
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [state]);

  const onNewRun = useCallback(() => {
    persist(reduce(initialState(), { type: 'START_RUN', seed: 1 }));
    setView('game');
  }, [persist]);

  const onContinue = useCallback(() => setView('game'), []);

  const onMove = useCallback((pos: Position) => {
    setState((prev) => (prev ? reduce(prev, { type: 'MOVE_PLAYER', to: pos }) : prev));
  }, []);

  const onQuit = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduce(prev, { type: 'RETURN_FORGE' });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
    setView('title');
  }, []);

  if (view === 'game' && state?.mode === 'RUN' && state.run) {
    return (
      <main className="flex min-h-screen flex-col items-center gap-3 bg-[#0a0e1a] py-4 text-slate-100">
        <div className="flex w-full max-w-5xl items-center justify-between px-4">
          <span className="font-semibold tracking-widest">RIFTFORGE — Sol {state.run.floor}</span>
          <button
            onClick={onQuit}
            className="rounded border border-slate-400 px-3 py-2"
            style={{ minHeight: '44px' }}
          >
            Quitter la Faille
          </button>
        </div>
        <GameCanvas
          key={`${state.run.seed}-${state.run.floor}`}
          initialPos={state.run.playerPos}
          onMove={onMove}
        />
        <p className="text-sm opacity-60">
          Flèches / ZQSD / WASD pour se déplacer. Position : ({state.run.playerPos.x},{' '}
          {state.run.playerPos.y})
        </p>
      </main>
    );
  }

  return (
    <TitleScreen
      state={state}
      hasSave={state?.run !== null && state?.run !== undefined}
      onNewRun={onNewRun}
      onContinue={onContinue}
    />
  );
}
