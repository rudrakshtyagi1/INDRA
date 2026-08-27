import React from 'react';
import { X, Download, FileText, Globe, Layers, Archive } from 'lucide-react';
import { api } from '../services/api';

export default function ExportModal({ isOpen, onClose, simulationResult, selectedPreset }) {
  if (!isOpen) return null;

  const params = simulationResult?.scenario_params || selectedPreset || {};
  const payload = {
    run_id: simulationResult?.run_id,
    scenario_name: params.name || 'HydroBreach_Simulation',
    lat: params.lat || 30.485,
    lon: params.lon || 79.738,
    reach_length_km: params.reach_length_km || 25.0,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-100">
              Export Geospatial Layers & HADR Reports
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Download standardized GIS datasets and disaster situation reports for <strong>{payload.scenario_name}</strong>.
        </p>

        <div className="space-y-2.5">
          {/* ESRI Shapefile Package */}
          <div
            onClick={() => api.downloadShapefile(payload)}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center border border-blue-800/40">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition">
                  ESRI Shapefile Package (.shp .zip)
                </h4>
                <p className="text-[11px] text-slate-400">Inundation extents, hazard zones (.shp, .shx, .dbf, .prj)</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
          </div>

          {/* Google Earth KML */}
          <div
            onClick={() => api.downloadKML(payload)}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center border border-emerald-800/40">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition">
                  Google Earth KML / KMZ (.kml)
                </h4>
                <p className="text-[11px] text-slate-400">3D extruded hazard polygons with elevation tags</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
          </div>

          {/* HADR Situation Report CSV */}
          <div
            onClick={() => api.downloadCSVReport(payload)}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center border border-red-800/40">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-red-400 transition">
                  HADR Situation Report (.csv)
                </h4>
                <p className="text-[11px] text-slate-400">Exposure summary, economic loss & NDRF resource table</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
          </div>

          {/* Delft3D FM Project Files */}
          <div
            onClick={() => api.downloadDelft3DFiles(payload)}
            className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl cursor-pointer transition flex items-center justify-between group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center border border-cyan-800/40">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition">
                  Delft3D FM Simulation Package (.zip)
                </h4>
                <p className="text-[11px] text-slate-400">Master definition (.mdu), boundary forcing (.ext), hydrograph (.tim)</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
