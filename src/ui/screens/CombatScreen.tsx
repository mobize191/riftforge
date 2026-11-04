'use client';

import { useEffect, useRef, useState } from 'react';
import { availableSoloModules, actorLabel, type CombatState, type CombatAction, moduleEffectLabel, moduleEnergyCost } from '../../core/combat/combat';
import { BALANCE } from '../../data/balance';
import { craftableRecipes } from '../../core/combat/createModule';
import { ELEMENTS } from '../../data/elements';
import { RECIPES } from '../../data/recipes';
import { entityIdOf, isEliteId, portraitUrl, portraitFallbackUrl, bondTierTint, ELITE_TINT } from '../portraits';
import { COMPANION_BY_MONSTER } from '../../data/companions';
import type { Orb } from '../../core/types';

export default function CombatScreen({
  combat,
  discovered,
  onAction,
  onEnd,
  companionBondTier = 1,
}: {
  combat: CombatState;
  discovered: string[];
  onAction: (a: CombatAction) => void;
  onEnd: (result: 'won' | 'lost' | 'fled' | 'challenge-failed', loot: CombatState['loot'], ko?: boolean) => void;
  companionBondTier?: number; // R8-02 — teinte de lien par palier sur le portrait du compagnon
}) {
  const [menu, setMenu] = useState<'root' | 'items' | 'attack' | 'companions'>('root');
  // R9-03 juice : flash d'impact par élément + tremblement sur gros dégâts + fondu d'entrée
  const [fx, setFx] = useState<{ color: string; key: number } | null>(null);
  const [shake, setShake] = useState(0);
  const prevHpRef = useRef(combat.player.hp);
  useEffect(() => {
    if (combat.player.hp < prevHpRef.current) {
      const drop = prevHpRef.current - combat.player.hp;
      if (drop >= 4) setShake((n) => n + 1); // gros dégâts -> tremblement
      setFx({ color: '#ff3344', key: Date.now() });
    }
    prevHpRef.current = combat.player.hp;
  }, [combat.player.hp, combat.turn]);
  const flashEl = (color: string) => setFx({ color, key: Date.now() });
  const [target, setTarget] = useState(0);
  const [fuseSel, setFuseSel] = useState<number[]>([]);
  const actorId = combat.order[combat.actorIdx % combat.order.length];
  const isCompTurn = actorId === 'companion';
  void actorLabel(combat); // B27 : label conservé pour test (r9-08) — la bannière est rendue dans le h2
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
      className={`flex min-h-screen flex-col items-center gap-4 px-4 py-6 ${shake > 0 ? 'rf-shake' : ''} rf-fadein`}
      style={{ background: '#140a12', color: '#f8e8ec' }}
    >
      {/* R9-03 : flash d'impact plein écran (couleur de l'élément) */}
      {fx && <span key={fx.key} className="rf-flash" style={{ background: fx.color }} />}
      <style>{`@keyframes rfshake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-4px,2px)} 50%{transform:translate(4px,-2px)} 75%{transform:translate(-3px,-2px)} }
        .rf-shake { animation: rfshake 0.25s ease-out; }
        @keyframes rfflash { 0%{opacity:0.55} 100%{opacity:0} }
        .rf-flash { position: fixed; inset: 0; pointer-events: none; animation: rfflash 0.35s ease-out forwards; z-index: 40; }
        @keyframes rffadein { from{opacity:0} to{opacity:1} }
        .rf-fadein { animation: rffadein 0.25s ease-out; }`}</style>
      <h2 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)' }}>
        COMBAT — Round {combat.turn} · Au tour de : {isCompTurn ? `🤝 ${combat.companion?.name ?? 'compagnon'}` : '🧙 vous'}
        {combat.challenge && ` · Défi « ${combat.challenge.def.name} » : ${combat.challenge.turnsLeft} tours restants`}
      </h2>
      <div className="w-full max-w-xl rounded-lg border border-slate-500 p-3">
        <strong>{combat.player.name}</strong> — PV {combat.player.hp}/{combat.player.maxHp}
        <div className="mt-2" aria-label="Énergie de combat">
          <span className="text-sm opacity-80">
            Énergie : {combat.energy}/{BALANCE.COMBAT_ENERGY_MAX} (+{BALANCE.COMBAT_ENERGY_REGEN}/tour)
          </span>
          <div className="mt-1 flex gap-1" role="progressbar" aria-valuenow={combat.energy} aria-valuemin={0} aria-valuemax={BALANCE.COMBAT_ENERGY_MAX}>
            {Array.from({ length: BALANCE.COMBAT_ENERGY_MAX }, (_, i) => (
              <span
                key={i}
                className="h-3 flex-1 rounded-[3px] border"
                style={{
                  borderColor: 'rgba(148,163,184,0.5)',
                  background: i < combat.energy ? '#38bdf8' : 'transparent',
                  minWidth: '10px',
                }}
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>
      {combat.companion && (
        <div className={`flex w-full max-w-xl items-center gap-3 rounded-lg border p-3 ${combat.companion.ko ? 'border-slate-600 opacity-50' : 'border-emerald-400/60'}`}>
          {/* R9-07 : portrait du compagnon + teinte de lien par palier (R8-02) */}
          {(() => {
            const def = Object.values(COMPANION_BY_MONSTER).find((d) => d.id === combat.companion!.defId);
            const mid = def?.monsterId ?? 'mousse';
            const png = portraitUrl(mid);
            const fallback = portraitFallbackUrl(mid);
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={png || fallback}
                onError={(ev) => {
                  if (!ev.currentTarget.src.endsWith(fallback)) ev.currentTarget.src = fallback;
                }}
                alt={combat.companion.name}
                width={48}
                height={48}
                className="shrink-0 rounded"
                style={{ filter: bondTierTint(companionBondTier) || undefined }}
              />
            );
          })()}
          <div>
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
        </div>
      )}
      <ul className="flex w-full max-w-xl flex-col gap-2">
        {combat.enemies.map((e, i) => {
          // R9-07 : portrait IA (assets/portraits/*.png) avec fallback code-gen SVG (R6-09)
          // si le fichier est absent — jamais d'écran vide. Télégraphie = flash rouge
          // superposé sur le portrait (pas d'animation dédiée en V1). Élite = teinte.
          const baseId = entityIdOf(e.id);
          const telegraphing = e.id.startsWith('boss:') && combat.telegraph !== null;
          const png = portraitUrl(baseId);
          const fallback = portraitFallbackUrl(baseId, telegraphing);
          const elite = isEliteId(e.id);
          return (
          <li
            key={e.id}
            className={`flex items-center gap-3 rounded border px-4 py-2 ${e.hp <= 0 ? 'border-slate-600 opacity-40 line-through' : i === aliveTarget ? 'border-amber-400 bg-amber-950/60 ring-2 ring-amber-300' : 'border-red-400/60 bg-red-950/40'}`}
            style={{ minHeight: '44px' }}
          >
            <span className={`relative inline-block shrink-0 overflow-hidden rounded ${telegraphing ? 'animate-pulse' : ''}`} style={telegraphing ? { boxShadow: '0 0 12px 3px #ff2244' } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={png || fallback}
                onError={(ev) => {
                  if (ev.currentTarget.src !== fallback && !ev.currentTarget.src.endsWith(fallback)) {
                    ev.currentTarget.src = fallback;
                  }
                }}
                alt={e.name}
                width={48}
                height={48}
                className="rounded"
                style={{ filter: elite ? ELITE_TINT : telegraphing ? 'saturate(1.6) hue-rotate(-25deg)' : undefined }}
              />
              {telegraphing && <span className="absolute inset-0 bg-red-500/30" />}
            </span>
            <span>
            {e.name} — PV {e.hp}/{e.maxHp} · ATK {e.attack}
            {telegraphing && <span className="ml-2 text-red-400 font-semibold">prépare {combat.telegraph}…</span>}
            </span>
            {e.hp > 0 && (
              <button
                onClick={() => setTarget(i)}
                className={`ml-auto rounded px-3 py-1 ${i === aliveTarget ? 'bg-amber-500 text-black font-bold' : 'bg-slate-600'}`}
                style={{ minHeight: '44px' }}
              >
                {i === aliveTarget ? '◉ Sélectionné' : 'Sélectionner'}
              </button>
            )}
          </li>
          );
        })}
      </ul>

      {menu === 'companions' && combat.companion && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          <p className="text-sm opacity-80">
            {combat.companion.name} — PV {combat.companion.hp}/{combat.companion.maxHp}
            {combat.companion.ko ? ' — K.O.' : ''}
            {/* B26 : les compétences ne se déclenchent qu'au tour du compagnon (initiative FF) */}
            {!isCompTurn && !combat.companion.ko && (
              <span className="block text-amber-300">Compétences utilisables uniquement au tour du compagnon.</span>
            )}
          </p>
          {Object.entries(combat.companion.skills)
            .filter(([, lvl]) => lvl > 0)
            .map(([skillId, lvl]) => (
              <button
                key={skillId}
                disabled={combat.companion!.ko || !isCompTurn}
                onClick={() => {
                  onAction({ type: 'USE_COMPANION_SKILL', skillId });
                  setMenu('root');
                }}
                className="rounded border border-emerald-300 px-4 py-2 text-left disabled:opacity-40"
                style={{ minHeight: '44px' }}
              >
                {skillId} niv {lvl} — gratuit{!isCompTurn ? ' (tour du compagnon requis)' : ''}
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
                flashEl(ELEMENTS[m.inputs[0]].color); // R9-03 flash par élément
                onAction({ type: 'CAST_MODULE', moduleId: m.id, target: aliveTarget >= 0 ? aliveTarget : target });
                setMenu('root');
              }}
              className="rounded border px-4 py-2 text-left"
              style={{ minHeight: '44px', borderColor: ELEMENTS[m.inputs[0]].color }}
            >
              {m.name} ({ELEMENTS[m.inputs[0]].name}) — {moduleEffectLabel(m)} — {moduleEnergyCost(m)} énergie
            </button>
          ))}
          {createdModules.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                flashEl(ELEMENTS[m.inputs[0]]?.color ?? '#ff5533'); // R9-03 flash par élément
                onAction({ type: 'CAST_MODULE', moduleId: m.id, target: aliveTarget >= 0 ? aliveTarget : target });
                setMenu('root');
              }}
              className="rounded border border-red-300 px-4 py-2 text-left"
              style={{ minHeight: '44px' }}
            >
              ▶ {m.name} — {moduleEffectLabel(m)} (créé — {moduleEnergyCost(m)} énergie)
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
          {isCompTurn ? `Attaquer (${combat.companion?.name}) — gratuit` : `Attaquer (cible sélectionnée) — ${BALANCE.ENERGY_COST_ATTACK} énergie`}
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
        {combat.log.slice(-6).map((l, i) => {
          // R10-03 (D2) : « Faiblesse ! » accentué, « Résisté ! » atténué.
          const m = l.match(/^(.*?)(Faiblesse !|Résisté !)(.*)$/);
          if (!m) return <p key={i}>{l}</p>;
          const accentue = m[2] === 'Faiblesse !';
          return (
            <p key={i}>
              {m[1]}
              <span className={accentue ? 'font-bold text-amber-300' : 'italic opacity-60'}>{m[2]}</span>
              {m[3]}
            </p>
          );
        })}
      </div>
    </main>
  );
}
