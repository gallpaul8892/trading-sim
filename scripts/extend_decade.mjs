// Extends the scenario from 36 steps (2000-2002) to 120 (2000-2009).
// Appends monthly steps 2003-01 .. 2009-12. Existing steps are preserved verbatim.
// Prices are anchor-interpolated monthly paths approximating the real decade;
// news = handcrafted key events + auto-generated commentary on monthly movers.
// Run: node scripts/extend_decade.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = new URL('../src/data/techBubble.json', import.meta.url);
const scenario = JSON.parse(readFileSync(PATH, 'utf8'));

if (scenario.timeline.length !== 36) {
  console.error(`Expected 36 existing steps, found ${scenario.timeline.length}. Aborting to avoid duplication.`);
  process.exit(1);
}

const TICKERS = ['MSFT', 'AAPL', 'AMZN', 'CSCO', 'INTC', 'ORCL', 'SUNW', 'YHOO', 'EBAY', 'QCOM'];

// Anchor points: [monthIndex (0 = 2003-01), price]. Linear interpolation between anchors.
const ANCHORS = {
  MSFT: [[0, 19.5], [5, 20.5], [11, 23.0], [17, 21.5], [23, 24.5], [29, 21.0], [35, 22.5], [41, 21.5], [47, 24.5], [53, 29.0], [57, 34.2], [59, 35.0], [65, 26.0], [68, 23.0], [71, 17.0], [74, 15.5], [83, 29.0]],
  AAPL: [[0, 0.52], [4, 0.62], [11, 0.95], [16, 1.4], [23, 2.6], [26, 2.4], [35, 5.3], [41, 4.4], [47, 6.9], [48, 9.4], [53, 11.4], [59, 14.2], [65, 10.5], [68, 8.4], [71, 6.1], [74, 3.6], [79, 5.2], [83, 7.2]],
  AMZN: [[0, 21.5], [3, 26.0], [11, 54.0], [17, 42.0], [23, 38.0], [29, 42.0], [35, 45.0], [38, 32.0], [41, 31.0], [47, 44.0], [53, 66.0], [59, 94.0], [65, 72.0], [68, 60.0], [71, 42.0], [74, 52.0], [79, 86.0], [83, 125.0]],
  CSCO: [[0, 14.2], [5, 16.8], [11, 23.2], [17, 19.4], [23, 20.6], [29, 18.9], [35, 18.1], [41, 21.2], [47, 25.4], [53, 27.1], [57, 32.4], [59, 28.9], [65, 22.4], [68, 21.2], [71, 16.5], [74, 14.8], [83, 24.1]],
  INTC: [[0, 16.8], [3, 21.4], [11, 30.1], [17, 23.6], [23, 24.9], [29, 23.4], [35, 26.3], [41, 20.6], [47, 21.4], [53, 24.6], [59, 27.0], [65, 21.8], [68, 20.4], [71, 14.6], [74, 13.1], [83, 20.8]],
  ORCL: [[0, 12.4], [6, 12.8], [11, 13.9], [17, 11.6], [23, 13.2], [29, 12.4], [35, 12.8], [41, 14.6], [47, 17.4], [53, 20.1], [59, 22.8], [65, 19.4], [68, 18.2], [71, 15.1], [74, 16.4], [76, 19.6], [83, 24.2]],
  SUNW: [[0, 3.1], [5, 3.6], [11, 4.4], [17, 4.1], [23, 5.2], [29, 4.3], [35, 4.6], [41, 4.9], [47, 6.1], [53, 5.8], [59, 5.4], [65, 4.2], [68, 3.6], [71, 2.7], [74, 4.1], [75, 6.8], [83, 8.9]],
  YHOO: [[0, 12.8], [4, 16.4], [11, 27.2], [17, 31.6], [23, 36.4], [29, 34.8], [35, 39.2], [41, 32.1], [47, 25.8], [53, 27.4], [59, 23.2], [61, 20.6], [64, 29.4], [68, 24.2], [71, 11.8], [74, 12.9], [83, 16.4]],
  EBAY: [[0, 18.9], [5, 24.6], [11, 33.8], [17, 38.4], [23, 43.2], [29, 48.6], [35, 55.1], [41, 31.4], [47, 33.8], [53, 36.2], [59, 32.6], [65, 28.4], [68, 22.6], [71, 12.4], [74, 10.8], [83, 23.4]],
  QCOM: [[0, 33.4], [4, 38.6], [11, 44.2], [17, 41.6], [23, 43.8], [29, 39.6], [35, 44.8], [41, 38.4], [47, 42.6], [53, 41.8], [59, 43.2], [65, 48.6], [68, 44.2], [71, 36.8], [74, 34.6], [83, 47.4]],
};

