import type { GameState } from '../types';
import { BOND_XP, BOND_TIER_EFFECTS, EVOLUTION_KILLS_SAME_RACE } from '../../data/bond';
import { LIAISON_QUESTS, type LiaisonQuest } from '../../data/liaison';
import { spendResources } from './forge';

// R8 — Mécanique de lien (méta-progression compagnons). Pur, déterministe.

// Palier de lien (1-5) depuis l'XP cumulé — seuils en data.
export function bondTierOf(xp: number): number {
  let tier = 1;
  for (let i = 0; i < BOND_XP.tierXpThresholds.length; i++) {
    if (xp >= BOND_XP.tierXpThresholds[i]) tier = i + 1;
  }
  return Math.min(tier, BOND_TIERS_MAX);
}
const BOND_TIERS_MAX = BOND_XP.tierXpThresholds.length;

export function addBondXp(state: GameState, monsterId: string, amount: number): GameState {
  if (!state.forge.roster.includes(monsterId) && monsterId !== state.forge.team[0]) return state;
  if (amount <= 0) return state;
  const xp = (state.forge.bondXp[monsterId] ?? 0) + amount;
  return {
    ...state,
    forge: {
      ...state.forge,
      bondXp: { ...state.forge.bondXp, [monsterId]: xp },
      bondTier: { ...state.forge.bondTier, [monsterId]: bondTierOf(xp) },
    },
  };
}

// Cadeau offert à un compagnon (R8-01) : coût en data, gain d'XP en data.
export function giftCompanion(state: GameState, monsterId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  if (!state.forge.roster.includes(monsterId)) return state;
  const next = spendResources(state, BOND_XP.giftCost);
  if (next === state) return state;
  return addBondXp(next, monsterId, BOND_XP.perGift);
}

// Évolution au palier 4 (R8-03) : irréversible, condition évaluée depuis l'état réel
// (compteur persistant de kills de la même race à la Forge). Le compagnon gagne un
// bonus majeur (marqueur + stats via le palier, évolution enregistrée).
export function canEvolve(state: GameState, monsterId: string): boolean {
  if (state.mode !== 'FORGE') return false;
  const tier = state.forge.bondTier[monsterId] ?? 1;
  if (tier < 4) return false;
  if (state.forge.evolved[monsterId]) return false;
  const kills = state.forge.killCounts[monsterId] ?? 0;
  return kills >= EVOLUTION_KILLS_SAME_RACE;
}

export function evolveCompanion(state: GameState, monsterId: string): GameState {
  if (!canEvolve(state, monsterId)) return state;
  return {
    ...state,
    forge: { ...state.forge, evolved: { ...state.forge.evolved, [monsterId]: true } },
  };
}

// Bonus de palier appliqué EN RUN uniquement si le compagnon est en équipe (R8-02).
export function bondHpBonus(state: GameState): number {
  const teamMonster = state.forge.team[0];
  if (!teamMonster) return 0;
  const tier = state.forge.bondTier[teamMonster] ?? 1;
  return BOND_TIER_EFFECTS.find((e) => e.tier === tier)?.playerHpBonus ?? 0;
}

// --- Liaiseuse (R8-04) ---

export type LiaisonQuestStatus = 'locked' | 'available' | 'done';

export function liaisonQuestStatus(state: GameState, quest: LiaisonQuest): LiaisonQuestStatus {
  if (state.forge.liaisonQuests[quest.id] === 'done') return 'done';
  switch (quest.condition) {
    case 'tier2-any':
      return Object.values(state.forge.bondTier).some((t) => t >= 2) ? 'available' : 'locked';
    case 'boss-killed-any':
      return state.forge.defeatedBosses.length > 0 ? 'available' : 'locked';
    case 'rest-home':
      return state.forge.lastHomeEvent !== null ? 'available' : 'locked';
    default:
      return 'locked';
  }
}

// Compléter une quête de la Liaiseuse : dialogues minimaux + XP de lien vers le
// compagnon d'équipe (s'il y en a un).
export function completeLiaisonQuest(state: GameState, questId: string): GameState {
  if (state.mode !== 'FORGE') return state;
  const quest = LIAISON_QUESTS.find((q) => q.id === questId);
  if (!quest) return state;
  if (liaisonQuestStatus(state, quest) !== 'available') return state;
  const teamMonster = state.forge.team[0];
  let next: GameState = {
    ...state,
    forge: { ...state.forge, liaisonQuests: { ...state.forge.liaisonQuests, [questId]: 'done' } },
  };
  if (teamMonster) next = addBondXp(next, teamMonster, quest.bondXpReward);
  return next;
}
