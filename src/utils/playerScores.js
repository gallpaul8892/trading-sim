const TOP_SCORE_KEY_PREFIX = 'trading-sim-top-score:';

export function getTopScore(difficultyId) {
  const stored = window.localStorage.getItem(`${TOP_SCORE_KEY_PREFIX}${difficultyId}`);
  if (stored === null) return null;

  const score = Number(stored);
  return Number.isFinite(score) ? score : null;
}

export function recordTopScore(difficultyId, score) {
  const previousBest = getTopScore(difficultyId);
  const best = previousBest === null ? score : Math.max(previousBest, score);
  if (best !== previousBest) {
    window.localStorage.setItem(`${TOP_SCORE_KEY_PREFIX}${difficultyId}`, String(best));
  }
  return best;
}
