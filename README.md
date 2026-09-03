# FloodLab

> Physics-based dam-break inundation modelling and emergency-response decision support for HADR workflows.

FloodLab is an end-to-end disaster-modelling platform that connects hydrology, breach-release modelling, near-field particle hydrodynamics, far-field 2D inundation modelling, infrastructure exposure, emergency routing, satellite observation, numerical QA, and scientific provenance inside one operational command-center workflow.

The current reference implementation focuses on a what-if Tehri Dam / Bhagirathi River benchmark in Uttarakhand, India.

> **Important:** FloodLab is a research and emergency-planning prototype. The Tehri catastrophic-breach scenario is a hypothetical benchmark, not a historical event or an operational forecast.

---

## Why FloodLab?

A flood map alone is not enough during a dam-break or sudden-release emergency.
Decision makers need to answer a chain of questions:

1. What hydrometeorological conditions are driving the scenario?
2. What discharge hydrograph enters the hydraulic model?
3. How does the near-field breach flow behave?
4. How does that discharge propagate downstream through complex terrain?
5. When does inundation reach specific locations?
6. Which roads and critical assets intersect the modelled hazard?
7. Can responders still reach affected areas?
8. What parts of the result are observed, assumed, modelled, or derived?

FloodLab is designed around that full chain rather than treating modelling, GIS analysis, and HADR routing as disconnected tasks.

### Core Idea

```
REAL DATA
   ↓
HYDROLOGY
   ↓
THEORETICAL BREACH BENCHMARK
   ↓
DUALSPHYSICS — NEAR FIELD
   ↓
FROUDE SIMILARITY COUPLING
   ↓
LISFLOOD-FP — FAR FIELD
   ↓
TEMPORAL FLOOD PRODUCTS
   ↓
EXPOSURE ANALYSIS
   ↓
HADR ROUTING
   ↓
SATELLITE / QA / PROVENANCE
   ↓
FLOODLAB COMMAND CENTER
```

The dashboard is only the interface. The actual system is the scientific modelling and decision-support pipeline underneath it.

---

## System Architecture

```mermaid
flowchart TD
    A[Real-World Data] --> B[Geospatial & Hydrometeorological Preprocessing]

    A1[Copernicus DEM GLO-30] --> A
    A2[ERA5-Land Precipitation] --> A
    A3[CWC Discharge Observations] --> A
    A4[HydroBASINS / HydroRIVERS] --> A
    A5[ESA WorldCover 2021] --> A
    A6[OpenStreetMap] --> A
    A7[Sentinel-1 / Google Earth Engine] --> A

    B --> C[Hydrology Engine]
    C --> D[Hydrologic Q(t)]
    D --> E[Theoretical Breach Benchmark]
    E --> F[DualSPHysics 5.4 CPU<br/>Near-Field Particle Hydrodynamics]
    F --> G[Froude Similarity Coupling<br/>Model Q(t) → Prototype Q(t)]
    G --> H[LISFLOOD-FP 8.1<br/>2D Far-Field Inundation]

    H --> I[Temporal Depth / Arrival / Inundation]
    I --> J[Exposure Engine]
    J --> K[Roads / Assets / Critical Infrastructure]
    K --> L[HADR Routing Engine<br/>OSMnx + NetworkX]

    A7 --> M[Sentinel-1 Change Analysis]
    H --> M

    C --> N[Scientific Artifact Registry]
    E --> N
    F --> N
    G --> N
    H --> N
    J --> N
    L --> N
    M --> N

    N --> O[FastAPI API Layer]
    O --> P[React Command Center]
```

---

## Multi-Scale Hydraulic Architecture

One of the main design decisions in FloodLab is to not force one solver to do everything.

### 1. DualSPHysics — Near Field
The breach vicinity contains highly dynamic free-surface flow, rapid acceleration, strong deformation, and complex local hydraulics. FloodLab uses DualSPHysics 5.4 CPU for this near-field stage.

Verified execution artifacts include:
- GenCase execution
- DualSPHysics solver execution
- PartVTK particle output generation
- real particle-frame artifacts for scientific visualization

The near-field model is not used to simulate the entire downstream river corridor. That would be computationally inefficient for a large catchment-scale emergency workflow.

### 2. Froude Similarity — Physics-Based Coupling
The downstream SPH discharge is transferred to prototype scale using Froude similarity.
For the verified scale ratio:
- Length scale: $\lambda_L = 100$
- Velocity scale: $\lambda_v = \sqrt{\lambda_L} = 10$
- Time scale: $\lambda_t = \sqrt{\lambda_L} = 10$
- Discharge scale: $\lambda_Q = \lambda_L^{5/2} = 100,000$

A model-scale downstream peak of approximately $3.0\text{ m}^3/\text{s}$ therefore corresponds to a prototype-equivalent coupling peak of approximately $300,000\text{ m}^3/\text{s}$.

