const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/Overview.jsx', 'utf-8');

const provenanceTable = `
      {/* Data Provenance Table */}
      <div className="px-6 pb-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Data Provenance & Sources</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-semibold uppercase tracking-wider">Dataset / Source</th>
                  <th className="pb-2 font-semibold uppercase tracking-wider">Purpose</th>
                  <th className="pb-2 font-semibold uppercase tracking-wider">Status</th>
                  <th className="pb-2 font-semibold uppercase tracking-wider">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 font-medium">Copernicus GLO-30</td>
                  <td className="py-2">Terrain</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">REMOTE-SENSING DATA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">ERA5-Land</td>
                  <td className="py-2">Rainfall forcing</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">REANALYSIS DATA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">CWC Tekhla / Koteshwar</td>
                  <td className="py-2">Hydrologic QA</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">OBSERVED GAUGE DATA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">HydroRIVERS / HydroBASINS</td>
                  <td className="py-2">River and catchment context</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">GEOSPATIAL DATA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">ESA WorldCover</td>
                  <td className="py-2">Land-cover context</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">REMOTE-SENSING DATA</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">OpenStreetMap</td>
                  <td className="py-2">Infrastructure & Routing</td>
                  <td className="py-2"><span className="status-pill status-pill--active">USED</span></td>
                  <td className="py-2 font-mono text-[10px]">OPEN GEOSPATIAL DATA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Optional ML Section */}
      <div className="px-6 pb-5">
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Optional Flood Susceptibility Screening</p>
            <p className="text-xs text-slate-500 mb-2">Machine learning susceptibility models (e.g. LightGBM, XGBoost) are strictly separated from the core hydrodynamic prediction.</p>
            <span className="status-pill status-pill--neutral">NOT USED IN CURRENT V3 PIPELINE</span>
          </div>
        </div>
      </div>
`;

// Insert before {/* Disclaimer */}
const disclaimerToken = "{/* Disclaimer */}";
const disclaimerIdx = content.indexOf(disclaimerToken);
if (disclaimerIdx !== -1) {
  content = content.slice(0, disclaimerIdx) + provenanceTable + '\n      ' + content.slice(disclaimerIdx);
}

fs.writeFileSync('frontend/src/pages/Overview.jsx', content);
