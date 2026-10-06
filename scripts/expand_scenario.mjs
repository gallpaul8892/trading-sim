// Expands the tech-bubble scenario from 3 tickers to 10.
// Price series are plausible split-adjusted paths shaped like the real
// 2000-2002 histories. Run once: node scripts/expand_scenario.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = new URL('../src/data/techBubble.json', import.meta.url);
const scenario = JSON.parse(readFileSync(PATH, 'utf8'));

const NEW_PRICES = {
  // Cisco — bubble poster child, ~$54 peak, 85% crash
  CSCO: [45.7, 51.2, 53.8, 48.3, 42.6, 47.9, 44.2, 48.5, 41.1, 37.4, 31.8, 28.4, 31.6, 25.3, 21.2, 23.8, 25.9, 19.6, 18.2, 15.9, 12.3, 15.4, 19.1, 18.2, 19.4, 16.8, 17.5, 14.2, 15.1, 13.8, 10.9, 12.6, 11.4, 12.1, 13.6, 12.95],
  // Intel — PC slowdown grind lower
  INTC: [41.9, 44.3, 48.1, 43.5, 39.8, 44.6, 47.2, 49.3, 41.6, 38.9, 34.2, 30.1, 32.5, 28.9, 27.4, 30.2, 29.8, 31.1, 28.3, 25.6, 21.9, 24.8, 27.6, 28.9, 27.2, 25.1, 26.4, 22.3, 21.6, 19.8, 15.9, 16.8, 15.2, 17.3, 19.6, 18.45],
  // Oracle — late-2000 peak, enterprise freeze
  ORCL: [27.9, 31.4, 35.8, 30.6, 27.9, 33.4, 31.8, 38.2, 42.6, 39.1, 33.8, 29.6, 30.2, 25.8, 22.4, 24.9, 23.6, 21.8, 18.9, 15.4, 12.8, 14.6, 16.9, 15.8, 16.4, 14.2, 15.1, 12.9, 12.3, 11.6, 9.2, 10.4, 9.8, 11.2, 12.6, 11.75],
  // Sun Microsystems — the great collapse, -95% peak to trough
  SUNW: [25.3, 28.9, 33.4, 29.8, 27.2, 31.6, 30.1, 34.8, 38.9, 35.2, 29.6, 24.8, 23.4, 18.9, 16.2, 17.8, 16.4, 14.9, 12.3, 10.1, 8.2, 9.6, 11.4, 10.8, 11.2, 9.4, 10.1, 7.8, 7.2, 6.4, 4.1, 4.8, 3.9, 3.2, 3.6, 2.95],
  // Yahoo — portal ad collapse
  YHOO: [108.2, 112.4, 102.6, 89.3, 82.1, 88.4, 84.2, 90.6, 76.3, 68.9, 54.2, 31.4, 30.8, 24.6, 19.8, 21.3, 23.9, 20.1, 18.4, 14.2, 9.6, 11.8, 16.4, 15.9, 17.2, 15.1, 16.8, 14.9, 15.6, 14.1, 10.3, 11.2, 9.8, 10.6, 12.3, 11.15],
  // eBay — the profitable survivor, actually UP over the period
  EBAY: [10.85, 12.4, 14.9, 12.2, 11.1, 13.6, 12.9, 15.4, 13.8, 14.6, 16.2, 15.4, 16.8, 18.3, 17.2, 19.6, 21.4, 20.8, 19.3, 17.6, 14.9, 16.8, 19.4, 21.2, 22.6, 21.3, 22.8, 20.4, 19.8, 18.9, 15.6, 16.9, 15.8, 17.4, 19.2, 17.05],
  // Qualcomm — early 2000 spike then long bleed
  QCOM: [44.6, 52.3, 58.9, 51.4, 46.8, 54.2, 49.6, 56.8, 52.3, 47.9, 41.6, 38.2, 42.4, 36.8, 33.4, 38.9, 41.2, 39.6, 35.8, 31.2, 26.4, 29.8, 34.6, 36.9, 38.2, 34.8, 36.4, 31.9, 30.6, 28.4, 23.8, 26.2, 24.6, 28.9, 33.4, 31.65],
};

