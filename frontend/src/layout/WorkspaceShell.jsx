import React from 'react';
import NavigationRail from './NavigationRail';
import ContextBar from './ContextBar';

export default function WorkspaceShell({ activeTab, onSelectTab, children }) {
  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <NavigationRail activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        <ContextBar activeTab={activeTab} />
        <main className="flex-1 w-full relative overflow-hidden bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