// Deterministic ±2% wobble so paths don't look ruler-straight.
function noise(ticker, i) {
  let h = 0;
  const s = ticker + ':' + i;
  for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * 0.04;
}

function interpolate(anchors, i) {
  for (let a = 0; a < anchors.length - 1; a++) {
    const [i0, p0] = anchors[a];
    const [i1, p1] = anchors[a + 1];
    if (i >= i0 && i <= i1) {
      const t = (i - i0) / (i1 - i0);
      return p0 + (p1 - p0) * t;
    }
  }
  return anchors[anchors.length - 1][1];
}

// Handcrafted key events, keyed by YYYY-MM.
const KEY_NEWS = {
  '2003-01': [{ ticker: 'MACRO', headline: 'Bush Proposes $674B Tax Cut to Jolt the Economy', summary: 'Dividend tax elimination plan cheers equity bulls as recovery struggles to take hold.' }],
  '2003-02': [{ ticker: 'MACRO', headline: 'War Drums in Iraq Keep Markets on Edge', summary: 'Geopolitical uncertainty caps the winter rally; volatility gauges stay elevated.' }],
  '2003-03': [{ ticker: 'MACRO', headline: 'Iraq War Begins — Stocks Rally on Relief', summary: 'Markets pop on the removal of uncertainty; beaten-down tech leads the charge off the lows.' }],
  '2003-04': [{ ticker: 'AMZN', headline: 'Amazon Posts Second Straight Profitable Quarter', summary: 'Free shipping and third-party sellers drive the turnaround story into high gear.' }],
  '2003-05': [{ ticker: 'AAPL', headline: 'iTunes Music Store Sells 1 Million Songs in First Week', summary: "The 99-cent download model catches fire — Apple's 'digital hub' bet starts paying off." }],
  '2003-06': [{ ticker: 'MACRO', headline: 'Fed Cuts to 1% — Lowest Since 1958', summary: 'Ultra-cheap money pours fuel on the recovery trade.' }],
  '2003-07': [{ ticker: 'ORCL', headline: 'Oracle Launches Hostile $5.1B Bid for PeopleSoft', summary: 'Ellison declares the enterprise software consolidation war officially open.' }],
  '2003-08': [{ ticker: 'QCOM', headline: '3G Rollout Accelerates in Asia, Qualcomm Royalties Climb', summary: 'CDMA licensing machine hums as carriers race to deploy next-gen networks.' }],
  '2003-09': [{ ticker: 'YHOO', headline: 'Yahoo Ad Revenue Roars Back With Overture Deal', summary: 'Paid search acquisition transforms the portal into a recovery winner.' }],
  '2003-10': [{ ticker: 'CSCO', headline: 'Cisco Orders Inflect Higher — Chambers Turns Cautiously Optimistic', summary: 'Corporate network spending thaws for the first time in three years.' }],
  '2003-11': [{ ticker: 'MACRO', headline: 'Nasdaq Up 45% Year-to-Date as Risk Appetite Returns', summary: 'Momentum funds pile back into the same names they dumped in 2002.' }],
  '2003-12': [{ ticker: 'MACRO', headline: 'Year in Review: The Recovery Is Real', summary: 'Every major tech name finished higher in 2003. The bust finally looks like history.' }],
  '2004-01': [{ ticker: 'EBAY', headline: 'eBay Holiday GMV Smashes Estimates Again', summary: 'The auction king extends its streak of market-beating growth quarters.' }],
  '2004-02': [{ ticker: 'MACRO', headline: 'IPO Window Creaks Back Open', summary: 'Bankers dust off their tech pipelines; talk of a certain search engine filing grows louder.' }],
  '2004-04': [{ ticker: 'INTC', headline: 'Intel Cancels Next-Gen Chip Amid Design Stumbles', summary: "Execution wobbles at the chip giant hand momentum to rival AMD's Opteron." }],
  '2004-07': [{ ticker: 'MSFT', headline: 'Microsoft Unveils $75B Cash Return — Largest in History', summary: 'Special dividend and buyback mark the official maturation of the former growth rocket.' }],
  '2004-08': [{ ticker: 'MACRO', headline: 'Google IPO Debuts at $85 — Tech Market Has Its New Darling', summary: 'Dutch auction pricing frustrates Wall Street, but the listing symbolizes the post-bust era.' }],
  '2004-10': [{ ticker: 'AAPL', headline: 'iPod Photo Unveiled as Apple Momentum Builds', summary: 'The white earbuds are everywhere; analysts scramble to raise holiday estimates.' }],
  '2004-12': [{ ticker: 'AAPL', headline: 'Apple Holiday Blowout: iPod Sales Up 500% Year-over-Year', summary: 'The halo effect is real — Mac sales surge alongside the music player phenomenon.' }],
  '2005-01': [{ ticker: 'AAPL', headline: 'Apple Launches $99 iPod Shuffle and $499 Mac mini', summary: 'Cupertino attacks the low end of both music players and PCs at once.' }],
  '2005-03': [{ ticker: 'SUNW', headline: 'Sun Swings to Loss, McNealy Under Pressure', summary: 'The once-mighty server vendor keeps shrinking as x86 boxes eat its lunch.' }],
  '2005-06': [{ ticker: 'AAPL', headline: "Stunner: Apple Ditches PowerPC for Intel Chips", summary: "Jobs announces the Mac's brain transplant — INTC rallies on the marquee design win." }],
  '2005-09': [{ ticker: 'AAPL', headline: 'iPod nano Replaces the mini — Thinner Than a Pencil', summary: 'Another category-defining hit keeps the Apple flywheel spinning.' }],
  '2005-12': [{ ticker: 'MACRO', headline: 'Year in Review: Flat Indices Hide Massive Stock Dispersion', summary: 'Apple up 123%, eBay flying, while Dell-era PC names stall — stock-picking is back.' }],
  '2006-01': [{ ticker: 'INTC', headline: 'First Intel Macs Ship as Viiv Platform Launches', summary: 'The Wintel duopoly gets a new member; analysts debate margin impact.' }],
  '2006-03': [{ ticker: 'AMZN', headline: 'Amazon Quietly Launches S3 Cloud Storage', summary: 'A curious side project: rentable computing infrastructure. Few on Wall Street pay attention.' }],
  '2006-06': [{ ticker: 'YHOO', headline: 'Yahoo Delays Panama Ad Platform — Stock Plunges 20%', summary: 'The Google gap widens as the critical search-monetization upgrade slips.' }],
  '2006-09': [{ ticker: 'CSCO', headline: 'Cisco Back Above $25 as Networking Upgrade Cycle Builds', summary: 'Video traffic explosion revives the bandwidth-scarcity investment thesis.' }],
  '2006-11': [{ ticker: 'QCOM', headline: 'Qualcomm Battles Nokia Over Patent Royalties', summary: 'Legal overhang clouds the 3G royalty stream just as smartphones take off.' }],
  '2006-12': [{ ticker: 'MACRO', headline: 'Year in Review: Housing Peaks, Few Notice', summary: 'Home prices roll over quietly while equity markets party on.' }],
  '2007-01': [{ ticker: 'AAPL', headline: "Apple Announces the iPhone: 'An iPod, a Phone, an Internet Communicator'", summary: 'Jobs unveils the device that will redefine the industry — AAPL gaps up massively.' }],
  '2007-04': [{ ticker: 'AMZN', headline: 'Amazon Prime Membership Accelerates', summary: 'Free two-day shipping drives loyalty metrics off the charts.' }],
  '2007-06': [{ ticker: 'AAPL', headline: 'iPhone Launch Day: Lines Around the Block', summary: 'The most hyped gadget launch in history delivers; activation servers buckle under demand.' }],
  '2007-08': [{ ticker: 'MACRO', headline: 'Credit Markets Seize — BNP Freezes Funds, ECB Intervenes', summary: "The subprime crack appears. Most equity traders dismiss it as 'contained'." }],
  '2007-10': [{ ticker: 'CSCO', headline: 'Cisco Touches $33 — Chambers Warns of "Lumpy" Enterprise Orders', summary: 'The warning sign flashing at the market top that few heeded.' }],
  '2007-11': [{ ticker: 'AMZN', headline: 'Amazon Launches the Kindle E-Reader', summary: 'A $399 book gadget? Skeptics scoff, but the first run sells out in hours.' }],
  '2007-12': [{ ticker: 'MACRO', headline: 'Recession Officially Begins (Though Nobody Knows It Yet)', summary: 'NBER would later date the downturn to this exact month.' }],
  '2008-02': [{ ticker: 'MSFT', headline: 'Microsoft Bids $44.6B for Yahoo', summary: "Ballmer's blockbuster offer sends YHOO soaring and MSFT sliding on dilution fears." }],
  '2008-03': [{ ticker: 'MACRO', headline: 'Bear Stearns Collapses — Fire Sale to JPMorgan at $2/Share', summary: 'The first domino falls. The Fed engineers a weekend rescue; fear index spikes.' }],
  '2008-05': [{ ticker: 'YHOO', headline: 'Microsoft Walks Away From Yahoo Deal', summary: 'Yang holds out for more; shareholders are furious as the premium evaporates.' }],
  '2008-07': [{ ticker: 'AAPL', headline: 'iPhone 3G and App Store Launch', summary: 'The software platform era begins — 500 apps at launch, 10M downloads in a weekend.' }],
  '2008-09': [{ ticker: 'MACRO', headline: 'LEHMAN BROTHERS BANKRUPT — Global Financial Meltdown', summary: 'AIG nationalized, money markets break the buck, TARP passed amid panic. Everything sells off together.' }],
  '2008-10': [{ ticker: 'MACRO', headline: 'Worst Month Since 1987 — Forced Liquidation Everywhere', summary: 'Hedge fund deleveraging cascades; even profitable tech leaders get indiscriminately dumped.' }],
  '2008-11': [{ ticker: 'MACRO', headline: 'Obama Wins as Economy Sheds 500k Jobs in a Month', summary: 'No election relief rally — the selling continues into year-end.' }],
  '2008-12': [{ ticker: 'MACRO', headline: 'Fed Cuts to Zero, Launches QE', summary: 'The nuclear option deployed. Despair is total — historically a fertile setup.' }],
  '2009-03': [{ ticker: 'MACRO', headline: 'Market Bottoms March 9 — Explosive Rally Begins', summary: 'From maximum pessimism, the S&P rips 25% in three weeks. The generational buying opportunity.' }],
  '2009-04': [{ ticker: 'ORCL', headline: 'Oracle Buys Sun Microsystems for $7.4B', summary: "SUNW holders get a surprise exit; Ellison scoops up Java and Solaris at fire-sale prices." }],
  '2009-06': [{ ticker: 'AAPL', headline: 'iPhone 3GS Launches; Steve Jobs Returns From Medical Leave', summary: 'The comeback king returns to the helm with the stock recovering sharply.' }],
  '2009-07': [{ ticker: 'AMZN', headline: 'Amazon Buys Zappos for $1.2B, Beats Earnings', summary: 'The everything store expands while cloud whispers grow into a roar.' }],
  '2009-09': [{ ticker: 'QCOM', headline: 'Smartphone Boom Lifts Qualcomm Royalties', summary: 'Android handsets multiply — every one of them pays Qualcomm.' }],
  '2009-12': [{ ticker: 'MACRO', headline: 'Decade in Review: From Dot-Com Peak to iPhone Era', summary: 'The 2000s destroyed weak business models and minted new giants. AAPL +900%, AMZN +900%, SUNW -88%. On to the next decade.' }],
};

