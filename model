import { seedById, computeGrowSec, computeYield, applySpecial } from "./economy.js";

export function nowMs() { return Date.now(); }

export function makeEmptyPlots(count) {
  return Array.from({ length: count }, () => ({
    seedId: null,
    plantedAtMs: 0,
    readyAtMs: 0,
    lastNote: null,
  }));
}

export function seedLevel(state, seedId) {
  return state.seedLevels[seedId] ?? 1;
}

export function isBoostActive(state) {
  return nowMs() < (state.boost.activeUntil ?? 0);
}

export function deploySeed(state, plotIdx, seedId) {
  const p = state.plots[plotIdx];
  p.seedId = seedId;
  const seed = seedById(seedId);
  const lvl = seedLevel(state, seedId);
  const growSec = computeGrowSec(seed, lvl);

  p.plantedAtMs = nowMs();
  p.readyAtMs = p.plantedAtMs + Math.floor(growSec * 1000);
  p.lastNote = null;
}

export function canClaim(state, plotIdx) {
  const p = state.plots[plotIdx];
  return p.seedId && nowMs() >= p.readyAtMs;
}

export function claimAndReplant(state, plotIdx, boostMultiplier, rng = Math.random) {
  const p = state.plots[plotIdx];
  const seed = seedById(p.seedId);
  const lvl = seedLevel(state, seed.id);

  let amount = computeYield(seed, lvl);
  if (isBoostActive(state)) amount *= boostMultiplier;

  const applied = applySpecial(seed, amount, rng);
  const earned = Math.floor(applied.amount);

  state.credits += earned;
  state.stats.totalClaims += 1;
  state.stats.totalEarned += earned;

  p.lastNote = applied.note;

  // immediate replant (keeps tempo tight)
  const growSec = computeGrowSec(seed, lvl);
  p.plantedAtMs = nowMs();
  p.readyAtMs = p.plantedAtMs + Math.floor(growSec * 1000);

  return { earned, note: applied.note };
}
