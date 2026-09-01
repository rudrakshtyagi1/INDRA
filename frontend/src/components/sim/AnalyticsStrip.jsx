import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import HydrographChart from '../charts/HydrographChart';
import DownstreamHazardChart from '../charts/DownstreamHazardChart';
import ArrivalTimelineChart from '../charts/ArrivalTimelineChart';
import { PROTOTYPE_METADATA } from '../../data/prototype/tehriPrototypeRun';
import { PROTOTYPE_SETTLEMENTS } from '../../data/prototype/tehriPrototypeSettlements';

const PANELS = ['hydrograph', 'arrivals', 'hazard'];
const PANEL_LABELS = {
  hydrograph: 'Q(t) Outflow',
  arrivals: 'Arrival Timeline',
  hazard: 'Hazard Profile',
};

export default function AnalyticsStrip({ isOpen, currentTimeMin, currentTimeHrs }) {
  const [maximized, setMaximized] = useState(null);
  const meta = PROTOTYPE_METADATA;
  const breach = meta.breachMechanics;

  const renderPanel = (id, compact = false) => {
    switch (id) {
      case 'hydrograph':
        return (
          <HydrographChart
            times={breach.hydrographTimesHrs}
            flows={breach.hydrographFlowsM3s}
            currentTimeHrs={currentTimeHrs}
            peakDischarge={breach.peakDischargeM3s}
            timeToPeakHrs={breach.timeToPeakHrs}
          />
        );
      case 'arrivals':
        return (
          <ArrivalTimelineChart
            currentTimeMin={currentTimeMin}
            stations={PROTOTYPE_SETTLEMENTS}
          />
        );
      case 'hazard':
        return (
          <DownstreamHazardChart
            stations={PROTOTYPE_SETTLEMENTS.map((s) => ({
              name: s.name,
              km: s.kmFromDam,
              depth: s.peakDepthM,
              vel: s.peakVelocityMs,
            }))}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="analytics-strip"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 180, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 overflow-hidden border-t border-[var(--surface-border)] bg-[var(--surface-1)]"
        >
          {/* Maximized view */}
          <AnimatePresence>
            {maximized && (
              <motion.div
                key="maximized"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-20 bg-[var(--surface-0)] flex flex-col"
                style={{ bottom: 0, top: 0, left: 0, right: 0 }}
              >
                <div className="h-9 px-4 flex items-center justify-between border-b border-[var(--surface-border)] shrink-0">
                  <span className="text-[10px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                    {PANEL_LABELS[maximized]}
                  </span>
                  <button
                    onClick={() => setMaximized(null)}
                    className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  {renderPanel(maximized)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3-column strip */}
          <div className="h-full grid grid-cols-3 divide-x divide-[var(--surface-border)]">
            {PANELS.map((id) => (
              <div key={id} className="relative flex flex-col h-full overflow-hidden group">
                <div className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setMaximized(id)}
                    className="w-5 h-5 flex items-center justify-center rounded bg-[var(--surface-3)] border border-[var(--surface-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                    title={`Maximize ${PANEL_LABELS[id]}`}
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                  </button>
                </div>
                <div className="absolute top-1.5 left-2 z-10">
                  <span className="text-[9px] font-semibold tracking-widest text-[var(--text-muted)] uppercase">
                    {PANEL_LABELS[id]}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden pt-5">
                  {renderPanel(id)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
