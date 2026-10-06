import { useState } from 'react';
import { useGameStore, currentStep } from '../store/useGameStore';
import { tickerInfo } from '../data/tickerInfo';

const TICKER_COLORS = {
  MACRO: 'border-amber-500/50 text-amber-300 bg-amber-950/40',
  MSFT: 'border-sky-500/50 text-sky-300 bg-sky-950/40',
  AAPL: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40',
  AMZN: 'border-orange-500/50 text-orange-300 bg-orange-950/40',
  CSCO: 'border-teal-500/50 text-teal-300 bg-teal-950/40',
  INTC: 'border-blue-500/50 text-blue-300 bg-blue-950/40',
  ORCL: 'border-red-500/50 text-red-300 bg-red-950/40',
  SUNW: 'border-violet-500/50 text-violet-300 bg-violet-950/40',
  YHOO: 'border-fuchsia-500/50 text-fuchsia-300 bg-fuchsia-950/40',
  EBAY: 'border-lime-500/50 text-lime-300 bg-lime-950/40',
  QCOM: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40',
};

export default function NewsFeed() {
  const game = useGameStore((s) => s.game);
  const [filter, setFilter] = useState('ALL');
  const step = currentStep(game);
  const tickers = Object.keys(step.prices);
  const filters = ['ALL', 'MACRO', ...tickers];
  const news = step.news.filter((n) => filter === 'ALL' || n.ticker === filter);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-400">
          📰 Market Wire — {step.date}
        </h2>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            title={f !== 'ALL' ? tickerInfo(f, step.date).blurb : undefined}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
              filter === f
                ? 'bg-slate-100 text-slate-900 border-slate-100 font-semibold'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {news.length === 0 && (
          <div className="text-sm text-slate-500 italic">No news for this filter this month.</div>
        )}
        {news.map((n, i) => (
          <article
            key={i}
            className={`border rounded-lg p-3 ${TICKER_COLORS[n.ticker] || TICKER_COLORS.MACRO}`}
          >
            <div className="text-[10px] font-bold tracking-widest mb-1 opacity-80">{n.ticker}</div>
            <h3 className="font-semibold text-sm text-slate-100 leading-snug">{n.headline}</h3>
            <p className="text-xs mt-1.5 text-slate-300/80 leading-relaxed">{n.summary}</p>
          </article>
        ))}
      </div>
      <p className="text-[11px] text-slate-600 mt-4 italic">
        Trade on this information, then advance the clock to see how the market reacts.
      </p>
    </div>
  );
}
