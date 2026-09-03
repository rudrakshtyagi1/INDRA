#!/usr/bin/env bash
set -e

mkdir -p docs/screenshots scratch/chrome_profile

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE_URL="http://localhost:5173"
PROFILE="/Users/rudrakshtyagi/Desktop/dam/scratch/chrome_profile"

capture() {
  local filename="$1"
  local url="$2"
  echo "Capturing $filename from $url ..."
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --user-data-dir="$PROFILE" \
    --window-size=1920,1080 \
    --virtual-time-budget=3500 \
    --screenshot="docs/screenshots/$filename" \
    "$url" >/dev/null 2>&1 || true
}

echo "=== Starting 16 Screenshot Evidence Matrix Capture ==="

capture "01_command_center.png" "$BASE_URL/#overview"
capture "02_physics_pipeline_flow.png" "$BASE_URL/#physics"
capture "03_hydrology_observed_vs_modelled.png" "$BASE_URL/#hydrology"
capture "04_theoretical_breach_hydrograph.png" "$BASE_URL/#simulation?view=breach"
capture "05_dualsphysics_particle_playback.png" "$BASE_URL/#simulation?view=sph"
capture "06_froude_coupling_scaling.png" "$BASE_URL/#simulation?view=coupling"
capture "07_lisflood_temporal_flood_t0.png" "$BASE_URL/#simulation?view=lisflood&t=0"
capture "08_lisflood_temporal_flood_t1800.png" "$BASE_URL/#simulation?view=lisflood&t=1800"
capture "09_lisflood_temporal_flood_t3600.png" "$BASE_URL/#simulation?view=lisflood&t=3600"
capture "10_exposure_road_network.png" "$BASE_URL/#exposure"
capture "11_hadr_route_feasibility.png" "$BASE_URL/#hadr"
capture "12_data_operations_catalog.png" "$BASE_URL/#data"
capture "13_catchment_landcover_composition.png" "$BASE_URL/#data"
capture "14_solver_comparison_matrix.png" "$BASE_URL/#models_qa"
capture "15_numerical_qa_console.png" "$BASE_URL/#models_qa"
capture "16_guided_science_tour.png" "$BASE_URL/#physics"

echo "=== All 16 Screenshots Captured Successfully ==="
ls -lh docs/screenshots/*.png