const WINNER_TEMPLATES = [
  (t, p) => ({ ticker: t, headline: `${t} Rallies ${p}% as Momentum Builds`, summary: 'Buyers step in aggressively; volume trends confirm institutional accumulation.' }),
  (t, p) => ({ ticker: t, headline: `${t} Jumps ${p}% on Analyst Upgrades`, summary: 'Wall Street warms to the story as earnings estimates drift higher.' }),
  (t, p) => ({ ticker: t, headline: `${t} Climbs ${p}% — Best Month This Year`, summary: 'Short covering adds fuel to a fundamentally improving picture.' }),
];
const LOSER_TEMPLATES = [
  (t, p) => ({ ticker: t, headline: `${t} Slides ${p}% on Profit Taking`, summary: 'Traders lock in gains; the long-term trend remains the key debate.' }),
  (t, p) => ({ ticker: t, headline: `${t} Falls ${p}% as Sellers Dominate`, summary: 'Weak hands exit amid renewed questions on growth durability.' }),
  (t, p) => ({ ticker: t, headline: `${t} Drops ${p}% — Worst Performer This Month`, summary: 'No single catalyst, but distribution patterns suggest caution.' }),
];
const MACRO_FILLERS = [
  { ticker: 'MACRO', headline: 'Fed Holds Rates Steady, Signals Data Dependence', summary: 'Policymakers content to watch and wait; markets read the tea leaves.' },
  { ticker: 'MACRO', headline: 'Mixed Economic Data Keeps Traders Guessing', summary: 'Jobs report and consumer confidence pull in opposite directions.' },
  { ticker: 'MACRO', headline: 'Earnings Season Delivers Modest Beats Across Tech', summary: 'Guidance is conservative but balance sheets keep strengthening.' },
  { ticker: 'MACRO', headline: 'Quiet Month on Wall Street as Volumes Thin', summary: 'Traders square positions ahead of the next catalyst.' },
];

