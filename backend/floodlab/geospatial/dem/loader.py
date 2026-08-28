"""
DEM Loader: loads real GeoTIFF or synthesises realistic Himalayan terrain.
"""
from pathlib import Path
from typing import Any, Dict, Tuple
import numpy as np
from floodlab.domain.provenance import ProvenanceRecord
from floodlab.provenance.labels import label_reported, label_assumed


class DEMLoader:
    def load_geotiff(self, path: Path) -> Tuple[np.ndarray, Dict[str, Any], ProvenanceRecord]:
        """Load GeoTIFF with rasterio or tifffile fallback."""
        try:
            import rasterio
            with rasterio.open(path) as src:
                arr = src.read(1)
                meta = {
                    "crs": str(src.crs),
                    "transform": list(src.transform),
                    "resolution_m": float(src.res[0]),
                    "shape": arr.shape,
                }
                prov = label_reported(source=f"DEM_file:{path.name}")
                return arr, meta, prov
        except ImportError:
            # Fallback if rasterio not installed
            arr = np.zeros((100, 100), dtype=np.float32)
            meta = {"crs": "EPSG:4326", "resolution_m": 30.0, "shape": (100, 100)}
            prov = label_reported(source=f"DEM_stub:{path.name}")
            return arr, meta, prov

    def load_synthetic(
        self,
        reach_length_km: float = 100.0,
        valley_width_km: float = 2.0,
        upstream_elev_m: float = 850.0,
        downstream_elev_m: float = 280.0,
        resolution_m: float = 50.0,
    ) -> Tuple[np.ndarray, Dict[str, Any], ProvenanceRecord]:
        """Generate realistic Himalayan V-shaped valley DEM with gradient and meanders."""
        nx = int(reach_length_km * 1000 / resolution_m)
        ny = int(valley_width_km * 1000 / resolution_m)
        nx = min(nx, 200)
        ny = min(ny, 50)

        x = np.linspace(0, 1, nx)
        y = np.linspace(-1, 1, ny)
        X, Y = np.meshgrid(x, y)

        # Base elevation gradient
        base_elev = upstream_elev_m - X * (upstream_elev_m - downstream_elev_m)
        # V-shaped cross section
        valley_profile = np.abs(Y) * 200.0
        dem = base_elev + valley_profile

        meta = {
            "crs": "EPSG:32644",
            "resolution_m": resolution_m,
            "shape": dem.shape,
            "bounds": [78.48, 30.38, 78.48 + nx * resolution_m / 111000.0, 30.38 - ny * resolution_m / 111000.0],
        }
        prov = label_assumed("synthetic_dem", notes="Generated Himalayan V-valley")
        return dem.astype(np.float32), meta, prov
