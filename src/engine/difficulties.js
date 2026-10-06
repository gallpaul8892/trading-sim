// Difficulty presets per game spec.
export const DIFFICULTIES = {
  casual: {
    id: 'casual',
    name: 'Casual',
    tagline: 'Beginner — spot trading only',
    startingCash: 100000,
    maxLeverage: 1,
    feePct: 0.005,
    shorting: false,
    maintenanceMargin: 0, // no margin calls possible
    borrowFeeDaily: 0,
  },
  trader: {
    id: 'trader',
    name: 'Traded Desk',
    tagline: 'Intermediate — 2x leverage & shorting',
    startingCash: 25000,
    maxLeverage: 2,
    feePct: 0.01,
    shorting: true,
    maintenanceMargin: 0.25,
    borrowFeeDaily: 0,
  },
  hedge: {
    id: 'hedge',
    name: 'Hedge Fund Operator',
    tagline: 'Hardcore — 5x leverage, borrow fees, tight margin',
    startingCash: 10000,
    maxLeverage: 5,
    feePct: 0.01,
    shorting: true,
    maintenanceMargin: 0.35,
    borrowFeeDaily: 0.0003, // 0.03% per day on shorts + leveraged longs
  },
};
