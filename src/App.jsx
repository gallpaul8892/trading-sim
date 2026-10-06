import { useEffect, useState } from 'react';
import { useGameStore } from './store/useGameStore';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import ReportScreen from './components/ReportScreen';

const THEME_STORAGE_KEY = 'trading-sim-theme';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const [isLight, setIsLight] = useState(
    () => window.localStorage.getItem(THEME_STORAGE_KEY) === 'light'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? 'light' : 'dark';
    window.localStorage.setItem(THEME_STORAGE_KEY, isLight ? 'light' : 'dark');
  }, [isLight]);

  return (
    <>
      {screen === 'setup' ? <SetupScreen /> : screen === 'report' ? <ReportScreen /> : <GameScreen />}
      <button
        type="button"
        onClick={() => setIsLight((current) => !current)}
        aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        aria-pressed={isLight}
        className="fixed top-4 right-4 z-50 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg transition hover:bg-slate-700"
      >
        {isLight ? '☾ Dark mode' : '☀ Light mode'}
      </button>
    </>
  );
}
