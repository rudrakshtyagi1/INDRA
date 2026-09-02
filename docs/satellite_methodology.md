# Sentinel-1 Observation Lab — Scientific & Operational Methodology

## 1. Scope & Scientific Boundaries

FloodLab uses Google Earth Engine (GEE) to provide **observational environmental context** alongside hydrodynamic models.

- **Hypothetical benchmarks (e.g. Tehri catastrophic dam break):**
  Tehri has never suffered a catastrophic dam failure. Any spatial overlap between satellite observations and the Tehri benchmark is labelled `SPATIAL_CONTEXT_ONLY`. It indicates where surface water or reservoir geometry existed at the time of observation; **it is not physical validation of the failure model**.
- **Real historical disasters (e.g. Chamoli 2021 / Rishi Ganga):**
  When configured with dates bounding an actual event, bitemporal SAR change detection captures newly impounded water, valley ponding, or scouring. When validated against external field/optical data, this can serve as `HISTORICAL_SPATIAL_COMPARISON`.
- **Truthful execution:**
  FloodLab never fabricates SAR values, Otsu thresholds, or active alert cards. If Earth Engine is unconfigured or authentication fails, the application truthfully displays `STANDBY / DATA UNAVAILABLE`.

## 2. SAR Data Source & Collection

- **Collection:** `COPERNICUS/S1_GRD` (Sentinel-1 Ground Range Detected).
- **Instrument Mode:** `IW` (Interferometric Wide Swath) — standard over land.
- **Polarizations:** `VV` (primary for open water detection; specular reflection yields strong drop in backscatter) and `VH` (cross-pol, useful in rough/vegetated terrain).
- **Resolution:** 10 m pixel spacing, projected at 30 m for interactive regional analysis.

## 3. Pre-Processing & Filtering

1. **Bounding Box Restriction:** Limited to <=6,000 km² and <=3° span per axis to keep on-demand interactive computation responsive.
2. **Homogeneous Geometry (Relative Orbit Matching):**
   - SAR backscatter is sensitive to look direction and incidence angle.
   - The pipeline selects the latest post-event scene, extracts its `relativeOrbitNumber_start` and `orbitProperties_pass` (ASCENDING/DESCENDING), and filters the pre-event window to match.
   - If matching passes exist, single-orbit composites are used. If not, a warning is returned and multi-orbit composites are used with documented caveat.
3. **Edge Masking:** Pixels with raw backscatter <= -30 dB (border noise / antenna pattern edge artifacts) are masked prior to reduction.
4. **Temporal Reduction:** Median composites over the pre-event and post-event windows produce robust speckle-reduced backscatter grids ($\gamma^0_{pre}$ and $\gamma^0_{post}$).

## 4. Change Detection & Adaptive Thresholding

1. **Backscatter Drop:**
   $$\Delta\sigma^0 = \text{median}(\sigma^0_{pre}) - \text{median}(\sigma^0_{post})$$
   Smooth open water acts as a specular reflector, scattering radar energy away from the sensor. A sharp **decrease** in backscatter ($\Delta\sigma^0 > 0$) is the characteristic signature of new open surface water.
2. **Locally Adaptive Otsu Threshold:**
   - Earth Engine computes the histogram of $\Delta\sigma^0$ within the AOI across 128 bins.
   - FloodLab executes Otsu's discriminant algorithm locally in Python on the returned histogram.
   - This maximizes the between-class variance $\sigma_B^2(t) = \omega_0(t)\omega_1(t)[\mu_0(t) - \mu_1(t)]^2$ to find an optimal scene-specific drop threshold, avoiding brittle hardcoded dB cutoffs.
3. **Absolute Post-Event Water Constraint:**
   - Candidate pixels must satisfy both $\Delta\sigma^0 > T_{otsu}$ AND $\sigma^0_{post} < T_{water}$ (configurable, default -14 dB for VV).
   - This prevents false-positive change detections over dry smooth surfaces (e.g. airfields, sand dunes) whose backscatter dropped from slightly rough to very smooth without actually becoming water.

## 5. Morphological Cleanup & Vectorization

1. **Permanent Water Exclusion:**
   - Optionally masks out permanent water bodies using the JRC Global Surface Water dataset (`JRC/GSW1_4/GlobalSurfaceWater`, occurrence >= 90%).
   - The resulting layer represents **new or expanded** surface water rather than baseline reservoirs.
2. **Connected-Pixel Filter:**
   - Earth Engine `connectedPixelCount` with 8-connectivity enforces a minimum cluster size (>=4 connected pixels) to remove isolated radar speckle spikes.
3. **Vectorization:**
   - `reduceToVectors` converts contiguous water change patches to GeoJSON polygons at 30 m resolution.
   - Patches are filtered by minimum area (default >=900 m², or 1 full Landsat/Copernicus 30 m pixel).
   - The top 200 largest polygons are returned with calculated area in m².

## 6. Model Comparison Metrics

When an observed water extent is compared against a precomputed hydrodynamic model footprint (e.g. Tehri V3 or V4):

- Both geometries are converted to `shapely` polygons and reprojected to the local UTM zone corresponding to their centroid longitude/latitude.
- Accurate ellipsoidal surface area ($m^2$) is computed:
  $$\text{IoU} = \frac{\text{Area}(\text{Sat} \cap \text{Model})}{\text{Area}(\text{Sat} \cup \text{Model})}$$
  $$\text{Coverage}_{\text{model}} = \frac{\text{Area}(\text{Sat} \cap \text{Model})}{\text{Area}(\text{Model})}$$
  $$\text{Coverage}_{\text{sat}} = \frac{\text{Area}(\text{Sat} \cap \text{Model})}{\text{Area}(\text{Sat})}$$

## 7. Known Physical Limitations

1. **Terrain Effects (Layover / Shadow):** In steep Himalayan valleys, mountain slopes facing toward the radar cause foreshortening/layover; slopes facing away create radar shadow (zero signal). Both cause false change artifacts.
2. **Inundated Vegetation:** Radar penetrating vegetation canopy may scatter via double-bounce off tree trunks and standing water, resulting in an **increase** rather than a decrease in backscatter. This simple specular-drop workflow does not detect flooded forests.
3. **Wind Roughening:** Strong winds over open water create surface capillary waves, increasing SAR backscatter and temporarily masking the water signature.
4. **Preprocessed GRD:** Earth Engine GRD scenes have undergone thermal noise removal, radiometric calibration, and terrain correction, but have not undergone radiometric terrain flattening (which requires specialized gamma-naught RTC processing).
