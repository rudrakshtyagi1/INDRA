import subprocess
import time
import os
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_URL = "http://localhost:5173"
OUT_DIR = Path("/Users/rudrakshtyagi/Desktop/dam/docs/screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

SCREENSHOTS = [
    ("01_command_center.png", f"{BASE_URL}/#overview"),
    ("02_physics_pipeline_flow.png", f"{BASE_URL}/#physics"),
    ("03_hydrology_observed_vs_modelled.png", f"{BASE_URL}/#hydrology"),
    ("04_theoretical_breach_hydrograph.png", f"{BASE_URL}/#simulation?view=breach"),
    ("05_dualsphysics_particle_playback.png", f"{BASE_URL}/#simulation?view=sph"),
    ("06_froude_coupling_scaling.png", f"{BASE_URL}/#simulation?view=coupling"),
    ("07_lisflood_temporal_flood_t0.png", f"{BASE_URL}/#simulation?view=lisflood&t=0"),
    ("08_lisflood_temporal_flood_t1800.png", f"{BASE_URL}/#simulation?view=lisflood&t=1800"),
    ("09_lisflood_temporal_flood_t3600.png", f"{BASE_URL}/#simulation?view=lisflood&t=3600"),
    ("10_exposure_road_network.png", f"{BASE_URL}/#exposure"),
    ("11_hadr_route_feasibility.png", f"{BASE_URL}/#hadr"),
    ("12_data_operations_catalog.png", f"{BASE_URL}/#data?sub=catalog"),
    ("13_catchment_landcover_composition.png", f"{BASE_URL}/#data?sub=catchment"),
    ("14_solver_comparison_matrix.png", f"{BASE_URL}/#models_qa"),
    ("15_numerical_qa_console.png", f"{BASE_URL}/#models_qa"),
    ("16_guided_science_tour.png", f"{BASE_URL}/#physics?tour=true"),
]

def capture_one(filename, url, idx):
    target = OUT_DIR / filename
    if target.exists():
        target.unlink()

    profile = f"/Users/rudrakshtyagi/Desktop/dam/scratch/chrome_p_{idx}"
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        f"--user-data-dir={profile}",
        "--window-size=1920,1080",
        f"--screenshot={str(target)}",
        url,
    ]

    print(f"[{idx+1}/16] Capturing {filename} from {url}...")
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    captured = False
    for _ in range(25):
        time.sleep(0.4)
        if target.exists() and target.stat().st_size > 10000:
            print(f"    -> OK: {filename} ({target.stat().st_size:,} bytes)")
            captured = True
            break

    proc.terminate()
    try:
        proc.wait(timeout=2)
    except Exception:
        proc.kill()
    return captured

def main():
    print("=== Capturing 16 Screenshot Evidence Matrix (1920x1080) ===")
    results = {}
    for i, (fname, url) in enumerate(SCREENSHOTS):
        results[fname] = capture_one(fname, url, i)

    print("\n=== SUMMARY ===")
    for fname, ok in results.items():
        size = (OUT_DIR / fname).stat().st_size if (OUT_DIR / fname).exists() else 0
        status = f"PASS ({size:,} B)" if ok else "FAIL"
        print(f"  {fname}: {status}")

if __name__ == "__main__":
    main()
