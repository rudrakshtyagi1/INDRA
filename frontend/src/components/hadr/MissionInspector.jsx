import React from 'react';
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Users,
  Building2,
  ChevronRight,
  ArrowRight,
  Plane,
  Footprints,
  Car,
  Ship,
  AlertOctagon,
  Compass,
  Zap,
} from 'lucide-react';
import {
  PROTOTYPE_TACTICAL_ROUTES,
  PROTOTYPE_NDRF_BASE,
  calculateOperationalMargin,
} from '../../data/prototype/tehriPrototypeRoutes';

const SETTLEMENT_LIST = Object.values(PROTOTYPE_TACTICAL_ROUTES);

export default function MissionInspector({
  activeId,
  onSelectId,
  onCalculateRoute,
  routeDrawn,
  selectedRouteMode = 'ROAD',
  onSelectRouteMode,
}) {
  const active = PROTOTYPE_TACTICAL_ROUTES[activeId] || SETTLEMENT_LIST[0];
  const roadRoute = active.roadRoute;
  const fallbackRoute = active.fallbackGroundRoute;
  const airRoute = active.airEvacRoute;
  const boatRoute = active.boatRoute;
  const rejectedRoute = active.rejectedRoute;

  // Active selected route object
  let activeSelectedRoute = roadRoute;
  if (selectedRouteMode === 'FALLBACK_GROUND') activeSelectedRoute = fallbackRoute;
  else if (selectedRouteMode === 'AIR_EVAC') activeSelectedRoute = airRoute;
  else if (selectedRouteMode === 'BOAT' && boatRoute) activeSelectedRoute = boatRoute;

  // Truthful deterministic mode-specific operational margin calculation
  const safetyCalculation = calculateOperationalMargin({
    checkpointFloodMin: activeSelectedRoute.checkpointFloodMin,
    missionStartMin: 0,
    transitToCheckpointMin: activeSelectedRoute.transitToCheckpointMin ?? activeSelectedRoute.etaMin,
    requiredBufferMin: 10,
    isRouteAvailable: activeSelectedRoute.isAvailable !== false,
    unavailabilityReason: activeSelectedRoute.unavailabilityReason || '',
  });

  return (
    <div className="h-full flex flex-col bg-[var(--surface-2)] overflow-hidden select-none">
      {/* Target Settlement Header */}
      <div className="p-4 border-b border-[var(--surface-border)] shrink-0 space-y-1.5 bg-[var(--surface-1)]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            HADR Mission Target
          </p>
          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded border border-[var(--surface-border)]">
            PROTOTYPE TACTICAL PLAN
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
            {active.settlementName}
          </h3>
          <span
            className={`status-pill ${
              active.floodArrivalMin <= 15 ? 'status-pill--danger' : 'status-pill--running'
            }`}
          >
            T+{active.floodArrivalMin}m flood arrival
          </span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] font-mono">
          Corridor Chainage: {active.kmFromDam} km · {active.population?.toLocaleString()} Population (PROTOTYPE EXPOSURE)
        </p>
      </div>

      {/* Common T_0 Origin Mission Timing Breakdown */}
      <div className="p-4 border-b border-[var(--surface-border)] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Mission Timing &amp; Safety Margin
          </p>
          <span className="text-[10px] font-mono text-blue-300">Origin: T₀ = 00:00 (Breach)</span>
        </div>

        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Active Critical Checkpoint:</span>
            <span className="font-mono font-bold text-[var(--text-primary)] text-right truncate max-w-[180px]">
              {activeSelectedRoute.checkpointName || 'Checkpoint Unset'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Wave Arrival at Checkpoint:</span>
            <span className="font-mono font-bold text-red-400">
              {activeSelectedRoute.checkpointFloodMin != null
                ? `T+${activeSelectedRoute.checkpointFloodMin} min`
                : 'N/A (Elevated / Unconstrained)'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Mission Start Time:</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">T+00 min</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Transit to Checkpoint:</span>
            <span className="font-mono font-bold text-blue-400">
              {activeSelectedRoute.transitToCheckpointMin != null
                ? `+${activeSelectedRoute.transitToCheckpointMin} min`
                : 'N/A'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Required Safety Buffer:</span>
            <span className="font-mono text-amber-300">10 min</span>
          </div>

          <div className="pt-1.5 border-t border-[var(--surface-border)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)]">Operational Status:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                  safetyCalculation.badgeColor === 'emerald'
                    ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                    : safetyCalculation.badgeColor === 'amber'
                    ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30'
                    : safetyCalculation.badgeColor === 'red'
                    ? 'text-red-300 bg-red-500/15 border border-red-500/30'
                    : 'text-[var(--text-muted)] bg-white/5 border border-[var(--surface-border)]'
                }`}
              >
                {safetyCalculation.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Modal Route Mode Selector */}
      <div className="p-4 border-b border-[var(--surface-border)] shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Select Evacuation Route Mode
          </p>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            Fallback for Evaluation: <strong className="text-amber-400">{active.fallbackMode}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Road Route */}
          <button
            onClick={() => onSelectRouteMode?.('ROAD')}
            className={`p-2.5 rounded-xl text-left transition border ${
              selectedRouteMode === 'ROAD'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-[var(--surface-3)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Road Ridge</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">PRIMARY</span>
            </div>
            <p className="text-sm font-bold font-mono mt-1 text-[var(--text-primary)]">
              {roadRoute.etaMin}m <span className="text-[10px] font-normal text-[var(--text-muted)]">({roadRoute.distKm} km)</span>
            </p>
            <span className="text-[9.5px] text-emerald-400 font-sans block mt-0.5">
              PROTOTYPE ROAD-FOLLOWING ROUTE
            </span>
          </button>

          {/* Ridge Foot Trail */}
          <button
            onClick={() => onSelectRouteMode?.('FALLBACK_GROUND')}
            className={`p-2.5 rounded-xl text-left transition border ${
              selectedRouteMode === 'FALLBACK_GROUND'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                : 'bg-[var(--surface-3)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Ridge Trail</span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">FOOT</span>
            </div>
            <p className="text-sm font-bold font-mono mt-1 text-[var(--text-primary)]">
              {fallbackRoute.etaMin}m <span className="text-[10px] font-normal text-[var(--text-muted)]">({fallbackRoute.distKm} km)</span>
            </p>
            <span className="text-[9.5px] text-amber-400 font-sans block mt-0.5">
              PROTOTYPE MOUNTAIN RIDGE FOOT TRAIL
            </span>
          </button>

          {/* Air Evacuation */}
          <button
            onClick={() => onSelectRouteMode?.('AIR_EVAC')}
            className={`p-2.5 rounded-xl text-left transition border ${
              selectedRouteMode === 'AIR_EVAC'
                ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-sm'
                : 'bg-[var(--surface-3)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Air Evac</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold">HELICOPTER</span>
            </div>
            <p className="text-sm font-bold font-mono mt-1 text-[var(--text-primary)]">
              {airRoute.etaMin}m <span className="text-[10px] font-normal text-[var(--text-muted)]">({airRoute.distKm} km)</span>
            </p>
            <span className="text-[9.5px] text-purple-400 font-sans block mt-0.5">
              PROTOTYPE HELICOPTER TRANSIT VECTOR
            </span>
          </button>

          {/* Waterborne Route (if available in reach) */}
          {boatRoute && boatRoute.isAvailable ? (
            <button
              onClick={() => onSelectRouteMode?.('BOAT')}
              className={`p-2.5 rounded-xl text-left transition border ${
                selectedRouteMode === 'BOAT'
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-sm'
                  : 'bg-[var(--surface-3)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ship className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Waterborne</span>
                </div>
                <span className="text-[10px] font-mono text-sky-400 font-bold">WATER</span>
              </div>
              <p className="text-sm font-bold font-mono mt-1 text-[var(--text-primary)]">
                {boatRoute.etaMin}m <span className="text-[10px] font-normal text-[var(--text-muted)]">({boatRoute.distKm} km)</span>
              </p>
              <span className="text-[9.5px] text-sky-400 font-sans block mt-0.5">
                PROTOTYPE WATERBORNE ROUTE
              </span>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-[var(--surface-3)]/40 border border-[var(--surface-border)]/50 opacity-60 flex flex-col justify-center">
              <span className="text-xs text-[var(--text-muted)] font-bold">Waterborne Route</span>
              <span className="text-[9.5px] text-[var(--text-muted)] mt-1">
                ROUTE NOT FEASIBLE (Non-navigable gorge)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Destinations (Healthcare & Shelters) */}
      <div className="p-4 space-y-2.5 border-b border-[var(--surface-border)] shrink-0">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">
          Reachable Emergency Facilities
        </p>

        {/* Nearest Safe Healthcare */}
        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🏥</span>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {active.nearestHospital}
              </p>
            </div>
            <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--surface-border)]">
              PROTOTYPE FIXTURE
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono">
            <span>Road ETA: <strong className="text-[var(--text-primary)]">{active.nearestHospitalEtaMin}m</strong></span>
            <span>Foot: <strong className="text-[var(--text-primary)]">{(active.nearestHospitalEtaMin * 2.2) | 0}m</strong></span>
            <span>Air: <strong className="text-[var(--text-primary)]">5m</strong></span>
          </div>
        </div>

        {/* Nearest Safe Shelter */}
        <div className="p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--surface-border)] space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">⛺</span>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {active.nearestShelter}
              </p>
            </div>
            <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--surface-border)]">
              PROTOTYPE FIXTURE
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            Transit ETA: <strong className="text-[var(--text-primary)]">{active.nearestShelterEtaMin}m</strong> · Designated high-ground assembly point
          </p>
        </div>
      </div>

      {/* Tactical Route Decision Rationale & Submerged Warning */}
      {routeDrawn && (
        <div className="p-4 space-y-2 border-b border-[var(--surface-border)] shrink-0 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Corridor Decision Rationale
          </p>

          {/* Rejected Valley Road Warning */}
          <div className="rounded-xl p-3 bg-red-950/40 border border-red-500/40 space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-xs font-bold text-red-300">
                Impassable Valley Low Road (Submerged at T+{rejectedRoute.bridgeFloodMin}m)
              </span>
            </div>
            <p className="text-xs text-red-200/90 leading-relaxed font-sans">
              {rejectedRoute.hazardReason}
            </p>
          </div>

          {/* Selected Corridor Rationale */}
          <div className="rounded-xl p-3 bg-emerald-950/30 border border-emerald-500/40 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300">
                Selected Safe Corridor ({activeSelectedRoute.label})
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
              {activeSelectedRoute.rationale}
            </p>
          </div>
        </div>
      )}

      {/* Target Settlement Selector */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
          Priority Reach Targets
        </p>
        <div className="space-y-1.5">
          {SETTLEMENT_LIST.map((s, i) => {
            const isActive = s.settlementId === activeId;
            return (
              <button
                key={s.settlementId}
                onClick={() => onSelectId(s.settlementId)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left
                  ${
                    isActive
                      ? 'bg-blue-600/20 border border-blue-500/50 shadow-sm'
                      : 'hover:bg-white/5 border border-[var(--surface-border)]'
                  }
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`
                    w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0
                    ${
                      s.floodArrivalMin <= 15
                        ? 'bg-red-500/20 text-red-400'
                        : s.floodArrivalMin <= 25
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }
                  `}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {s.settlementName}
                  </span>
                </div>
                <span
                  className={`text-xs font-mono font-bold shrink-0 ml-2 ${
                    s.floodArrivalMin <= 15
                      ? 'text-red-400'
                      : s.floodArrivalMin <= 25
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}
                >
                  T+{s.floodArrivalMin}m
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTA Button */}
      <div className="p-4 border-t border-[var(--surface-border)] shrink-0 bg-[var(--surface-1)]">
        <button
          onClick={() => onCalculateRoute(activeId)}
          className="
            w-full py-2.5 rounded-xl
            bg-blue-600 hover:bg-blue-500 active:bg-blue-700
            text-white text-xs font-bold tracking-wide
            transition flex items-center justify-center gap-2
            shadow-md shadow-blue-900/40
          "
        >
          <Navigation className="w-4 h-4" />
          <span>Deploy Tactical Corridor</span>
        </button>
      </div>
    </div>
  );
}
