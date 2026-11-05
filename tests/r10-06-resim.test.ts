import { describe, it, expect } from 'vitest';
// R10-06 — Re-simulation V1.1 (décisions D1-D4) : 1000 runs complètes avec le bot
// compétent (extrait dans tests/helpers/simbot.ts, partagé avec R11-03/R11-06).
// Assert : bande première-run 0,1-0,2 % tenue (§SPEC-2), morts étalées (<= 50 % au
// biome 1), les 4 biomes visités.
import { BALANCE } from '../src/data/balance';
import { fullRun } from './helpers/simbot';

describe('R10-06 re-simulation V1.1 (1000 runs, bot compétent économe en énergie)', () => {
  it('bande 0,1-0,2 % tenue, morts étalées (<= 50 % biome 1), 4 biomes visités', { timeout: 900000 }, () => {
    const N = process.env.SIM_RUNS_FINAL ? parseInt(process.env.SIM_RUNS_FINAL, 10) : 1000; // bande §SPEC-2 : N=1000 requis — SIM_RUNS (250 en CI) ne peut pas la mesurer
    let wins = 0;
    let totalTurns = 0;
    const deathBiomes = [0, 0, 0, 0];
    for (let seed = 1; seed <= N; seed++) {
      const r = fullRun((seed * 2654435761) >>> 0);
      totalTurns += r.turns;
      if (r.won) wins++;
      else if (r.deathBiome >= 0 && r.deathBiome < 4) deathBiomes[r.deathBiome]++;
    }
    const rate = wins / N;
    const morts = deathBiomes.reduce((a, b) => a + b, 0);
    console.log(
      `[R10-06] runs=${N} victoires=${wins} taux=${(rate * 100).toFixed(3)}% tours moyens=${(totalTurns / N).toFixed(1)} morts=${morts} par biome: ${deathBiomes.map((d, i) => `biome${i + 1}=${d}`).join(' ')}`,
    );
    // Bande §SPEC-2 conservée.
    expect(rate).toBeGreaterThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MIN);
    expect(rate).toBeLessThanOrEqual(BALANCE.FIRST_RUN_WIN_TARGET_MAX);
    // Distribution étalée : <= 50 % des morts au biome 1, et les 4 biomes sont visités.
    expect(deathBiomes[0]).toBeLessThanOrEqual(morts * 0.5);
    expect(deathBiomes[1] + deathBiomes[2] + deathBiomes[3] + wins).toBeGreaterThan(0);
    expect(deathBiomes[3]).toBeGreaterThan(0); // biome 4 atteint par le bot
  });
});
