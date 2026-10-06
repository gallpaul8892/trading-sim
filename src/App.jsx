import { useGameStore } from './store/useGameStore';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import ReportScreen from './components/ReportScreen';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  if (screen === 'setup') return <SetupScreen />;
  if (screen === 'report') return <ReportScreen />;
  return <GameScreen />;
}
