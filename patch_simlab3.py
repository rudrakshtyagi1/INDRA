with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

# Disable V4 option
new_ui = """
              <select 
                className="ml-2 bg-[var(--surface-0)] border border-[var(--surface-border)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--accent)]"
                value={selectedRun}
                onChange={(e) => setSelectedRun(e.target.value)}
              >
                <option value="V3">TEHRI V3 — VERIFIED 800s BENCHMARK</option>
                <option value="V4" disabled>TEHRI V4 — EXTENDED 3600s (FAILED QA - RERUNNING)</option>
              </select>
"""
import re
content = re.sub(r'<select.*?<option value="V3">TEHRI V3 — VERIFIED 800s BENCHMARK</option>.*?<option value="V4">TEHRI V4 — EXTENDED 3600s MODEL RUN</option>.*?</select>', new_ui, content, flags=re.DOTALL)

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)
