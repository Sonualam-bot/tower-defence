import type { SelectedTowerInfo } from '../engine/GameEngine';

interface SelectedTowerPanelProps {
  tower: SelectedTowerInfo;
  money: number;
  onUpgrade: () => void;
  onSell: () => void;
}

export function SelectedTowerPanel({ tower, money, onUpgrade, onSell }: SelectedTowerPanelProps) {
  const canUpgrade = tower.upgradeCost !== null && money >= tower.upgradeCost;
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{tower.name}</h2>
        <span className="text-xs text-white/50">
          Level {tower.level}/{tower.maxLevel}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-1 text-center text-xs tabular-nums">
        <StatCell label="Damage" value={tower.damage} />
        <StatCell label="Range" value={tower.range} />
        <StatCell label="Rate" value={`${tower.shotsPerSecond.toFixed(1)}/s`} />
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onUpgrade}
          disabled={!canUpgrade}
          className="flex-1 rounded-md bg-sky-500 px-2 py-1.5 text-sm font-medium hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
          title="Upgrade (U)"
        >
          {tower.upgradeCost === null ? 'Max level' : `Upgrade ${tower.upgradeCost}g`}
        </button>
        <button
          onClick={onSell}
          className="rounded-md bg-white/10 px-2 py-1.5 text-sm font-medium hover:bg-red-500/80"
          title="Sell (S)"
        >
          Sell +{tower.sellValue}g
        </button>
      </div>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-black/30 py-1">
      <dt className="text-[10px] text-white/40 uppercase">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