const EXTRA_NEWS = {
  '2000-01': [
    { ticker: 'CSCO', headline: "Cisco Eyes 'Most Valuable Company' Crown as Orders Surge", summary: 'Networking gear demand seems insatiable; market cap closes in on Microsoft and GE.' },
  ],
  '2000-03': [
    { ticker: 'QCOM', headline: 'Qualcomm Soars on CDMA Licensing Wins', summary: 'Wireless royalty model has analysts racing to raise price targets.' },
  ],
  '2000-04': [
    { ticker: 'INTC', headline: 'Intel Flags Softening PC Orders', summary: 'Chip giant admits corporate buyers are pausing; semis sell off broadly.' },
  ],
  '2000-05': [
    { ticker: 'SUNW', headline: "Sun's Server Boom Shows First Cracks", summary: "The 'dot in dot-com' still growing fast, but startup customers are vanishing." },
  ],
  '2000-07': [
    { ticker: 'YHOO', headline: 'Yahoo Misses on Ad Revenue Slowdown', summary: 'Portal model under fire as dot-com advertisers go bust en masse.' },
  ],
  '2000-08': [
    { ticker: 'EBAY', headline: 'eBay Beats Street Again — Profitable Since Day One', summary: 'While peers burn cash, the auction house quietly compounds earnings.' },
  ],
  '2000-10': [
    { ticker: 'ORCL', headline: 'Oracle Insists Database Demand Remains Strong', summary: 'Ellison dismisses slowdown talk, but enterprise pipeline whispers grow louder.' },
  ],
  '2000-11': [
    { ticker: 'CSCO', headline: 'Cisco Customers Delay Equipment Orders', summary: 'Carrier capex cancellations hint the networking buildout has peaked.' },
  ],
  '2001-02': [
    { ticker: 'INTC', headline: 'Intel Cuts 5,000 Jobs as Chip Demand Evaporates', summary: 'First major layoffs in years underscore the depth of the PC downturn.' },
  ],
  '2001-03': [
    { ticker: 'SUNW', headline: 'Sun Warns: First Revenue Shortfall in a Decade', summary: 'McNealy concedes the startup gold rush that fueled growth is over.' },
  ],
  '2001-05': [
    { ticker: 'YHOO', headline: 'Yahoo CEO Koogle Steps Down Amid Ad Collapse', summary: 'Hollywood veteran Terry Semel brought in to reinvent the portal.' },
  ],
  '2001-06': [
    { ticker: 'EBAY', headline: 'eBay Raises Guidance — Auction Model Shrugs Off Recession', summary: 'Buyers hunting bargains keep volumes growing through the downturn.' },
  ],
  '2001-07': [
    { ticker: 'QCOM', headline: 'Qualcomm Trims Forecast as Handset Sales Slow', summary: 'Royalty stream holds up, but equipment revenue disappoints.' },
  ],
  '2001-08': [
    { ticker: 'ORCL', headline: 'Oracle Layoffs Confirm Enterprise Spending Freeze', summary: 'Even the database king cannot escape the IT budget drought.' },
  ],
  '2001-10': [
    { ticker: 'CSCO', headline: 'Cisco Swings to First-Ever Quarterly Loss', summary: 'Chambers calls it the toughest environment in company history.' },
  ],
  '2001-12': [
    { ticker: 'EBAY', headline: 'eBay Holiday Auction Volumes Smash Records', summary: 'The marketplace model proves its resilience when it matters most.' },
  ],
  '2002-01': [
    { ticker: 'SUNW', headline: 'Sun Bleeds Share to Dell and IBM', summary: 'Cheap Intel-based servers eat the high-end Unix franchise alive.' },
  ],
  '2002-02': [
    { ticker: 'YHOO', headline: 'Yahoo Buys HotJobs, Pivots to Paid Services', summary: 'Semel bets subscriptions and listings can replace vanished banner ads.' },
  ],
  '2002-03': [
    { ticker: 'QCOM', headline: 'Qualcomm Signs Major 3G Licensing Deals in Asia', summary: 'Korean and Japanese carriers commit to CDMA for next-gen networks.' },
  ],
  '2002-04': [
    { ticker: 'INTC', headline: 'Intel Margins Squeezed by AMD Price War', summary: 'Athlon gains force unprecedented discounting in the CPU market.' },
  ],
  '2002-05': [
    { ticker: 'ORCL', headline: 'Oracle Beats Earnings but Guidance Disappoints', summary: 'Cost cuts deliver the quarter, yet new license sales keep shrinking.' },
  ],
  '2002-06': [
    { ticker: 'CSCO', headline: 'Cisco Writes Down $2.2B in Excess Inventory', summary: 'The cost of betting on endless growth finally hits the income statement.' },
  ],
  '2002-08': [
    { ticker: 'EBAY', headline: 'eBay Moves to Acquire PayPal for $1.5B', summary: 'Payments integration locks in the marketplace flywheel.' },
  ],
  '2002-09': [
    { ticker: 'SUNW', headline: 'Sun Falls Below $4 — Down 92% From Peak', summary: 'From dot-com kingpin to penny-stock territory in 24 months.' },
  ],
};

for (const step of scenario.timeline) {
  const i = scenario.timeline.indexOf(step);
  for (const [ticker, series] of Object.entries(NEW_PRICES)) {
    step.prices[ticker] = series[i];
  }
  const extra = EXTRA_NEWS[step.date];
  if (extra) {
    step.news = [...step.news, ...extra].slice(0, 3);
  }
}

scenario.scenario_config.description =
  'Trade 10 tech stocks — MSFT, AAPL, AMZN, CSCO, INTC, ORCL, SUNW, YHOO, EBAY, QCOM — through the dot-com boom, bust and the first signs of recovery. 36 monthly decision points from January 2000 to December 2002.';

writeFileSync(PATH, JSON.stringify(scenario, null, 2) + '\n');

// Sanity checks
for (const step of scenario.timeline) {
  const n = Object.keys(step.prices).length;
  if (n !== 10) throw new Error(`${step.date} has ${n} tickers, expected 10`);
  if (step.news.length > 3) throw new Error(`${step.date} has ${step.news.length} news items`);
}
console.log(`Scenario expanded: ${scenario.timeline.length} steps x 10 tickers.`);