This value is a **DualSPHysics-derived / Froude back-scaled coupling boundary peak Q**, not a rainfall-runoff inflow value.

### 3. LISFLOOD-FP — Far Field
The prototype-equivalent hydrograph becomes the upstream boundary for LISFLOOD-FP 8.1, which is used for efficient 2D downstream inundation modelling.

This stage generates spatial and temporal products such as:
- water depth
- arrival time
- inundation extent
- temporal depth frames
- wet-area evolution
- downstream exposure products

#### Hybrid Architecture Overview
| Stage | Solver / Method | Role |
| :--- | :--- | :--- |
| **Hydrology** | Conceptual rainfall-runoff model | Event-scale inflow response |
| **Breach benchmark** | Theoretical benchmark formulation | What-if breach forcing |
| **Near field** | DualSPHysics 5.4 CPU | High-energy local breach hydraulics |
| **Scale coupling** | Froude similarity | Model-to-prototype $Q(t)$ transfer |
| **Far field** | LISFLOOD-FP 8.1 | 2D inundation propagation |
| **Impact** | GIS spatial intersection | Road / asset exposure |
| **Response** | OSMnx + NetworkX | Hazard-aware HADR routing |

---

## Data Pipeline

FloodLab combines multiple open and institutional data sources.

| Dataset | Use in FloodLab |
| :--- | :--- |
| **Copernicus DEM GLO-30** | Terrain / hydraulic-domain preprocessing |
| **ERA5-Land** | Hourly precipitation forcing |
| **CWC observations** | Hydrologic comparison / parameter fitting |
| **HydroBASINS** | Catchment geometry and basin consistency checks |
| **HydroRIVERS** | River-network topology |
| **ESA WorldCover 2021** | Land-cover context and roughness-related preprocessing |
| **OpenStreetMap** | Roads, routing graph, facilities and exposure layers |
| **Sentinel-1 GRD** | Pre/post surface-water-change analysis via GEE |

### Verified Preprocessing Reference Values
- **Tehri catchment area**: ~7,300.30 km²
- **CWC reference area**: ~7,287 km²
- **Difference**: ~0.18%
- **HydroBASINS IoU L10**: 0.9643
- **HydroBASINS IoU L08**: 0.9438
- **HydroRIVERS reaches in study data**: 4,677

---

## Hydrology Engine

The current verified event workflow uses a conceptual event rainfall-runoff model built from:
- rainfall-loss separation
- Nash cascade routing
- linear baseflow

The selected hydrometeorological prototype event spans 30 July–4 August 2024.

### Reference Metrics
| Metric | Value |
| :--- | :--- |
| **Prototype-event rainfall** | 89.76 mm |
| **Observed Tekhla hourly peak** | 852.93 m³/s |
| **Modelled Bhagirathi peak** | 866.81 m³/s |
| **Peak error** | +1.63% |
| **Timing error** | +5 h |
| **Volume bias** | +8.58% |
| **NSE** | -0.4436 |
| **KGE** | 0.3096 |
| **Pearson r** | 0.3179 |
| **RMSE** | 148.18 m³/s |
| **MAE** | 123.99 m³/s |

The hydrology stage is deliberately labelled:
> `PARTIALLY CALIBRATED / PARAMETER-FITTED`

The system does not hide weak goodness-of-fit metrics. Scientific limitations are surfaced directly in the interface and provenance layer.

Hydrologic scenario peaks currently include:
- **LOW**: 1,593.84 m³/s
- **BASE**: 2,113.68 m³/s
- **HIGH**: 2,962.76 m³/s

These are hydrologic inflow scenarios and are intentionally kept separate from catastrophic breach-release values.

---

## Theoretical Breach Benchmark

A catastrophic Tehri breach has not occurred historically. FloodLab therefore treats the catastrophic case as a what-if emergency-planning benchmark.
Because a verified Tehri-specific stage-storage relationship was not available in the project data, the theoretical breach stage uses simplified assumptions and synthetic hypsometry.

The UI and API distinguish this stage with explicit labels such as:
- `SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY`
- `SYNTHETIC_HYPSOMETRY`
- `STAGE_STORAGE_DATA_NOT_AVAILABLE`

This prevents hypothetical scenario values from being mistaken for historical observations.

---

## Corrected V4 Hydraulic Benchmark

The strongest verified far-field benchmark currently packaged with FloodLab is the corrected V4 run.

| Parameter | Value |
| :--- | :--- |
| **Solver** | LISFLOOD-FP 8.1 |
| **Grid resolution** | 30 m |
| **Hydraulic-domain length** | ~30 km |
| **Simulation duration** | 3,600 s |
| **Temporal frames** | 61 |
| **Downstream boundary** | FREE |
| **Final mass-balance error** | 0.00023% |
| **Boundary QA** | PASS |
| **Hydraulic QA** | PASS |