const yearOf = (i) => 2003 + Math.floor(i / 12);
const monthOf = (i) => (i % 12) + 1;
const dateOf = (i) => `${yearOf(i)}-${String(monthOf(i)).padStart(2, '0')}`;

// Build the 84 price series.
const series = {};
for (const t of TICKERS) {
  series[t] = [];
  for (let i = 0; i < 84; i++) {
    const base = interpolate(ANCHORS[t], i);
    series[t].push(Math.max(0.05, Math.round(base * (1 + noise(t, i)) * 100) / 100));
  }
}

const newSteps = [];
for (let i = 0; i < 84; i++) {
  const date = dateOf(i);
  const prices = {};
  for (const t of TICKERS) prices[t] = series[t][i];

  const news = [];
  const keyed = KEY_NEWS[date];
  if (keyed) news.push(...keyed);

  // Fill remaining slots (up to 3) with commentary on the month's biggest movers.
  if (news.length < 3 && i > 0) {
    const movers = TICKERS.map((t) => ({
      t,
      chg: (series[t][i] - series[t][i - 1]) / series[t][i - 1],
    })).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg));
    let ti = 0;
    for (const m of movers) {
      if (news.length >= 3) break;
      if (Math.abs(m.chg) < 0.06) continue; // only noteworthy moves
      if (news.some((n) => n.ticker === m.t)) continue;
      const pct = Math.round(Math.abs(m.chg) * 100);
      const tmpl = m.chg > 0 ? WINNER_TEMPLATES[ti++ % WINNER_TEMPLATES.length] : LOSER_TEMPLATES[ti++ % LOSER_TEMPLATES.length];
      news.push(tmpl(m.t, pct));
    }
  }
  if (news.length === 0) news.push(MACRO_FILLERS[i % MACRO_FILLERS.length]);
  if (news.length === 1 && !keyed) news.push(MACRO_FILLERS[(i + 1) % MACRO_FILLERS.length]);

  newSteps.push({ date, news: news.slice(0, 3), prices });
}

