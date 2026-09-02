import re

with open("frontend/src/pages/ScenariosWorkspace.jsx", "r") as f:
    content = f.read()

content = content.replace("import { Layers, Plus, FileText, CheckCircle2, AlertTriangle, AlertCircle, Upload, X, Play, Clock, ArrowRight, ArrowLeft } from 'lucide-react';", "import { Layers, Plus, FileText, CheckCircle2, AlertTriangle, AlertCircle, Upload, X, Play, Clock, ArrowRight, ArrowLeft } from 'lucide-react';\nimport ExportMenu from '../components/ExportMenu';")

# Find where to put it in renderRunDetails.
# Let's put it next to "RETURN TO REGISTRY"
if '<button onClick={() => { setView(\'registry\'); fetchScenarios(); }} className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">' in content:
    content = content.replace('<button onClick={() => { setView(\'registry\'); fetchScenarios(); }} className="w-full py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">', 
    '<ExportMenu runId={selectedRun?.run_id} products={["inundation_extent", "max_depth", "arrival_time", "exposed_roads", "exposed_settlements", "exposed_healthcare", "exposed_bridges", "exposed_power", "normal_route", "hazard_aware_route", "exposure_summary"]} />\n             <button onClick={() => { setView(\'registry\'); fetchScenarios(); }} className="w-full mt-2 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">')

with open("frontend/src/pages/ScenariosWorkspace.jsx", "w") as f:
    f.write(content)
