import { useState } from 'react';
import { useGameStore, useAccount, currentPrices, currentStep, computePerAsset } from '../store/useGameStore';
import { fmtMoney, fmtPct, liquidationPrice } from '../engine/engine';
import { tickerInfo } from '../data/tickerInfo';

export default function PortfolioPanel() {
  const game = useGameStore((s) => s.game);
  const sellLong = useGameStore((s) => s.sellLong);
  const coverShort = useGameStore((s) => s.coverShort);
  const acct = useAccount();
  const prices = currentPrices(game);
  const [fraction, setFraction] = useState(1);

  const m = game.difficulty.maintenanceMargin;
  const perAsset = computePerAsset(game, prices);
  const gameDate = currentStep(game).date;

  const pnlCell = (v) => (
    <span className={v > 0.005 ? 'text-emerald-400' : v < -0.005 ? 'text-rose-400' : 'text-slate-500'}>
      {Math.abs(v) < 0.005 ? '—' : fmtMoney(v)}
    </span>
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-400">
          📂 Portfolio
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          Close:
          {[0.25, 0.5, 1].map((f) => (
            <button
              key={f}
              onClick={() => setFraction(f)}
              className={`px-2 py-0.5 rounded ${
                fraction === f ? 'bg-slate-100 text-slate-900 font-semibold' : 'bg-slate-800 hover:bg-slate-700'
              }`}
            >
              {f * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Account summary */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-500 text-[10px] uppercase">Unrealized P&L</div>
          <div className={acct.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {fmtMoney(acct.unrealizedPnl)}
          </div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-500 text-[10px] uppercase">Total Exposure</div>
          <div>{fmtMoney(acct.exposure)}</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-500 text-[10px] uppercase">Borrowed Margin</div>
          <div className="text-indigo-300">{fmtMoney(game.borrowedMargin)}</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="text-slate-500 text-[10px] uppercase">Short Liability</div>
          <div className="text-rose-300">{fmtMoney(acct.shortLiability)}</div>
        </div>
      </div>

      {/* Per-asset breakdown */}
      <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 mb-2">
        P&L by Asset
      </h3>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-500 text-left border-b border-slate-800">
              <th className="pb-1.5 pr-2 font-medium">Asset</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Net Value</th>
              <th className="pb-1.5 pr-2 font-medium text-right">% Equity</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Unreal.</th>
              <th className="pb-1.5 pr-2 font-medium text-right">Realized</th>
              <th className="pb-1.5 font-medium text-right">Total P&L</th>
            </tr>
          </thead>
          <tbody>
            {perAsset.map((r) => {
              const active = r.exposure > 0 || Math.abs(r.realized) > 0.005;
              const equityShare = acct.equity !== 0 ? r.netValue / acct.equity : 0;
              return (
                <tr
                  key={r.ticker}
                  className={`border-b border-slate-800/50 last:border-0 ${active ? '' : 'opacity-40'}`}
                >
                  <td className="py-1.5 pr-2 font-bold">
                    <span title={tickerInfo(r.ticker, gameDate).blurb} className="cursor-help border-b border-dotted border-slate-600">
                      {r.ticker}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 text-right">
                    {r.exposure > 0 ? (
                      <span title={`${r.netShares.toFixed(1)} net shares`}>
                        {fmtMoney(r.netValue)}
                        {r.shortLiability > 0 && r.longValue === 0 && (
                          <span className="text-rose-400 text-[10px]"> short</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-slate-400">
                    {r.exposure > 0 ? fmtPct(equityShare, 0) : '—'}
                  </td>
                  <td className="py-1.5 pr-2 text-right">{pnlCell(r.unrealized)}</td>
                  <td className="py-1.5 pr-2 text-right">{pnlCell(r.realized)}</td>
                  <td className="py-1.5 text-right font-semibold">{pnlCell(r.totalPnl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 mb-2">
        Open Positions
      </h3>
      {game.positions.length === 0 ? (
        <div className="text-sm text-slate-500 italic text-center py-8">
          No open positions. Use the trading desk to enter a trade.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left border-b border-slate-800">
                <th className="pb-2 pr-2 font-medium">Position</th>
                <th className="pb-2 pr-2 font-medium text-right">Entry</th>
                <th className="pb-2 pr-2 font-medium text-right">Current</th>
                <th className="pb-2 pr-2 font-medium text-right">Liq. Px</th>
                <th className="pb-2 pr-2 font-medium text-right">P&L</th>
                <th className="pb-2 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {game.positions.map((p) => {
                const cur = prices[p.ticker];
                const value = p.shares * cur;
                const pnl =
                  p.side === 'long'
                    ? (cur - p.entryPrice) * p.shares
                    : (p.entryPrice - cur) * p.shares;
                const pnlPct = pnl / (p.shares * p.entryPrice);
                const liq = liquidationPrice(p, m);
                return (
                  <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            p.side === 'long' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
                          }`}
                        >
                          {p.side === 'long' ? 'LONG' : 'SHORT'}
                        </span>
                        <span className="font-bold">{p.ticker}</span>
                        <span className="text-indigo-300 font-mono">{p.leverage}x</span>
                      </div>
                      <div className="text-slate-500 font-mono mt-0.5">
                        {p.shares.toFixed(1)} sh · {fmtMoney(value)}
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-right font-mono">${p.entryPrice.toFixed(2)}</td>
                    <td className="py-2.5 pr-2 text-right font-mono">${cur.toFixed(2)}</td>
                    <td className="py-2.5 pr-2 text-right font-mono text-slate-400">
                      {liq ? `$${liq.toFixed(2)}` : '—'}
                    </td>
                    <td className={`py-2.5 pr-2 text-right font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtMoney(pnl)}
                      <div className="text-[10px] opacity-75">{fmtPct(pnlPct)}</div>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => (p.side === 'long' ? sellLong(p.id, fraction) : coverShort(p.id, fraction))}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          p.side === 'long'
                            ? 'bg-slate-800 hover:bg-emerald-700 text-slate-300 hover:text-white'
                            : 'bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {p.side === 'long' ? 'Sell' : 'Cover'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
