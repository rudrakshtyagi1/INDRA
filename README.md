# HydroBreach: Dam Break & Flash Flood Simulation Framework for HADR

HydroBreach is an end-to-end simulation, satellite surveillance, and disaster analytics platform designed to model catastrophic dam-break and river-blockage flash flood events in India. Built specifically for Humanitarian Assistance and Disaster Relief (HADR) agencies (NDMA, SDMAs, CWC, NDRF), HydroBreach combines particle physics, 2D shallow water hydrodynamic modeling, Google Earth Engine (GEE) Sentinel-1 SAR change detection, and standardized geospatial exports (`.shp` and `.kml`).

---

## 🌊 Key Capabilities

### 1. Dual Hydrodynamic Simulation Engines
- **Weakly Compressible SPH (WCSPH)**: Mesh-free particle hydrodynamics with Wendland $C_2$ smoothing kernels, Monaghan artificial viscosity, and Tait equation of state. Resolves high-energy initial dam break shock fronts and steep mountain debris avalanches.
- **Delft3D Flexible Mesh / 2D SWE**: High-resolution finite volume 2D Shallow Water Equations solver with well-balanced bed slope reconstruction, wetting/drying front tracking, and Manning friction roughness.
- **Co-Registration & CSI Evaluation**: Side-by-side verification calculating the **Critical Success Index (CSI)**, Probability of Detection (POD), False Alarm Ratio (FAR), and spatial depth difference heatmaps ($\Delta h$).

### 2. Empirical Dam Breach Mechanics
- **Froehlich (2008)**: Parametric breach width, side slope, development time, and peak outflow discharge.
- **MacDonald & Langridge-Monopolis (1984)**: Volume of eroded embankment material and breach development.
- **Von Thun & Gillette (1990)**: Erosion rates and breach sizing for highly cohesive vs easily erodible materials.
- **Ritter & Stoker Analytical Solutions**: Instantaneous failure for concrete gravity and arch dams.
- **Landslide Dam Outburst Flood (LDOF)**: Costa & Schuster / Walder equations for loose rock/ice blockages.

### 3. Pre-Packaged Indian Benchmark Scenarios
1. **Rishi Ganga & Dhauliganga (Uttarakhand 2021 Disaster)**: Rock/ice avalanche triggered landslide dam outburst flood affecting Raini village and Tapovan Vishnugad HEP.
2. **Bhakra Dam (Sutlej River, HP / Punjab)**: Concrete gravity dam failure scenario downstream through Nangal, Anandpur Sahib, and Ropar.
3. **Tehri Dam (Bhagirathi River, Uttarakhand)**: Rockfill embankment dam piping & overtopping breach scenario cascading towards Devprayag, Rishikesh, and Haridwar.
4. **Hirakud Dam (Mahanadi River, Odisha)**: Earthen dam extreme surge & spillway release scenario impacting Sambalpur.

### 4. GEE Sentinel-1 SAR Satellite Observation
- Real, credential-gated access to the Google Earth Engine `COPERNICUS/S1_GRD` collection.
- Bitemporal pre/post SAR backscatter-drop analysis with adaptive Otsu thresholding.
- Matching relative-orbit preference, permanent-water exclusion, connected-pixel cleanup, area statistics, GeoJSON vectors, and map visualization.
- Persisted observation analyses plus model-vs-satellite spatial overlap metrics.
- **No synthetic SAR fallback:** if GEE is unavailable, the UI reports `STANDBY / DATA UNAVAILABLE`.
- Tehri catastrophic-breach satellite overlap is explicitly treated as **environmental spatial context, not historical physical validation**.

See [`docs/satellite_methodology.md`](docs/satellite_methodology.md).

### 5. HADR Loss & Damage Assessment
- Hazard Rating: $HR = d \cdot (v + 0.5) + DF$ (CWC & Defra standards).
- Depth-damage vulnerability curves for residential, commercial, and agricultural assets.
- Tactical Evacuation Zoning:
  - **Red Zone** (< 30 min arrival, high velocity): Forced evacuation & NDRF motorboats.
  - **Orange Zone** (30 - 120 min): Pre-emptive shelter relocation.
  - **Yellow Zone** (> 120 min): Advisory & logistics standby.
