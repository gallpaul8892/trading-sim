// Company blurbs shown in hover tooltips across the UI.
// Descriptions are era-aware: they only reflect what was publicly known at the
// start of the period — no future knowledge leaks. Each era is a year prefix.
const ERAS = ['2000', '2003', '2006', '2009'];

const TICKER_INFO = {
  MSFT: {
    name: 'Microsoft Corp.',
    blurb: {
      2000: 'PC software giant: Windows and Office dominate the desktop. Under DOJ antitrust attack, with talk of a forced breakup.',
      2003: 'Windows and Office monopoly settled its antitrust case. Sitting on a mountain of cash; Xbox is a small, money-losing side bet.',
      2006: 'Mature software cash cow: Windows + Office dividends and buybacks. Vista launch delayed repeatedly; Xbox finally shows promise.',
      2009: 'Windows 7 rebuilding credibility after Vista. Search (Bing) and cloud (Azure) are new battles against Google.',
    },
  },
  AAPL: {
    name: 'Apple Inc.',
    blurb: {
      2000: 'Struggling PC maker surviving on the iMac comeback. A niche brand for creatives; a fraction of its former self.',
      2003: 'PC maker with a surprise hit: the iPod music player and new iTunes store are outselling the Macs they were meant to promote.',
      2006: 'The iPod company. Music players dominate revenue; Macs are gaining share on Intel chips. Retail stores are booming.',
      2009: 'iPhone maker. The phone business already dwarfs the Mac; the App Store is a phenomenon. Rumors swirl of a tablet device.',
    },
  },
  AMZN: {
    name: 'Amazon.com Inc.',
    blurb: {
      2000: 'Online bookseller burning cash to expand into CDs, toys and electronics. Bears question if it will ever turn a profit.',
      2003: 'Leading online retailer, finally profitable. Free shipping and marketplace sellers are driving rapid growth.',
      2006: 'E-commerce leader with a peculiar new side project: renting out computing infrastructure over the internet (S3/EC2).',
      2009: 'E-commerce juggernaut. Kindle e-readers lead a hardware push; cloud services are quietly becoming a real business.',
    },
  },
  CSCO: {
    name: 'Cisco Systems Inc.',
    blurb: {
      2000: "The arms dealer of the internet boom: routers and switches behind the web's buildout. Closing in on the title of world's most valuable company.",
      2003: 'Networking equipment leader recovering from the crash. Corporate network spending is just beginning to thaw.',
      2006: 'Networking incumbent enjoying a video-traffic upgrade cycle. Core routing growth is steady but no longer explosive.',
      2009: 'Mature networking giant branching into servers (UCS) and telepresence video as core switching slows.',
    },
  },
  INTC: {
    name: 'Intel Corp.',
    blurb: {
      2000: "Dominant maker of PC microprocessors — 'Intel Inside'. The boom in PC sales made it a Wall Street darling.",
      2003: 'PC chip leader fighting off AMD in servers. Centrino laptop chips are a bright spot in a weak PC market.',
      2006: 'PC chipmaker squeezed by AMD and price wars. Lands the marquee Apple Mac account after the PowerPC switch.',
      2009: 'Semiconductor leader emerging from the crisis; Atom chips power the netbook craze. Datacenter demand recovering.',
    },
  },
  ORCL: {
    name: 'Oracle Corp.',
    blurb: {
      2000: "Enterprise database king. Larry Ellison's company powers corporate IT and rides the e-business software wave.",
      2003: 'Database giant turning predator: a hostile $5B bid for PeopleSoft kicks off software industry consolidation.',
      2006: 'Consolidator of enterprise software — PeopleSoft, Siebel and dozens more absorbed. Database cash flows fund the spree.',
      2009: 'Enterprise software empire. Agreed to buy struggling Sun Microsystems — hardware, Java and all — for $7.4B.',
    },
  },
  SUNW: {
    name: 'Sun Microsystems',
    blurb: {
      2000: "'The dot in dot-com' — its powerful Unix servers run the internet's hottest startups. Riding the bubble hard.",
      2003: 'Server maker in decline: cheap Intel/Linux boxes are eating its high-end Unix franchise. Losses mounting.',
      2006: 'Fading server pioneer. Open-sourcing Java and Solaris in a bid for relevance; new CEO trying to stop the bleeding.',
      2009: 'Shell of its former self. Agreed to be acquired by Oracle for $7.4B — a fraction of its bubble-era peak value.',
    },
  },
  YHOO: {
    name: 'Yahoo! Inc.',
    blurb: {
      2000: "The web's front door: the leading portal for search, news, mail and ads. Banner advertising prints money.",
      2003: 'Portal staging a comeback under Hollywood veteran Terry Semel. Paid search (Overture) deal revives ad revenue.',
      2006: 'Portal losing the search war to Google. Delays to its Panama ad platform have investors losing patience.',
      2009: 'Wounded portal. Rejected Microsoft\'s $44.6B takeover bid in 2008 — a decision shareholders still argue about.',
    },
  },
  EBAY: {
    name: 'eBay Inc.',
    blurb: {
      2000: 'Online auction marketplace — rare among dot-coms for being profitable from the start. Collectibles and garage-sale economics at scale.',
      2003: 'Auction marketplace juggernaut. Bought PayPal in 2002; the payments + marketplace flywheel is spinning fast.',
      2006: 'Marketplace maturing as growth slows from its hyper phase. PayPal remains the crown jewel; Skype purchase questioned.',
      2009: 'Marketplace struggling against Amazon; PayPal carries the business. New CEO refocusing on fixed-price sales.',
    },
  },
  QCOM: {
    name: 'Qualcomm Inc.',
    blurb: {
      2000: 'Owns key CDMA wireless patents — collects royalties on mobile phones using its technology. A toll booth on wireless growth.',
      2003: 'Wireless patent king profiting from 3G network rollouts in Asia. Every CDMA phone sold pays Qualcomm.',
      2006: '3G royalty machine entangled in patent wars with Nokia and Broadcom. Legal risk clouds the licensing stream.',
      2009: 'Smartphone-era winner: royalties flow from every 3G handset, and its Snapdragon chips power early smartphones.',
    },
  },
};

function eraFor(date) {
  const year = parseInt(String(date).slice(0, 4), 10);
  let era = ERAS[0];
  for (const e of ERAS) if (year >= Number(e)) era = e;
  return era;
}

// date: 'YYYY-MM' string (optional; defaults to the 2000 era).
export function tickerInfo(ticker, date) {
  const info = TICKER_INFO[ticker] || {
    name: ticker,
    blurb: { 2000: 'Broad market / macroeconomic news.', 2003: 'Broad market / macroeconomic news.', 2006: 'Broad market / macroeconomic news.', 2009: 'Broad market / macroeconomic news.' },
  };
  const era = eraFor(date || '2000-01');
  return { name: info.name, blurb: info.blurb[era] || info.blurb[ERAS[0]] };
}
