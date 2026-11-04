'use client';

import { useRef, useState } from 'react';
import type { GameState } from '../../core/types';
import { soundEngine, playSound } from '../audio';

export default function TitleScreen({
  state,
  hasSave,
  onNewRun,
  onContinue,
  onExportSave,
  onImportSave,
  importError,
}: {
  state: GameState | null;
  hasSave: boolean;
  onNewRun: () => void;
  onContinue: () => void;
  onExportSave?: () => void; // R9-05 — télécharger la save (JSON versionné)
  onImportSave?: (file: File) => void; // R9-05 — charger un fichier (validation core)
  importError?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  // R9-02 : bouton couper le son (persisté), testé sans AudioContext.
  const [muted, setMuted] = useState(soundEngine.muted);
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
        <button
          onClick={() => {
            playSound('ui-click');
            setMuted(soundEngine.toggleMute());
          }}
          className="rounded-lg border border-slate-500 bg-slate-800/80"
          style={{ minHeight: '44px', fontSize: '0.95rem', padding: '0.5rem 1rem' }}
          aria-pressed={muted}
        >
          Son : {muted ? 'coupé' : 'activé'}
        </button>
        {/* R9-05 : export / import de la sauvegarde */}
        {onExportSave && (
          <button
            onClick={onExportSave}
            className="rounded-lg border border-emerald-400/70 bg-emerald-900/60"
            style={{ minHeight: '44px', fontSize: '0.95rem', padding: '0.5rem 1rem' }}
          >
            Télécharger la save
          </button>
        )}
        {onImportSave && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-emerald-400/70 bg-emerald-900/60"
              style={{ minHeight: '44px', fontSize: '0.95rem', padding: '0.5rem 1rem' }}
            >
              Charger un fichier
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Fichier de sauvegarde"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportSave(f);
                e.target.value = '';
              }}
            />
          </>
        )}
        {importError && (
          <p role="alert" style={{ color: '#ff8899', fontSize: '0.9rem' }}>
            {importError}
          </p>
        )}
      </div>
      {state && (
        <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>
          État : {state.mode}
          {state.run
            ? ` — sol ${state.run.floor}, position (${state.run.playerPos.x}, ${state.run.playerPos.y})`
            : ''}
        </p>
      )}
    </main>
  );
}
