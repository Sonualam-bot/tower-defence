import { useEffect, useState, useSyncExternalStore } from 'react';
import { TOWER_TYPES, TOWERS } from '../config/towers';
import { GameEngine } from '../engine/GameEngine';
import { DamageFlash, WaveBanner } from './Feedback';
import { GameCanvas } from './GameCanvas';
import { EndScreen, PauseScreen, StartScreen } from './Overlays';
import { PerfPanel } from './PerfPanel';
import { SelectedTowerPanel } from './SelectedTowerPanel';
import { TopBar } from './TopBar';
import { TowerPalette } from './TowerPalette';

export function GameScreen() {
  const [engine] = useState(() => new GameEngine());
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [showPerf, setShowPerf] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      const tower = TOWER_TYPES.find((t) => TOWERS[t].hotkey === key);
      if (tower) engine.chooseBuildType(tower);
      else if (key === ' ') {
        e.preventDefault();
        engine.togglePause();
      } else if (key === 'escape') engine.deselect();
      else if (key === 'u') engine.upgradeSelected();
      else if (key === 's') engine.sellSelected();
      else if (key === 'n') engine.callNextWave();
      else if (key === 'r') engine.restart();
      else if (key === '`' || key === 'f3') setShowPerf((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        baseHealth={snap.baseHealth}
        maxHealth={snap.maxHealth}
        wave={snap.wave}
        totalWaves={snap.totalWaves}
        countdown={snap.countdown}
        money={snap.money}
        score={snap.score}
        speed={snap.speed}
        paused={snap.phase === 'paused'}
        canCallWave={snap.phase === 'playing' && snap.waveStage === 'countdown'}
        onPause={() => engine.togglePause()}
        onSpeed={(s) => engine.setSpeed(s)}
        onRestart={() => engine.restart()}
        onCallWave={() => engine.callNextWave()}
      />
      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[300px] flex-1">
          <GameCanvas engine={engine} />
          <DamageFlash health={snap.baseHealth} />
          <WaveBanner wave={snap.wave} active={!snap.benchmark.active && snap.phase === 'playing'} />
          {showPerf && (
            <PerfPanel
              snapshot={snap}
              onOption={(k, v) => engine.setOption(k, v)}
              onStressTest={() => engine.startStressTest()}
              onRecord={() => engine.recordBenchmark()}
            />
          )}
          {snap.phase === 'menu' && <StartScreen onStart={() => engine.start()} />}
          {snap.phase === 'paused' && <PauseScreen onResume={() => engine.togglePause()} onRestart={() => engine.restart()} />}
          {(snap.phase === 'game-over' || snap.phase === 'victory') && (
            <EndScreen victory={snap.phase === 'victory'} wave={snap.wave} score={snap.score} onRestart={() => engine.restart()} />
          )}
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-white/10 bg-[#0f141b] p-3 md:w-64 md:border-l">
          <TowerPalette money={snap.money} buildType={snap.buildType} onSelect={(t) => engine.chooseBuildType(t)} />
          {snap.selectedTower && (
            <SelectedTowerPanel
              tower={snap.selectedTower}
              money={snap.money}
              onUpgrade={() => engine.upgradeSelected()}
              onSell={() => engine.sellSelected()}
            />
          )}
          <p className="mt-auto text-[11px] text-white/30">
            Space pause · N next wave · U upgrade · S sell · ` perf panel
          </p>
        </aside>
      </main>
    </div>
  );
}
