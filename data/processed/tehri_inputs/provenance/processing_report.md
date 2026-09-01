# FloodLab GIS Input Processing Report

**Processing Date:** 2026-09-01 11:00:00 UTC  
**Study Corridor:** Tehri Dam (30.378°N, 78.481°E) → Bijnor Barrage (29.375°N, 78.130°E)  
**Authoritative Storage CRS:** `EPSG:4326` (WGS84)  
**Authoritative Processing Metric CRS:** `EPSG:32644` (WGS84 / UTM Zone 44N)  

---

## 1. Selected Administrative Boundaries
- **Relevant States (2):** `Uttarakhand` (IN-UT), `Uttar Pradesh` (IN-UP)
- **Selected Unique Study Districts (11):**
  - *Uttarakhand (6):* Tehri Garhwal, Uttarkashi, Garhwal (Pauri Garhwal), Dehradun, Hardwar (Haridwar), Rudraprayag
  - *Uttar Pradesh (5):* Bijnor, Saharanpur, Muzaffarnagar, Meerut, Jyotiba Phule Nagar (Amroha)

---

## 2. Canonical Layer Inventory

| Layer Name | File Path | Feature Count | Primary Classification Breakdown |
| :--- | :--- | :---: | :--- |
| **Study States** | `admin/study_states.gpkg` | 2 | Uttarakhand, Uttar Pradesh |
| **Study Districts** | `admin/study_districts.gpkg` | 11 | 11 unique district polygon features |
| **Road Network Routing** | `osm/road_network_routing.gpkg` | 38,888 edges | 30,726 nodes (100% connected single graph) |
| **Bridges** | `osm/bridges.gpkg` | 535 segments | 534 unique physical bridge OSM IDs |
| **Healthcare** | `osm/healthcare.gpkg` | 81 | 57 hospitals, 18 clinics, 1 doctors, 5 pharmacies |
| **Shelters** | `osm/shelters.gpkg` | 4 | 4 true OSM shelters (`amenity=shelter`) |
| **Community Centres** | `osm/community_centres.gpkg` | 5 | 5 community assembly halls |
| **Helipads** | `osm/helipads.gpkg` | 12 | 12 OSM-mapped aviation landing points |
| **Emergency Facilities** | `osm/emergency_facilities.gpkg` | 14 | 14 Police outposts/stations, 0 Fire stations |
| **Power Infrastructure** | `osm/power_infrastructure.gpkg` | 42 | 26 substations, 9 power plants, 7 generators |
| **Settlements** | `osm/settlements.gpkg` | 1049 | 2 cities, 9 towns, 144 villages, 853 hamlets, 29 suburbs, 12 localities |

---

## 3. Data Quality & Spatial Join Audits
- **Geometry Validity:** 0 invalid geometries across all layers.
- **Canonical ID Uniqueness:** 100% unique `canonical_osm_id` across all feature layers.
- **Admin Spatial Join Success Rates:**
  - Healthcare: **100.0%** (81/81)
  - Settlements: **100.0%** (1,049/1,049)
  - Road Edges: **100.0%** (38,888/38,888)
- **Named Feature Completeness:**
  - Healthcare: 77/81 named (95.1%), 4 unnamed
  - Settlements: 921/1049 named (87.8%), 128 unnamed
  - Road Edges: 670/38,888 named (1.7%), 38,218 unnamed (98.3%) across 61 unique road names

---

## 4. Routing Readiness & Prototype Limitations
- **Graph Topology:** Connected components = 1 (100% of nodes in single component).
- **End-to-End Route Preserved:** `YES` (Tehri Dam Axis to Bijnor Barrage Boundary = 295 nodes, 229.83 km).
- **Bridge-Tagged Edges:** 535 edges (534 unique physical bridge OSM IDs).
- **Current Routing Graph Limitation:** Only the largest connected drive-network component was retained within each OSM acquisition query; smaller disconnected drivable components may therefore be absent from the current routing graph.

---

## 5. Remaining Scientific Input Datasets

1. **Topography (Copernicus DEM GLO-30):**
   Terrain/elevation input for hydrodynamic domain preparation. It is a DSM and does NOT provide river bathymetry.
2. **Land Cover (ESA WorldCover 2021):**
   Land-cover classification input. It does NOT directly provide Manning's n. Later convert classes to documented roughness priors/lookups and include calibration/uncertainty.
3. **Population Exposure (WorldPop / GHSL):**
   100 m population raster grids for spatial exposure intersection with hydrodynamic flood footprints.
4. **Hydrologic Discharge Reference (CWC Koteshwar):**
   Observed downstream hydrologic/discharge reference data. Not automatically assumed as upstream boundary forcing for the Tehri breach model until the hydrodynamic boundary-condition architecture is explicitly defined.
