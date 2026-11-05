import { describe, it, expect } from 'vitest';
// R11-06 — Re-simulation V1.2 : bot compétent E1 (fusionne les modules), joue le
// compagnon (R11-02) et monte de niveau (E3). 1000 runs.
// Assert : bande première-run 0,1-0,2 % tenue (§SPEC-2, lue UNIQUEMENT via
// SIM_RUNS_FINAL — cf. B37), morts étalées (<= 50 % au biome 1, 4 biomes visités),
// niveau moyen atteint par biome affiché (~3/biome, E3).
import { BALANCE } from '../src/data/balance';
import { fullRun } from './helpers/simbot';

describe('R11-06 re-simulation V1.2 (bot E1 + compagnon + niveaux)', () => {
  it('bande 0,1-0,2 % tenue, morts étalées, niveau moyen par biome affiché', { timeout: 900000 }, () => {
    const N = process.env.SIM_RUNS_FINAL ? parseInt(process.env.SIM_RUNS_FINAL, 10) : 1000; // B37 : jamais SIM_RUNS pour la bande
    let wins = 0;
    let totalTurns = 0;
    const deathBiomes = [0, 0, 0, 0];
    const sumLevelByBiome = [0, 0, 0, 0];
    for (let seed = 1; seed <= N; seed++) {
      const r = fullRun((seed * 2654435761) >>> 0);
      totalTurns += r.turns;
      if (r.won) wins++;
      else if (r.deathBiome >= 0 && r.deathBiome < 4) deathBiomes[r.deathBiome]++;
      for (let b = 0; b < 4; b++) sumLevelByBiome[b] += r.maxLevelByBiome[b];
    }
    const rate = wins / N;
    const morts = deathBiomes.reduce((a, b) => a + b, 0);
    const niveauMoyen = sumLevelByBiome.map((s) => (s / N).toFixed(1)).join('/');
    console.log(
      `[R11-06] runs=${N} victoires=${wins} taux=${(rate * 100).toFixed(3)}% tours moyens=${(totalTurns / N).toFixed(1)} morts=${morts} par biome: ${deathBiomes.map((d, i) => `biome${i + 1}=${d}`).join(' ')} niveau moyen par biome (max atteint): ${niveauMoyen}`,
    );
    expect(rate).toBeGreaterThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MIN);
    expect(rate).toBeLessThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MAX);
    expect(deathBiomes[0]).toBeLessThanOrEqual(morts * 0.5);
    expect(deathBiomes[3]).toBeGreaterThan(0); // biome 4 atteint
    // E3 : ~3 niveaux/biome — le niveau moyen (max) au biome 1 reste dans une fenêtre raisonnable
    expect(sumLevelByBiome[0] / N).toBeGreaterThanOrEqual(1.5);
    expect(sumLevelByBiome[0] / N).toBeLessThanOrEqual(7);
  });
});