The numerical maximum depth in this benchmark is 431.41 m:
> `NUMERICAL BENCHMARK MAXIMUM — NOT PHYSICALLY VALIDATED`

FloodLab intentionally keeps numerical convergence separate from physical validation. A numerically stable run is not automatically presented as a real-world forecast.

---

## Exposure Analysis

FloodLab converts hydraulic output into operational GIS information by intersecting the modelled hazard with infrastructure layers.

For the corrected V4 benchmark:
- **Road length intersecting modelled hazard**: 60.819 km
- **Affected road segments**: 74
- **Earliest road exposure**: 120 s
- **Settlements intersected**: 0
- **Healthcare facilities intersected**: 0
- **Bridges intersected**: 0
- **Power assets intersected**: 0

A zero intersection is not interpreted as "safe". FloodLab reports it as:
> `NO INTERSECTION WITH CURRENT MODELLED HAZARD EXTENT`

---

## HADR Routing Engine

FloodLab connects flood modelling directly to emergency-route feasibility.

```
Temporal inundation
      ↓
Road-edge intersection
      ↓
Road graph state update
      ↓
OSMnx / NetworkX routing
      ↓
Route feasibility / hazard conflicts
```

For the corrected V4 benchmark:
- **Normal route distance**: 132.363 km
- **Modelled hazard-conflict edges**: 6
- **Normal route status**: `NOT FEASIBLE AGAINST CURRENT MODELLED HAZARD`
- **Hazard-aware route**: `NO PASSABLE PATH` under the current scenario

For the earlier V3 benchmark, the routing engine found a hazard-aware detour of approximately 143.93 km, about 10.32 km longer than the normal route.

The routing layer is designed to return an unavailable path when necessary rather than drawing a visually convenient but scientifically unsupported route.

---

## Sentinel-1 Satellite Observation

FloodLab includes a real, credential-gated Google Earth Engine + Sentinel-1 GRD workflow.

The workflow supports:
- IW-mode Sentinel-1 scenes
- VV / VH polarization filtering
- pre-event and post-event median composites
- same-relative-orbit preference
- backscatter-drop analysis
- Otsu thresholding
- optional permanent-water exclusion
- connected-component cleanup
- surface-water-change area calculation
- GeoJSON vectorization
- model-vs-observation spatial-overlap calculations

For the hypothetical catastrophic Tehri breach, Sentinel-1 comparison is treated as:
> `SPATIAL CONTEXT ONLY — NOT HISTORICAL BREACH VALIDATION`

When credentials or observations are unavailable, FloodLab reports a truthful unavailable/standby state instead of generating synthetic satellite data.

---

## Scientific Provenance

Every important result is classified separately from execution status.
FloodLab uses seven provenance categories:

| Provenance | Meaning |
| :--- | :--- |
| **OBSERVED** | Directly measured data |
| **REPORTED** | Value from an external authoritative source |
| **ASSUMED** | Explicit modelling assumption |
| **MODELLED** | Direct model output |
| **DERIVED** | Computed from one or more inputs / outputs |
| **PRECOMPUTED MODEL RESULT** | Verified stored model output served by the platform |
| **CONTEXT DATA** | Supporting contextual layer not used as direct validation |

---

## Software Architecture

### Frontend
The command center is built with React + Vite and provides workspaces for:
- Command Center
- Simulation Lab
- Scenario Builder
- Exposure Analysis
- Damage / vulnerability exploration
- HADR routing
- Sentinel-1 observation
- Models & QA
- Data & Provenance

The Simulation Lab supports scientific sub-views including:
- LISFLOOD temporal frames
- DualSPHysics particle playback
- Froude coupling
- breach benchmark plots
- frame/audit information

### Backend
The backend is built with FastAPI and is organized around modular routers, scientific services, geospatial processing, solver adapters, exports, provenance, and run/scenario control.

```
backend/floodlab/
├── api/           # FastAPI application + REST routers
├── config/        # environment / provider configuration
├── core/          # shared application logic
├── domain/        # domain-level models
├── engines/       # solver integration / numerical engines
├── exporters/     # GeoJSON / SHP / KML / CSV products
├── geospatial/    # raster/vector spatial processing
├── provenance/    # provenance and lineage metadata
├── satellite/     # Sentinel-1 / GEE workflow
├── schemas/       # API/data schemas
└── services/      # scenarios, runs, boundaries, artifacts, etc.
```

The application serves verified heavy-solver outputs as precomputed scientific artifacts; normal web startup does not rerun DualSPHysics or LISFLOOD-FP.

---

## API & Export Products

FloodLab exposes REST endpoints for scientific products and scenario/run workflows.

Supported export families include:
- GeoTIFF
- GeoJSON
- ESRI Shapefile ZIP
- KML
- CSV

