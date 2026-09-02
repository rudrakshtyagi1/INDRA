import React from 'react';
import { Play, Pause, RotateCcw, Clock, ChevronUp, ChevronDown } from 'lucide-react';

const SPEEDS = [1, 2, 5];

export default function PlaybackRail({
  isPlaying,
  onTogglePlay,
  onReset,
  currentTimeMin = 0,
  onTimeChange,
  playbackSpeed = 1,
  onSpeedChange,
  isAnalyticsOpen,
  onToggleAnalytics,
  maxTimeMin = 13.33,
}) {
  const currentTimeSec = Math.round(currentTimeMin * 60);
  const clampedSec = Math.min(800, currentTimeSec);
  const pct = Math.round((currentTimeMin / maxTimeMin) * 100);

  // Road unavailability by time step
  const roadEdges = clampedSec <= 0 ? 0 : clampedSec <= 300 ? 31 : clampedSec <= 600 ? 49 : 52;

  const timeLabel = `T+${clampedSec}s`;

  return (
    <div className="h-12 flex items-center gap-3 px-4 bg-white border-t border-slate-200 shrink-0">
      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition text-white shadow-sm shrink-0"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
      </button>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition shrink-0"
        title="Reset to T+0"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Time label */}
      <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
        <Clock className="w-3 h-3 text-blue-600" />
        <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
          {timeLabel}
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-xs font-mono text-orange-600 font-semibold">{roadEdges} road edges</span>
      </div>

      {/* Scrubber */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <input
          type="range"
          className="scrubber w-full cursor-pointer"
          min={0}
          max={maxTimeMin}
          step={0.05}
          value={currentTimeMin}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, #2563EB 0%, #2563EB ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
          }}
        />
      </div>

      
      {/* Checkpoint labels */}
      <div className="hidden md:flex flex-col text-[9px] font-mono text-slate-400 shrink-0">
        <div className="flex justify-between w-48 px-1 mb-0.5">
          <span title="~2 km">101s</span>
          <span title="~5 km">349s</span>
          <span title="~8 km">763s</span>
          <span className="text-slate-600 font-semibold" title="10 km">NOT REACHED</span>
        </div>
        <div className="flex justify-between w-48 border-t border-slate-300 relative">
          <div className="absolute top-0 left-0 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 left-1/3 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 left-2/3 h-1 border-l border-slate-300"></div>
          <div className="absolute top-0 right-0 h-1 border-r border-slate-400"></div>
        </div>
      </div>

      {/* Speed */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 rounded text-xs font-mono font-semibold transition ${
              playbackSpeed === s ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Analytics toggle */}
      <button
        onClick={onToggleAnalytics}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition shrink-0"
        title={isAnalyticsOpen ? 'Collapse analytics' : 'Expand analytics'}
      >
        {isAnalyticsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
    </div>
  );
}
