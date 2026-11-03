'use client';

import { useEffect, useState } from 'react';
import { initialState, reduce } from '../../core/run/state';
import { serialize, deserialize, SAVE_KEY } from '../../core/save/save';
import { loadFromPort, saveToPort } from '../../core/save/storage';
import { createLocalStoragePort } from '../storage';
import type { GameState } from '../../core/types';

export default function TitleScreen() {
  const [state, setState] = useState<GameState | null>(null);
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    const port = createLocalStoragePort();
    const raw = loadFromPort(port, SAVE_KEY);
    if (raw) {
      try {
        setState(deserialize(raw));
        setHasSave(true);
      } catch {
        setHasSave(false);
      }
    }
  }, []);

  const persist = (next: GameState) => {
    setState(next);
    saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
  };

  const onNewRun = () => {
    persist(reduce(initialState(), { type: 'START_RUN', seed: 1 }));
    setHasSave(true);
  };

  const onContinue = () => {
    const raw = loadFromPort(createLocalStoragePort(), SAVE_KEY);
    if (raw) setState(deserialize(raw));
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #1b2a4a 0%, #0a0e1a 70%)',
        color: '#e8ecf8',
      }}
    >
      <h1
        className="font-bold tracking-widest"
        style={{ fontSize: 'clamp(2.5rem, 9vw, 6rem)', textShadow: '0 0 24px #4f7cff' }}
      >
        RIFTFORGE
      </h1>
      <p className="max-w-md" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', opacity: 0.8 }}>
        Technomancien·ne de la Forge. Descendez dans les Failles, revenez avec le butin.
      </p>
      <div className="flex flex-col gap-4" style={{ width: 'min(320px, 80vw)' }}>
        <button
          onClick={onNewRun}
          className="rounded-lg border border-blue-400 bg-blue-600/80 font-semibold hover:bg-blue-500"
          style={{ minHeight: '44px', fontSize: '1.05rem', padding: '0.75rem 1rem' }}
        >
          Nouvelle descente
        </button>
        {hasSave && (
          <button
            onClick={onContinue}
            className="rounded-lg border border-slate-400 bg-slate-700/80 font-semibold hover:bg-slate-600"
            style={{ minHeight: '44px', fontSize: '1.05rem', padding: '0.75rem 1rem' }}
          >
            Continuer
          </button>
        )}
      </div>
      {state && (
        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
          État : {state.mode}
          {state.run ? ` — sol ${state.run.floor}, PV ${state.run.playerHp}/${state.run.playerMaxHp}` : ''}
        </p>
      )}
    </main>
  );
}
