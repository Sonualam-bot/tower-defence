import { TOWER_TYPES, TOWERS, type TowerDefinition, type TowerType } from '../config/towers';

interface TowerPaletteProps {
  money: number;
  buildType: TowerType | null;
  onSelect: (type: TowerType) => void;
}

export function TowerPalette({ money, buildType, onSelect }: TowerPaletteProps) {
  return (
    <section>
      <h2 className="mb-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">Towers</h2>
      <div className="flex flex-col gap-2">
        {TOWER_TYPES.map((type) => (
          <TowerCard
            key={type}
            definition={TOWERS[type]}
            selected={buildType === type}
            canAfford={money >= TOWERS[type].levels[0].cost}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-white/40">Click a pad to build. Shift-click builds several. Right-click cancels.</p>
    </section>
  );
}

interface TowerCardProps {
  definition: TowerDefinition;
  selected: boolean;
  canAfford: boolean;
  onSelect: (type: TowerType) => void;
}

function TowerCard({ definition, selected, canAfford, onSelect }: TowerCardProps) {
  const base = definition.levels[0];
  return (
    <button
      onClick={() => onSelect(definition.type)}
      disabled={!canAfford && !selected}
      aria-pressed={selected}
      className={`group rounded-lg border p-2.5 text-left transition-colors ${
        selected ? 'border-sky-400 bg-sky-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ background: definition.color }} />
        <span className="font-semibold">{definition.name}</span>
        <kbd className="rounded bg-white/10 px-1 text-[10px] text-white/50">{definition.hotkey}</kbd>
        <span className={`ml-auto text-sm tabular-nums ${canAfford ? 'text-amber-300' : 'text-red-400'}`}>{base.cost}g</span>
      </div>
      <p className="mt-1 text-xs text-white/50">{definition.description}</p>
      <div className="mt-1.5 flex gap-3 text-[11px] text-white/60 tabular-nums">
        <span>DMG {base.damage}</span>
        <span>RNG {base.range}</span>
        <span>{(1 / base.interval).toFixed(1)}/s</span>
      </div>
    </button>
  );
}
