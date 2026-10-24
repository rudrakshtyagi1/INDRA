# INDRA Utility Scripts

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

## Scientific workflows and diagnostics

Run these commands from the repository root. They require the corresponding local
scientific datasets and external tools; they are not part of normal web startup.
Many retain machine-specific `/workspace` or `/data` paths and overwrite outputs.

| Directory | Contents | Example |
| --- | --- | --- |
| `modelling/sph/` | XML and forcing preparation, solver launch, coupling extraction | `python scripts/modelling/sph/extract_checkpoints.py` |
| `modelling/lisflood/` | Terrain, boundaries, V2–V5 preparation, conversion and solver launch | `python scripts/modelling/lisflood/generate_v5_domain.py` |
| `analysis/exposure/` | V3 and V4 exposure calculations | `python scripts/analysis/exposure/compute_exposure_v4.py` |
| `analysis/routing/` | V3/V4 route calculations and road timing | `python scripts/analysis/routing/run_hadr_v4.py` |
| `diagnostics/` | Manual raster, graph, infrastructure, and path checks | `python scripts/diagnostics/test_paths.py` |

The `test_*.py` files in `diagnostics/` are manual dataset probes, not pytest tests.
Alternative historical scripts are retained for traceability; their names do not
establish a canonical execution order or scientific validity. See the
[repository guide](../docs/repository_structure.md) for storage and placement rules.

`python scripts/check_repository_structure.py` checks staged files for misplaced
scripts, generated grids, backups, and local environments without running models.
