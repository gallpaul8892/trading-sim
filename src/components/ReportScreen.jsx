import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGameStore } from '../store/useGameStore';
import { computeStats, fmtMoney, fmtPct } from '../engine/engine';

function StatCard({ label, value, tone }) {
  const tones = {
    good: 'text-emerald-400',
    bad: 'text-rose-400',
    neutral: 'text-slate-100',
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono ${tones[tone] || tones.neutral}`}>{value}</div>
    </div>
  );
}

export default function ReportScreen() {
  const game = useGameStore((s) => s.game);
  const restart = useGameStore((s) => s.restart);
  if (!game) return null;

  const stats = computeStats(game);
  const beatBenchmark = stats.totalReturn >= stats.benchmarkReturn;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-1">
          {stats.bankrupt ? '💥 Fund Liquidated' : '🏁 Campaign Complete'}
        </h1>
        <p className="text-slate-400">
          {game.scenario.scenario_config.title} · {game.difficulty.name} difficulty
        </p>
        {stats.bankrupt && (
          <p className="text-rose-400 text-sm mt-2">
            Your equity hit zero. The risk desk has seized the remaining collateral.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Final Equity"
          value={fmtMoney(stats.finalEquity)}
          tone={stats.totalReturn >= 0 ? 'good' : 'bad'}
        />
        <StatCard
          label="Total Return"
          value={fmtPct(stats.totalReturn)}
          tone={stats.totalReturn >= 0 ? 'good' : 'bad'}
        />
        <StatCard
          label="Buy & Hold Benchmark"
          value={fmtPct(stats.benchmarkReturn)}
          tone={beatBenchmark ? 'neutral' : 'bad'}
        />
        <StatCard
          label="vs Benchmark"
          value={`${beatBenchmark ? '+' : ''}${fmtPct(stats.totalReturn - stats.benchmarkReturn)}`}
          tone={beatBenchmark ? 'good' : 'bad'}
        />
        <StatCard label="Max Drawdown" value={fmtPct(stats.maxDrawdown)} tone="bad" />
        <StatCard label="Win Rate" value={`${fmtPct(stats.winRate, 0)} (${stats.totalTrades} trades)`} />
        <StatCard label="Total Fees Paid" value={fmtMoney(stats.totalFees)} tone="neutral" />
        <StatCard
          label="Margin Calls Survived"
          value={String(stats.marginCalls)}
          tone={stats.marginCalls > 0 ? 'bad' : 'good'}
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-slate-400 mb-3">
          Equity Curve vs Buy & Hold
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={game.history} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={6} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={56}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => fmtMoney(v)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="equity"
                name="Your Equity"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name="Buy & Hold"
                stroke="#818cf8"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats.liquidations.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-900 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-rose-300 mb-2">
            Forced Liquidations
          </h2>
          <ul className="text-sm text-rose-200/80 space-y-1 font-mono">
            {stats.liquidations.map((l, i) => (
              <li key={i}>
                {l.date} — {l.side.toUpperCase()} {l.ticker} closed ({fmtMoney(l.pnl)})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={restart}
          className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold transition shadow-lg shadow-emerald-900/40"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