scenario.timeline.push(...newSteps);
scenario.scenario_config.title = 'The 2000s: Boom, Bust & the iPhone Era';
scenario.scenario_config.description =
  'Trade 10 tech stocks — MSFT, AAPL, AMZN, CSCO, INTC, ORCL, SUNW, YHOO, EBAY, QCOM — across a full decade: the dot-com peak and crash, the recovery, the iPhone revolution, and the 2008 financial crisis. 120 monthly decision points from January 2000 to December 2009.';

writeFileSync(PATH, JSON.stringify(scenario, null, 2) + '\n');

// Sanity checks
if (scenario.timeline.length !== 120) throw new Error(`expected 120 steps, got ${scenario.timeline.length}`);
for (const step of scenario.timeline) {
  if (Object.keys(step.prices).length !== 10) throw new Error(`${step.date}: wrong ticker count`);
  if (!step.news.length || step.news.length > 3) throw new Error(`${step.date}: bad news count ${step.news.length}`);
}
if (scenario.timeline[119].date !== '2009-12') throw new Error('last step should be 2009-12');
console.log('Extended to 120 monthly steps (2000-01 .. 2009-12), 10 tickers each.');
console.log(`Sample: AAPL 2002-12=${scenario.timeline[35].prices.AAPL}, 2009-12=${series.AAPL[83]}; AMZN 2009-12=${series.AMZN[83]}`);
