'use client';

import { useState } from 'react';
import { availableSoloModules, type CombatState, type CombatAction } from '../../core/combat/combat';
import { ELEMENTS } from '../../data/elements';

export default function CombatScreen({
  combat,
  onAction,
  onEnd,
}: {
  combat: CombatState;
  onAction: (a: CombatAction) => void;
  onEnd: (result: 'won' | 'lost' | 'fled', loot: CombatState['loot']) => void;
}) {
  const [menu, setMenu] = useState<'root' | 'items' | 'attack'>('root');
  const [target, setTarget] = useState(0);
  const soloModules = availableSoloModules(combat.orbs);

  const phase = combat.phase;
  if (phase === 'won' || phase === 'lost' || phase === 'fled') {
    return (
      <main
        className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
        style={{ background: '#140a12', color: '#f8e8ec' }}
      >
        <h2 className="font-bold" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' }}>
          {phase === 'won' ? 'VICTOIRE' : phase === 'fled' ? 'FUITE' : 'RUN TERMINÉE'}
        </h2>
        <button
          onClick={() => onEnd(phase, combat.loot)}
          className="rounded-lg border border-emerald-300 bg-emerald-700 px-6 py-3 font-semibold"
          style={{ minHeight: '44px', fontSize: '1.05rem' }}
        >
          Continuer
        </button>
      </main>
    );
  }

  const alive = combat.enemies.map((e, i) => ({ ...e, index: i })).filter((e) => e.hp > 0);

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-4 px-4 py-6"
      style={{ background: '#140a12', color: '#f8e8ec' }}
    >
      <h2 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}>
        COMBAT — Tour {combat.turn}
      </h2>
      <div className="w-full max-w-xl rounded-lg border border-slate-500 p-3">
        <strong>{combat.player.name}</strong> — PV {combat.player.hp}/{combat.player.maxHp}
      </div>
      <ul className="flex w-full max-w-xl flex-col gap-2">
        {combat.enemies.map((e, i) => (
          <li
            key={e.id}
            className={`rounded border px-4 py-2 ${e.hp <= 0 ? 'border-slate-600 opacity-40 line-through' : 'border-red-400/60 bg-red-950/40'}`}
            style={{ minHeight: '44px' }}
          >
            {e.name} — PV {e.hp}/{e.maxHp} · ATK {e.attack}
            {menu === 'attack' && e.hp > 0 && (
              <button
                onClick={() => {
                  onAction({ type: 'ATTACK', target: i });
                  setMenu('root');
                }}
                className="ml-3 rounded bg-red-700 px-3 py-1"
                style={{ minHeight: '44px' }}
              >
                Cibler
              </button>
            )}
          </li>
        ))}
      </ul>

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

      {menu === 'attack' && soloModules.length > 0 && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          {soloModules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onAction({ type: 'CAST_MODULE', moduleId: m.id, target });
                setMenu('root');
              }}
              className="rounded border px-4 py-2 text-left"
              style={{ minHeight: '44px', borderColor: ELEMENTS[m.inputs[0]].color }}
            >
              {m.name} ({ELEMENTS[m.inputs[0]].name}) — gratuit
            </button>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-xl flex-wrap gap-2">
        <button
          onClick={() => setMenu(menu === 'attack' ? 'root' : 'attack')}
          className="rounded bg-red-700 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Attaque & Modules
        </button>
        <button
          onClick={() => setMenu(menu === 'items' ? 'root' : 'items')}
          className="rounded bg-sky-700 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Objets
        </button>
        <button
          onClick={() => onAction({ type: 'CAPTURE', target })}
          className="rounded bg-violet-700 px-4 py-3 font-semibold"
          style={{ minHeight: '44px', flex: 1, minWidth: '120px' }}
        >
          Capturer
        </button>
        <button
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