- Tabular economic loss breakdown in ₹ Crores (INR).

### 6. Standardized Geospatial Exporters
- **ESRI Shapefile Package**: `.shp`, `.shx`, `.dbf`, `.prj` bundled into `.zip`.
- **Google Earth KML / KMZ**: 3D extruded hazard polygons with elevation tags.
- **GeoJSON**: Standard web GIS FeatureCollections.
- **HADR Situation Report**: Tabulated CSV summary for incident commanders.
- **Delft3D FM Simulation Package**: `.mdu`, `.ext`, and `.tim` files for Deltares Delft3D FM suite.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn hydrobreach.api.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Backend Tests
```bash
cd backend
pytest tests/ -v
```

---

## 📊 System Architecture

```
HydroBreach/
├── backend/
│   ├── hydrobreach/
│   │   ├── models/
│   │   │   ├── breach_mechanics.py       # Froehlich, MacDonald, Von Thun, Ritter
│   │   │   ├── sph_engine/               # WCSPH Particle Physics Solver
│   │   │   ├── delft3d_engine/           # 2D SWE Flexible Mesh Hydrodynamics
│   │   │   ├── scenario_comparator/      # CSI, POD, FAR, Difference Heatmaps
│   │   │   ├── gee_monitor/              # Sentinel-1 SAR Change Detection
│   │   │   ├── loss_damage/              # CWC/JRC Depth-Damage & HADR Zoning
│   │   │   ├── geospatial_etl/           # DEM Bathymetry & Cross-Sections
│   │   │   └── exporters/                # Shapefile (.shp), KML (.kml), GeoJSON
│   │   ├── data/
│   │   │   └── preset_scenarios.py       # Indian River & Dam Datasets
│   │   └── api/
│   │       ├── main.py                   # FastAPI Application Entry
│   │       └── routers/                  # Modular REST Endpoints
│   └── tests/
│       └── test_hydrobreach.py           # Verification Test Suite
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── ScenarioBuilder.jsx       # Dam & Breach Parameter Configurator
    │   │   ├── SimulationViewer.jsx      # Canvas SPH Particle & Contours Viewer
    │   │   ├── DualComparisonView.jsx    # SPH vs Delft3D CSI Comparison
    │   │   ├── DamageAssessmentPanel.jsx # HADR Evacuation & Loss Breakdown
    │   │   ├── GEEMonitorPanel.jsx       # Sentinel-1 SAR Satellite Feed
    │   │   ├── ElevationProfileModal.jsx # DEM Thalweg & Valley Cross-Sections
    │   │   └── ExportModal.jsx           # One-Click .shp / .kml / .csv Exporter
    │   ├── services/api.js
    │   └── App.jsx
```

🚧 Active Development

Current pipeline:
Real geospatial inputs → catchment delineation → rainfall/discharge forcing
→ hydrologic inflow scenarios → theoretical breach benchmark
→ DualSPHysics integration in progress

## Docker Deployment (Reproducible Web Platform)

Prerequisites:
- Docker Desktop or Docker Engine

### Quickstart

1. Clone the repository and configure the environment:
```bash
git clone https://github.com/rudrakshtyagi1/Floodlab.git
cd Floodlab
cp .env.example .env
```
*(Fill in optional environment variables in `.env` if required, such as `GEE_SERVICE_ACCOUNT`)*

2. Start the application:
```bash
docker compose up -d --build
```

### Application URLs
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Data Provenance
Included V3 outputs are precomputed results from verified scientific solver runs (DualSPHysics and LISFLOOD-FP).
Normal Docker application startup does not rerun the computational models.
For reproducibility, solver workflows are documented separately in the respective `scripts/` or `docs/` directories.
