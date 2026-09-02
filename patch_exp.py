import re

with open("frontend/src/pages/Exposure.jsx", "r") as f:
    content = f.read()

content = content.replace("import { useV3Data } from '../hooks/useV3Data';", "import { useV3Data } from '../hooks/useV3Data';\nimport ExportMenu from '../components/ExportMenu';")

if '<div className="flex justify-between items-center mb-6">' in content:
    content = content.replace('<div className="flex justify-between items-center mb-6">', '<div className="flex justify-between items-center mb-6">\n          <ExportMenu products={["exposed_roads", "exposed_settlements", "exposed_healthcare", "exposed_bridges", "exposed_power", "exposure_summary"]} />')

with open("frontend/src/pages/Exposure.jsx", "w") as f:
    f.write(content)
