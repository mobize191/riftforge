'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, Position } from '../core/types';
import type { LevelMap } from '../core/run/generate';
import { initialState, reduce } from '../core/run/state';
import { serialize, deserialize, importSave, SAVE_KEY } from '../core/save/save';
import { loadFromPort, saveToPort } from '../core/save/storage';
import { createLocalStoragePort } from './storage';
import TitleScreen from './screens/TitleScreen';
import GameCanvas, { type GameCanvasApi } from './GameCanvas';
import CombatScreen from './screens/CombatScreen';
import ForgeScreen from './screens/ForgeScreen';
import { MONSTERS } from '../data/monsters';
import { BIOME_ORDER, BIOME_BY_ID, BIOME_PALETTES } from '../data/biomes';
import { RECIPES, RECIPE_BY_ID } from '../data/recipes';
import { craftableRecipes } from '../core/combat/createModule';
import { achievableFusions } from '../core/combat/fuseModules';
import { ELEMENTS } from '../data/elements';
import { startCombat, combatReduce, type CombatState, type CombatAction } from '../core/combat/combat';
import { COMPANION_BY_MONSTER, type CompanionDef } from '../data/companions';

// R11-02 (E2) — fin du null silencieux : si un compagnon d'équipe n'a pas de def,
// le core REFUSE le départ en run avec un message FR explicite (forge.notice affiché
// à la Forge) ; ce lookup ne peut donc plus renvoyer null sans message en pratique.
function teamCompanionDef(monsterId: string | undefined): CompanionDef | null {
  if (!monsterId) return null;
  const def: CompanionDef | undefined = COMPANION_BY_MONSTER[monsterId];
  return def ?? null;
}
import { playSound } from './audio';

type View = 'title' | 'game' | 'forge';

