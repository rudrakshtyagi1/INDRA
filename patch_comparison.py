import re

with open('frontend/src/pages/ScenarioComparison.jsx', 'r') as f:
    content = f.read()

content = content.replace("Delft3D FM", "LISFLOOD-FP")
content = content.replace("Delft3dDiagram", "LisfloodDiagram")
content = content.replace("delft3d", "lisflood")
content = content.replace("Far-field 2–100 km", "Far-field 2–15 km")
content = content.replace("PROTOTYPE SCHEMATIC · Live solver coupling in standby", "V3 COUPLING SCHEMATIC · BACK-SCALED DUALSPHYSICS MODEL RESULT → LISFLOOD-FP")
content = content.replace("PROTOTYPE SCHEMATIC · Precomputed hydrodynamic routing", "V3 COUPLING SCHEMATIC · REAL SOLVER EXECUTION")
content = content.replace("Delft3D Flexible Mesh cells", "LISFLOOD-FP grid cells")
content = content.replace("SOLVER NOT EXECUTED · DATA UNAVAILABLE", "PHYSICAL VALIDATION: NOT AVAILABLE")
content = content.replace("DualSPHysics (0–2 km) → LISFLOOD-FP (2–145 km)", "DualSPHysics (0–2 km) → LISFLOOD-FP (2–15 km)")
content = content.replace("DualSPHysics (0–2 km) → Delft3D FM (2–145 km)", "DualSPHysics (0–2 km) → LISFLOOD-FP (2–15 km)")
content = content.replace("SOLVER NOT EXECUTED", "OBSERVED VALIDATION DATA NOT AVAILABLE")
content = content.replace("Requires live coupled run", "Requires observed dataset")
content = content.replace("PROTOTYPE SCHEMATIC", "WHAT-IF HYDRODYNAMIC BENCHMARK")
content = content.replace("Delft3D", "LISFLOOD-FP")
content = content.replace("2–145 km", "2–15 km")

with open('frontend/src/pages/ScenarioComparison.jsx', 'w') as f:
    f.write(content)
