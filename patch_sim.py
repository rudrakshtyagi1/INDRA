import re

with open("frontend/src/pages/SimulationLab.jsx", "r") as f:
    content = f.read()

# Add import
content = content.replace("import { useV3Data } from '../hooks/useV3Data';", "import { useV3Data } from '../hooks/useV3Data';\nimport ExportMenu from '../components/ExportMenu';")

# Find a good place for the Export menu, e.g., next to the header or in the floating controls.
# Let's find: <div className="absolute top-4 left-4 z-[400] flex gap-2">
if '<div className="absolute top-4 left-4 z-[400] flex gap-2">' in content:
    content = content.replace('<div className="absolute top-4 left-4 z-[400] flex gap-2">', '<div className="absolute top-4 left-4 z-[400] flex gap-2">\n        <ExportMenu products={["inundation_extent", "max_depth", "arrival_time"]} />')

with open("frontend/src/pages/SimulationLab.jsx", "w") as f:
    f.write(content)

