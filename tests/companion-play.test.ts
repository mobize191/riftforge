import { describe, it, expect } from 'vitest';
// Batterie dédiée « jouer AVEC son compagnon » : capture -> écurie -> équipe -> run
// -> présence en combat -> compétence déclenchée -> soin effectif -> K.O. -> jalon.
// Rejoue le flux exact de l'UI (mêmes appels à reduce/startCombat que App.tsx).
import { initialState, reduce } from '../src/core/run/state';
import { startCombat, combatReduce, captureChance, type CombatState } from '../src/core/combat/combat';
import { COMPANION_BY_MONSTER } from '../src/data/companions';
import { BOND_XP } from '../src/data/bond';

function mkCombat(s: ReturnType<typeof initialState>): CombatState {
  return startCombat(
    (s.run!.seed ^ (s.run!.floor * 7919)) >>> 0,
    s.run!.playerHp,
    s.run!.playerMaxHp,
    s.run!.playerAttack,
    s.run!.encounter!,
    s.run!.orbs.map((o) => o.element).filter((e): e is NonNullable<typeof e> => e !== null),
    s.forge.team[0] ? (COMPANION_BY_MONSTER[s.forge.team[0]] ?? null) : null,
    s.run!.companionSkills,
    s.run!.companionKo,
    s.run!.modules.map((m) => m.id),
    s.run!.challengeId ?? undefined,
    s.run!.activeModifiers,
  );
}

// Capture le premier ennemi affaibli en combat (comme un joueur) : on attaque tant
// que PV > 5 (sinon on risque de le tuer), puis on tente la capture (réessayable).
function captureFirst(s: ReturnType<typeof initialState>) {
  s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
  let c = mkCombat(s);
  let guard = 0;
  while (c.phase === 'player' && guard++ < 60 && c.captured.length === 0) {
    const alive = c.enemies.findIndex((e) => e.hp > 0);
    if (alive < 0) break;
    if (c.enemies[alive].hp > 5) c = combatReduce(c, { type: 'ATTACK', target: alive });
    else c = combatReduce(c, { type: 'CAPTURE', target: alive });
  }
  expect(c.captured).toContain('mousse');
  return reduce(s, { type: 'EXIT_COMBAT', victory: c.phase === 'won', loot: c.loot ?? undefined, playerHp: c.player.hp });
}

