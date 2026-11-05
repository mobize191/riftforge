import { describe, it, expect } from 'vitest';
// R11-03 (E3) — niveaux 1→12 sur les 4 biomes : courbe d'XP ×12 (data), gains relevés,
// XP des monstres/boss croissante en profondeur, niveau 12 inatteignable avant le biome 4.
import { initialState, reduce } from '../src/core/run/state';
import { BALANCE } from '../src/data/balance';
import { fullRun } from './helpers/simbot';

describe('R11-03 (E3) niveaux 1→12', () => {
  it('courbe monotone : 12 seuils strictement croissants, niveau max = 12', () => {
    const t = BALANCE.LEVEL_XP_THRESHOLDS;
    expect(t).toHaveLength(12);
    expect(t[0]).toBe(0);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    // le core ne dépasse pas le niveau 12 (LEVEL_XP_THRESHOLDS.length)
    expect(BALANCE.LEVEL_XP_THRESHOLDS.length).toBe(12);
  });

  it('gains par niveau exacts (HP_PER_LEVEL, ATK_PER_LEVEL en data)', () => {
    let s = reduce(initialState(), { type: 'START_RUN', seed: 1 });
    const hp0 = s.run!.playerMaxHp;
    const atk0 = s.run!.playerAttack;
    const lvl0 = s.run!.playerLevel;
    // XP suffisante pour plusieurs niveaux d'un coup (biome 1 : 2 XP/kill)
    const kills = Math.ceil(BALANCE.LEVEL_XP_THRESHOLDS[4] / BALANCE.XP_PER_KILL_BY_BIOME[0]);
    s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
    s = reduce(s, {
      type: 'EXIT_COMBAT',
      victory: true,
      loot: { credits: 0, orbs: [], kills, essence: 0, minerai: 0, captured: [] },
      playerHp: s.run!.playerHp,
    });
    const gained = s.run!.playerLevel - lvl0;
    expect(gained).toBeGreaterThanOrEqual(3);
    expect(s.run!.playerMaxHp).toBe(hp0 + gained * BALANCE.HP_PER_LEVEL);
    expect(s.run!.playerAttack).toBe(atk0 + gained * BALANCE.ATK_PER_LEVEL);
  });

  it('XP croissante en profondeur : par kill et bonus boss par biome (data)', () => {
    expect(BALANCE.XP_PER_KILL_BY_BIOME).toHaveLength(4);
    expect(BALANCE.XP_BOSS_BONUS_BY_BIOME).toHaveLength(4);
    for (let i = 1; i < 4; i++) {
      expect(BALANCE.XP_PER_KILL_BY_BIOME[i]).toBeGreaterThan(BALANCE.XP_PER_KILL_BY_BIOME[i - 1]);
      expect(BALANCE.XP_BOSS_BONUS_BY_BIOME[i]).toBeGreaterThan(BALANCE.XP_BOSS_BONUS_BY_BIOME[i - 1]);
    }
    // vérification concrète : même combat, XP différente selon le biome
    const mk = (biomeIndex: number) => {
      let s = reduce(initialState(), { type: 'START_RUN', seed: 1, biomeIndex });
      s = reduce(s, { type: 'ENTER_COMBAT', enemies: ['mousse'], fromMap: false });
      return reduce(s, {
        type: 'EXIT_COMBAT',
        victory: true,
        loot: { credits: 0, orbs: [], kills: 1, essence: 0, minerai: 0, captured: [] },
      });
    };
    expect(mk(0).run!.xp).toBe(BALANCE.XP_PER_KILL_BY_BIOME[0]);
    expect(mk(3).run!.xp).toBe(BALANCE.XP_PER_KILL_BY_BIOME[3]);
  });

  it('simulation bot : niveau 12 inatteignable avant le biome 4 (~3 niveaux/biome)', { timeout: 600000 }, () => {
    const N = process.env.SIM_RUNS ? parseInt(process.env.SIM_RUNS, 10) : 200;
    const maxBeforeB4 = [0, 0, 0];
    let sumByBiome = [0, 0, 0, 0];
    let count = 0;
    for (let seed = 1; seed <= N; seed++) {
      const r = fullRun((seed * 2654435761) >>> 0);
      for (let b = 0; b < 3; b++) {
        maxBeforeB4[b] = Math.max(maxBeforeB4[b], r.maxLevelByBiome[b]);
        sumByBiome[b] += r.maxLevelByBiome[b];
      }
      sumByBiome[3] += r.maxLevelByBiome[3];
      count++;
    }
    console.log(
      `[R11-03] runs=${N} niveau max par biome: ${maxBeforeB4.map((m, i) => `biome${i + 1}=${m}`).join(' ')} moyenne biome1-3=${sumByBiome.slice(0, 3).map((s) => (s / count).toFixed(1)).join('/')}`,
    );
    // Assertion du ticket : niveau 12 JAMAIS atteint avant le biome 4.
    for (const m of maxBeforeB4) expect(m).toBeLessThan(12);
    // Pacing ~3 niveaux/biome : le niveau max atteint au biome 1 reste raisonnable (<= 6).
    expect(maxBeforeB4[0]).toBeLessThanOrEqual(6);
    expect(maxBeforeB4[1]).toBeLessThanOrEqual(9);
    expect(maxBeforeB4[2]).toBeLessThanOrEqual(11);
  });
});
