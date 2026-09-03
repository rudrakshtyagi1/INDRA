import React from 'react';
import NavigationRail from './NavigationRail';
import ContextBar from './ContextBar';

export default function WorkspaceShell({ activeTab, onSelectTab, onOpenTour, children }) {
  return (
    <div className="h-screen w-screen bg-[#0B0F19] flex overflow-hidden font-sans text-slate-100">
      <NavigationRail activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <ContextBar activeTab={activeTab} onOpenTour={onOpenTour} />
        <main className="flex-1 w-full relative overflow-hidden bg-[#0B0F19]">
          {children}
        </main>
      </div>
    </div>
  );
}
