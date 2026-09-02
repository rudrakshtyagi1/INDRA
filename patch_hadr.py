import re

with open("frontend/src/pages/HADRDashboard.jsx", "r") as f:
    content = f.read()

content = content.replace("import { useV3Data } from '../hooks/useV3Data';", "import { useV3Data } from '../hooks/useV3Data';\nimport ExportMenu from '../components/ExportMenu';")
content = content.replace('<div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">', '<div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0 flex justify-between items-center">\n        <div>')
content = content.replace('<p className="text-sm text-slate-500 mt-1">Evaluate emergency-response routing against modelled hydrodynamic constraints.</p>', '<p className="text-sm text-slate-500 mt-1">Evaluate emergency-response routing against modelled hydrodynamic constraints.</p>\n        </div>\n        <ExportMenu products={["normal_route", "hazard_aware_route"]} />')

with open("frontend/src/pages/HADRDashboard.jsx", "w") as f:
    f.write(content)
