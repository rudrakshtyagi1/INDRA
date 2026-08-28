# Data Sources

## Digital Elevation Model (DEM)

Provider and version are NOT hardcoded. Each run records the DEM provenance in manifest.json.

Supported sources:
| Source | Resolution | Coverage | Provenance Level |
|--------|-----------|----------|-----------------|
| Copernicus DEM GLO-30 | 30 m | Global | REPORTED |
| Copernicus DEM GLO-90 | 90 m | Global | REPORTED |
| CartoDEM V3R1 | 30 m | India | REPORTED (Survey of India) |
| SRTM 1-arc-second | 30 m | Global (56S-60N) | REPORTED |
| SRTM 3-arc-second | 90 m | Global | REPORTED |

DEM requires sink-filling and hydrological conditioning before use.

## Rainfall

| Source | Resolution | Coverage | Provenance Level |
|--------|-----------|----------|-----------------|
| IMD Gridded Daily Rainfall | 0.25 deg | India | REPORTED |
| GPM IMERG Late Run | 0.1 deg / 30 min | Global | OBSERVED |
| IMD Rain Gauge | Point | India | OBSERVED |

## Reservoir Specifications

| Dam | Source | Provenance Level |
|-----|--------|-----------------|
| Tehri Dam | THDC India Limited Annual Report | REPORTED |
| Rishi Ganga (2021) | NDMA post-event report | REPORTED |
| Bhakra Dam | BBMB technical specifications | REPORTED |
| Hirakud Dam | OWMC specifications | REPORTED |

## Satellite Imagery

| Source | Band/Product | Use | Provenance Level |
|--------|-------------|-----|-----------------|
| Sentinel-1 GRD | C-SAR VV/VH backscatter | Flood detection, lake monitoring | OBSERVED |
| Sentinel-2 L2A | NDWI (NIR-SWIR) | Optical flood extent | OBSERVED |
| JRC Global Surface Water | Water occurrence | Permanent water mask | REPORTED |

## Land Cover

| Source | Resolution | Provenance Level |
|--------|-----------|-----------------|
| ESA WorldCover 2021 | 10 m | REPORTED (ESA Sentinel-derived) |
| MODIS Land Cover | 500 m | REPORTED |

## Roads and Settlements

| Source | Type | Provenance Level |
|--------|------|-----------------|
| OpenStreetMap | Roads, settlements, infrastructure | REPORTED (community-mapped) |

## Population

| Source | Resolution | Provenance Level |
|--------|-----------|-----------------|
| WorldPop 2020 | 100 m | REPORTED (statistical model output) |
| Census of India 2011 | Village-level | REPORTED |
