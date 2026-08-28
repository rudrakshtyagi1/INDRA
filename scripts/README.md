# FloodLab Utility Scripts

| Script | Purpose | Example Usage |
|--------|---------|---------------|
| `download_dem.py` | Downloads / records metadata for DEM tiles | `python scripts/download_dem.py --source copernicus` |
| `download_osm.py` | Downloads OSM roads and settlements | `python scripts/download_osm.py --output data/raw/osm` |
| `prepare_tehri.py` | Prepares terrain & OSM for Tehri scenario | `python scripts/prepare_tehri.py` |
| `preprocess_data.py` | Generic data preprocessing pipeline | `python scripts/preprocess_data.py --scenario tehri_base` |
| `run_sph.py` | Standalone DualSPHysics runner test | `python scripts/run_sph.py --run-id sph_001` |
| `run_delft3d.py` | Standalone Delft3D FM runner test | `python scripts/run_delft3d.py --run-id delft_001` |
| `run_pipeline.py` | Full end-to-end pipeline execution | `python scripts/run_pipeline.py --scenario tehri_base` |
| `seed_database.py` | Seeds DB from scenario YAML files | `python scripts/seed_database.py` |
