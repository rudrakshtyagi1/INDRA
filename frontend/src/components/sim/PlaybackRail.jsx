import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Clock,
} from 'lucide-react';

const SPEEDS = [1, 2, 4];

export default function PlaybackRail({
  currentTimeMin,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  onSpeedChange,
  isAnalyticsOpen,
  onToggleAnalytics,
    maxTimeMin = 240,
}) {
  const pct = Math.round((currentTimeMin / maxTimeMin) * 100);
  const hrs = Math.floor(currentTimeMin / 60);
  const mins = currentTimeMin % 60;
  const timeLabel = hrs > 0 ? `T+${hrs}h ${mins.toString().padStart(2, '0')}m` : `T+${currentTimeMin}m`;

  return (
    <div
      className="flex items-center gap-4 px-5 border-t border-[var(--surface-border)] bg-[var(--surface-1)] shrink-0 select-none"
      style={{ height: '54px' }}
    >
      {/* Play / Pause Primary Button */}
      <button
        onClick={onTogglePlay}
        className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition text-white shadow-md shadow-blue-900/30 shrink-0"
        title={isPlaying ? 'Pause simulation timeline' : 'Play simulation timeline'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white translate-x-0.5" />
        )}
      </button>

      {/* Reset to T+0 */}
      <button
        onClick={onReset}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-[var(--surface-border)] transition shrink-0"
        title="Reset timeline to breach initiation (T+0)"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Large Readable Time Label */}
      <div className="flex items-center gap-1.5 shrink-0 bg-[var(--surface-2)] px-3 py-1.5 rounded-lg border border-[var(--surface-border)]">
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-mono font-bold text-[var(--text-primary)] tabular-nums">
          {timeLabel}
        </span>
      </div>

      {/* Scrubber Timeline Slider */}
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <input
          type="range"
          className="scrubber w-full cursor-pointer"
          min={0}
          max={maxTimeMin}
          step={1}
          value={currentTimeMin}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, #24324a ${pct}%, #24324a 100%)`,
          }}
        />
      </div>

      {/* End Limit */}
      <span className="text-xs font-mono font-medium text-[var(--text-secondary)] shrink-0">
        T+4h 00m (Boundary)
      </span>

      {/* Playback Speed Multiplier */}
      <div className="flex items-center gap-1 shrink-0 bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--surface-border)]">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`
              px-2.5 py-1 rounded text-xs font-mono font-semibold transition
              ${playbackSpeed === s
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Analytics Drawer Toggle */}
      <button
        onClick={onToggleAnalytics}
        title={isAnalyticsOpen ? 'Collapse analytics summary' : 'Expand analytics summary'}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-[var(--surface-border)] transition shrink-0"
      >
        {isAnalyticsOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
