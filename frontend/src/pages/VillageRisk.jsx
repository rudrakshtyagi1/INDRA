import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Shield, Users, MapPin, Activity, SkipBack, SkipForward, Play, Pause, RotateCcw, Layers, Info, Bell, BarChart3, RefreshCw, Database } from 'lucide-react';
import L from 'leaflet';
import { api } from '../services/api';

const TIER = {
  CRITICAL_IMMEDIATE: { bg:'#7f1d1d', border:'#ef4444', text:'#fca5a5', label:'CRITICAL' },
  HIGH_PRIORITY:      { bg:'#78350f', border:'#f59e0b', text:'#fcd34d', label:'HIGH'     },
  ELEVATED_WATCH:     { bg:'#1e3a5f', border:'#3b82f6', text:'#93c5fd', label:'WATCH'    },
  SAFE_STANDBY:       { bg:'#064e3b', border:'#10b981', text:'#6ee7b7', label:'STANDBY'  },
};
const ISO = {
  DIRECTLY_INUNDATED:   { label:'INUNDATED',   cls:'text-red-400'    },
  ISOLATED_BY_FLOOD:    { label:'ISOLATED',    cls:'text-orange-400' },
  ROAD_CUTOFF_IMMINENT: { label:'CUTOFF SOON', cls:'text-amber-400'  },
  ACCESSIBLE:           { label:'ACCESSIBLE',  cls:'text-emerald-400'},
};
const ENS = [
  { id:'ENS_P50', label:'P50 Median Overtopping'   },
  { id:'ENS_P90', label:'P90 Conservative Piping'  },
  { id:'ENS_P10', label:'P10 Optimistic Partial'   },
];
const STEPS = [0,300,600,900,1200,1800,2400,3000,3600];

function fmt(v) { const n = parseFloat(v); return isNaN(n) ? '---' : n.toFixed(0) + ' min'; }

function Bar({ rpi }) {
  const c = rpi >= 75 ? '#ef4444' : rpi >= 50 ? '#f59e0b' : rpi >= 25 ? '#3b82f6' : '#10b981';
  return (
    <div style={{width:'100%',height:4,background:'#1e293b',borderRadius:2,overflow:'hidden'}}>
      <div style={{width:`${rpi}%`,height:'100%',background:c,borderRadius:2,transition:'width .5s'}} />
    </div>
  );
}

