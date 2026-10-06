// Quick smoke test for the financial engine (not part of the app build).
import assert from 'node:assert';
import {
  startCampaign,
  openLong,
  closeLong,
  closeLongByTicker,
  openShort,
  coverShort,
  advanceStep,
  computeAccount,
  computePerAsset,
  computeStats,
  currentPrices,
} from '../engine/engine.js';
import { DIFFICULTIES } from '../engine/difficulties.js';
import { readFileSync } from 'node:fs';

const scenario = JSON.parse(readFileSync(new URL('../data/techBubble.json', import.meta.url)));

// --- Casual: spot only ---
let g = startCampaign(scenario, DIFFICULTIES.casual);
assert.equal(g.cash, 100000);
openLong(g, 'MSFT', 10000, 1);
let acct = computeAccount(g, currentPrices(g));
assert.ok(Math.abs(acct.equity - (100000 - 10000 * 0.005)) < 0.01, `equity after fee: ${acct.equity}`);
assert.equal(g.borrowedMargin, 0);
assert.throws(() => openShort(g, 'AAPL', 5000, 1), /disabled/);
assert.throws(() => openLong(g, 'AAPL', 5000, 2), /1x/);

// Casual: selling (closing) longs by ticker must always work.
openLong(g, 'MSFT', 5000, 1);
assert.equal(g.positions.filter((p) => p.ticker === 'MSFT').length, 2);
closeLongByTicker(g, 'MSFT', 9000); // partial: oldest position reduced first
let remainingMsft = g.positions
  .filter((p) => p.ticker === 'MSFT')
  .reduce((s, p) => s + p.shares * p.entryPrice, 0);
assert.ok(Math.abs(remainingMsft - 6000) < 1e-6, `remaining MSFT cost basis: ${remainingMsft}`);
assert.equal(g.closedTrades.length, 1);
closeLongByTicker(g, 'MSFT', 999999); // caps at holdings value
assert.equal(g.positions.filter((p) => p.ticker === 'MSFT').length, 0);
assert.throws(() => closeLongByTicker(g, 'AAPL', 1000), /No open long/);

// Per-asset breakdown: unrealized + realized + zero rows for untouched tickers.
openLong(g, 'EBAY', 10000, 1);
const perAsset = computePerAsset(g, currentPrices(g));
assert.equal(perAsset.length, 10, 'breakdown covers all 10 tickers');
const msftRow = perAsset.find((r) => r.ticker === 'MSFT');
assert.ok(msftRow.exposure === 0, 'MSFT fully closed');
assert.ok(msftRow.realized < 0, 'MSFT realized loss = round-trip fees');
assert.ok(Math.abs(msftRow.unrealized) < 1e-9);
const ebayRow = perAsset.find((r) => r.ticker === 'EBAY');
assert.ok(ebayRow.netValue > 0 && ebayRow.netShares > 0, 'EBAY open long counted');
assert.ok(Math.abs(ebayRow.unrealized) < 1e-9, 'no move yet');
const sunwRow = perAsset.find((r) => r.ticker === 'SUNW');
assert.ok(sunwRow.exposure === 0 && sunwRow.totalPnl === 0, 'untouched ticker zero row');
// Sum of per-asset unrealized must equal account-level unrealized.
const acctCheck = computeAccount(g, currentPrices(g));
assert.ok(
  Math.abs(perAsset.reduce((s, r) => s + r.unrealized, 0) - acctCheck.unrealizedPnl) < 1e-6,
  'per-asset unrealized ties to account total'
);

// --- Trader: 2x leverage long ---
g = startCampaign(scenario, DIFFICULTIES.trader);
openLong(g, 'AMZN', 20000, 2); // own 10k, borrow 10k
assert.ok(Math.abs(g.borrowedMargin - 10000) < 1e-9);
acct = computeAccount(g, currentPrices(g));
assert.ok(Math.abs(acct.equity - (25000 - 200)) < 0.01, `lev equity: ${acct.equity}`);
const posId = g.positions[0].id;
closeLong(g, posId, 1);
assert.equal(g.positions.length, 0);
assert.ok(Math.abs(g.borrowedMargin) < 1e-9);
assert.equal(g.closedTrades.length, 1);

// --- Hedge: short selling + borrow fees + margin calls ---
g = startCampaign(scenario, DIFFICULTIES.hedge);
openShort(g, 'AMZN', 15000, 3); // collateral 5k, proceeds +15k
assert.ok(g.cash > 24000, `cash after short proceeds: ${g.cash}`);
acct = computeAccount(g, currentPrices(g));
assert.ok(Math.abs(acct.shortLiability - 15000) < 1e-6);
assert.ok(Math.abs(acct.equity - (10000 - 150)) < 0.01);
const pnl = coverShort(g, g.positions[0].id, 1);
assert.ok(pnl < 0, 'covering at same price loses the fee');

// Run a full campaign to completion; ensure no crash and stats compute.
g = startCampaign(scenario, DIFFICULTIES.hedge);
openLong(g, 'AAPL', 5000, 5);
openShort(g, 'AMZN', 10000, 5);
let steps = 0;
while (!g.finished && steps < 200) {
  advanceStep(g);
  steps++;
}
assert.ok(g.finished);
const stats = computeStats(g);
assert.ok(Number.isFinite(stats.totalReturn));
assert.ok(Number.isFinite(stats.maxDrawdown));
assert.ok(stats.maxDrawdown >= 0 && stats.maxDrawdown <= 1.5);
assert.equal(g.history.length, scenario.timeline.length);
console.log('ALL ENGINE TESTS PASSED');
console.log(`  steps simulated: ${steps}, margin calls: ${stats.marginCalls}, bankrupt: ${stats.bankrupt}`);
console.log(`  final equity: ${stats.finalEquity.toFixed(2)}, return: ${(stats.totalReturn * 100).toFixed(1)}%, benchmark: ${(stats.benchmarkReturn * 100).toFixed(1)}%`);
