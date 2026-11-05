'use client';

import type { GameState } from '../../core/types';
import { CRAFTABLE_EQUIPMENT, MERCHANT_ITEMS, EQUIPMENT_SLOT_LIMITS } from '../../data/equipment';
import { ownedCount, slotFull } from '../../core/forge/forge';
import { trophiesOf } from '../../core/forge/home';
import { canEvolve, liaisonQuestStatus } from '../../core/forge/bond';
import { LIAISON_QUESTS } from '../../data/liaison';
import { BOND_TIERS } from '../../data/bond';
import { FORGE_GRID, BUILDINGS as BUILDING_DEFS } from '../../data/buildings';
import { BUILDINGS, ENTREPOS, UPGRADE_COSTS } from '../../data/buildings';
import { LAB } from '../../data/lab';
import { RECIPES } from '../../data/recipes';
import { canalizationSlots } from '../../core/forge/lab';
import { COMPANION_BY_MONSTER } from '../../data/companions';
import { companionSkillLabel } from '../../core/combat/combat';
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
  onEquip,
  onUnequip,
  onRest,
  onGift,
  onEvolve,
  onLiaisonQuest,
  onPlaceBuilding,
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
  onEquip: (instanceId: string) => void;
  onUnequip: (instanceId: string) => void;
  onRest: () => void;
  onGift: (monsterId: string) => void;
  onEvolve: (monsterId: string) => void;
  onLiaisonQuest: (questId: string) => void;
  onPlaceBuilding: (buildingId: string, x: number, y: number) => void;
}) {
  const f = state.forge;
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [placeSel, setPlaceSel] = useState<string | null>(null); // B29 : bâtiment sélectionné pour placement
  const trophies = trophiesOf(state);
  const btn = 'rounded border px-4 py-2 text-left disabled:opacity-40';
  const btnStyle = { minHeight: '44px' } as const;

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
      {/* R11-02 (E2) — jamais de null silencieux : un refus explicite est affiché ici */}
      {f.notice && (
        <p role="alert" className="w-full max-w-xl rounded border border-red-400/70 bg-red-950/50 px-4 py-2 text-sm text-red-200">
          {f.notice}
        </p>
      )}

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
                {/* R10-08 : portrait du compagnon (variante -evo.png si évolué), fallback code-gen */}
                <img
                  src={portraitUrl(id, f.evolved[id] ?? false) || '/assets/forge.svg'}
                  onError={(ev) => {
                    const fb = `/assets/monster-${id}.svg`;
                    if (!ev.currentTarget.src.endsWith(fb)) ev.currentTarget.src = fb;
                  }}
                  alt={f.companionNames[id] ?? id}
                  width={40}
                  height={40}
                  className="shrink-0 rounded border border-slate-600 object-cover"
                />
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
                <span className="text-sm opacity-80">
                  palier {f.bondTier[id] ?? 1} ({BOND_TIERS[(f.bondTier[id] ?? 1) - 1]?.name ?? 'Étincelle'}){f.evolved[id] ? ' · évolué' : ''}
                </span>
                <button className={`${btn} border-pink-300/70`} style={btnStyle} onClick={() => onGift(id)}>
                  Cadeau (2 essence)
                </button>
                {canEvolve(state, id) && (
                  <button className={`${btn} border-fuchsia-400/80`} style={btnStyle} onClick={() => onEvolve(id)}>
                    Évolution (palier 4)
                  </button>
                )}
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
                {/* R11-02 (E2) — garde-fou : compagnon de combat vs worker uniquement */}
                <span className={`text-xs ${f.team.includes(id) ? 'text-emerald-300' : 'opacity-70'}`}>
                  {f.team.includes(id) ? '⚔ compagnon de combat' : (f.workers['extracteur'] ?? []).includes(id) ? 'worker uniquement' : 'ni équipe ni worker'}
                </span>
                {/* R11-02 (E2) — arbre de compétences : 1 compétence par palier de lien 1→5 */}
                {(() => {
                  const def = COMPANION_BY_MONSTER[id];
                  if (!def) {
                    return (
                      <p role="alert" className="w-full text-xs text-red-300">
                        Définition de compagnon manquante pour « {id} » — non jouable en combat (départ en run refusé).
                      </p>
                    );
                  }
                  const tier = f.bondTier[id] ?? 1;
                  return (
                    <ul className="flex w-full flex-wrap gap-1 text-xs">
                      {def.skills.map((s) => {
                        const unlocked = tier >= s.unlockTier;
                        return (
                          <li
                            key={s.id}
                            className={`rounded border px-2 py-1 ${unlocked ? 'border-emerald-400/60' : 'border-slate-600 opacity-60'}`}
                            title={unlocked ? companionSkillLabel(s) : `Verrouillée — palier de lien ${s.unlockTier} requis`}
                          >
                            Palier {s.unlockTier} · {s.name} — {unlocked ? companionSkillLabel(s) : `🔒 palier ${s.unlockTier} requis`}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
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
        <h2 className="mb-2 font-semibold">Maison du héros</h2>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm opacity-80">Équipement porté ({f.equipment.length}) :</span>
          {f.equipment.length === 0 && <span className="opacity-60">aucun</span>}
          {f.equipment.map((e) => (
            <span key={e.id} className="flex items-center gap-1 rounded border border-slate-500 px-2 py-1" style={btnStyle}>
              {e.defId}
              <button className={`${btn} border-slate-400`} style={btnStyle} onClick={() => onUnequip(e.id)}>
                Ranger
              </button>
            </span>
          ))}
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm opacity-80">Rangements ({f.homeEquipment.length}) :</span>
          {f.homeEquipment.length === 0 && <span className="opacity-60">vide</span>}
          {f.homeEquipment.map((e) => (
            <span key={e.id} className="flex items-center gap-1 rounded border border-slate-600 px-2 py-1 opacity-90" style={btnStyle}>
              {e.defId}
              <button className={`${btn} border-emerald-400/70`} style={btnStyle} onClick={() => onEquip(e.id)}>
                Équiper
              </button>
            </span>
          ))}
        </div>
        <button className={`${btn} border-emerald-400/70`} style={btnStyle} onClick={onRest}>
          Se reposer à la Maison
        </button>
        {f.lastHomeEvent && <p className="mt-1 text-sm text-emerald-200">{f.lastHomeEvent}</p>}
        <p className="mt-2 text-sm opacity-80">
          Trophées — boss vaincus : {trophies.bosses.length ? trophies.bosses.join(', ') : 'aucun'} · codex{' '}
          {trophies.codexSeen}/{trophies.codexTotal} · contrats remplis : {trophies.contractsDone} · run complétée :{' '}
          {trophies.runCompleted ? 'oui' : 'non'}
        </p>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Liaiseuse — quêtes de lien</h2>
        <div className="flex flex-col gap-2">
          {LIAISON_QUESTS.map((q) => {
            const status = liaisonQuestStatus(state, q);
            return (
              <div key={q.id} className="rounded border border-fuchsia-300/50 px-3 py-2" style={btnStyle}>
                <strong>{q.name}</strong>{' '}
                <span className="opacity-70">({status === 'done' ? 'terminée' : status === 'available' ? 'disponible' : 'verrouillée'})</span>
                {status !== 'done' && (
                  <ul className="mt-1 text-sm opacity-80">
                    {q.lines.map((l, i) => (
                      <li key={i}>« {l} »</li>
                    ))}
                  </ul>
                )}
                {status === 'available' && (
                  <button className={`${btn} border-fuchsia-300/70 mt-1`} style={btnStyle} onClick={() => onLiaisonQuest(q.id)}>
                    Terminer la quête (+{q.bondXpReward} lien)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Travailleurs par bâtiment</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {Object.keys(BUILDING_DEFS).map((bid) => (
            <li key={bid} className="rounded border border-slate-600 px-3 py-2" style={btnStyle}>
              {BUILDING_DEFS[bid].name} : {(f.workers[bid] ?? []).length > 0 ? (f.workers[bid] ?? []).map((w) => f.companionNames[w] ?? w).join(', ') : 'aucun worker'}
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full max-w-xl">
        <h2 className="mb-2 font-semibold">Plan de la Forge — placement des bâtiments</h2>
        <p className="mb-2 text-sm opacity-70">
          Placez vos bâtiments sur la grille : les bonus de voisinage s&apos;activent quand les deux bâtiments
          d&apos;un binôme sont sur des cases adjacentes. Cliquez un bâtiment construit, puis une case.
        </p>
        <div className="mb-2 flex flex-wrap gap-1">
          {Object.entries(f.buildings)
            .filter(([, lvl]) => (lvl as number) > 0)
            .map(([bid, lvl]) => (
              <button
                key={bid}
                className={`${btn} ${placeSel === bid ? 'border-emerald-300 bg-emerald-900/60' : 'border-slate-500'}`}
                style={btnStyle}
                onClick={() => setPlaceSel(placeSel === bid ? null : bid)}
              >
                {bid} niv {lvl}
              </button>
            ))}
        </div>
        <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${FORGE_GRID.width}, 56px)` }}>
          {Array.from({ length: FORGE_GRID.height }).map((_, y) =>
            Array.from({ length: FORGE_GRID.width }).map((_, x) => {
              const here = Object.entries(f.buildingPos).find(([, pp]) => pp.x === x && pp.y === y);
              return (
                <button
                  key={`${x},${y}`}
                  aria-label={`Case ${x},${y}`}
                  className="rounded border border-slate-600 bg-black/40 px-1 py-1 text-xs"
                  style={{ minHeight: '44px', minWidth: '56px' }}
                  onClick={() => placeSel && onPlaceBuilding(placeSel, x, y)}
                >
                  {here ? here[0] : '·'}
                </button>
              );
            }),
          )}
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
