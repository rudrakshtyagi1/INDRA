import re

with open("backend/floodlab/api/main.py", "r") as f:
    content = f.read()

if "from floodlab.api.routers import exports" not in content:
    content = content.replace("from floodlab.api.routers import ( v3, runs,", "from floodlab.api.routers import ( v3, runs, exports,")
    content = content.replace('app.include_router(runs.router, prefix="/api/runs", tags=["runs"])', 'app.include_router(runs.router, prefix="/api/runs", tags=["runs"])\napp.include_router(exports.router, prefix="/api/runs/{run_id}/exports", tags=["exports"])')

with open("backend/floodlab/api/main.py", "w") as f:
    f.write(content)
