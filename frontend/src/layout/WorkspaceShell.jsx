
import React from 'react';
import NavigationRail from './NavigationRail';

export default function WorkspaceShell({ activeTab, onSelectTab, children }) {
  return (
    <div className="h-screen w-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900">
      <NavigationRail activeTab={activeTab} onSelectTab={onSelectTab} />
      <div className="flex-1 h-full relative flex flex-col min-w-0">
        {/* We removed the bulky top bar to maximize map area. The pages will render their own minimal breadcrumbs if needed. */}
        <main className="flex-1 h-full w-full relative overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
