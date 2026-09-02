with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

content = content.replace(
    "fetch('/data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_runData.tif')",
    "fetch(runData.maxDepthUrl || '/data/processed/tehri_simulations/lisflood_fp/outputs/v3_geometry_corrected/rasters/max_depth_v3.tif')"
)
content = content.replace(
    "// Load max_depth_runData.tif",
    "// Load max depth raster"
)
# Add the run toggle UI
toggle_ui = """
      <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--surface-border)] bg-white">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
            <FlaskConical size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Simulation Lab</h1>
            <div className="text-sm font-medium text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
              <span className={`status-pill ${selectedRun === 'V3' ? 'status-pill--active' : 'status-pill--running'}`}>
                {selectedRun === 'V3' ? 'TEHRI V3 (800s)' : 'TEHRI V4 EXTENDED (3600s)'}
              </span>
              <select 
                className="ml-2 bg-[var(--surface-0)] border border-[var(--surface-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                value={selectedRun}
                onChange={(e) => setSelectedRun(e.target.value)}
              >
                <option value="V3">TEHRI V3 — VERIFIED 800s BENCHMARK</option>
                <option value="V4">TEHRI V4 — EXTENDED 3600s MODEL RUN</option>
              </select>
"""

import re
content = re.sub(r' *<div className="px-6 py-4 flex items-center justify-between border-b border-\[var\(--surface-border\)\] bg-white">.*?<h1 className="text-xl font-bold tracking-tight text-\[var\(--text-primary\)\]">Simulation Lab</h1>.*?<span className="status-pill status-pill--active">.*?</span>', toggle_ui, content, flags=re.DOTALL)

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)
