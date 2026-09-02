const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/sim/FloatingMapControls.jsx', 'utf-8');

const labelHtml = `
      {/* Playback Mode Label */}
      <div 
        className="floating-control flex flex-col px-3 py-2 text-xs font-semibold text-slate-800 bg-white/95"
        title="Flood extent is progressively revealed using the modelled first-arrival time raster. Instantaneous water depth time-series are not currently loaded."
      >
        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">PLAYBACK MODE</span>
        <span className="text-blue-700">ARRIVAL-TIME-DERIVED PROPAGATION</span>
      </div>
`;

const insertToken = "{/* Layers Menu */}";
content = content.replace(insertToken, labelHtml + '\n      ' + insertToken);

fs.writeFileSync('frontend/src/components/sim/FloatingMapControls.jsx', content);
