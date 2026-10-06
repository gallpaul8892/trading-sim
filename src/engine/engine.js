// Pure financial engine: accounting, orders, margin calls, liquidation.
// All functions are side-effect free; they take a game object and return
// { game, ... } or throw an Error with a user-facing message.

let nextPositionId = 1;
export function resetPositionIds() {
  nextPositionId = 1;
}

export function daysBetween(dateA, dateB) {
  const ms = new Date(dateB + '-01') - new Date(dateA + '-01');
  return Math.max(1, Math.round(ms / 86400000));
}

export function fmtMoney(v) {
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(v, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

// ---------- Accounting ----------

export function computeAccount(game, prices) {
  let longValue = 0;
  let shortLiability = 0;
  for (const p of game.positions) {
    const v = p.shares * prices[p.ticker];
    if (p.side === 'long') longValue += v;
    else shortLiability += v;
  }
  const exposure = longValue + shortLiability;
  const equity = game.cash + longValue - game.borrowedMargin - shortLiability;
  const health = exposure > 0 ? equity / exposure : Infinity;
  const unrealizedPnl = game.positions.reduce((sum, p) => {
    const cur = p.shares * prices[p.ticker];
    const entry = p.shares * p.entryPrice;
    return sum + (p.side === 'long' ? cur - entry : entry - cur);
  }, 0);
  return { longValue, shortLiability, exposure, equity, health, unrealizedPnl };
}

// Estimated liquidation price for a position given a maintenance margin m.
// Long:  equity_pos = V - borrowed; margin call when (V - borrowed) / V = m
//        => V_liq = borrowed / (1 - m)
// Short: equity_pos = collateral + proceeds - V; call when equity_pos / V = m
//        => V_liq = (collateral + proceeds) / (1 + m)
export function liquidationPrice(pos, maintenance) {
  if (pos.side === 'long') {
    if (!pos.borrowed || pos.borrowed <= 0 || maintenance <= 0) return null;
    return pos.borrowed / (1 - maintenance) / pos.shares;
  }
  if (maintenance <= 0) return null;
  return (pos.collateral + pos.proceeds) / (1 + maintenance) / pos.shares;
}

// ---------- Campaign lifecycle ----------

export function startCampaign(scenario, difficulty) {
  resetPositionIds();
  const firstStep = scenario.timeline[0];
  const tickers = Object.keys(firstStep.prices);
  // Buy & hold benchmark: equal-weight all tickers with the full starting cash.
  const benchmark = {};
  const perAsset = difficulty.startingCash / tickers.length;
  for (const t of tickers) {
    benchmark[t] = perAsset / firstStep.prices[t]; // shares held
  }
  const game = {
    scenario,
    difficulty,
    stepIndex: 0,
    cash: difficulty.startingCash,
    startingCash: difficulty.startingCash,
    borrowedMargin: 0,
    positions: [],
    closedTrades: [], // {ticker, side, pnl, date}
    totalFees: 0,
    marginCalls: 0,
    liquidations: [], // log of forced liquidation events
    bankrupt: false,
    finished: false,
    benchmark,
    history: [],
  };
  const acct = computeAccount(game, firstStep.prices);
  game.history.push(makeSnapshot(game, firstStep, acct));
  return game;
}

function benchmarkValue(game, prices) {
  let v = 0;
  for (const t of Object.keys(game.benchmark)) {
    v += game.benchmark[t] * prices[t];
  }
  return v;
}

function makeSnapshot(game, step, acct) {
  return {
    date: step.date,
    equity: acct.equity,
    cash: game.cash,
    exposure: acct.exposure,
    health: acct.health === Infinity ? null : acct.health,
    benchmark: benchmarkValue(game, step.prices),
  };
}

export function currentPrices(game) {
  return game.scenario.timeline[game.stepIndex].prices;
}

export function currentStep(game) {
  return game.scenario.timeline[game.stepIndex];
}

// ---------- Orders ----------

function applyFee(game, fee) {
  game.cash -= fee;
  game.totalFees += fee;
}

export function openLong(game, ticker, sizeUsd, leverage) {
  const d = game.difficulty;
  const price = currentPrices(game)[ticker];
  if (!(sizeUsd > 0)) throw new Error('Enter a position size greater than $0.');
  if (leverage < 1 || leverage > d.maxLeverage)
    throw new Error(`Leverage must be between 1x and ${d.maxLeverage}x on ${d.name}.`);
  const fee = sizeUsd * d.feePct;
  const marginRequired = sizeUsd / leverage;
  const borrowed = sizeUsd - marginRequired;
  if (game.cash < marginRequired + fee)
    throw new Error(
      `Insufficient cash. Need ${fmtMoney(marginRequired + fee)} (margin ${fmtMoney(marginRequired)} + fee ${fmtMoney(fee)}).`
    );
  game.cash -= marginRequired; // own money committed
  game.borrowedMargin += borrowed; // broker loan covers the rest
  applyFee(game, fee);
  game.positions.push({
    id: nextPositionId++,
    ticker,
    side: 'long',
    shares: sizeUsd / price,
    entryPrice: price,
    leverage,
    borrowed,
    openDate: currentStep(game).date,
  });
}

export function closeLong(game, positionId, fraction = 1) {
  const idx = game.positions.findIndex((p) => p.id === positionId && p.side === 'long');
  if (idx < 0) throw new Error('Position not found.');
  const pos = game.positions[idx];
  const frac = Math.min(1, Math.max(0.01, fraction));
  const shares = pos.shares * frac;
  const price = currentPrices(game)[pos.ticker];
  const value = shares * price;
  const fee = value * game.difficulty.feePct;
  const borrowRepay = pos.borrowed * frac;
  game.cash += value - borrowRepay;
  applyFee(game, fee);
  game.borrowedMargin -= borrowRepay;
  pos.borrowed -= borrowRepay;
  pos.shares -= shares;
  const pnl = (price - pos.entryPrice) * shares - fee;
  game.closedTrades.push({ ticker: pos.ticker, side: 'long', pnl, date: currentStep(game).date });
  if (pos.shares < 1e-9) game.positions.splice(idx, 1);
  return pnl;
}

// Sell a USD amount of open longs in a ticker (oldest positions first).
// This is the plain "sell shares" action — available on every difficulty.
export function closeLongByTicker(game, ticker, sizeUsd) {
  const price = currentPrices(game)[ticker];
  const positions = game.positions.filter((p) => p.side === 'long' && p.ticker === ticker);
  if (positions.length === 0) throw new Error(`No open long position in ${ticker} to sell.`);
  const totalValue = positions.reduce((s, p) => s + p.shares * price, 0);
  if (!(sizeUsd > 0)) throw new Error('Enter a position size greater than $0.');
  let remaining = Math.min(sizeUsd, totalValue);
  let realized = 0;
  for (const pos of positions) {
    if (remaining <= 1e-9) break;
    const posValue = pos.shares * price;
    const frac = Math.min(1, remaining / posValue);
    realized += closeLong(game, pos.id, frac);
    remaining -= posValue * frac;
  }
  return realized;
}

export function openShort(game, ticker, sizeUsd, leverage) {
  const d = game.difficulty;
  if (!d.shorting) throw new Error(`Short selling is disabled on ${d.name} difficulty.`);
  const price = currentPrices(game)[ticker];
  if (!(sizeUsd > 0)) throw new Error('Enter a position size greater than $0.');
  if (leverage < 1 || leverage > d.maxLeverage)
    throw new Error(`Leverage must be between 1x and ${d.maxLeverage}x on ${d.name}.`);
  const fee = sizeUsd * d.feePct;
  const collateral = sizeUsd / leverage; // initial margin, must be available in cash
  if (game.cash < collateral + fee)
    throw new Error(
      `Insufficient cash. Need ${fmtMoney(collateral + fee)} (collateral ${fmtMoney(collateral)} + fee ${fmtMoney(fee)}).`
    );
  applyFee(game, fee);
  game.cash += sizeUsd; // proceeds of borrowed shares sold into the market
  game.positions.push({
    id: nextPositionId++,
    ticker,
    side: 'short',
    shares: sizeUsd / price,
    entryPrice: price,
    leverage,
    collateral,
    proceeds: sizeUsd,
    openDate: currentStep(game).date,
  });
}

export function coverShort(game, positionId, fraction = 1) {
  const idx = game.positions.findIndex((p) => p.id === positionId && p.side === 'short');
  if (idx < 0) throw new Error('Position not found.');
  const pos = game.positions[idx];
  const frac = Math.min(1, Math.max(0.01, fraction));
  const shares = pos.shares * frac;
  const price = currentPrices(game)[pos.ticker];
  const cost = shares * price;
  const fee = cost * game.difficulty.feePct;
  if (game.cash < cost + fee)
    throw new Error(`Insufficient cash to cover. Need ${fmtMoney(cost + fee)}.`);
  game.cash -= cost;
  applyFee(game, fee);
  pos.shares -= shares;
  pos.collateral *= 1 - frac;
  pos.proceeds *= 1 - frac;
  const pnl = (pos.entryPrice - price) * shares - fee;
  game.closedTrades.push({ ticker: pos.ticker, side: 'short', pnl, date: currentStep(game).date });
  if (pos.shares < 1e-9) game.positions.splice(idx, 1);
  return pnl;
}

// ---------- Margin calls & forced liquidation ----------

// Liquidate the highest-risk position (worst % loss vs entry) at current prices.
function liquidateWorstPosition(game, prices) {
  let worstIdx = -1;
  let worstLoss = Infinity;
  game.positions.forEach((p, i) => {
    const price = prices[p.ticker];
    const lossPct =
      p.side === 'long'
        ? (price - p.entryPrice) / p.entryPrice
        : (p.entryPrice - price) / p.entryPrice;
    if (lossPct < worstLoss) {
      worstIdx = i;
      worstLoss = lossPct;
    }
  });
  if (worstIdx < 0) return null;
  const pos = game.positions[worstIdx];
  const price = prices[pos.ticker];
  let pnl;
  if (pos.side === 'long') pnl = closeLong(game, pos.id, 1);
  else pnl = coverShortForce(game, pos.id, price);
  game.liquidations.push({
    date: currentStep(game).date,
    ticker: pos.ticker,
    side: pos.side,
    pnl,
  });
  return pos;
}

// Forced cover that ignores the cash sufficiency check (broker force-buys).
function coverShortForce(game, positionId, price) {
  const idx = game.positions.findIndex((p) => p.id === positionId && p.side === 'short');
  const pos = game.positions[idx];
  const cost = pos.shares * price;
  const fee = cost * game.difficulty.feePct;
  game.cash -= cost;
  applyFee(game, fee);
  const pnl = (pos.entryPrice - price) * pos.shares - fee;
  game.closedTrades.push({ ticker: pos.ticker, side: 'short', pnl, date: currentStep(game).date });
  game.positions.splice(idx, 1);
  return pnl;
}

export function checkMarginCalls(game) {
  const d = game.difficulty;
  const prices = currentPrices(game);
  const events = [];
  if (d.maintenanceMargin <= 0) return events;
  let acct = computeAccount(game, prices);
  let safety = 0;
  while (acct.exposure > 0 && acct.health < d.maintenanceMargin && safety < 50) {
    safety++;
    if (events.length === 0) game.marginCalls += 1;
    const pos = liquidateWorstPosition(game, prices);
    if (!pos) break;
    events.push(pos);
    acct = computeAccount(game, prices);
  }
  if (acct.equity <= 0) {
    game.bankrupt = true;
    game.finished = true;
  }
  return events;
}

// ---------- Timeline advancement ----------

export function advanceStep(game) {
  const timeline = game.scenario.timeline;
  const fromStep = timeline[game.stepIndex];
  if (game.stepIndex + 1 >= timeline.length) {
    game.finished = true;
    return { finished: true, liquidated: [] };
  }
  const toStep = timeline[game.stepIndex + 1];
  const days = daysBetween(fromStep.date, toStep.date);

  // 1. Daily borrow fee on shorts + leveraged longs (hardcore mode).
  const d = game.difficulty;
  if (d.borrowFeeDaily > 0) {
    const oldPrices = fromStep.prices;
    const acctOld = computeAccount(game, oldPrices);
    const borrowBase = game.borrowedMargin + acctOld.shortLiability;
    if (borrowBase > 0) {
      const fee = borrowBase * d.borrowFeeDaily * days;
      game.cash -= fee;
      game.totalFees += fee;
    }
  }

  // 2. Advance the clock; new prices take effect.
  game.stepIndex += 1;

  // 3. Margin maintenance check at the new prices.
  const liquidated = checkMarginCalls(game);

  // 4. Record history snapshot.
  const acct = computeAccount(game, toStep.prices);
  game.history.push(makeSnapshot(game, toStep, acct));

  return { finished: game.finished, liquidated };
}

// ---------- Per-asset breakdown ----------

// Aggregates open positions and closed trades into per-ticker stats:
// net position value, unrealized P&L, realized P&L, total P&L.
export function computePerAsset(game, prices) {
  const rows = Object.keys(prices).map((ticker) => {
    let longShares = 0;
    let shortShares = 0;
    let longEntryValue = 0;
    let shortEntryValue = 0;
    for (const p of game.positions) {
      if (p.ticker !== ticker) continue;
      if (p.side === 'long') {
        longShares += p.shares;
        longEntryValue += p.shares * p.entryPrice;
      } else {
        shortShares += p.shares;
        shortEntryValue += p.shares * p.entryPrice;
      }
    }
    const price = prices[ticker];
    const longValue = longShares * price;
    const shortLiability = shortShares * price;
    const unrealized = longValue - longEntryValue + (shortEntryValue - shortLiability);
    const realized = game.closedTrades
      .filter((c) => c.ticker === ticker)
      .reduce((s, c) => s + c.pnl, 0);
    return {
      ticker,
      netShares: longShares - shortShares,
      longValue,
      shortLiability,
      netValue: longValue - shortLiability,
      exposure: longValue + shortLiability,
      unrealized,
      realized,
      totalPnl: unrealized + realized,
    };
  });
  // Most active positions first; untouched tickers sink to the bottom.
  rows.sort((a, b) => b.exposure - a.exposure || Math.abs(b.totalPnl) - Math.abs(a.totalPnl));
  return rows;
}

// ---------- End-of-game stats ----------

export function computeStats(game) {
  const hist = game.history;
  const finalEquity = hist.length ? hist[hist.length - 1].equity : game.startingCash;
  const finalBenchmark = hist.length ? hist[hist.length - 1].benchmark : game.startingCash;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const h of hist) {
    if (h.equity > peak) peak = h.equity;
    if (peak > 0) {
      const dd = (peak - h.equity) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  const wins = game.closedTrades.filter((t) => t.pnl > 0).length;
  const winRate = game.closedTrades.length ? wins / game.closedTrades.length : 0;

  return {
    finalEquity,
    totalReturn: (finalEquity - game.startingCash) / game.startingCash,
    benchmarkReturn: (finalBenchmark - game.startingCash) / game.startingCash,
    maxDrawdown,
    winRate,
    totalTrades: game.closedTrades.length,
    totalFees: game.totalFees,
    marginCalls: game.marginCalls,
    liquidations: game.liquidations,
    bankrupt: game.bankrupt,
  };
}
