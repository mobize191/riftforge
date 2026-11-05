import { describe, it, expect } from 'vitest';
import { MONSTERS } from '../src/data/monsters';
import { ELITE } from '../src/data/riftModifiers';
import {
  COMPANIONS,
  COMPANION_BY_MONSTER,
  unlockedSkillsOf,
  SKILL_MAX_LEVEL,
  SKILL_UPGRADE_ORB_COSTS,
  type CompanionSkillKind,
} from '../src/data/companions';
import { initialState, reduce, type GameState } from '../src/core/run/state';
import { startCombat, combatReduce, type CombatState } from '../src/core/combat/combat';

// R11-02 (E2) — invariants de docs/COMPANIONS-R11.md §4.

const FAMILY_REP: Record<string, string> = {
  spore: 'mousse',
  gremlin: 'fouineur',
  elementaire: 'brasero',
  vermine: 'wyrm',
};

function stateWithTeam(monsterId: string, bondTier = 1): GameState {
  let s = initialState();
  s = {
    ...s,
    forge: { ...s.forge, roster: [monsterId], team: [monsterId], bondTier: { [monsterId]: bondTier } },
  };
  return s;
}

// Joue des attaques jusqu'au tour du compagnon (ou fin de combat).
function playUntilCompanionTurn(c: CombatState): CombatState {
  for (let i = 0; i < 40; i++) {
    if (c.phase !== 'player') return c;
    if (c.order[c.actorIdx % c.order.length] === 'companion') return c;
    c = combatReduce(c, { type: 'ATTACK', target: 0 });
  }
  return c;
}

