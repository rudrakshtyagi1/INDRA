import re

with open("backend/floodlab/api/routers/v3.py", "r") as f:
    content = f.read()

new_endpoints = """
@router.get("/context/{asset_type}")
async def get_v3_context(asset_type: str):
    path = f"{V3_BASE}/exposure/v3/context/{asset_type}.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "MODEL OUTPUT UNAVAILABLE")
"""

content = content + new_endpoints

with open("backend/floodlab/api/routers/v3.py", "w") as f:
    f.write(content)

