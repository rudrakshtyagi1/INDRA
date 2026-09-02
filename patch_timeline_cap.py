import re

with open('frontend/src/pages/SimulationLab.jsx', 'r') as f:
    content = f.read()

content = content.replace("prev >= 180", "prev >= 13.33")
content = content.replace("return 180", "return 13.33")
content = content.replace("Math.min(180, prev + 1)", "Math.min(13.33, prev + 0.166)") # Step by ~10 seconds (0.166 mins)

with open('frontend/src/pages/SimulationLab.jsx', 'w') as f:
    f.write(content)
