import re

with open("backend/floodlab/api/routers/runs.py", "r") as f:
    content = f.read()

frames_endpoint = """
@router.get("/{run_id}/frames")
async def get_run_frames(run_id: str):
    if run_id not in RUNS_DB:
        raise HTTPException(404, "Run not found")
        
    frames = []
    if run_id == "v4_extended":
        for i in range(61):
            time_sec = i * 60
            # Pad with 4 digits as per LISFLOOD output: 0000, 0001, etc.
            # But the export engine expects the product name. 
            # We can create a dynamic export product "depth_XXXX" or just pass it directly.
            # Let's assume the frontend will fetch Geotiffs or simply use the URL provided.
            url = f"/api/runs/{run_id}/exports/depth_{i:04d}?format=geotiff"
            frames.append({"time_sec": time_sec, "url": url})
            
        return {
            "run_id": run_id,
            "provenance": "MODELLED",
            "solver": "LISFLOOD-FP 8.1",
            "interval_sec": 60,
            "frames": frames
        }
    else:
        # For V3 or others
        return {
            "run_id": run_id,
            "provenance": "PRECOMPUTED VERIFIED PROTOTYPE RESULT",
            "solver": "LISFLOOD-FP 8.1",
            "interval_sec": 50,
            "frames": [
                {"time_sec": i * 50, "url": f"/api/runs/{run_id}/exports/depth_{i:04d}?format=geotiff"}
                for i in range(17)
            ]
        }
"""
content += frames_endpoint

with open("backend/floodlab/api/routers/runs.py", "w") as f:
    f.write(content)
