export const SEEDS = [
  { id: "BTC", name: "Bitcoin",  growSec: 120, yield: 150, special: { type:"none" } },
  { id: "ETH", name: "Ethereum", growSec: 75,  yield: 95,  special: { type:"none" } },
  { id: "USDT",name: "Tether",   growSec: 45,  yield: 42,  special: { type:"stable" } },
  { id: "BNB", name: "BNB",      growSec: 85,  yield: 105, special: { type:"procBonus", chance:0.06, mult:1.30, label:"Fee Rebate" } },
  { id: "SOL", name: "Solana",   growSec: 35,  yield: 40,  special: { type:"none" } },
  { id: "XRP", name: "XRP",      growSec: 30,  yield: 34,  special: { type:"none" } },
  { id: "USDC",name: "USD Coin", growSec: 40,  yield: 38,  special: { type:"stable" } },
  { id: "DOGE",name: "Dogecoin", growSec: 20,  yield: 20,  special: { type:"procBonus", chance:0.12, mult:3.0, label:"Meme Surge" } },
  { id: "TON", name: "Toncoin",  growSec: 55,  yield: 68,  special: { type:"procBonus", chance:0.08, mult:1.5, label:"Turbo Relay" } },
  { id: "ADA", name: "Cardano",  growSec: 40,  yield: 46,  special: { type:"swing", chanceUp:0.10, upMult:1.2, chanceDown:0.10, downMult:0.8 } },
];

export const START_UNLOCKED = ["SOL","XRP","USDT"];
export const SHOP_CATALOG = [
  { id:"USDC", cost: 450 },
  { id:"DOGE", cost: 240 },
  { id:"ADA",  cost: 520 },
  { id:"TON",  cost: 720 },
  { id:"BNB",  cost: 1200 },
  { id:"ETH",  cost: 2200 },
  { id:"BTC",  cost: 4200 },
];

export function seedById(id) {
  const s = SEEDS.find(x => x.id === id);
  if (!s) throw new Error(`Unknown seed id: ${id}`);
  return s;
}

export function baseSeedCost(seedId) {
  const ladder = {
    DOGE: 40, XRP: 55, SOL: 65, USDC: 80, USDT: 80,
    ADA: 120, TON: 160, BNB: 220, ETH: 380, BTC: 650,
  };
  return ladder[seedId] ?? 100;
}

export function upgradeCost(seedId, level) {
  return Math.floor(baseSeedCost(seedId) * Math.pow(1.55, level - 1));
}

export function computeGrowSec(seed, level) {
  const reduced = seed.growSec * Math.pow(0.97, level - 1);
  return Math.max(seed.growSec * 0.5, reduced);
}

export function computeYield(seed, level) {
  return seed.yield * Math.pow(1.20, level - 1);
}

export function applySpecial(seed, baseAmount, rng) {
  const sp = seed.special;
  if (!sp || sp.type === "none") return { amount: baseAmount, note: null };

  if (sp.type === "stable") return { amount: baseAmount, note: "Stable" };

  const r = rng();

  if (sp.type === "procBonus") {
    if (r < sp.chance) return { amount: baseAmount * sp.mult, note: sp.label };
    return { amount: baseAmount, note: null };
  }

  if (sp.type === "swing") {
    if (r < sp.chanceUp) return { amount: baseAmount * sp.upMult, note: "Bull Tick" };
    if (r > 1 - sp.chanceDown) return { amount: baseAmount * sp.downMult, note: "Bear Tick" };
    return { amount: baseAmount, note: null };
  }

  return { amount: baseAmount, note: null };
}
