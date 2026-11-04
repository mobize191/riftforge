import { describe, it, expect } from 'vitest';
// R8-04 — La Liaiseuse [playtest] : PNJ permanent de la Forge, quêtes de lien à
// dialogues minimaux (2-3 lignes FR), quêtes acceptables/complétées/verrouillées
// selon l'état réel.
import { initialState, reduce } from '../src/core/run/state';
import { liaisonQuestStatus, completeLiaisonQuest } from '../src/core/forge/bond';
import { LIAISON_QUESTS } from '../src/data/liaison';

describe('R8-04 la Liaiseuse', () => {
  it('dialogues minimaux : 2-3 lignes FR par quête, aucune histoire', () => {
    for (const q of LIAISON_QUESTS) {
      expect(q.lines.length).toBeGreaterThanOrEqual(2);
      expect(q.lines.length).toBeLessThanOrEqual(3);
    }
  });

  it('quêtes verrouillées -> disponibles -> complétées selon l’état réel', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    const q1 = LIAISON_QUESTS.find((q) => q.id === 'quest-accueil')!;
    expect(liaisonQuestStatus(s, q1)).toBe('locked'); // aucun palier 2
    // passer palier 2 -> disponible
    s = { ...s, forge: { ...s.forge, bondXp: { mousse: 10 }, bondTier: { mousse: 2 } } };
    expect(liaisonQuestStatus(s, q1)).toBe('available');
    // compléter -> done + XP de lien vers le compagnon d'équipe
    s = reduce(s, { type: 'COMPLETE_LIAISON_QUEST', questId: q1.id });
    expect(s.forge.liaisonQuests[q1.id]).toBe('done');
    expect(s.forge.bondXp['mousse']).toBe(10 + q1.bondXpReward);
    expect(liaisonQuestStatus(s, q1)).toBe('done');
    // quête boss verrouillée tant qu'aucun boss vaincu
    const q2 = LIAISON_QUESTS.find((q) => q.id === 'quest-boss')!;
    expect(liaisonQuestStatus(s, q2)).toBe('locked');
    s = { ...s, forge: { ...s.forge, defeatedBosses: ['racine-mere'] } };
    expect(liaisonQuestStatus(s, q2)).toBe('available');
    // quête refusée si verrouillée
    const before = s;
    s = reduce(s, { type: 'COMPLETE_LIAISON_QUEST', questId: 'quest-repos' });
    expect(s).toBe(before); // pas encore de repos
    s = reduce(s, { type: 'REST_AT_HOME' });
    s = reduce(s, { type: 'COMPLETE_LIAISON_QUEST', questId: 'quest-repos' });
    expect(s.forge.liaisonQuests['quest-repos']).toBe('done');
  });

  it('completeLiaisonQuest pur : rien sans condition remplie', () => {
    const s = initialState();
    expect(completeLiaisonQuest(s, 'quest-boss')).toBe(s);
  });
});
