import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize2,
  Minimize2,
  Activity,
  Layers,
  Clock,
  Compass,
  AlertCircle,
} from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function FullScreenVisualization({
  isOpen,
  onClose,
  title = 'Geographic Hydrodynamic Simulation',
  scenarioName = 'Tehri Dam (Bhagirathi River)',
  runId = 'sim_latest',
  status = 'COMPLETED',
  timeLabel,
  children,
  contextControls,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none font-sans text-slate-100"
      >
        {/* 1. Sleek Fullscreen Top Context Bar (Height ~56px) */}
        <header className="h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-5 flex items-center justify-between shrink-0 z-20">
          {/* Left: Title & Scenario Context */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-white tracking-wide truncate">
                {title}
              </span>
            </div>

            <span className="text-slate-600 hidden sm:inline">&bull;</span>

            <span className="text-xs font-mono text-slate-300 hidden md:inline truncate">
              {scenarioName}
            </span>

            <div className="hidden lg:flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                RUN: {runId}
              </span>
              <StatusBadge status={status} size="sm" />
            </div>
          </div>

          {/* Right: Time, Context Controls, and Exit Button */}
          <div className="flex items-center gap-3 shrink-0">
            {timeLabel && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-amber-400">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{timeLabel}</span>
              </div>
            )}

            {contextControls && (
              <div className="flex items-center gap-2">
                {contextControls}
              </div>
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700 shadow-sm"
              title="Exit Fullscreen Mode (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </button>
          </div>
        </header>

        {/* 2. Main Dominant Visual Viewport (Occupies 85–90% of screen) */}
        <main className="flex-1 relative flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          {children}
        </main>
      </motion.div>
    </AnimatePresence>
  );
}
