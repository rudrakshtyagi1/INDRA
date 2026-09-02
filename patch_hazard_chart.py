import re

with open('frontend/src/components/charts/DownstreamHazardChart.jsx', 'r') as f:
    content = f.read()

content = content.replace("Peak Depth & Velocity Profile", "MODELLED MAXIMUM DEPTH PROFILE")

# Remove velPoints
content = re.sub(r'const velPoints = .*?;', '', content)

# Remove velocity line rendering
content = re.sub(r'<polyline points=\{velPoints\}.*?/>', '', content)

# Remove velocity circles
content = re.sub(r'<circle cx=\{scaleX\(s\.km\)\} cy=\{scaleVelY\(s\.vel\)\}.*?/>', '', content)

# Modify the Header
header_old = """        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Waves className="w-3 h-3" /> Peak Depth (m)
          </div>
          <div className="flex items-center gap-1.5 text-purple-400">
            <Gauge className="w-3 h-3" /> Velocity (m/s)
          </div>
        </div>"""

header_new = """        <div className="flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Waves className="w-3 h-3" /> Depth (m)
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            VELOCITY DATA: NOT AVAILABLE FROM CURRENT V3 OUTPUT
          </div>
        </div>"""
content = content.replace(header_old, header_new)

# Remove the right y-axis for velocity
content = re.sub(r'\{\/\* Right Y-axis \(Velocity\) \*\/\}.*?\{\/\* Stations X-axis \*\/\}', '{/* Stations X-axis */}', content, flags=re.DOTALL)

with open('frontend/src/components/charts/DownstreamHazardChart.jsx', 'w') as f:
    f.write(content)
