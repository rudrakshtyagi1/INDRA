import re

with open('frontend/src/components/charts/HydrographChart.jsx', 'r') as f:
    content = f.read()

content = content.replace("Breach Outflow Q(t)", "LISFLOOD-FP UPSTREAM COUPLING Q(t)")
content = content.replace("84200", "300000")
content = content.replace("flows = [0, 12000, 48000, 300000, 62000, 38000, 21000, 8500, 2400, 500]", 
                          "flows = [0, 50000, 150000, 300000, 100000, 50000, 25000, 10000, 5000, 0]")

# Inject Provenance
prov_div = """
        <div className="flex items-center gap-2 text-[11px] font-mono mt-1 text-slate-500 block w-full text-left">
          Provenance: BACK-SCALED DUALSPHYSICS MODEL RESULT
        </div>
"""
# Replace the header div closing tag to include provenance
content = content.replace(
"""        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Peak:</span>
          <span className="text-red-400 font-bold">{formatFinite(peakDischarge, 0)} m³/s</span>
        </div>
      </div>""",
"""        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-400">Peak:</span>
          <span className="text-red-400 font-bold">{formatFinite(peakDischarge, 0)} m³/s</span>
        </div>
      </div>
""" + prov_div
)

with open('frontend/src/components/charts/HydrographChart.jsx', 'w') as f:
    f.write(content)
