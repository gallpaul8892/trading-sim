import { useGameStore, SCENARIOS } from '../store/useGameStore';
import { DIFFICULTIES } from '../engine/difficulties';
import { fmtMoney, fmtPct } from '../engine/engine';
import Leaderboard from './Leaderboard';

export default function SetupScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const scenario = SCENARIOS[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 tracking-tight">
          News-Driven <span className="text-emerald-400">Trading Simulator</span>
        </h1>
        <p className="text-center text-slate-400 mb-8">
          Trade real history, one headline at a time. Long, short, leverage — survive the cycle.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Scenario</div>
          <div className="text-xl font-semibold">{scenario.scenario_config.title}</div>
          <p className="text-slate-400 text-sm mt-1">{scenario.scenario_config.description}</p>
          <div className="flex gap-2 mt-3">
            {Object.keys(scenario.timeline[0].prices).map((t) => (
              <span key={t} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                {t}
              </span>
            ))}
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
              {scenario.timeline.length} monthly steps
            </span>
          </div>
        </div>

        <Leaderboard selectable difficultyId="casual" />

        <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          Select Difficulty
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(DIFFICULTIES).map((d) => (
            <button
              key={d.id}
              onClick={() => startGame(d.id, 0)}
              className="text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/60 rounded-xl p-5 transition group"
            >
              <div className="text-lg font-semibold group-hover:text-emerald-300">{d.name}</div>
              <div className="text-xs text-slate-500 mb-4">{d.tagline}</div>
              <ul className="text-sm space-y-1.5 text-slate-300">
                <li className="flex justify-between">
                  <span className="text-slate-500">Starting Cash</span>
                  <span className="font-mono">{fmtMoney(d.startingCash)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Max Leverage</span>
                  <span className="font-mono">{d.maxLeverage}x</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Trade Fee</span>
                  <span className="font-mono">{fmtPct(d.feePct)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Short Selling</span>
                  <span className="font-mono">{d.shorting ? 'Enabled' : 'Disabled'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Margin Call Level</span>
                  <span className="font-mono">
                    {d.maintenanceMargin > 0 ? fmtPct(d.maintenanceMargin, 0) : 'N/A'}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Daily Borrow Fee</span>
                  <span className="font-mono">
                    {d.borrowFeeDaily > 0 ? fmtPct(d.borrowFeeDaily, 2) : 'None'}
                  </span>
                </li>
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
