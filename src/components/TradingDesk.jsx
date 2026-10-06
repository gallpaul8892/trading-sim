import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useGameStore, currentPrices, currentStep } from '../store/useGameStore';
import { fmtMoney, fmtPct } from '../engine/engine';
import { tickerInfo } from '../data/tickerInfo';

export default function TradingDesk() {
  const game = useGameStore((s) => s.game);
  const buyLong = useGameStore((s) => s.buyLong);
  const sellShort = useGameStore((s) => s.sellShort);
  const sellLongTicker = useGameStore((s) => s.sellLongTicker);

  const prices = currentPrices(game);
  const tickers = Object.keys(prices);
  const d = game.difficulty;

  const [ticker, setTicker] = useState(tickers[0]);
  const [side, setSide] = useState('long');
  const [leverage, setLeverage] = useState(1);
  const [sizeInput, setSizeInput] = useState('');

  const price = prices[ticker];
  const prevPrices =
    game.stepIndex > 0 ? game.scenario.timeline[game.stepIndex - 1].prices : null;
  const change = prevPrices ? (price - prevPrices[ticker]) / prevPrices[ticker] : 0;

  const priceHistory = useMemo(
    () =>
      game.scenario.timeline.slice(0, game.stepIndex + 1).map((s) => ({
        date: s.date,
        price: s.prices[ticker],
      })),
    [game.stepIndex, ticker, game.scenario]
  );

  const sizeUsd = parseFloat(sizeInput) || 0;
  const fee = sizeUsd * d.feePct;
  const marginRequired = sizeUsd / leverage;
  const shares = price > 0 ? sizeUsd / price : 0;

  // Estimated liquidation price for the hypothetical order.
  let estLiq = null;
  if (sizeUsd > 0 && d.maintenanceMargin > 0) {
    if (side === 'long' && leverage > 1) {
      const borrowed = sizeUsd - marginRequired;
      estLiq = borrowed / (1 - d.maintenanceMargin) / shares;
    } else if (side === 'short') {
      estLiq = (marginRequired + sizeUsd) / (1 + d.maintenanceMargin) / shares;
    }
  }

  const leverageOptions = [];
  for (let l = 1; l <= d.maxLeverage; l++) leverageOptions.push(l);

  const submit = () => {
    if (side === 'long') buyLong(ticker, sizeUsd, leverage);
    else if (side === 'short') sellShort(ticker, sizeUsd, leverage);
    else sellLongTicker(ticker, sizeUsd);
  };

  const setPctOfCash = (pct) => {
    const base = game.cash * pct;
    // Max affordable exposure: margin (size/leverage) + fee (size*feePct) must
    // fit inside `base`. Floor (never round up) so 100% always clears.
    const size = (base * leverage) / (1 + d.feePct * leverage);
    setSizeInput(size > 0 ? String(Math.floor(size)) : '0');
  };

  // Current long holdings in the selected ticker (used for Sell mode).
  const holdingsShares = game.positions
    .filter((p) => p.side === 'long' && p.ticker === ticker)
    .reduce((s, p) => s + p.shares, 0);
  const holdingsValue = holdingsShares * price;
  const sellValue = Math.min(sizeUsd, holdingsValue);
  const sellShares = price > 0 ? sellValue / price : 0;
  const sellFee = sellValue * d.feePct;

  const setPctOfPosition = (pct) => {
    const v = holdingsValue * pct;
    setSizeInput(v > 0 ? String(Math.floor(v)) : '0');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-3">
        🖥️ Trading Desk
      </h2>

      {/* Asset selector */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {tickers.map((t, idx) => {
          const p = prices[t];
          const chg = prevPrices ? (p - prevPrices[t]) / prevPrices[t] : 0;
          const active = t === ticker;
          const info = tickerInfo(t, currentStep(game).date);
          return (
            <div key={t} className="relative group">
              <button
                onClick={() => setTicker(t)}
                className={`w-full rounded-lg border px-1.5 py-2 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
                }`}
              >
                <div className="font-bold text-xs">{t}</div>
                <div className="font-mono text-[11px] text-slate-300">${p.toFixed(2)}</div>
                <div className={`text-[10px] font-mono ${chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {chg >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(chg))}
                </div>
              </button>
              <div
                className={`pointer-events-none absolute left-0 z-20 w-48 rounded-lg border border-slate-600 bg-slate-800 p-2.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 ${
                  idx < 5 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
                }`}
              >
                <div className="font-bold text-xs text-emerald-300">
                  {t} · {info.name}
                </div>
                <p className="text-[11px] leading-snug text-slate-300 mt-1">{info.blurb}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Price chart */}
      <div className="h-36 mb-4 bg-slate-950/60 rounded-lg border border-slate-800 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceHistory} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="px" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, ticker]}
            />
            <Area type="monotone" dataKey="price" stroke="#34d399" strokeWidth={2} fill="url(#px)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Order type toggle — buy and sell are always available; shorting is difficulty-gated */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => setSide('long')}
          className={`py-2 rounded-lg text-sm font-semibold transition ${
            side === 'long'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Buy / Long
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`py-2 rounded-lg text-sm font-semibold transition ${
            side === 'sell'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Sell / Close
        </button>
        <button
          onClick={() => d.shorting && setSide('short')}
          disabled={!d.shorting}
          title={d.shorting ? '' : 'Short selling disabled on Casual'}
          className={`py-2 rounded-lg text-sm font-semibold transition ${
            side === 'short'
              ? 'bg-rose-600 text-white'
              : d.shorting
              ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
          }`}
        >
          Short {!d.shorting && '🔒'}
        </button>
      </div>

      {/* Leverage selector */}
      <div className={`mb-3 ${side === 'sell' ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
          Leverage {side === 'sell' && '(n/a when closing)'}
        </div>
        <div className="flex gap-1.5">
          {leverageOptions.map((l) => (
            <button
              key={l}
              onClick={() => setLeverage(l)}
              className={`flex-1 py-1.5 rounded-md text-sm font-mono font-semibold transition ${
                leverage === l
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {l}x
            </button>
          ))}
        </div>
      </div>

      {/* Size input */}
      <div className="mb-3">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Position Size (USD)</span>
          <span className="text-[11px] text-slate-500 font-mono">Cash: {fmtMoney(game.cash)}</span>
        </div>
        <input
          type="number"
          min="0"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          placeholder="e.g. 5000"
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-emerald-500"
        />
        <div className="flex gap-1.5 mt-1.5">
          {[0.1, 0.25, 0.5, 1].map((p) => (
            <button
              key={p}
              onClick={() => (side === 'sell' ? setPctOfPosition(p) : setPctOfCash(p))}
              className="flex-1 text-[11px] py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
            >
              {p * 100}% {side === 'sell' ? 'pos' : 'cash'}
            </button>
          ))}
        </div>
      </div>

      {/* Position calculator */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 mb-3 text-xs font-mono space-y-1.5">
        {side === 'sell' ? (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Holdings ({ticker})</span>
              <span>{fmtMoney(holdingsValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Shares to Sell</span>
              <span>{sellShares > 0 ? sellShares.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Fee ({fmtPct(d.feePct)})</span>
              <span className="text-amber-300">{sellValue > 0 ? fmtMoney(sellFee) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Proceeds</span>
              <span>{sellValue > 0 ? fmtMoney(sellValue - sellFee) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Liquidation Price</span>
              <span className="text-slate-600">N/A</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-slate-500">Shares</span>
              <span>{shares > 0 ? shares.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Fee ({fmtPct(d.feePct)})</span>
              <span className="text-amber-300">{sizeUsd > 0 ? fmtMoney(fee) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Initial Margin Required</span>
              <span>{sizeUsd > 0 ? fmtMoney(marginRequired) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Borrowed (margin loan)</span>
              <span className="text-indigo-300">
                {side === 'long' && sizeUsd > 0 ? fmtMoney(sizeUsd - marginRequired) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Est. Liquidation Price</span>
              <span className={estLiq ? 'text-rose-400' : 'text-slate-600'}>
                {estLiq ? `$${estLiq.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          </>
        )}
      </div>

      <button
        onClick={submit}
        disabled={sizeUsd <= 0 || (side === 'sell' && holdingsValue <= 0)}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed ${
          side === 'long'
            ? 'bg-emerald-600 hover:bg-emerald-500'
            : side === 'sell'
            ? 'bg-amber-600 hover:bg-amber-500'
            : 'bg-rose-600 hover:bg-rose-500'
        }`}
      >
        {side === 'long'
          ? `Buy ${ticker} — ${leverage}x`
          : side === 'sell'
          ? `Sell ${ticker}`
          : `Short ${ticker} — ${leverage}x`}
      </button>
    </div>
  );
}
