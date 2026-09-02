import React from 'react';
import { Navigation, AlertTriangle, Info } from 'lucide-react';

function Row({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0 gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-slate-800 text-right tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, iconClass = 'text-slate-400', children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon className={`w-3.5 h-3.5 ${iconClass}`} />}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 px-3 py-1">
        {children}
      </div>
    </div>
  );
}

export default function MissionInspector({
  v3,
  activeId,
  onSelectId,
  onCalculateRoute,
  routeDrawn,
  selectedRouteMode,
  onSelectRouteMode,
}) {
  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200 overflow-y-auto" style={{ width: 'var(--inspector-width)', flexShrink: 0 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">HADR Routing Benchmark</p>
          <span className="status-pill status-pill--warning">WHAT-IF</span>
        </div>
        <h3 className="text-sm font-bold text-slate-900">Mission Inspector</h3>
      </div>

      <div className="p-4 flex-1">
        {/* Destination card — key differentiator */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Destination Analysis</p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Nearest by Distance</p>
              <p className="text-xs font-semibold text-slate-800">Laxman Jhula Government Hospital</p>
            </div>
            <div className="border-t border-blue-100 pt-2">
              <p className="text-[10px] text-slate-500 mb-0.5">Nearest Reachable (Avoiding Modelled Hazard)</p>
              <p className="text-xs font-semibold text-slate-800">Dr. Arora&apos;s Clinic</p>
            </div>
          </div>
          <div className="flex gap-1.5 mt-2 p-2 bg-blue-100/60 rounded">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-blue-700">Nearest ≠ Reachable. Assessed against 800-s model window only.</p>
          </div>
        </div>

        <Section title="Normal Route" icon={Navigation} iconClass="text-red-500">
          <Row label="Distance" value="133.61 km" />
          <Row label="ETA" value="~4.45 h" />
          <Row label="Status" value="NOT FEASIBLE" valueClass="text-red-600" />
          <div className="py-2">
            <p className="text-[10px] text-red-500 font-medium">NOT FEASIBLE AGAINST KNOWN MODELLED HAZARD</p>
          </div>
        </Section>

        <Section title="Hazard-Aware Route" icon={Navigation} iconClass="text-emerald-600">
          <Row label="Distance" value="143.93 km" />
          <Row label="ETA" value="~4.80 h" />
          <Row label="Penalty" value="+10.32 km" valueClass="text-orange-600" />
          <Row label="Hazard Edges Avoided" value="2" />
          <Row label="Status" value="FEASIBLE" valueClass="text-emerald-600" />
          <div className="py-2">
            <p className="text-[10px] text-emerald-600 font-medium">AVOIDS CURRENTLY MODELLED HAZARD SEGMENTS</p>
          </div>
        </Section>

        {/* Full-route warning */}
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-amber-700 mb-0.5">FULL-ROUTE FUTURE HAZARD STATUS</p>
            <p className="text-[10px] text-amber-600">UNKNOWN BEYOND MODEL WINDOW</p>
          </div>
        </div>

        <Section title="Benchmark Origin">
          <Row label="Location" value="Prototype HADR Origin" />
          <Row label="Type" value="Benchmark Response Origin" />
          <Row label="Provenance" value="Not an operational NDRF facility" valueClass="text-slate-500" />
        </Section>
      </div>
    </div>
  );
}
