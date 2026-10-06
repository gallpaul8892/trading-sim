import { useState } from 'react';
import { DIFFICULTIES } from '../engine/difficulties';
import { fmtMoney } from '../engine/engine';
import { getTopScore } from '../utils/playerScores';

const NAMES = [
  'Marcus Hale', 'Priya Nair', 'Tobias Reinhardt', 'Yuki Tanaka', 'Elena Voss',
  'Dmitri Kozlov', 'Amara Okafor', 'Sofia Marchetti', 'Liam O\u2019Connor', 'Chen Wei',
];

// Casual top 10 spans $1.2M down to $840k; other levels scale with starting cash.
const CASUAL_TOP = 1200000;
const CASUAL_TENTH = 840000;

export function getLeaderboard(difficultyId) {
  const scale = DIFFICULTIES[difficultyId].startingCash / DIFFICULTIES.casual.startingCash;
  const offset = difficultyId === 'casual' ? 0 : DIFFICULTIES[difficultyId].startingCash % 7;
  return NAMES.map((name, i) => {
    const base = CASUAL_TOP - ((CASUAL_TOP - CASUAL_TENTH) * i) / 9;
    // deterministic jitter so values don't look evenly spaced
    const jitter = Math.sin((i + 1) * 12.9898 + offset) * 0.012 * base;
    const profit = Math.round(((i === 0 ? base : i === 9 ? base : base + jitter) * scale) / 100) * 100;
    return { name: difficultyId === 'casual' ? name : NAMES[(i + offset) % 10], profit };
  });
}

export default function Leaderboard({ difficultyId, selectable = false, player = null }) {
  const [tab, setTab] = useState(difficultyId || 'casual');
  const id = selectable ? tab : difficultyId;
  let rows = getLeaderboard(id);
  const storedTopScore = getTopScore(id);
  const playerProfit = player
    ? storedTopScore === null
      ? player.profit
      : Math.max(storedTopScore, player.profit)
    : storedTopScore;

  if (playerProfit !== null) {
    rows = [...rows, { name: 'You', profit: playerProfit, you: true }]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-widest text-slate-500">
          🏆 Leaderboard · Top 10 by Profit
        </h2>
        {selectable && (
          <div className="flex gap-1">
            {Object.values(DIFFICULTIES).map((d) => (
              <button
                key={d.id}
                onClick={() => setTab(d.id)}
                className={`text-xs px-2.5 py-1 rounded ${
                  tab === d.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <ol className="text-sm divide-y divide-slate-800">
        {rows.map((r, i) => (
          <li
            key={r.name + i}
            className={`flex items-center py-1.5 ${
              r.you ? 'text-emerald-300 font-semibold bg-emerald-500/10 -mx-2 px-2 rounded' : ''
            }`}
          >
            <span className="w-8 text-slate-500 font-mono">{i + 1}</span>
            <span className="flex-1">{r.name}</span>
            <span className="font-mono text-emerald-400">+{fmtMoney(r.profit)}</span>
          </li>
        ))}
      </ol>
      {playerProfit !== null && !rows.some((r) => r.you) && (
        <div className="mt-2 pt-2 border-t border-slate-800 flex text-sm text-slate-400">
          <span className="w-8">11+</span>
          <span className="flex-1">You</span>
          <span className="font-mono">
            {playerProfit >= 0 ? '+' : ''}
            {fmtMoney(playerProfit)}
          </span>
        </div>
      )}
    </div>
  );
}
