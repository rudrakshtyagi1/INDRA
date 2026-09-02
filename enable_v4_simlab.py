with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

import re
# Find the disabled option and re-enable it
content = re.sub(r'<option value="V4" disabled>.*?</option>', '<option value="V4">TEHRI V4 — EXTENDED 3600s MODEL RUN</option>', content)

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)
