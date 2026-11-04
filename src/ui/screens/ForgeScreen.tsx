'use client';

import type { GameState } from '../../core/types';
import { CRAFTABLE_EQUIPMENT, MERCHANT_ITEMS, EQUIPMENT_SLOT_LIMITS } from '../../data/equipment';
import { ownedCount, slotFull } from '../../core/forge/forge';
import { BUILDINGS, ENTREPOS, UPGRADE_COSTS } from '../../data/buildings';
import { LAB } from '../../data/lab';
import { RECIPES } from '../../data/recipes';
import { canalizationSlots } from '../../core/forge/lab';
import { portraitUrl } from '../portraits';
import { useState } from 'react';

// R9-07 : portrait de PNJ (assets/portraits/*.png) avec fallback icône code-gen si absent
// (la liaiseuse.png arrive plus tard — jamais d'emplacement vide).
function PnjPortrait({ id, label }: { id: string; label: string }) {
  const png = portraitUrl(id);
  const fallback = '/assets/forge.svg';
  return (
    <span className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={png || fallback}
        onError={(ev) => {
          if (!ev.currentTarget.src.endsWith(fallback)) ev.currentTarget.src = fallback;
        }}
        alt={label}
        width={56}
        height={56}
        className="rounded-full border border-amber-200/40 object-cover"
      />
      <span className="text-xs opacity-80">{label}</span>
    </span>
  );
}

