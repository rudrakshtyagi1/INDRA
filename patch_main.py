import re

with open("backend/floodlab/api/main.py", "r") as f:
    content = f.read()

if "from floodlab.api.routers import runs" not in content:
    content = content.replace("from floodlab.api.routers import ( v3,", "from floodlab.api.routers import ( v3, runs,")
    content = content.replace('app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])', 'app.include_router(scenarios.router, prefix="/api/scenarios", tags=["scenarios"])\napp.include_router(runs.router, prefix="/api/runs", tags=["runs"])')

with open("backend/floodlab/api/main.py", "w") as f:
    f.write(content)