describe('jouer avec son compagnon — flux complet', () => {
  it('capture -> écurie -> équipe -> présent en combat avec compétence initiale', () => {
    let s = initialState();
    s = reduce(s, { type: 'START_RUN', seed: 123 });
    s = captureFirst(s);
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.roster).toContain('mousse'); // capturé = à l'écurie
    s = reduce(s, { type: 'SET_TEAM', monsterIds: ['mousse'] });
    expect(s.forge.team).toEqual(['mousse']);
    s = reduce(s, { type: 'START_RUN', seed: 124 });
    // 1 compétence initiale débloquée car compagnon en équipe
    expect(Object.keys(s.run!.companionSkills).length).toBe(1);
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['sporeling'], fromMap: false });
    const c = mkCombat(s);
    expect(c.companion).not.toBeNull();
    expect(c.companion!.ko).toBe(false);
    expect(c.order).toContain('companion'); // le compagnon a sa place dans l'initiative
  });

  it('le compagnon soigne le joueur via sa compétence (USE_COMPANION_SKILL, au SON tour)', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 9 });
    // force une compétence de soin débloquée
    s = { ...s, run: { ...s.run!, companionSkills: { 'soin-simple': 2 } } };
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['cuirasse'], fromMap: false });
    let c = mkCombat(s);
    // avance jusqu'au tour du compagnon
    let guard = 0;
    while (c.phase === 'player' && c.order[c.actorIdx % c.order.length] !== 'companion' && guard++ < 20) {
      c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) });
    }
    expect(c.order[c.actorIdx % c.order.length]).toBe('companion'); // bien au tour du compagnon
    // au tour du JOUEUR la compétence est refusée (règle d'initiative FF)
    let cPlayerTurn = { ...c, actorIdx: (c.actorIdx + 1) % c.order.length };
    if (cPlayerTurn.order[cPlayerTurn.actorIdx % cPlayerTurn.order.length] === 'player') {
      const refused = combatReduce(cPlayerTurn, { type: 'USE_COMPANION_SKILL', skillId: 'soin-simple' });
      expect(refused).toBe(cPlayerTurn);
    }
    // au tour du compagnon : soin effectif (1 PV/niveau x niv 2 = +2, R11-06)
    c = { ...c, player: { ...c.player, hp: 5 } };
    const c2 = combatReduce(c, { type: 'USE_COMPANION_SKILL', skillId: 'soin-simple' });
    expect(c2.player.hp).toBe(7); // 5 + 2 (soin-simple niv 2 x 1 PV, R11-06)
    expect(c2.log.some((l) => l.includes(c.companion!.name))).toBe(true);
  });

  it('le compagnon attaque à SON tour (initiative FF), pas au tour du joueur', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 55 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['cuirasse'], fromMap: false });
    let c = mkCombat(s);
    let guard = 0;
    let sawCompanionTurn = false;
    let companionDealtDamage = false;
    while (c.phase === 'player' && guard++ < 60) {
      const actor = c.order[c.actorIdx % c.order.length];
      const alive = c.enemies.findIndex((e) => e.hp > 0);
      if (alive < 0) break;
      if (actor === 'companion') {
        sawCompanionTurn = true;
        const hpBefore = c.enemies[alive].hp;
        c = combatReduce(c, { type: 'ATTACK', target: alive }); // le joueur choisit pour le compagnon
        if (c.enemies[alive] && c.enemies[alive].hp < hpBefore) companionDealtDamage = true;
      } else {
        c = combatReduce(c, { type: 'ATTACK', target: alive });
      }
    }
    expect(sawCompanionTurn).toBe(true);
    expect(companionDealtDamage).toBe(true);
    expect(['won', 'lost', 'fled']).toContain(c.phase);
  });

  it('K.O. du compagnon : persiste dans la run, se réveille à la Forge (design §R3)', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 3 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['amas', 'amas', 'amas'], fromMap: false });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: false, companionKo: true, playerHp: 10 });
    expect(s.run!.companionKo).toBe(true); // K.O. enregistré dans la run
    // combat suivant de la MÊME run : le compagnon reste K.O.
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    const c = mkCombat(s);
    expect(c.companion).not.toBeNull();
    expect(c.companion!.ko).toBe(true);
    expect(c.order).not.toContain('companion'); // plus dans l'initiative
    // retour Forge -> nouvelle run : le compagnon se réveille
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    s = reduce(s, { type: 'START_RUN', seed: 4 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    expect(mkCombat(s).companion!.ko).toBe(false);
  });

  it('jalon (palier de compétence) proposé au sol 3 quand un compagnon est en équipe', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 21 });
    s = reduce(s, { type: 'NEXT_FLOOR' });
    expect(s.run!.pendingMilestone).toBe(false);
    s = reduce(s, { type: 'NEXT_FLOOR' }); // sol 3
    expect(s.run!.pendingMilestone).toBe(true);
    const before = { ...s.run!.companionSkills };
    // R11-02 (E2) : déblocage par palier de lien — un jalon ne débloque que si le palier
    // est atteint ; ici palier 1, donc on monte la compétence déjà débloquée.
    s = reduce(s, { type: 'RESOLVE_MILESTONE', choice: { kind: 'upgrade', skillId: 'soin-simple' } });
    expect(s.run!.pendingMilestone).toBe(false);
    expect(s.run!.companionSkills['soin-simple']).toBe((before['soin-simple'] ?? 0) + 1);
  });

  it('victoire partagée -> XP de lien au retour (compagnon vivant)', () => {
    let s = initialState();
    s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
    s = reduce(s, { type: 'START_RUN', seed: 31 });
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    s = reduce(s, { type: 'EXIT_COMBAT', victory: true, loot: { credits: 5, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] }, companionKo: false });
    s = reduce(reduce(s, { type: 'DIE' }), { type: 'RETURN_FORGE' });
    expect(s.forge.bondXp['mousse'] ?? 0).toBeGreaterThanOrEqual(BOND_XP.perSharedVictory);
  });

  it('robustesse : 200 seeds, compagnon en équipe -> toujours présent et combat jamais bloqué', () => {
    for (let seed = 1; seed <= 200; seed++) {
      let s = initialState();
      s = { ...s, forge: { ...s.forge, roster: ['mousse'], team: ['mousse'] } };
      s = reduce(s, { type: 'START_RUN', seed });
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse', 'sporeling'], fromMap: false });
      let c = mkCombat(s);
      expect(c.companion).not.toBeNull();
      let guard = 0;
      while (c.phase === 'player' && guard++ < 100) {
        const alive = c.enemies.findIndex((e) => e.hp > 0);
        if (alive < 0) break;
        const actor = c.order[c.actorIdx % c.order.length];
        if (actor === 'companion') {
          const sk = Object.keys(c.companion!.skills)[0];
          c = combatReduce(c, sk ? { type: 'USE_COMPANION_SKILL', skillId: sk } : { type: 'ATTACK', target: alive });
          if (c.phase !== 'player') break;
        }
        c = combatReduce(c, { type: 'ATTACK', target: c.enemies.findIndex((e) => e.hp > 0) >= 0 ? c.enemies.findIndex((e) => e.hp > 0) : 0 });
      }
      expect(['won', 'lost', 'fled']).toContain(c.phase);
    }
  });

  it('captureChance monotone et bornée (data CAPTURE)', () => {
    expect(captureChance(1, 10)).toBeGreaterThan(captureChance(9, 10));
    expect(captureChance(0, 10)).toBeLessThanOrEqual(1);
    expect(captureChance(0, 10)).toBeGreaterThan(0.5);
  });
});
