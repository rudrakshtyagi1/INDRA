import re

with open("backend/floodlab/api/routers/v3.py", "r") as f:
    content = f.read()

# Replace get_v3_frames block
start_idx = content.find('@router.get("/frames")')
if start_idx != -1:
    new_block = """@router.get("/frames/{time_sec}")
async def get_v3_frame(time_sec: int):
    \"\"\"
    Returns the precomputed GeoJSON arrival-time propagation mask.
    time_sec should be snapped to nearest 50s.
    \"\"\"
    snapped = int(round(time_sec / 50.0) * 50)
    snapped = max(0, min(800, snapped))
    path = f"{V3_BASE}/lisflood_fp/outputs/v3_geometry_corrected/rasters/frames/frame_{snapped:03d}.geojson"
    if os.path.exists(path):
        return FileResponse(path, media_type="application/geo+json")
    raise HTTPException(404, "FRAME NOT FOUND")
"""
    content = content[:start_idx] + new_block

with open("backend/floodlab/api/routers/v3.py", "w") as f:
    f.write(content)
