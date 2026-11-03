'use client';

import { MONSTER_BY_ID } from '../../data/monsters';

// Écran de combat placeholder (R1-02) — le menu complet arrive en R1-03.
export default function CombatScreen({
  enemies,
  onFlee,
}: {
  enemies: string[];
  onFlee: () => void;
}) {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: '#140a12', color: '#f8e8ec' }}
    >
      <h2 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)' }}>
        RENCONTRE
      </h2>
      <ul className="flex flex-col gap-2">
        {enemies.map((id, i) => {
          const m = MONSTER_BY_ID[id];
          return (
            <li
              key={`${id}-${i}`}
              className="rounded border border-red-400/60 bg-red-950/40 px-4 py-2"
              style={{ minHeight: '44px' }}
            >
              {m?.name ?? id} — PV {m?.hp ?? '?'} / ATK {m?.attack ?? '?'}
            </li>
          );
        })}
      </ul>
      <button
        onClick={onFlee}
        className="rounded-lg border border-slate-300 px-6 py-3 font-semibold"
        style={{ minHeight: '44px', fontSize: '1.05rem' }}
      >
        Fuir
      </button>
    </main>
  );
}