function VillageCard({ s, onClose }) {
  if (!s) return null;
  const tc = TIER[s.priority_tier] || TIER.SAFE_STANDBY;
  const iso = ISO[s.isolation_status] || { label: s.isolation_status, cls: 'text-slate-300' };
  return (
    <div className="absolute top-4 right-4 z-[600] w-72 rounded-lg shadow-2xl border overflow-hidden"
         style={{background:'rgba(15,23,42,0.97)',borderColor:tc.border}}>
      <div className="flex items-center justify-between px-3 py-2" style={{background:tc.bg}}>
        <span className="font-bold text-xs tracking-wider uppercase" style={{color:tc.text}}>{s.name}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs ml-2">X</button>
      </div>
      <div className="p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Priority Tier</span>
          <span className="font-bold" style={{color:tc.text}}>{tc.label}</span>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Response Priority Index</span>
            <span className="font-mono text-white">{s.response_priority_index}/100</span>
          </div>
          <Bar rpi={s.response_priority_index} />
        </div>
        <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800">
          <div><span className="text-slate-500 block">Population</span><span className="text-white font-mono">{s.population?.toLocaleString()}</span></div>
          <div><span className="text-slate-500 block">Elevation</span><span className="text-white font-mono">{s.elevation_m} m</span></div>
          <div><span className="text-slate-500 block">Flood Arrival</span><span className="font-mono" style={{color:tc.text}}>{fmt(s.flood_arrival_time_min)}</span></div>
          <div><span className="text-slate-500 block">Peak Depth</span><span className="text-white font-mono">{s.peak_depth_m?.toFixed(1)} m</span></div>
          <div><span className="text-slate-500 block">Road Cutoff</span><span className="font-mono text-orange-300">{fmt(s.road_cutoff_time_min)}</span></div>
          <div><span className="text-slate-500 block">Isolation</span><span className={'font-bold ' + iso.cls}>{iso.label}</span></div>
        </div>
        <div className="pt-1 border-t border-slate-800">
          <div className="flex justify-between"><span className="text-slate-400">Flood Likelihood</span><span className="font-mono text-white">{(s.flood_likelihood*100).toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Data Quality</span><span className="font-mono text-slate-300">{(s.data_quality_score*100).toFixed(0)}%</span></div>
        </div>
        {s.assigned_shelter_name && (
          <div className="pt-1 border-t border-slate-800">
            <span className="text-slate-500 block">Shelter</span>
            <span className="text-emerald-300 font-medium">{s.assigned_shelter_name}</span>
            <div className="flex justify-between mt-1"><span className="text-slate-400">Distance</span><span className="font-mono text-white">{s.nearest_shelter_distance_km?.toFixed(1)} km</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Route Status</span>
              <span className={'font-bold text-[10px] ' + (s.route_status==='FEASIBLE'?'text-emerald-400':s.route_status==='TIGHT_MARGIN'?'text-amber-400':'text-red-400')}>{s.route_status}</span>
            </div>
          </div>
        )}
        {s.critical_facilities?.length > 0 && (
          <div className="pt-1 border-t border-slate-800">
            <span className="text-slate-500 block mb-1">Critical Facilities</span>
            {s.critical_facilities.map((f,i) => <span key={i} className="text-sky-300 block text-[10px]">{f}</span>)}
          </div>
        )}
        <div className="pt-1 border-t border-slate-800 text-[9px] text-amber-400">{s.mode_label}</div>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, onReview }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-amber-400 bg-amber-950/50 border border-amber-800 rounded px-2 py-1">
        HUMAN REVIEW REQUIRED - No alerts dispatched automatically
      </div>
      {alerts.length === 0 && <div className="text-slate-500 text-xs text-center py-4">No critical alerts generated</div>}
      {alerts.map(a => {
        const tc = TIER[a.priority_tier] || TIER.ELEVATED_WATCH;
        return (
          <div key={a.alert_id} className="rounded border p-2.5 space-y-1.5" style={{borderColor:tc.border,background:tc.bg+'40'}}>
            <div className="flex justify-between gap-2">
              <span className="font-bold text-[11px]" style={{color:tc.text}}>{a.settlement_name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{borderColor:tc.border,color:tc.text}}>{tc.label}</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-snug">{(a.recommended_action||'').slice(0,120)}...</div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{a.review_status}</span>
              {a.review_status === 'DRAFT' && <button onClick={() => onReview(a.alert_id)} className="text-[10px] text-sky-400 hover:text-sky-200">Review</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UncPanel({ bounds }) {
  return (
    <div className="space-y-2">
      {bounds.map(b => (
        <div key={b.metric} className="rounded bg-slate-800/60 border border-slate-700 p-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">{b.metric.replace(/_/g,' ')}</div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-sky-400 font-mono w-14">P10: {b.p10_optimistic.toFixed(1)}</span>
            <div className="flex-1 h-2 bg-gradient-to-r from-sky-600/60 via-amber-500/60 to-red-600/60 rounded" />
            <span className="text-red-400 font-mono w-14 text-right">P90: {b.p90_conservative.toFixed(1)}</span>
          </div>
          <div className="text-center text-[10px] text-amber-300 font-mono mt-0.5">P50: {b.p50_median.toFixed(1)} {b.unit}</div>
        </div>
      ))}
      <div className="p-2 bg-slate-800/50 border border-slate-700 rounded text-[10px] text-slate-400">
        <Info className="w-3 h-3 inline mr-1 text-sky-400" />
        Flood likelihood, RPI, and data quality are numerically separate fields.
      </div>
    </div>
  );
}

export default function VillageRisk() {
  const mapRef = useRef(null);
  const mapI = useRef(null);
  const mV = useRef({});
  const mS = useRef({});
  const mR = useRef({});
  const sseR = useRef(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sel, setSel] = useState(null);
  const [ens, setEns] = useState('ENS_P50');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [panel, setPanel] = useState('queue');
  const [alerts, setAlerts] = useState([]);
  const [lyr, setLyr] = useState({ routes:true, shelters:true, labels:true });

  useEffect(() => {
    if (mapI.current || !mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl:false, attributionControl:true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution:'© Esri, Maxar', maxZoom:18 }).addTo(map);
    L.control.zoom({ position:'topright' }).addTo(map);
    map.setView([30.25, 78.47], 10);
    mapI.current = map;
    return () => { map.remove(); mapI.current = null; };
  }, []);

  const renderLayers = useCallback((d) => {
    const map = mapI.current;
    if (!map || !d) return;
    Object.values(mV.current).forEach(m => m.remove());
    Object.values(mS.current).forEach(m => m.remove());
    Object.values(mR.current).forEach(l => l.remove());
    mV.current = {}; mS.current = {}; mR.current = {};

    d.settlements.forEach(s => {
      const tc = TIER[s.priority_tier] || TIER.SAFE_STANDBY;
      const iso = ISO[s.isolation_status] || { label:s.isolation_status, cls:'text-slate-300' };
      const sz = s.population > 3000 ? 22 : s.population > 1000 ? 18 : 14;
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${tc.bg};border:2px solid ${tc.border};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:${tc.text};box-shadow:0 0 8px ${tc.border}80;cursor:pointer">${tc.label[0]}</div>`,
        iconSize: [sz, sz], iconAnchor: [sz/2, sz/2]
      });
      const mk = L.marker([s.latitude, s.longitude], { icon });
      mk.on('click', () => setSel(s));
      if (lyr.labels) mk.bindTooltip(`<b style="color:${tc.text}">${s.name}</b><br/><span style="color:#94a3b8">RPI ${s.response_priority_index} | ${iso.label}</span>`, { permanent:false, direction:'top' });
      mk.addTo(map);
      mV.current[s.settlement_id] = mk;
    });

    if (lyr.shelters) d.shelters.forEach(sh => {
      const occ = sh.occupancy_percent;
      const col = occ > 90 ? '#ef4444' : occ > 60 ? '#f59e0b' : '#10b981';
      const icon = L.divIcon({ className:'', html:`<div style="width:16px;height:16px;border-radius:3px;background:#0f172a;border:2px solid ${col};display:flex;align-items:center;justify-content:center;font-size:8px;color:${col};font-weight:700;box-shadow:0 0 6px ${col}80">S</div>`, iconSize:[16,16], iconAnchor:[8,8] });
      const mk = L.marker([sh.latitude, sh.longitude], { icon });
      mk.bindTooltip(`<b style="color:#f1f5f9">${sh.name}</b><br/>${sh.allocated_evacuees}/${sh.capacity} (${occ.toFixed(0)}%)`, { permanent:false, direction:'top' });
      mk.addTo(map);
      mS.current[sh.shelter_id] = mk;
    });

    if (lyr.routes) d.evacuation_routes.forEach(r => {
      const col = r.is_passable_at_sim_time ? '#10b981' : '#ef4444';
      const line = L.polyline(r.path_coordinates.map(([lon,lat]) => [lat,lon]), { color:col, weight:2.5, opacity:0.85, dashArray: r.is_passable_at_sim_time ? null : '6,4' });
      line.bindTooltip(`${r.settlement_name} to ${r.shelter_name} | ${r.traversability_state}`);
      line.addTo(map);
      mR.current[r.route_id] = line;
    });
  }, [lyr]);

  useEffect(() => { if (data) renderLayers(data); }, [data, renderLayers]);

  const assess = useCallback(async (ts=t, sc=ens) => {
    setLoading(true); setError(null);
    try {
      const d = await api.assessVillageRisk({ mode:'DEMO', scenario_id:sc, sim_time_s:ts });
      setData(d); setAlerts(d.alerts_queue || []);
    } catch(e) { setError('Assessment failed: ' + e.message); }
    finally { setLoading(false); }
  }, [t, ens]);

  useEffect(() => { assess(0, 'ENS_P50'); }, []); // eslint-disable-line

  const startStream = useCallback(() => {
    if (sseR.current) { sseR.current.close(); sseR.current = null; }
    setStreaming(true); setPlaying(true);
    const es = api.streamVillageRisk({ scenario_id:ens, start_s:t, end_s:3600, step_s:300, speed_x:60 });
    es.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.event === 'stream_complete') { setPlaying(false); setStreaming(false); es.close(); return; }
        setData(d); setT(d.sim_time_s); setAlerts(d.alerts_queue || []);
      } catch(e) { /* ignore */ }
    };
    es.onerror = () => { setPlaying(false); setStreaming(false); es.close(); };
    sseR.current = es;
  }, [ens, t]);

  const stopStream = useCallback(() => {
    if (sseR.current) { sseR.current.close(); sseR.current = null; }
    setPlaying(false); setStreaming(false);
  }, []);

  const step = useCallback((dir) => {
    const idx = STEPS.indexOf(t);
    const ni = idx === -1 ? 0 : Math.max(0, Math.min(STEPS.length-1, idx+dir));
    const nt = STEPS[ni];
    setT(nt); assess(nt, ens);
  }, [t, ens, assess]);

  const reviewAlert = useCallback(async (alertId) => {
    try {
      await api.reviewAlert(alertId, { review_status:'UNDER_REVIEW', reviewed_by:'OPERATOR' });
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? {...a, review_status:'UNDER_REVIEW'} : a));
    } catch(e) { console.error(e); }
  }, []);

  const crit = data?.critical_settlements_count ?? 0;
  const isol = data?.isolated_settlements_count ?? 0;
  const pop = data?.total_population_at_risk ?? 0;
  const simMin = Math.round((t ?? 0) / 60);

  return (
    <div className="h-full w-full flex flex-col bg-[#0B0F19] text-slate-100 overflow-hidden select-none">
      <div className="h-10 bg-[#111827] border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-bold flex items-center gap-1.5"><Shield className="w-3.5 h-3.5"/>VILLAGE RISK &amp; RESCUE PRIORITY</span>
          <span className="text-slate-600">//</span>
          <span className="text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded font-bold animate-pulse">SYNTHETIC DEMO - NOT REAL-WORLD DATA</span>
          <span className="text-slate-600">//</span>
          <span className="text-slate-300">T+{simMin} min</span>
          <span className="text-slate-600">//</span>
          <span className="text-sky-300">{data?.scenario_id || '---'}</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin"/>}
          {streaming && <span className="text-emerald-400 animate-pulse text-[10px] font-bold">LIVE STREAM</span>}
          <span className={'text-[9px] px-1.5 py-0.5 rounded border ' + (crit>0?'bg-red-900 text-red-300 border-red-700':'bg-slate-800 text-slate-400 border-slate-700')}>{crit} CRITICAL</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-60 bg-[#111827] border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto text-xs">
          <div className="p-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Mission Summary</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[{label:'Settlements',value:data?.total_settlements??'---',icon:MapPin,cls:'text-white'},{label:'Critical',value:crit,icon:AlertTriangle,cls:crit>0?'text-red-400':'text-slate-400'},{label:'Isolated',value:isol,icon:Shield,cls:isol>0?'text-orange-400':'text-slate-400'},{label:'Pop at Risk',value:pop?(pop/1000).toFixed(1)+'K':'---',icon:Users,cls:'text-amber-300'}].map(({label,value,icon:Icon,cls})=>(
                <div key={label} className="bg-slate-800/60 rounded p-2">
                  <Icon className={'w-3 h-3 mb-1 '+cls}/>
                  <div className={'font-bold text-sm '+cls}>{value}</div>
                  <div className="text-[9px] text-slate-500">{label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Ensemble Scenario</div>
            {ENS.map(e => (
              <button key={e.id} onClick={() => {setEns(e.id); assess(t,e.id);}}
                className={'w-full text-left px-2.5 py-1.5 rounded mb-1 text-[11px] transition-colors ' + (ens===e.id?'bg-sky-900/70 text-sky-300 border border-sky-700':'text-slate-400 hover:bg-slate-800')}>
                {e.label}
              </button>
            ))}
          </div>
          <div className="p-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2">Scenario Timeline</div>
            <div className="flex items-center gap-1 mb-2">
              <button onClick={() => {setT(0); assess(0,ens);}} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><RotateCcw className="w-3.5 h-3.5"/></button>
              <button onClick={() => step(-1)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><SkipBack className="w-3.5 h-3.5"/></button>
              <button onClick={playing?stopStream:startStream}
                className={'p-1.5 rounded text-white flex-1 flex items-center justify-center gap-1 text-[10px] ' + (playing?'bg-orange-700 hover:bg-orange-600':'bg-sky-700 hover:bg-sky-600')}>
                {playing?<Pause className="w-3.5 h-3.5"/>:<Play className="w-3.5 h-3.5"/>}
                {playing?'PAUSE':'PLAY LIVE'}
              </button>
              <button onClick={() => step(1)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><SkipForward className="w-3.5 h-3.5"/></button>
            </div>
            <input type="range" min={0} max={3600} step={300} value={t}
              onChange={e => {const v=Number(e.target.value); setT(v); assess(v,ens);}}
              className="w-full accent-sky-500"/>
            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5"><span>T+0</span><span>T+{simMin}m</span><span>T+60m</span></div>
          </div>
          <div className="p-3 border-b border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1"><Layers className="w-3 h-3"/>Map Layers</div>
            {Object.entries(lyr).map(([k,v]) => (
              <label key={k} className="flex items-center gap-2 mb-1.5 cursor-pointer group">
                <input type="checkbox" checked={v} onChange={() => setLyr(p => ({...p,[k]:!p[k]}))} className="accent-sky-500 w-3 h-3"/>
                <span className="text-slate-400 text-[11px] capitalize group-hover:text-slate-200">{k}</span>
              </label>
            ))}
          </div>
          <div className="p-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1"><Database className="w-3 h-3"/>Data Status</div>
            <div className="bg-emerald-950/40 border border-emerald-800 rounded p-2 mb-1.5">
              <div className="text-emerald-400 font-bold text-[10px]">DEMO MODE ACTIVE</div>
              <div className="text-slate-400 text-[9px] mt-0.5">Synthetic data. No external inputs required.</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded p-2">
              <div className="text-slate-400 font-bold text-[10px]">DATA-CONNECTED: UNAVAILABLE</div>
              <div className="text-slate-500 text-[9px] mt-0.5">Needs: settlements GeoJSON, DEM, flood rasters, road network. See /api/village-risk/status</div>
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex flex-col min-w-0">
          {error && <div className="absolute top-4 left-4 right-4 z-[700] bg-red-950 border border-red-700 rounded px-3 py-2 text-red-300 text-xs">{error}</div>}
          <div className="flex-1 relative" ref={mapRef}>
            <div className="absolute bottom-12 left-4 z-[400] bg-slate-900/95 border border-slate-700 rounded p-2.5 text-[10px] space-y-1 shadow-xl">
              <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Priority Legend</div>
              {Object.entries(TIER).map(([k,v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border" style={{background:v.bg,borderColor:v.border}}/>
                  <span style={{color:v.text}}>{v.label}</span>
                </div>
              ))}
              <div className="border-t border-slate-700 mt-1 pt-1">
                <div className="flex items-center gap-1.5 text-emerald-400 text-[9px]">Open Route (green line)</div>
                <div className="flex items-center gap-1.5 text-red-400 text-[9px]">Flooded Route (dashed red)</div>
                <div className="flex items-center gap-1.5 text-slate-300 text-[9px]">[S] = Shelter marker</div>
              </div>
            </div>
          </div>
          {sel && <VillageCard s={sel} onClose={() => setSel(null)} />}
          <div className="h-9 bg-[#0F172A] border-t border-slate-800 px-3 flex items-center gap-2 text-[10px] font-mono shrink-0">
            <span className="text-slate-500 shrink-0">T+{simMin}min</span>
            <div className="flex-1 flex items-center gap-0.5 overflow-x-auto">
              {STEPS.map(s => (
                <button key={s} onClick={() => {setT(s); assess(s,ens);}}
                  className={'px-1.5 py-0.5 rounded text-[9px] shrink-0 transition-colors ' + (t===s?'bg-sky-700 text-white':'text-slate-500 hover:bg-slate-700 hover:text-slate-300')}>
                  {s/60}m
                </button>
              ))}
            </div>
            <span className={'shrink-0 ' + (loading?'text-amber-400 animate-pulse':'text-emerald-400')}>{loading?'COMPUTING':'READY'}</span>
          </div>
        </div>

        <div className="w-80 bg-[#111827] border-l border-slate-800 flex flex-col shrink-0 text-xs">
          <div className="flex border-b border-slate-800 shrink-0">
            {[{id:'queue',label:'Response Queue',icon:Activity},{id:'alerts',label:'Alert Queue',icon:Bell},{id:'unc',label:'Uncertainty',icon:BarChart3}].map(({id,label,icon:Icon}) => (
              <button key={id} onClick={() => setPanel(id)}
                className={'flex-1 py-2 text-[10px] flex flex-col items-center gap-0.5 transition-colors ' + (panel===id?'bg-sky-950 text-sky-400 border-b border-sky-500':'text-slate-500 hover:bg-slate-800 hover:text-slate-300')}>
                <Icon className="w-3.5 h-3.5"/>{label.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {panel === 'queue' && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Ranked Response Queue (RPI descending)</div>
                {data?.settlements?.map((s,i) => {
                  const tc = TIER[s.priority_tier] || TIER.SAFE_STANDBY;
                  const iso = ISO[s.isolation_status];
                  return (
                    <div key={s.settlement_id} onClick={() => setSel(s)}
                      className="rounded border p-2 cursor-pointer hover:opacity-90 transition-all"
                      style={{borderColor:tc.border,background:tc.bg+'30'}}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] text-slate-500">#{i+1}</span>
                          <span className="font-bold text-[11px]" style={{color:tc.text}}>{s.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-white">{s.response_priority_index}</span>
                      </div>
                      <Bar rpi={s.response_priority_index}/>
                      <div className="flex justify-between mt-1.5 text-[9px] text-slate-400">
                        <span>{s.population?.toLocaleString()}</span>
                        <span className={iso?.cls}>{iso?.label}</span>
                        <span>{fmt(s.time_to_isolation_countdown_min)} left</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {panel === 'alerts' && <AlertPanel alerts={alerts} onReview={reviewAlert}/>}
            {panel === 'unc' && data?.uncertainty_bounds && (
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Ensemble Uncertainty Bounds</div>
                <UncPanel bounds={data.uncertainty_bounds}/>
              </div>
            )}
          </div>
          <div className="border-t border-slate-800 p-3 shrink-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Shelter Capacity</div>
            <div className="grid grid-cols-2 gap-1.5">
              {data?.shelters?.slice(0,4).map(sh => {
                const pct = sh.occupancy_percent;
                const col = pct > 90 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';
                return (
                  <div key={sh.shelter_id} className="bg-slate-800/60 rounded p-1.5">
                    <div className="text-[9px] text-slate-400 truncate">{sh.name.split(' ').slice(0,2).join(' ')}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-700 rounded overflow-hidden">
                        <div className="h-full rounded" style={{width:`${pct}%`,background:col,transition:'width .5s'}}/>
                      </div>
                      <span className="text-[9px] font-mono text-slate-300">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