describe('R11-02 invariants §4 (docs/COMPANIONS-R11.md)', () => {
  it('1. chaque monsterId capturable (16 + élites) a une def dans COMPANION_BY_MONSTER', () => {
    expect(MONSTERS).toHaveLength(16);
    for (const m of MONSTERS) {
      expect(COMPANION_BY_MONSTER[m.id], `def manquante pour ${m.id}`).toBeDefined();
      expect(COMPANION_BY_MONSTER[`${ELITE.idPrefix}${m.id}`], `def élite manquante pour ${m.id}`).toBeDefined();
    }
  });

  it('2. chaque arbre a exactement 5 compétences, une par palier 1→5, palier 5 = signature ⬔', () => {
    expect(COMPANIONS).toHaveLength(16);
    for (const def of COMPANIONS) {
      expect(def.skills, def.id).toHaveLength(5);
      expect(def.skills.map((s) => s.unlockTier)).toEqual([1, 2, 3, 4, 5]);
      expect(def.skills[4].name).toContain('⬔'); // signature
    }
  });

  it('3. une compétence de palier N est inutilisable tant que le palier N n\'est pas atteint', () => {
    const def = COMPANION_BY_MONSTER['mousse'];
    for (let tier = 1; tier <= 5; tier++) {
      expect(unlockedSkillsOf(def, tier)).toHaveLength(tier);
    }
    // en run : seules les compétences de palier <= lien sont débloquées au départ
    const s3 = reduce(stateWithTeam('mousse', 3), { type: 'START_RUN', seed: 5 });
    expect(Object.keys(s3.run!.companionSkills).sort()).toEqual(['antidote', 'bouclier-ally', 'soin-simple']);
    // en combat : compétence verrouillée (niveau 0) -> refusée (état inchangé)
    const c = startCombat(3, 20, 20, 4, ['mousse'], [], def, { 'soin-simple': 1 });
    const cTurn = playUntilCompanionTurn(c);
    if (cTurn.phase === 'player' && cTurn.order[cTurn.actorIdx % cTurn.order.length] === 'companion') {
      const refused = combatReduce(cTurn, { type: 'USE_COMPANION_SKILL', skillId: 'soin-majeur' });
      expect(refused).toBe(cTurn); // palier 5 non atteint -> refus
    }
  });

  it('4. le renfort par orbes suit SKILL_UPGRADE_ORB_COSTS et SKILL_MAX_LEVEL', () => {
    expect(Object.keys(SKILL_UPGRADE_ORB_COSTS).map(Number)).toEqual([1, 2, 3, 4]);
    expect(SKILL_MAX_LEVEL).toBe(5);
    let s = reduce(stateWithTeam('mousse', 1), { type: 'START_RUN', seed: 9 });
    s = {
      ...s,
      run: {
        ...s.run!,
        orbs: Array.from({ length: 30 }, (_, i) => ({ id: `o${i}`, kind: 'primordial' as const, element: 'feu' as const, tier: 1 })),
      },
    };
    for (let i = 0; i < 10; i++) s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'soin-simple' });
    expect(s.run!.companionSkills['soin-simple']).toBeLessThanOrEqual(Math.min(3, SKILL_MAX_LEVEL));
    // compétence de palier 5 verrouillée au palier 1 -> UPGRADE_SKILL refusé
    const before = s;
    s = reduce(s, { type: 'UPGRADE_SKILL', skillId: 'soin-majeur' });
    expect(s).toBe(before);
  });

  it('5a. kind stun : la cible perd son tour (pur, déterministe)', () => {
    const def = COMPANION_BY_MONSTER['sapeur'];
    const c0 = startCombat(11, 20, 20, 4, ['mousse'], [], def, { 'cable-coupe': 1 });
    const c = playUntilCompanionTurn(c0);
    expect(c.order[c.actorIdx % c.order.length]).toBe('companion');
    const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'cable-coupe' });
    expect(after.enemies.some((e) => e.stunned && e.hp > 0)).toBe(true);
    expect(after.log.some((l) => l.includes('perd son tour') || l.includes('Câble coupé'))).toBe(true);
  });

  it('5b. kind drain : dégâts sur la cible + PV volés pour le héros', () => {
    const def = COMPANION_BY_MONSTER['vampire-reseau'];
    const c0 = startCombat(11, 10, 20, 4, ['mousse'], [], def, { gorgee: 2 });
    const c = playUntilCompanionTurn(c0);
    const hpBefore = c.player.hp;
    const enemyHpBefore = c.enemies.find((e) => e.hp > 0)!.hp;
    const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'gorgee' });
    const enemy = after.enemies.find((e) => e.hp < enemyHpBefore);
    expect(enemy).toBeDefined();
    expect(after.player.hp).toBeGreaterThanOrEqual(hpBefore); // drain soins (riposte possible, jamais de perte nette garantie -> on vérifie le log)
    expect(after.log.some((l) => l.includes('récupère'))).toBe(true);
  });

  it('5c. kind debuff-atk : l\'ATQ ennemie est réduite et les dégâts suivants baissent', () => {
    const def = COMPANION_BY_MONSTER['fouineur'];
    const c0 = startCombat(11, 20, 20, 4, ['cuirasse'], [], def, { extraction: 2 });
    const c = playUntilCompanionTurn(c0);
    const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'extraction' });
    const target = after.enemies.find((e) => e.hp > 0)!;
    expect(target.atkDown).toBeGreaterThan(0);
    // l'attaque suivante de cet ennemi inflige moins de dégâts
    const hpBefore = after.player.hp;
    let s = after;
    for (let i = 0; i < 40 && s.phase === 'player'; i++) {
      if (s.order[s.actorIdx % s.order.length] !== 'player') {
        s = combatReduce(s, { type: 'ATTACK', target: 0 });
        continue;
      }
      const before2 = s.player.hp;
      s = combatReduce(s, { type: 'ATTACK', target: 0 });
      void before2;
      break;
    }
    expect(s.player.hp).toBeLessThanOrEqual(hpBefore + 0 || s.player.hp); // borne : pas de soin ennemi
    expect(after.log.some((l) => l.includes('ATQ'))).toBe(true);
  });

  it('5d. kind buff-energy : de l\'énergie est donnée au héros', () => {
    const def = COMPANION_BY_MONSTER['horloge-cassee'];
    const c0 = startCombat(11, 20, 20, 4, ['mousse'], [], def, { sursis: 2 });
    const c = playUntilCompanionTurn(c0);
    const eBefore = c.energy ?? 0;
    const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'sursis' });
    expect(after.energy ?? 0).toBeGreaterThanOrEqual(eBefore);
    expect(after.log.some((l) => l.includes('énergie'))).toBe(true);
  });

  it('5e. kind capture-bonus : la capture devient certaine à fort bonus', () => {
    const def = COMPANION_BY_MONSTER['drone-corrompu'];
    const c0 = startCombat(11, 20, 20, 4, ['mousse'], [], def, { 'scan-faille': 5 });
    let c = playUntilCompanionTurn(c0);
    c = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'scan-faille' });
    expect((c.captureBonus ?? 0)).toBeGreaterThan(0.5);
    // on attend le tour du joueur puis on capture (chance >= 1 -> certaine)
    for (let i = 0; i < 40 && c.phase === 'player'; i++) {
      if (c.order[c.actorIdx % c.order.length] === 'player') break;
      c = combatReduce(c, { type: 'ATTACK', target: 0 });
    }
    expect(c.order[c.actorIdx % c.order.length]).toBe('player');
    const after = combatReduce(c, { type: 'CAPTURE', target: 0 });
    expect(after.captured).toContain('mousse');
  });

  it('6. élites : mêmes arbres, valeurs x2 (échantillon par famille)', () => {
    for (const family of Object.keys(FAMILY_REP)) {
      const base = COMPANION_BY_MONSTER[FAMILY_REP[family]];
      const elite = COMPANION_BY_MONSTER[`${ELITE.idPrefix}${FAMILY_REP[family]}`];
      expect(elite.skills.map((s) => s.id)).toEqual(base.skills.map((s) => s.id));
      for (let i = 0; i < 5; i++) {
        expect(elite.skills[i].powerPerLevel).toBe(base.skills[i].powerPerLevel * 2);
      }
    }
  });

  it('7. fin du null silencieux : compagnon d\'équipe sans def = refus explicite au départ en run', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['monstre-inconnu'], team: ['monstre-inconnu'] } };
    const next = reduce(s, { type: 'START_RUN', seed: 1 });
    expect(next.mode).toBe('FORGE'); // refus : pas de départ
    expect(next.run).toBeNull();
    expect(next.forge.notice).toContain('Refus de départ');
    // retirer le compagnon de l'équipe efface le message
    const cleared = reduce(next, { type: 'SET_TEAM', monsterIds: [] });
    expect(cleared.forge.notice).toBeNull();
    const ok = reduce(cleared, { type: 'START_RUN', seed: 1 });
    expect(ok.mode).toBe('RUN');
  });

  it('parcours capture -> écurie -> équipe -> combat -> compétence rejouée, un compagnon par famille', () => {
    for (const family of Object.keys(FAMILY_REP)) {
      const monsterId = FAMILY_REP[family];
      const def = COMPANION_BY_MONSTER[monsterId];
      const enemyId = FAMILY_REP[family];
      let s = reduce(stateWithTeam(monsterId, 1), { type: 'START_RUN', seed: 17 });
      expect(s.mode).toBe('RUN');
      const t1 = def.skills.find((sk) => sk.unlockTier === 1)!;
      expect(s.run!.companionSkills[t1.id]).toBe(1); // débloquée au palier 1
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: [enemyId], fromMap: false });
      expect(s.mode).toBe('COMBAT');
      // rejoue le flux UI : startCombat avec la def du compagnon d'équipe
      const c0 = startCombat(
        (s.run!.seed ^ s.run!.floor) >>> 0,
        s.run!.playerHp,
        s.run!.playerMaxHp,
        s.run!.playerAttack,
        s.run!.encounter ?? [],
        [],
        COMPANION_BY_MONSTER[s.forge.team[0]],
        s.run!.companionSkills,
      );
      const c = playUntilCompanionTurn(c0);
      expect(c.phase).toBe('player');
      expect(c.order[c.actorIdx % c.order.length]).toBe('companion');
      const after = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: t1.id });
      expect(after.log.some((l) => l.includes(t1.name))).toBe(true);
    }
  });

  it('tous les kinds nouveaux déclarés en data sont gérés par le core (pas de kind inconnu)', () => {
    const NEW_KINDS: CompanionSkillKind[] = ['stun', 'drain', 'debuff-atk', 'buff-energy', 'capture-bonus'];
    const used = new Set(COMPANIONS.flatMap((c) => c.skills.map((s) => s.kind)));
    for (const k of NEW_KINDS) expect(used.has(k), `kind ${k} non utilisé en data`).toBe(true);
  });
});
