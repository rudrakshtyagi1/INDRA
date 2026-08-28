# System Design

## Architecture Layers

```
[Frontend: MapLibre + Deck.gl (2D GIS) | CesiumJS (3D digital twin)]
                    |
              [FastAPI REST API]
                    |
         [Services Orchestration Layer]
                    |
    +-------+-------+-------+-------+
    |       |       |       |       |
 Engines  Geospa  Satell  Validat  Export
 (breach  -tial   -lite   -ion     -ers
  sph     DEM     GEE     benchm   GeoJSON
  couple  raster  Sentin  arks     KML
  delft3d vector  el-1/2           Shapef
  hazard  OSM              )       CSV
  expose  landcvr                  GeoTIF
  routing roughns)
    |
[Database: PostgreSQL 16 + PostGIS (primary)]
[         SQLite (dev/test fallback)        ]
    |
[Storage: storage/simulations/<run_id>/]
    |
[Celery Workers + Redis (long-running solver jobs)]
```

## Async API

FastAPI with async/await throughout. All DB queries via AsyncSession (SQLAlchemy 2.0).
Long-running solver jobs dispatched to Celery workers.

## Database Strategy

Primary: PostgreSQL 16 + PostGIS 3.4
- All production runs
- Spatial queries via PostGIS
- Simulation manifest storage
- Dam and scenario registry

Dev/Test fallback: SQLite + aiosqlite
- Controlled by DATABASE_URL env variable
- Activated by default in test suite
- No PostGIS spatial extensions (spatial ops fall back to pure Python Shapely)

## Run-Centric Storage

Each simulation run is self-contained under storage/simulations/<run_id>/:
```
manifest.json        <- created at run start, updated on completion
inputs/              <- snapshot of all input configs and scenario YAML
hydrology/           <- SCS-CN results, inflow hydrograph CSV
sph/                 <- DualSPHysics _Def.xml, case files, Part_XXXX/ output
coupling/            <- discharge_boundary.tim, boundary.ext, Q(t).json
delft3d/             <- .mdu, .ext, .net.nc, FloodSim_map.nc, FloodSim_his.nc
hazard/              <- depth_max.tif, velocity_max.tif, arrival_time.tif, hazard_rating.tif
uncertainty/         <- ensemble_members/, p10.tif, p50.tif, p90.tif, inundation_prob.tif
exposure/            <- population_exposed.json, infrastructure_exposed.json, road_risk.geojson
routing/             <- evacuation_routes.geojson, rescue_routes.geojson, village_priority.json
exports/             <- hazard_zones.geojson, hazard_zones.kml, hazard_zones.zip, report.csv
```

## Solver Integration Pattern

Both DualSPHysics and Delft3D FM are integrated via:
1. Input file generation (XML/MDU/EXT/TIM)
2. subprocess.run() execution of binary
3. Output file parsing (VTK/NetCDF/CSV)
4. EngineNotAvailableError if binary not found (never silently falls back)

Version recorded at runtime from binary --version flag, never hardcoded.