export default function ForgeScreen({
  state,
  onBuy,
  onCraft,
  onUpgrade,
  onUpgradeLab,
  onCraftRecipe,
  onDescend,
  onRename,
  onSetTeam,
  onAssignWorker,
  onSaveGrimoire,
}: {
  state: GameState;
  onBuy: (defId: string) => void;
  onCraft: (defId: string) => void;
  onUpgrade: (buildingId: string) => void;
  onUpgradeLab: () => void;
  onCraftRecipe: (recipeId: string) => void;
  onDescend: () => void;
  onRename: (monsterId: string, name: string) => void;
  onSetTeam: (monsterIds: string[]) => void;
  onAssignWorker: (buildingId: string, monsterId: string | null) => void;
  onSaveGrimoire: (slot: number, name: string, recipeIds: string[]) => void;
}) {
  const f = state.forge;
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const btn = 'rounded border px-4 py-2 text-left disabled:opacity-40';
  const btnStyle = { minHeight: '44px' } as const;
  const tier1 = RECIPES.filter((r) => r.tier === 1);

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-6 px-4 py-6"
      style={{ background: 'radial-gradient(ellipse at 50% 20%, #2a1a10 0%, #0a0e1a 70%)', color: '#f8ecdd' }}
    >
      <h1 className="font-bold tracking-widest" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.6rem)' }}>
        LA FORGE
      </h1>
      <div className="flex flex-wrap justify-center gap-4">
        <PnjPortrait id="marchand" label="Marchand" />
        <PnjPortrait id="constructeur" label="Constructeur" />
        <PnjPortrait id="liaiseuse" label="Liaiseuse" />
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        {(
          [
            ['Crédits', f.credits],
            ['Essence', f.essence],
            ['Minerai brut', f.mineraiBrut],
            ['Lingots', f.lingots],
          ] as const
        ).map(([label, value]) => (
          <span key={label} className="rounded border border-amber-200/40 px-3 py-2" style={btnStyle}>
            {label} : {value}
          </span>
        ))}
      </div>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Bâtiments</h2>
        <div className="flex flex-col gap-2">
          {Object.values(BUILDINGS).map((b) => {
            const level = f.buildings[b.id] ?? 0;
            const cost = UPGRADE_COSTS[b.id]?.credits ?? 0;
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-500 px-3 py-2" style={btnStyle}>
                <span>
                  {b.name} — niv {level}
                </span>
                <button className={`${btn} border-emerald-400/70`} style={btnStyle} disabled={f.credits < cost} onClick={() => onUpgrade(b.id)}>
                  Améliorer ({cost} crédits)
                </button>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-500 px-3 py-2" style={btnStyle}>
            <span>
              {LAB.name} — niv {f.buildings[LAB.id] ?? 1} · {canalizationSlots(state)} slots de canalisation
            </span>
            <button
              className={`${btn} border-emerald-400/70`}
              style={btnStyle}
              disabled={f.credits < (LAB.upgradeCost.credits ?? 0) || f.essence < (LAB.upgradeCost.essence ?? 0)}
              onClick={onUpgradeLab}
            >
              Améliorer ({LAB.upgradeCost.credits} crédits, {LAB.upgradeCost.essence} essence)
            </button>
          </div>
          <p className="text-sm opacity-70">
            {ENTREPOS.name} — niv {f.buildings[ENTREPOS.id] ?? 0} (caps de stockage augmentés)
          </p>
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Labo — débloquer des recettes de modules</h2>
        <p className="mb-2 text-sm opacity-70">
          Les modules de palier 1 (un seul élément) se lancent gratuitement dès que vous tenez
          l’orbe correspondante. Le Labo sert à <strong>débloquer les recettes de paliers
          supérieurs</strong> (2+ orbes), contre un coût croissant : communs (palier 1), puis
          lingots (palier 2), puis ressources de biomes profonds (palier 3).
        </p>
        <div className="flex flex-col gap-2">
          {RECIPES.map((r) => {
            const cost = r.tier === 1 ? LAB.tier1RecipeCost : r.tier === 2 ? LAB.tier2RecipeCost : LAB.tier3RecipeCost;
            const unlocked = f.unlockedRecipes.includes(r.id);
            const affordable = Object.entries(cost).every(([k, v]) => (f as unknown as Record<string, number>)[k] >= (v ?? 0));
            return (
              <button
                key={r.id}
                className={`${btn} border-sky-300/70 disabled:opacity-40`}
                style={btnStyle}
                disabled={unlocked || !affordable}
                onClick={() => onCraftRecipe(r.id)}
              >
                {unlocked ? '✓ ' : ''}
                {r.name} — palier {r.tier}
                {!unlocked && ` (${Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ')})`}
                {unlocked ? ' — débloquée' : ''}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Forge Arcane — craft d’équipement</h2>
        <div className="flex flex-col gap-2">
          {CRAFTABLE_EQUIPMENT.map((item) => {
            const owned =
              f.equipment.some((e) => e.defId === item.id) || f.homeEquipment.some((e) => e.defId === item.id);
            const full = slotFull(state, item.slot);
            const affordable = Object.entries(item.craftCost).every(
              ([k, v]) => (f as unknown as Record<string, number>)[k] >= (v ?? 0),
            );
            return (
              <button
                key={item.id}
                className={`${btn} border-violet-300/70 disabled:opacity-40`}
                style={btnStyle}
                disabled={owned || full || !affordable}
                onClick={() => onCraft(item.id)}
              >
                {item.name} [{item.slot}] —{' '}
                {Object.entries(item.craftCost).map(([k, v]) => `${v} ${k}`).join(', ')}
                {owned ? ' · possédé' : full ? ` · ${item.slot} plein` : ''}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Le Marchand</h2>
        <div className="flex flex-col gap-2">
          {MERCHANT_ITEMS.map((item) => {
            const owned =
              f.equipment.some((e) => e.defId === item.id) || f.homeEquipment.some((e) => e.defId === item.id);
            const full = slotFull(state, item.slot);
            const disabled = f.credits < item.cost || owned || full;
            return (
              <button
                key={item.id}
                disabled={disabled}
                onClick={() => onBuy(item.id)}
                className={`${btn} border-amber-400/70 bg-amber-900/40 disabled:opacity-40`}
                style={btnStyle}
              >
                {item.name} [{item.slot}] — {item.cost} crédits
                {item.attackBonus > 0 && ` · +${item.attackBonus} ATK`}
                {item.hpBonus > 0 && ` · +${item.hpBonus} PV`}
                {owned ? ' · possédé' : full ? ` · ${item.slot} plein (${ownedCount(state, item.slot)}/${EQUIPMENT_SLOT_LIMITS[item.slot]})` : ''}
              </button>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Écurie ({f.roster.length})</h2>
        {f.roster.length === 0 ? (
          <p className="opacity-60">Aucun compagnon — capturez des monstres dans la Faille.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {f.roster.map((id) => (
              <li key={id} className="flex flex-wrap items-center gap-2 rounded border border-slate-500 px-3 py-2" style={btnStyle}>
                <input
                  value={nameDrafts[id] ?? f.companionNames[id] ?? id}
                  onChange={(e) => setNameDrafts((d) => ({ ...d, [id]: e.target.value }))}
                  onBlur={() => onRename(id, nameDrafts[id] ?? f.companionNames[id] ?? id)}
                  className="min-w-0 flex-1 rounded bg-black/40 px-2 py-1"
                  style={{ minHeight: '44px' }}
                  aria-label={`Nom du compagnon ${id}`}
                />
                <button
                  className={`${btn} border-emerald-400/70`}
                  style={btnStyle}
                  onClick={() => onSetTeam(f.team.includes(id) ? [] : [id])}
                >
                  {f.team.includes(id) ? '✓ En équipe' : 'Mettre en équipe'}
                </button>
                <button
                  className={`${btn} border-sky-300/70`}
                  style={btnStyle}
                  disabled={f.team.includes(id)}
                  title={f.team.includes(id) ? 'Déjà en équipe de combat' : ''}
                  onClick={() =>
                    onAssignWorker(
                      'extracteur',
                      (f.workers['extracteur'] ?? []).includes(id) ? null : id,
                    )
                  }
                >
                  {(f.workers['extracteur'] ?? []).includes(id) ? '✓ Worker extracteur' : f.team.includes(id) ? 'En équipe' : '+ Worker extracteur'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Grimoire (jusqu’à 3 compositions favorites)</h2>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((slot) => (
            <div key={slot} className="flex flex-wrap items-center gap-2 rounded border border-slate-500 px-3 py-2" style={btnStyle}>
              <span className="flex-1">
                Slot {slot + 1} : {f.grimoire[slot] ? `${f.grimoire[slot].name} (${f.grimoire[slot].recipeIds.length} recettes)` : 'vide'}
              </span>
              <button
                className={`${btn} border-violet-300/70`}
                style={btnStyle}
                disabled={f.discoveredRecipes.length === 0}
                onClick={() => onSaveGrimoire(slot, `Comp. ${slot + 1}`, f.discoveredRecipes)}
              >
                Enregistrer les recettes découvertes
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Équipement porté ({f.equipment.length})</h2>
        {f.equipment.length === 0 ? (
          <p className="opacity-60">Aucun équipement.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {f.equipment.map((e) => (
              <li key={e.id} className="rounded border border-slate-500 px-3 py-2" style={btnStyle}>
                {e.defId}
              </li>
            ))}
          </ul>
        )}
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
