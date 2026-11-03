'use client';

import type { GameState } from '../../core/types';
import { MERCHANT_ITEMS } from '../../data/equipment';
import { EQUIPMENT_BY_ID } from '../../data/equipment';

export default function ForgeScreen({
  state,
  onBuy,
  onDescend,
}: {
  state: GameState;
  onBuy: (defId: string) => void;
  onDescend: () => void;
}) {
  const f = state.forge;
  return (
    <main
      className="flex min-h-screen flex-col items-center gap-6 px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #2a1a10 0%, #0a0e1a 70%)', color: '#f8ecdd' }}
    >
      <h1 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.6rem)' }}>
        LA FORGE
      </h1>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <span className="rounded border border-amber-300/60 px-3 py-2" style={{ minHeight: '44px' }}>
          Crédits : {f.credits}
        </span>
        <span className="rounded border border-sky-300/60 px-3 py-2" style={{ minHeight: '44px' }}>
          Essence : {f.essence}
        </span>
        <span className="rounded border border-stone-300/60 px-3 py-2" style={{ minHeight: '44px' }}>
          Minerai brut : {f.mineraiBrut}
        </span>
      </div>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Équipement porté ({f.equipment.length})</h2>
        {f.equipment.length === 0 ? (
          <p className="opacity-60">Aucun équipement — la préparation se fait chez le Marchand.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {f.equipment.map((e) => (
              <li key={e.id} className="rounded border border-slate-500 px-3 py-2" style={{ minHeight: '44px' }}>
                {EQUIPMENT_BY_ID[e.defId]?.name ?? e.defId}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Le Marchand</h2>
        <div className="flex flex-col gap-2">
          {MERCHANT_ITEMS.map((item) => (
            <button
              key={item.id}
              disabled={f.credits < item.cost}
              onClick={() => onBuy(item.id)}
              className="rounded border border-amber-400/70 bg-amber-900/40 px-4 py-2 text-left disabled:opacity-40"
              style={{ minHeight: '44px' }}
            >
              {item.name} — {item.cost} crédits
              {item.attackBonus > 0 && ` · +${item.attackBonus} ATK`}
              {item.hpBonus > 0 && ` · +${item.hpBonus} PV`}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={onDescend}
        className="rounded-lg border border-blue-400 bg-blue-600/80 px-6 py-3 font-semibold hover:bg-blue-500"
        style={{ minHeight: '44px', fontSize: '1.05rem' }}
      >
        Redescendre
      </button>
    </main>
  );
}
