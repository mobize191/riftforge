'use client';

import { useState } from 'react';
import { availableSoloModules, currentActorId, type CombatState, type CombatAction } from '../../core/combat/combat';
import { craftableRecipes } from '../../core/combat/createModule';
import { ELEMENTS } from '../../data/elements';
import { RECIPES } from '../../data/recipes';
import type { Orb } from '../../core/types';

export default function CombatScreen({
  combat,
  discovered,
  onAction,
  onEnd,
}: {
  combat: CombatState;
  discovered: string[];
  onAction: (a: CombatAction) => void;
  onEnd: (result: 'won' | 'lost' | 'fled' | 'challenge-failed', loot: CombatState['loot'], ko?: boolean) => void;
}) {
  const [menu, setMenu] = useState<'root' | 'items' | 'attack' | 'companions'>('root');
  const [target, setTarget] = useState(0);
  const [fuseSel, setFuseSel] = useState<number[]>([]);
  const actorId = currentActorId(combat);
  const isCompTurn = actorId === 'companion';
  const soloModules = availableSoloModules(combat.orbs);
  const orbObjs: Orb[] = combat.orbs.map((el, i) => ({ id: `c${i}`, kind: 'primordial', element: el, tier: 1 }));
  const craftable = craftableRecipes(orbObjs, discovered).filter((r) => !combat.modules.includes(r.id));
  const createdModules = combat.modules
    .map((id) => RECIPES.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r);

  const phase = combat.phase;
  if (phase === 'won' || phase === 'lost' || phase === 'fled' || phase === 'challenge-failed') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: '#140a12', color: '#f8e8ec' }}
      >
        <h2 className="font-bold" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' }}>
          {phase === 'won' ? 'VICTOIRE' : phase === 'fled' ? 'FUITE' : phase === 'challenge-failed' ? 'DÉFI ÉCHOUÉ (pas de récompense)' : 'RUN TERMINÉE'}
        </h2>
        <button
          onClick={() => onEnd(phase, combat.loot, combat.companion?.ko)}
          className="rounded-lg border border-emerald-300 bg-emerald-700 px-6 py-3 font-semibold"
          style={{ minHeight: '44px', fontSize: '1.05rem' }}
        >
          Continuer
        </button>
      </main>
    );
  }

  const alive = combat.enemies.map((e, i) => ({ ...e, index: i })).filter((e) => e.hp > 0);
  // Cible sélectionnée (clic sur l'ennemi) ; retombe sur la première cible vivante si elle meurt.
  const aliveTarget = combat.enemies[target]?.hp > 0 ? target : combat.enemies.findIndex((e) => e.hp > 0);

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-4 px-4 py-6"
      style={{ background: '#140a12', color: '#f8e8ec' }}
    >
      <h2 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}>
        COMBAT — Round {combat.turn} · Au tour de : {isCompTurn ? `🤝 ${combat.companion?.name ?? 'compagnon'}` : '🧙 vous'}
        {combat.challenge && ` · Défi « ${combat.challenge.def.name} » : ${combat.challenge.turnsLeft} tours restants`}
      </h2>
      <div className="w-full max-w-xl rounded-lg border border-slate-500 p-3">
        <strong>{combat.player.name}</strong> — PV {combat.player.hp}/{combat.player.maxHp}
      </div>
      {combat.companion && (
        <div className={`w-full max-w-xl rounded-lg border p-3 ${combat.companion.ko ? 'border-slate-600 opacity-50' : 'border-emerald-400/60'}`}>
          <strong>Compagnon : {combat.companion.name}</strong> — PV {combat.companion.hp}/{combat.companion.maxHp}
          {combat.companion.ko && ' — K.O. (hors combat jusqu’à la Forge)'}
          <ul className="mt-1 text-sm opacity-80">
            {Object.entries(combat.companion.skills)
              .filter(([, lvl]) => lvl > 0)
              .map(([skill, lvl]) => (
                <li key={skill}>
                  {skill} niv {lvl}
                </li>
              ))}
          </ul>
        </div>
      )}
      <ul className="flex w-full max-w-xl flex-col gap-2">
        {combat.enemies.map((e, i) => (
          <li
            key={e.id}
            className={`rounded border px-4 py-2 ${e.hp <= 0 ? 'border-slate-600 opacity-40 line-through' : i === aliveTarget ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-300' : 'border-red-400/60 bg-red-950/40'}`}
            style={{ minHeight: '44px' }}
          >
            {e.name} — PV {e.hp}/{e.maxHp} · ATK {e.attack}
            {e.hp > 0 && (
              <button
                onClick={() => setTarget(i)}
                className={`ml-3 rounded px-3 py-1 ${i === aliveTarget ? 'bg-amber-500 text-black font-bold' : 'bg-slate-600'}`}
                style={{ minHeight: '44px' }}
              >
                {i === aliveTarget ? '◉ Sélectionné' : 'Sélectionner'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {menu === 'companions' && combat.companion && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          <p className="text-sm opacity-80">
            {combat.companion.name} — PV {combat.companion.hp}/{combat.companion.maxHp}
            {combat.companion.ko ? ' — K.O.' : ''}
          </p>
          {Object.entries(combat.companion.skills)
            .filter(([, lvl]) => lvl > 0)
            .map(([skillId, lvl]) => (
              <button
                key={skillId}
                disabled={combat.companion!.ko}
                onClick={() => {
                  onAction({ type: 'USE_COMPANION_SKILL', skillId });
                  setMenu('root');
                }}
                className="rounded border border-emerald-300 px-4 py-2 text-left disabled:opacity-40"
                style={{ minHeight: '44px' }}
              >
                {skillId} niv {lvl} — gratuit
              </button>
            ))}
        </div>
      )}

      {menu === 'items' && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          {combat.items.map((it) => (
            <button
              key={it.def.id}
              disabled={it.usesLeft <= 0}
              onClick={() => {
                onAction({ type: 'USE_ITEM', itemId: it.def.id, target });
                setMenu('root');
              }}
              className="rounded border border-sky-300 px-4 py-2 text-left disabled:opacity-40"
              style={{ minHeight: '44px' }}
            >
              {it.def.name} ({it.def.kind === 'heal' ? `+${it.def.power} PV` : `-${it.def.power} PV ennemi`}) — x{it.usesLeft}
            </button>
          ))}
        </div>
      )}

      {menu === 'attack' && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          {soloModules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onAction({ type: 'CAST_MODULE', moduleId: m.id, target: aliveTarget >= 0 ? aliveTarget : target });
                setMenu('root');
              }}
              className="rounded border px-4 py-2 text-left"
              style={{ minHeight: '44px', borderColor: ELEMENTS[m.inputs[0]].color }}
            >
              {m.name} ({ELEMENTS[m.inputs[0]].name}) — gratuit
            </button>
          ))}
          {createdModules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onAction({ type: 'CAST_MODULE', moduleId: m.id, target: aliveTarget >= 0 ? aliveTarget : target });
                setMenu('root');
              }}
              className="rounded border border-red-300 px-4 py-2 text-left"
              style={{ minHeight: '44px' }}
            >
              ▶ {m.name} (créé, lancement gratuit)
            </button>
          ))}
          {combat.orbs.length >= 2 && (
            <div className="rounded border border-fuchsia-300/70 p-2">
              <p className="mb-1 text-sm opacity-80">Fusionner 2 orbes (coûte le tour) :</p>
              <div className="mb-2 flex flex-wrap gap-1">
                {combat.orbs.map((el, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setFuseSel((sel) =>
                        sel.includes(i) ? sel.filter((x) => x !== i) : sel.length < 2 ? [...sel, i] : [sel[1], i],
                      )
                    }
                    className={`rounded border px-2 py-1 ${fuseSel.includes(i) ? 'border-fuchsia-300 bg-fuchsia-900/60' : 'border-slate-500'}`}
                    style={{ minHeight: '44px', minWidth: '44px', background: ELEMENTS[el]?.color }}
                  >
                    {el}
                  </button>
                ))}
              </div>
              <button
                disabled={fuseSel.length !== 2}
                onClick={() => {
                  onAction({ type: 'FUSE_IN_COMBAT', indices: fuseSel });
                  setFuseSel([]);
                  setMenu('root');
                }}
                className="rounded border border-fuchsia-300 px-3 py-2 disabled:opacity-40"
                style={{ minHeight: '44px' }}
              >
                ✦ Fusionner ({fuseSel.length}/2 sélectionnées)
              </button>
            </div>
          )}
          {craftable.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onAction({ type: 'CRAFT_MODULE', recipeId: r.id });
                setMenu('root');
              }}
              className="rounded border border-amber-300/80 px-4 py-2 text-left"
              style={{ minHeight: '44px' }}
            >
              ✚ Créer {r.name} (palier {r.tier}) — consomme {r.inputs.map((e) => ELEMENTS[e].name).join(' + ')}
            </button>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-xl flex-wrap gap-2">
        <button
          onClick={() => onAction({ type: 'ATTACK', target: aliveTarget >= 0 ? aliveTarget : 0 })}
          className="rounded bg-red-700 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          {isCompTurn ? `Attaquer (${combat.companion?.name})` : 'Attaquer (cible sélectionnée)'}
        </button>
        <button
          onClick={() => setMenu(menu === 'attack' ? 'root' : 'attack')}
          disabled={isCompTurn}
          className="rounded bg-orange-700 px-4 py-3 font-semibold disabled:opacity-40"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Modules ({soloModules.length + createdModules.length + craftable.length})
        </button>
        <button
          onClick={() => setMenu(menu === 'items' ? 'root' : 'items')}
          disabled={isCompTurn}
          className="rounded bg-sky-700 px-4 py-3 font-semibold disabled:opacity-40"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Objets
        </button>
        <button
          onClick={() => setMenu(menu === 'companions' ? 'root' : 'companions')}
          className={`rounded px-4 py-3 font-semibold ${isCompTurn ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-emerald-700'} disabled:opacity-40`}
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Compagnons{isCompTurn ? ' (son tour !)' : ''}
        </button>
        <button
          disabled={isCompTurn}
          onClick={() => onAction({ type: 'CAPTURE', target: aliveTarget >= 0 ? aliveTarget : target })}
          className="rounded bg-violet-700 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Capturer
        </button>
        <button
          disabled={isCompTurn}
          onClick={() => onAction({ type: 'FLEE' })}
          className="rounded bg-slate-600 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Fuir ({alive.length} ennemi(s))
        </button>
      </div>

      <div className="w-full max-w-xl rounded bg-black/40 p-3 text-sm" style={{ maxHeight: '30vh', overflowY: 'auto' }}>
        {combat.log.slice(-6).map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </main>
  );
}
