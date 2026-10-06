# News-Driven Trading Simulator

Turn-based trading simulator: trade 10 tech stocks (MSFT, AAPL, AMZN, CSCO,
INTC, ORCL, SUNW, YHOO, EBAY, QCOM) across the entire 2000s decade — the
dot-com peak and crash, the recovery, the iPhone era, and the 2008 financial
crisis. Spot trading, short selling, leverage, borrow fees, and margin calls —
all driven by a monthly news/timeline engine (120 decision points).

## Run

```powershell
npm.cmd install
npm.cmd run dev   # http://localhost:5173
```

> Note: on this machine use `npm.cmd` (PowerShell execution policy blocks `npm.ps1`).

## Test / Build

```powershell
node .\src\engine\engine.test.mjs   # engine smoke tests
npm.cmd run build                   # production build
```

## How to Play

1. Pick a difficulty (Casual $100k/1x, Traded Desk $25k/2x, Hedge Fund $10k/5x).
2. Use the Light mode / Dark mode button to choose a theme; your preference is saved in this browser.
3. Each month, read the news wire, then place trades in the Trading Desk.
4. Click **Advance to Next Date** — prices move, fees and borrow costs accrue,
   and margin maintenance is enforced. If your Equity / Exposure ratio falls
   below the maintenance level, the engine force-liquidates your worst position.
5. Survive to Dec 2009 and compare your equity curve against buy-and-hold.

## Architecture

- [src/engine/engine.js](src/engine/engine.js) — pure accounting core: cash,
  borrowed margin, short liabilities, equity, margin health, liquidation prices,
  margin-call loop, stats. No React dependencies; unit-testable in Node.
- [src/engine/difficulties.js](src/engine/difficulties.js) — difficulty presets.
- [src/data/techBubble.json](src/data/techBubble.json) — scenario in the spec's
  JSON schema (`scenario_config` + `timeline` of `{date, news, prices}`).
- [src/store/useGameStore.js](src/store/useGameStore.js) — Zustand store that
  clones game state, applies engine mutations, and exposes them to React.
- [src/components/](src/components) — Setup, Game (header dashboard, news feed,
  trading desk, portfolio), and Report screens.

### Accounting model

- `Equity = Cash + LongValue − BorrowedMargin − ShortLiability`
- `MarginHealth = Equity / TotalExposure` — margin call when below the
  difficulty's maintenance level; worst-losing position is force-liquidated
  until health is restored.
- Long liquidation price: `V_liq = Borrowed / (1 − m)`;
  short: `V_liq = (Collateral + Proceeds) / (1 + m)`.
- Hardcore mode charges 0.03%/day on borrowed margin + short liabilities,
  pro-rated by actual days between timeline steps.
