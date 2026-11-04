'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Position } from '../core/types';
import type { LevelMap } from '../core/run/generate';
import { initialState, reduce } from '../core/run/state';
import { serialize, deserialize, SAVE_KEY } from '../core/save/save';
import { loadFromPort, saveToPort } from '../core/save/storage';
import { createLocalStoragePort } from './storage';
import TitleScreen from './screens/TitleScreen';
import GameCanvas, { type GameCanvasApi } from './GameCanvas';
import CombatScreen from './screens/CombatScreen';
import ForgeScreen from './screens/ForgeScreen';
import { MONSTERS } from '../data/monsters';
import { startCombat, combatReduce, type CombatState, type CombatAction } from '../core/combat/combat';
import { COMPANION_BY_MONSTER } from '../data/companions';

type View = 'title' | 'game' | 'forge';

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('title');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const levelRef = useRef<LevelMap | null>(null);
  const canvasApiRef = useRef<GameCanvasApi>(null);
  const familyIds = useMemo(
    () => MONSTERS.filter((m) => m.family === 'spore').map((m) => m.id),
    [],
  );

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

  // Sauvegarde automatique à chaque changement de zone logique (sol), pas à chaque frame.
  const lastFloorRef = useRef<number | null>(null);
  useEffect(() => {
    const floor = state?.run?.floor ?? null;
    if (floor !== null && lastFloorRef.current !== null && lastFloorRef.current !== floor && state) {
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(state));
    }
    if (floor !== null) lastFloorRef.current = floor;
  }, [state]);

  const onNewRun = useCallback(() => {
    persist(reduce(initialState(), { type: 'START_RUN', seed: 1 }));
    setView('game');
  }, [persist]);

  const onContinue = useCallback(() => setView('game'), []);

  const onMove = useCallback((pos: Position) => {
    setState((prev) => (prev ? reduce(prev, { type: 'MOVE_PLAYER', to: pos }) : prev));
  }, []);

  const onEncounter = useCallback((enemies: string[]) => {
    setState((prev) => {
      if (!prev || !prev.run) return prev;
      setCombat(
        startCombat(
          (prev.run.seed ^ prev.run.floor) >>> 0,
          prev.run.playerHp,
          prev.run.playerMaxHp,
          prev.run.playerAttack,
          enemies,
          prev.run.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
          prev.forge.team[0] ? COMPANION_BY_MONSTER[prev.forge.team[0]] ?? null : null,
          prev.run.companionSkills,
          prev.run.companionKo,
          prev.run.modules.map((m) => m.id),
          prev.run.challengeId ?? undefined,
        ),
      );
      return reduce(prev, { type: 'ENTER_COMBAT', enemies });
    });
  }, []);

  const onCombatAction = useCallback((a: CombatAction) => {
    setCombat((prev) => (prev ? combatReduce(prev, a) : prev));
  }, []);

  const onCombatEnd = useCallback(
    (result: 'won' | 'lost' | 'fled' | 'challenge-failed', loot: CombatState['loot'], ko = false) => {
      setCombat(null);
      setState((prev) => {
        if (!prev) return prev;
        if (result === 'won')
          return reduce(prev, { type: 'EXIT_COMBAT', victory: true, loot: loot ?? undefined, companionKo: ko });
        if (result === 'fled' || result === 'challenge-failed')
          return reduce(prev, { type: 'EXIT_COMBAT', victory: false, companionKo: ko });
        return reduce(prev, { type: 'DIE' });
      });
    },
    [],
  );

  const onInteract = useCallback(() => {
    setState((prev) => (prev ? reduce(prev, { type: 'INTERACT' }) : prev));
  }, []);

  const onQuit = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduce(prev, { type: 'RETURN_FORGE' });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
    setView('forge');
  }, []);

  const onBuy = useCallback((defId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = reduce(prev, { type: 'BUY_ITEM', defId });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
  }, []);

  const onCraft = useCallback((defId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'CRAFT_ITEM', defId }) : prev));
  }, []);

  const onUpgrade = useCallback((buildingId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'UPGRADE_BUILDING', buildingId }) : prev));
  }, []);

  const onUpgradeLab = useCallback(() => {
    setState((prev) => (prev ? reduce(prev, { type: 'UPGRADE_LAB' }) : prev));
  }, []);

  const onCraftRecipe = useCallback((recipeId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'CRAFT_LAB_RECIPE', recipeId }) : prev));
  }, []);

  const onRename = useCallback((monsterId: string, name: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'RENAME_COMPANION', monsterId, name }) : prev));
  }, []);

  const onSetTeam = useCallback((monsterIds: string[]) => {
    setState((prev) => (prev ? reduce(prev, { type: 'SET_TEAM', monsterIds }) : prev));
  }, []);

  const onAssignWorker = useCallback((buildingId: string, monsterId: string | null) => {
    setState((prev) => (prev ? reduce(prev, { type: 'ASSIGN_WORKER', buildingId, monsterId }) : prev));
  }, []);

  const onSaveGrimoire = useCallback((slot: number, name: string, recipeIds: string[]) => {
    setState((prev) => (prev ? reduce(prev, { type: 'SAVE_GRIMOIRE', slot, name, recipeIds }) : prev));
  }, []);

  const onExecGrimoire = useCallback((slot: number) => {
    setState((prev) => (prev ? reduce(prev, { type: 'EXEC_GRIMOIRE', slot }) : prev));
  }, []);

  // Production temps réel : l'UI dérive les ticks de l'horloge réelle et les injecte dans le core.
  useEffect(() => {
    if (view !== 'forge' && view !== 'game') return;
    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        return prev.mode === 'RUN'
          ? reduce(prev, { type: 'TICK_RUN', ticks: 1 })
          : reduce(prev, { type: 'ADVANCE_TICKS', ticks: 1 });
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view]);

  const onDescend = useCallback(() => {
    const seed = Date.now() % 2147483647;
    setState((prev) => {
      const next = reduce(prev ?? initialState(), { type: 'START_RUN', seed });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
    setView('game');
  }, []);

  if (view === 'game' && state?.mode === 'COMBAT' && combat) {
    return <CombatScreen combat={combat} onAction={onCombatAction} onEnd={onCombatEnd} />;
  }

  if (view === 'forge' && state?.mode === 'FORGE') {
    return (
      <ForgeScreen
        state={state}
        onBuy={onBuy}
        onCraft={onCraft}
        onUpgrade={onUpgrade}
        onUpgradeLab={onUpgradeLab}
        onCraftRecipe={onCraftRecipe}
        onDescend={onDescend}
        onRename={onRename}
        onSetTeam={onSetTeam}
        onAssignWorker={onAssignWorker}
        onSaveGrimoire={onSaveGrimoire}
      />
    );
  }

  if (view === 'game' && state?.mode === 'RETOUR') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a0e1a] text-slate-100">
        <h2 className="font-bold" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' }}>
          RETOUR À LA FORGE
        </h2>
        <p>Butin conservé : {state.run?.lootCredits ?? 0} crédits.</p>
        <button
          onClick={onQuit}
          className="rounded-lg border border-emerald-300 bg-emerald-700 px-6 py-3 font-semibold"
          style={{ minHeight: '44px', fontSize: '1.05rem' }}
        >
          Entrer à la Forge
        </button>
      </main>
    );
  }

  if (view === 'game' && state?.mode === 'RUN' && state.run && state.run.level) {
    levelRef.current = state.run.level;
    const run = state.run;
    // Le pavé tactile pilote la scène Phaser (qui met à jour l'état via onMove).
    const touchMove = (dx: number, dy: number) => canvasApiRef.current?.move(dx, dy);
    const touchInteract = () => canvasApiRef.current?.interact();
    const padBtn: React.CSSProperties = {
      minWidth: '56px',
      minHeight: '56px',
      fontSize: '1.3rem',
      borderRadius: '10px',
      border: '1px solid rgba(148,163,184,0.6)',
      background: 'rgba(30,41,59,0.75)',
      color: '#e2e8f0',
      touchAction: 'manipulation',
    };
    return (
      <main className="flex min-h-screen flex-col items-center gap-3 bg-[#0a0e1a] py-4 text-slate-100">
        <div className="flex w-full max-w-5xl items-center justify-between px-4">
          <span className="font-semibold tracking-widest">
            RIFTFORGE — Sol {state.run.floor} · Niv {state.run.playerLevel} · XP {state.run.xp} ·{' '}
            {state.run.lootCredits} crédits
          </span>
          <button
            onClick={onQuit}
            className="rounded border border-slate-400 px-3 py-2"
            style={{ minHeight: '44px' }}
          >
            Quitter la Faille
          </button>
        </div>
        <GameCanvas
          ref={canvasApiRef}
          key={`${run.seed}-${run.floor}`}
          gameKey={`${run.seed}-${run.floor}`}
          levelRef={levelRef as React.MutableRefObject<LevelMap>}
          initialPos={run.playerPos}
          seed={run.seed}
          floor={run.floor}
          familyIds={familyIds}
          onMove={onMove}
          onEncounter={onEncounter}
          onInteract={onInteract}
        />
        {/* Pavé tactile (téléphone) — hit-zones 56 px */}
        <div className="flex flex-col items-center gap-2 pb-6 select-none">
          <button aria-label="Haut" style={padBtn} onClick={() => touchMove(0, -1)}>▲</button>
          <div className="flex gap-2">
            <button aria-label="Gauche" style={padBtn} onClick={() => touchMove(-1, 0)}>◀</button>
            <button aria-label="Interagir" style={{ ...padBtn, borderColor: 'rgba(52,211,153,0.8)' }} onClick={touchInteract}>E</button>
            <button aria-label="Droite" style={padBtn} onClick={() => touchMove(1, 0)}>▶</button>
          </div>
          <button aria-label="Bas" style={padBtn} onClick={() => touchMove(0, 1)}>▼</button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {state.forge.grimoire.map((slot, i) => (
            <button
              key={i}
              onClick={() => onExecGrimoire(i)}
              className="rounded border border-violet-300 px-3 py-2"
              style={{ minHeight: '44px' }}
            >
              Grimoire : {slot.name}
            </button>
          ))}
        </div>
        <p className="text-sm opacity-60">
          Flèches / ZQSD / WASD pour se déplacer, E pour interagir (coffre / sortie). Position : (
          {state.run.playerPos.x}, {state.run.playerPos.y})
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
