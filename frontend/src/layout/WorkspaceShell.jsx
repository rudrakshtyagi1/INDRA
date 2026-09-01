import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavigationRail from './NavigationRail';
import ContextBar from './ContextBar';

/**
 * Root workspace shell.
 * Layout: [NavigationRail 64px] [right column: ContextBar 48px / canvas fill]
 * The canvas area fills all remaining height with no overflow.
 */
export default function WorkspaceShell({
  activeTab,
  onSelectTab,
  children,
  // ContextBar props
  selectedPreset,
  presets,
  onSelectPreset,
  simulationResult,
  isSimulating,
  onRunSimulation,
  onOpenScenarioDrawer,
  onOpenDem,
  onOpenExport,
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--surface-0)]">
      {/* Left navigation rail */}
      <NavigationRail activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Right column: context bar + operational canvas */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <ContextBar
          selectedPreset={selectedPreset}
          presets={presets}
          onSelectPreset={onSelectPreset}
          simulationResult={simulationResult}
          isSimulating={isSimulating}
          onRunSimulation={onRunSimulation}
          onOpenScenarioDrawer={onOpenScenarioDrawer}
          onOpenDem={onOpenDem}
          onOpenExport={onOpenExport}
        />

        {/* Operational canvas — fills remaining height */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
