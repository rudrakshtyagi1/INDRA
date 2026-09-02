import re

with open("frontend/src/pages/Exposure.jsx", "r") as f:
    content = f.read()

content = content.replace('<div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0">', '<div className="px-8 py-6 bg-white border-b border-slate-200 shrink-0 flex justify-between items-center">\n         <div>')
content = content.replace('<p className="text-slate-500 mt-1 text-sm">Quantify asset inundation metrics along the 145km study corridor.</p>', '<p className="text-slate-500 mt-1 text-sm">Quantify asset inundation metrics along the 145km study corridor.</p>\n         </div>\n         <ExportMenu products={["exposed_roads", "exposed_settlements", "exposed_healthcare", "exposed_bridges", "exposed_power", "exposure_summary"]} />')

with open("frontend/src/pages/Exposure.jsx", "w") as f:
    f.write(content)