Typical products include temporal depth rasters, maximum depth, arrival time, inundation extent, exposed roads/assets, HADR routes, and exposure summaries.

---

## Local Development

### Option A — Docker (recommended)
```bash
git clone https://github.com/rudrakshtyagi1/Floodlab.git
cd Floodlab
cp .env.example .env

docker compose up --build
```

Application endpoints:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

Optional GEE / Copernicus credentials belong in environment variables or local secret mounts. Never commit `.env`, service-account keys, or provider secrets.

### Option B — Run services separately

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn floodlab.api.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173.
Vite proxies `/api` requests to the local FastAPI backend on port 8000 during development.

---

## Tests & Quality Gates

```bash
make test
make build-frontend
```

Or run directly:
```bash
cd backend
python3 -m pytest tests/ -v

cd ../frontend
npm run lint
npm run build
```

---

## Repository Structure

```
Floodlab/
├── backend/                 # FastAPI + scientific services
├── frontend/                # React/Vite command center
├── data/                    # run/scenario inputs and processed products
├── storage/                 # persisted application/satellite artifacts
├── docs/                    # methodology and engineering documentation
├── scripts/                 # reproducible scientific/preprocessing workflows
├── tests/                   # verification and integration tests
├── .github/                 # CI workflows
├── .env.example             # blank configuration template
├── docker-compose.yml       # reproducible local web stack
├── Makefile                 # common developer commands
└── README.md
```

---

## Current Model Status

### Verified / integrated
- Tehri-focused data preprocessing
- conceptual rainfall-runoff hydrology
- theoretical breach benchmark
- DualSPHysics 5.4 CPU execution
- Froude back-scaling and coupling hydrograph
- LISFLOOD-FP 8.1 corrected V4 benchmark
- temporal inundation products
- road / infrastructure exposure workflow
- OSMnx + NetworkX HADR routing
- geospatial exports
- GEE/Sentinel-1 integration path
- scientific artifact registry / API exposure
- provenance-aware command center

### Alternative solver status
Delft3D-FM was investigated as an alternative far-field solver, but the required executable/build chain was not available in the current environment.
- `INTEGRATION PATH AVAILABLE`
- `EXECUTABLE NOT AVAILABLE`
- `NO FLOODLAB NUMERICAL OUTPUT`

FloodLab does not fabricate a Delft3D comparison result.

### Roadmap — Extended Corridor V5
The next modelling scale is planned as:
> `TEHRI_V5_EXTENDED_CORRIDOR`<br/>
> Tehri → Devprayag → Rishikesh → Haridwar

Its purpose is to extend the far-field screening domain, track flood-front chainage, time-synchronize downstream road disruption, and support larger-area HADR analysis.

Until a real V5 solver run and QA outputs exist, this remains an in-development extension and is not presented as a completed scientific result.

---

## Scientific Limitations

FloodLab deliberately exposes its current limits:
- catastrophic Tehri breach is hypothetical
- physical validation of the catastrophic benchmark is not available
- verified Tehri-specific stage-storage data was unavailable for the breach benchmark
- bathymetry is currently unavailable
- hydrology is partially calibrated / parameter-fitted, not a fully validated operational forecast model
- V4 maximum depth is a numerical benchmark value, not a physically validated field depth
- current verified hydraulic outputs do not provide a validated velocity field for operational boat navigation
- areas outside a hydraulic model domain must not be interpreted as safe
- Sentinel-1 contextual comparison is not equivalent to historical breach validation
- the platform is decision-support research software, not dispatch authorization or a replacement for official dam-safety procedures

---

## Design Philosophy

- **Physics before presentation** — visual output must come from real scientific artifacts.
- **No fabricated certainty** — unavailable data remains unavailable.
- **Provenance everywhere** — observed, assumed, modelled, and derived information are kept distinct.
- **Hazard → Impact → Decision** — simulation is useful only when it can support downstream operational reasoning.

---

## SIH 2026 Context

FloodLab was developed for the Smart India Hackathon 2026 disaster-management problem space around dam-break inundation modelling and flash-flood scenario generation for HADR planning.

The Tehri / Bhagirathi case is used as the primary technical benchmark to demonstrate the end-to-end workflow.

---

## Final Summary

FloodLab is not just a GIS viewer and not just a hydraulic solver.
It is an integrated modelling architecture that connects:

```
DATA
→ HYDROLOGY
→ BREACH PHYSICS
→ DUALSPHYSICS
→ FROUDE COUPLING
→ LISFLOOD-FP
→ TEMPORAL INUNDATION
→ EXPOSURE
→ HADR ROUTING
→ SATELLITE / QA / PROVENANCE
```

The goal is to convert complex flood physics into transparent, traceable, and actionable emergency-planning information.

**FloodLab — Physics to Decisions.**