export default function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('title');
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [showModules, setShowModules] = useState(false);
  const [fuseSel, setFuseSel] = useState<number[]>([]); // B32 — fusion d'orbes hors combat
  const [showModuleFuse, setShowModuleFuse] = useState(false); // R11-01 (E1) — panneau fusion module+module
  const [fuseModSel, setFuseModSel] = useState<string[]>([]); // modules sources sélectionnés (2)
  const levelRef = useRef<LevelMap | null>(null);
  const canvasApiRef = useRef<GameCanvasApi>(null);
  // R6-09 : la famille de monstres et la palette suivent le biome courant de la run.
  const runBiome = state?.run ? BIOME_ORDER[Math.min(state.run.biomeIndex, BIOME_ORDER.length - 1)] : BIOME_ORDER[0];
  const familyIds = useMemo(
    () => MONSTERS.filter((m) => m.family === (BIOME_BY_ID[runBiome]?.family ?? 'spore')).map((m) => m.id),
    [runBiome],
  );
  const palette = BIOME_BY_ID[runBiome]?.palette ?? BIOME_PALETTES['failles-vertes'];

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

  // R9-05 : export/import de la save (JSON versionné) depuis l'écran titre.
  const [importError, setImportError] = useState<string | null>(null);
  const onExportSave = useCallback(() => {
    if (!state) return;
    const blob = new Blob([serialize(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riftforge-save.json';
    a.click();
    URL.revokeObjectURL(url);
    playSound('ui-buy');
  }, [state]);
  const onImportSave = useCallback((file: File) => {
    void file.text().then((text) => {
      try {
        const next = importSave(text); // validation + migration + refus propre des versions inconnues
        setImportError(null);
        persist(next);
        playSound('ui-buy');
      } catch {
        setImportError('Fichier de sauvegarde invalide ou version inconnue — import refusé.');
      }
    });
  }, [persist]);

  const onMove = useCallback((pos: Position) => {
    playSound('step'); // R9-02
    setState((prev) => (prev ? reduce(prev, { type: 'MOVE_PLAYER', to: pos }) : prev));
  }, []);

  // Filet de sécurité : toute entrée en combat (contact carte, autel, sortie du boss via E)
  // crée l'état de combat côté UI, sinon on retomberait sur l'écran titre.
  useEffect(() => {
    if (state?.mode === 'COMBAT' && state.run?.encounter && !combat) {
      setCombat(
        startCombat(
          (state.run.seed ^ (state.run.floor * 7919)) >>> 0,
          state.run.playerHp,
          state.run.playerMaxHp,
          state.run.playerAttack,
          state.run.encounter,
          state.run.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
          teamCompanionDef(state.forge.team[0]),
          state.run.companionSkills,
          state.run.companionKo,
          state.run.modules.map((m) => m.id),
          state.run.challengeId ?? undefined,
          state.run.activeModifiers,
        ),
      );
    }
  }, [state, combat]);

  const onEncounter = useCallback((enemies: string[]) => {
    playSound(enemies.some((e) => e.startsWith('boss:')) ? 'boss' : 'attack'); // R9-02
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
          teamCompanionDef(prev.forge.team[0]),
          prev.run.companionSkills,
          prev.run.companionKo,
          prev.run.modules.map((m) => m.id),
          prev.run.challengeId ?? undefined,
          prev.run.activeModifiers,
        ),
      );
      return reduce(prev, { type: 'ENTER_COMBAT', enemies, fromMap: true });
    });
  }, []);

  const onCombatAction = useCallback((a: CombatAction) => {
    // R9-02 : sons de combat selon l'action (attaque, module par élément, soin, etc.)
    if (a.type === 'ATTACK') playSound('attack');
    else if (a.type === 'CAST_MODULE') {
      const el = a.moduleId.startsWith('trait') ? 'hit-feu' : a.moduleId.startsWith('jet') ? 'hit-eau' : a.moduleId.includes('gravats') || a.moduleId.includes('plaque') ? 'shield' : a.moduleId.includes('seve') || a.moduleId.includes('condensation') ? 'heal' : 'hit-terre';
      playSound(el);
    } else if (a.type === 'USE_ITEM') playSound(a.itemId.includes('gelule') ? 'heal' : 'attack');
    else if (a.type === 'USE_COMPANION_SKILL') playSound('heal');
    else playSound('ui-click');
    setCombat((prev) => (prev ? combatReduce(prev, a) : prev));
  }, []);

  const combatHpRef = useRef(0);
  const onCombatEnd = useCallback(
    (result: 'won' | 'lost' | 'fled' | 'challenge-failed', loot: CombatState['loot'], ko = false) => {
      playSound(result === 'won' ? 'victory' : result === 'lost' ? 'defeat' : 'ui-click'); // R9-02
      if (combat) combatHpRef.current = combat.player.hp;
      setCombat(null);
      setState((prev) => {
        if (!prev) return prev;
        if (result === 'won')
          return reduce(prev, { type: 'EXIT_COMBAT', victory: true, loot: loot ?? undefined, companionKo: ko, playerHp: combatHpRef.current });
        if (result === 'fled' || result === 'challenge-failed')
          return reduce(prev, { type: 'EXIT_COMBAT', victory: false, companionKo: ko, playerHp: combatHpRef.current });
        return reduce(prev, { type: 'DIE' });
      });
    },
    [combat],
  );

  const onInteract = useCallback(() => {
    setState((prev) => (prev ? reduce(prev, { type: 'INTERACT' }) : prev));
  }, []);

  const onQuit = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      // Depuis une run en cours : abandon = fin de run (butin conservé, §SPEC-3), puis retour Forge.
      let next = prev;
      if (prev.mode === 'RUN' || prev.mode === 'COMBAT') next = reduce(next, { type: 'DIE' });
      next = reduce(next, { type: 'RETURN_FORGE' });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
    setView('forge');
  }, []);

  const onBuy = useCallback((defId: string) => {
    playSound('ui-buy'); // R9-02
    setState((prev) => {
      if (!prev) return prev;
      const next = reduce(prev, { type: 'BUY_ITEM', defId });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
  }, []);

  const onCraft = useCallback((defId: string) => {
    playSound('forge'); // R9-02
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
    setState((prev) => {
      if (!prev) return prev;
      if (monsterId === null) {
        // retirer ce compagnon précis : on lit l'état courant
        const current = prev.forge.workers[buildingId] ?? [];
        const last = current[current.length - 1];
        if (!last) return prev;
        const workers = Object.fromEntries(
          Object.entries(prev.forge.workers).map(([b, list]) => [b, list.filter((w) => w !== last)]),
        );
        if (!workers[buildingId]?.length) delete workers[buildingId];
        return { ...prev, forge: { ...prev.forge, workers } };
      }
      return reduce(prev, { type: 'ASSIGN_WORKER', buildingId, monsterId });
    });
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

  // B29/R6-07/R8 — Maison, Liaiseuse, placement des bâtiments (écran Forge)
  const onEquip = useCallback((instanceId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'EQUIP_ITEM', instanceId }) : prev));
    playSound('ui-click');
  }, []);
  const onUnequip = useCallback((instanceId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'UNEQUIP_ITEM', instanceId }) : prev));
    playSound('ui-click');
  }, []);
  const onRest = useCallback(() => {
    setState((prev) => (prev ? reduce(prev, { type: 'REST_AT_HOME' }) : prev));
    playSound('heal');
  }, []);
  const onGift = useCallback((monsterId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'GIFT_COMPANION', monsterId }) : prev));
    playSound('ui-buy');
  }, []);
  const onEvolve = useCallback((monsterId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'EVOLVE_COMPANION', monsterId }) : prev));
    playSound('victory');
  }, []);
  const onLiaisonQuest = useCallback((questId: string) => {
    setState((prev) => (prev ? reduce(prev, { type: 'COMPLETE_LIAISON_QUEST', questId }) : prev));
    playSound('ui-buy');
  }, []);
  const onPlaceBuilding = useCallback((buildingId: string, x: number, y: number) => {
    setState((prev) => (prev ? reduce(prev, { type: 'PLACE_BUILDING', buildingId, x, y }) : prev));
    playSound('forge');
  }, []);

  const onDescend = useCallback(() => {
    const seed = Date.now() % 2147483647;
    setState((prev) => {
      const next = reduce(prev ?? initialState(), { type: 'START_RUN', seed });
      saveToPort(createLocalStoragePort(), SAVE_KEY, serialize(next));
      return next;
    });
    // R11-02 (E2) : si le départ est refusé (ex. compagnon sans def), on reste à la
    // Forge et le message FR explicite (forge.notice) est affiché — jamais de null silencieux.
    setState((prev) => {
      if (prev && prev.mode === 'RUN') setView('game');
      return prev;
    });
  }, []);

  if (view === 'game' && state?.mode === 'COMBAT' && combat) {
    return (
      <CombatScreen
        combat={combat}
        discovered={state.forge.discoveredRecipes}
        onAction={onCombatAction}
        onEnd={onCombatEnd}
        companionBondTier={state.forge.team[0] ? (state.forge.bondTier[state.forge.team[0]] ?? 1) : 1}
        companionEvolved={state.forge.team[0] ? (state.forge.evolved[state.forge.team[0]] ?? false) : false}
      />
    );
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
        onEquip={onEquip}
        onUnequip={onUnequip}
        onRest={onRest}
        onGift={onGift}
        onEvolve={onEvolve}
        onLiaisonQuest={onLiaisonQuest}
        onPlaceBuilding={onPlaceBuilding}
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
            RIFTFORGE — Sol {state.run.floor} · Niv {state.run.playerLevel} · PV {run.playerHp}/{run.playerMaxHp} ·{' '}
            Butin : {run.lootCredits} crédits · {run.lootEssence} essence · {run.lootMinerai} minerai ·{' '}
            {run.lootSpores} spores
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
          palette={palette}
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
        {run.lastEvent && (
          <p className="rounded bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200" style={{ minHeight: '44px' }}>
            {run.lastEvent}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="opacity-70">Orbes :</span>
          {run.orbs.length === 0 && <span className="opacity-50">aucune</span>}
          {run.orbs.map((o, i) => (
            <button
              key={o.id}
              onClick={() =>
                setFuseSel((sel) =>
                  sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < 2 ? [...sel, i] : [sel[1], i],
                )
              }
              aria-pressed={fuseSel.includes(i)}
              title={o.kind === 'composite' ? 'Orbe composite (non re-fusionnable)' : `Orbe ${o.element} — sélectionner pour fusionner`}
              className={`inline-block h-6 w-6 rounded-full border ${fuseSel.includes(i) ? 'border-amber-300 ring-2 ring-amber-300' : 'border-white/40'}`}
              style={{
                background:
                  o.kind === 'composite'
                    ? 'linear-gradient(135deg,#ff5533,#3399ff,#aa7744,#dddddd)'
                    : { feu: '#ff5533', eau: '#3399ff', terre: '#aa7744', air: '#dddddd' }[o.element ?? 'air'],
              }}
            />
          ))}
          {/* B32 : fusion hors combat, gratuite et illimitée (§SPEC-5.2) */}
          {run.orbs.filter((o) => o.kind === 'primordial').length >= 2 && (
            <button
              className="rounded border border-fuchsia-300/70 px-3 py-1 disabled:opacity-40"
              style={{ minHeight: '44px' }}
              disabled={fuseSel.length !== 2}
              onClick={() => {
                persist(reduce(state!, { type: 'FUSE_ORBS', indices: fuseSel }));
                setFuseSel([]);
                playSound('ui-click');
              }}
            >
              ✦ Fusionner 2 orbes (gratuit, hors combat)
            </button>
          )}
          {run.companions.length > 0 && (
            <span className="ml-2 rounded border border-violet-300/60 px-2 py-1">
              Capturés : {run.companions.join(', ')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setShowModules((v) => !v)}
            className="rounded border border-orange-300 px-3 py-2"
            style={{ minHeight: '44px' }}
          >
            Modules ({run.modules.length} créés{showModules ? ' ▲' : ' ▼'})
          </button>
          <button
            onClick={() => setShowModuleFuse((v) => !v)}
            className="rounded border border-fuchsia-300 px-3 py-2"
            style={{ minHeight: '44px' }}
          >
            ⚗ Fusion de modules{showModuleFuse ? ' ▲' : ' ▼'}
          </button>
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
        {showModuleFuse && (
          <div className="flex w-full max-w-xl flex-col gap-2 px-4">
            <p className="text-sm font-semibold">⚗ Fusion module + module — mode « Modules » (gratuit, hors combat)</p>
            <p className="text-sm opacity-80">
              Sélectionnez 2 modules à fusionner — la fusion consomme les modules sources.
            </p>
            <div className="flex flex-wrap gap-1">
              {run.modules.length === 0 && <span className="text-sm opacity-60">Aucun module créé pour l&apos;instant.</span>}
              {run.modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    setFuseModSel((sel) =>
                      sel.includes(m.id) ? sel.filter((x) => x !== m.id) : sel.length < 2 ? [...sel, m.id] : [sel[1], m.id],
                    )
                  }
                  aria-pressed={fuseModSel.includes(m.id)}
                  className={`rounded border px-2 py-1 ${fuseModSel.includes(m.id) ? 'border-fuchsia-300 bg-fuchsia-900/60 ring-2 ring-fuchsia-300' : 'border-slate-500'}`}
                  style={{ minHeight: '44px' }}
                >
                  {m.name} (palier {m.tier})
                </button>
              ))}
            </div>
            {(() => {
              const selOrbs = run.orbs;
              const preview = achievableFusions(fuseModSel, selOrbs).filter((f) =>
                f.inputs.every((id) => fuseModSel.includes(id)) &&
                f.inputs.length === fuseModSel.length,
              );
              if (fuseModSel.length === 2 && preview.length === 0) {
                return <p className="text-sm opacity-60">Ces 2 modules ne produisent aucune fusion connue.</p>;
              }
              return preview.map((f) => {
                const res = RECIPE_BY_ID[f.resultId];
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      persist(reduce(state!, { type: 'FUSE_MODULES', fusionId: f.id }));
                      setFuseModSel([]);
                      playSound('forge');
                    }}
                    className="rounded border border-fuchsia-300/80 px-4 py-2 text-left"
                    style={{ minHeight: '44px' }}
                  >
                    ⚗ Fusionner → {res?.name ?? f.resultId} (palier {f.tier})
                    {f.orbs.length > 0 && ` — consomme aussi ${f.orbs.length} orbe(s)`}
                  </button>
                );
              });
            })()}
          </div>
        )}
        {showModules && (
          <div className="flex w-full max-w-xl flex-col gap-2 px-4">
            <p className="text-sm opacity-80">
              Orbes : {run.orbs.map((o) => o.element ?? 'composite').join(', ') || 'aucune'}
            </p>
            {craftableRecipes(
              run.orbs,
              RECIPES.map((r) => r.id),
            )
              .filter((r) => !run.modules.some((m) => m.id === r.id))
              .map((r) => (
              <button
                key={r.id}
                onClick={() =>
                  setState((prev) => (prev ? reduce(prev, { type: 'CREATE_MODULE', recipeId: r.id }) : prev))
                }
                className="rounded border border-orange-300/80 px-4 py-2 text-left"
                style={{ minHeight: '44px' }}
              >
                ✚ {r.name} (palier {r.tier}) — {r.inputs.map((e) => ELEMENTS[e].name).join(' + ')}
                {state.forge.discoveredRecipes.includes(r.id) ? ' · déjà découverte' : ' · nouvelle découverte !'}
              </button>
            ))}
            {craftableRecipes(run.orbs, RECIPES.map((r) => r.id)).filter(
              (r) => !run.modules.some((m) => m.id === r.id),
            ).length === 0 && (
              <p className="text-sm opacity-60">Aucune recette réalisable avec les orbes actuelles.</p>
            )}
            <p className="mt-2 text-sm font-semibold">Fusions réalisables avec vos modules et orbes actuels :</p>
            {(() => {
              const fusions = achievableFusions(run.modules.map((m) => m.id), run.orbs);
              if (fusions.length === 0) {
                return <p className="text-sm opacity-60">Aucune fusion réalisable — créez ou conservez des modules sources.</p>;
              }
              return fusions.map((f) => {
                const res = RECIPE_BY_ID[f.resultId];
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      persist(reduce(state!, { type: 'FUSE_MODULES', fusionId: f.id }));
                      setFuseModSel([]);
                      playSound('forge');
                    }}
                    className="rounded border border-fuchsia-300/80 px-4 py-2 text-left"
                    style={{ minHeight: '44px' }}
                  >
                    ⚗ {res?.name ?? f.resultId} (palier {f.tier}) — fusionne{' '}
                    {f.inputs.map((id) => RECIPE_BY_ID[id]?.name ?? id).join(' + ')}
                    {f.orbs.length > 0 && ` + ${f.orbs.length} orbe(s)`}
                  </button>
                );
              });
            })()}
          </div>
        )}
        <p className="text-sm opacity-60">
          Flèches / ZQSD / WASD ou pavé tactile pour se déplacer, E pour interagir (coffre / sortie / autel).
          Position : ({run.playerPos.x}, {run.playerPos.y})
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
      onExportSave={state ? onExportSave : undefined}
      onImportSave={onImportSave}
      importError={importError}
    />
  );
}
