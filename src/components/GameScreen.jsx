import { useGameStore, useAccount, currentStep } from '../store/useGameStore';
import { fmtMoney } from '../engine/engine';
import NewsFeed from './NewsFeed';
import TradingDesk from './TradingDesk';
import PortfolioPanel from './PortfolioPanel';
import MarginHealthBar from './MarginHealthBar';

export default function GameScreen() {
  const game = useGameStore((s) => s.game);
  const advance = useGameStore((s) => s.advance);
  const finishEarly = useGameStore((s) => s.finishEarly);
  const restart = useGameStore((s) => s.restart);
  const error = useGameStore((s) => s.error);
  const notice = useGameStore((s) => s.notice);
  const clearMessages = useGameStore((s) => s.clearMessages);
  const acct = useAccount();

  if (!game || !acct) return null;
  const step = currentStep(game);
  const d = game.difficulty;
  const isLastStep = game.stepIndex >= game.scenario.timeline.length - 1;
  const marginUsed = game.borrowedMargin + acct.shortLiability;
  const pnl = acct.equity - game.startingCash;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header Dashboard */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Date</div>
            <div className="text-lg font-bold font-mono">{step.date}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Total Equity</div>
            <div className={`text-lg font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fmtMoney(acct.equity)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Cash</div>
            <div className="text-lg font-semibold font-mono text-slate-200">{fmtMoney(game.cash)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Margin Used</div>
            <div className="text-lg font-semibold font-mono text-amber-300">{fmtMoney(marginUsed)}</div>
          </div>
          <div className="min-w-[220px] flex-1 max-w-sm">
            <MarginHealthBar acct={acct} maintenance={d.maintenanceMargin} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={finishEarly}
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              End Campaign
            </button>
            <button
              onClick={restart}
              className="text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Restart
            </button>
            <button
              onClick={advance}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm transition shadow-lg shadow-emerald-900/40"
            >
              {isLastStep ? 'Finish & View Report →' : 'Advance to Next Date →'}
            </button>
          </div>
        </div>
        {(error || notice) && (
          <div className="max-w-[1600px] mx-auto mt-2 flex gap-2">
            {error && (
              <div className="flex-1 bg-rose-950/70 border border-rose-800 text-rose-200 text-sm rounded-lg px-3 py-2 flex justify-between items-center">
                <span>⚠ {error}</span>
                <button onClick={clearMessages} className="text-rose-400 hover:text-rose-200 ml-3">✕</button>
              </div>
            )}
            {notice && (
              <div className="flex-1 bg-amber-950/70 border border-amber-800 text-amber-200 text-sm rounded-lg px-3 py-2 flex justify-between items-center">
                <span>📉 {notice}</span>
                <button onClick={clearMessages} className="text-amber-400 hover:text-amber-200 ml-3">✕</button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
          <NewsFeed />
        </div>
        <div className="lg:col-span-8 xl:col-span-5 order-1 lg:order-2">
          <TradingDesk />
        </div>
        <div className="lg:col-span-12 xl:col-span-4 order-3">
          <PortfolioPanel />
        </div>
      </main>
    </div>
  );
}
