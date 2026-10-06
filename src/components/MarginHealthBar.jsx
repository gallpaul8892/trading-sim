import { fmtPct } from '../engine/engine';

export default function MarginHealthBar({ acct, maintenance }) {
  const noMargin = maintenance <= 0;
  const health = acct.health;

  let pct = 100;
  let color = 'bg-emerald-500';
  let label = 'No margin exposure';

  if (!noMargin) {
    if (acct.exposure === 0) {
      pct = 100;
      label = 'Flat — no positions';
    } else if (health === Infinity) {
      pct = 100;
      label = 'Fully collateralized';
    } else {
      // Scale: maintenance threshold = 0% of bar, 2x maintenance = 100% of bar
      pct = Math.max(0, Math.min(100, ((health - maintenance) / maintenance) * 100));
      label = `Health ${fmtPct(health, 0)} (call at ${fmtPct(maintenance, 0)})`;
      if (health < maintenance * 1.15) color = 'bg-rose-500';
      else if (health < maintenance * 1.5) color = 'bg-amber-400';
    }
  }

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Margin Health</span>
        <span className="text-[11px] font-mono text-slate-400">{label}</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${noMargin ? 100 : pct}%` }} />
      </div>
    </div>
  );
}
