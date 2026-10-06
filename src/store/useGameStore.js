import { create } from 'zustand';
import {
  startCampaign,
  openLong,
  closeLong,
  closeLongByTicker,
  openShort,
  coverShort,
  advanceStep,
  computeAccount,
  computePerAsset,
  currentPrices,
  currentStep,
} from '../engine/engine';
import { DIFFICULTIES } from '../engine/difficulties';
import techBubble from '../data/techBubble.json';

export const SCENARIOS = [techBubble];

function clone(game) {
  // Structured clone so React sees a new reference every mutation.
  return structuredClone(game);
}

export const useGameStore = create((set, get) => ({
  screen: 'setup', // 'setup' | 'game' | 'report'
  game: null,
  error: null,
  notice: null, // transient info (margin call events etc.)

  startGame: (difficultyId, scenarioIndex = 0) => {
    const game = startCampaign(SCENARIOS[scenarioIndex], DIFFICULTIES[difficultyId]);
    set({ screen: 'game', game, error: null, notice: null });
  },

  restart: () => set({ screen: 'setup', game: null, error: null, notice: null }),

  clearMessages: () => set({ error: null, notice: null }),

  // Wrap an engine mutation; surfaces errors to the UI instead of throwing.
  mutate: (fn) => {
    const { game } = get();
    if (!game || game.finished) return;
    const next = clone(game);
    try {
      fn(next);
      set({ game: next, error: null });
    } catch (e) {
      set({ error: e.message });
    }
  },

  buyLong: (ticker, sizeUsd, leverage) =>
    get().mutate((g) => openLong(g, ticker, sizeUsd, leverage)),

  sellLong: (positionId, fraction) =>
    get().mutate((g) => closeLong(g, positionId, fraction)),

  sellLongTicker: (ticker, sizeUsd) =>
    get().mutate((g) => closeLongByTicker(g, ticker, sizeUsd)),

  sellShort: (ticker, sizeUsd, leverage) =>
    get().mutate((g) => openShort(g, ticker, sizeUsd, leverage)),

  coverShort: (positionId, fraction) =>
    get().mutate((g) => coverShort(g, positionId, fraction)),

  advance: () => {
    const { game } = get();
    if (!game || game.finished) return;
    const next = clone(game);
    const { finished, liquidated } = advanceStep(next);
    let notice = null;
    if (liquidated.length > 0) {
      const names = liquidated.map((p) => `${p.side.toUpperCase()} ${p.ticker}`).join(', ');
      notice = `MARGIN CALL — forced liquidation: ${names}`;
    }
    if (next.bankrupt) {
      notice = 'Account equity hit zero. The fund has been liquidated.';
    }
    set({ game: next, notice, error: null, screen: finished ? 'report' : 'game' });
  },

  finishEarly: () => {
    const { game } = get();
    if (!game) return;
    const next = clone(game);
    next.finished = true;
    set({ game: next, screen: 'report' });
  },
}));

// Selectors / helpers for components
export function useAccount() {
  const game = useGameStore((s) => s.game);
  if (!game) return null;
  return computeAccount(game, currentPrices(game));
}

export { computeAccount, computePerAsset, currentPrices, currentStep };
