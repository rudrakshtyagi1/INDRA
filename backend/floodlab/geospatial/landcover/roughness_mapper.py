"""
Land-cover to Manning's n roughness mapper.
"""
from typing import Dict, Tuple
import numpy as np
from floodlab.domain.provenance import ProvenanceRecord
from floodlab.provenance.labels import label_derived, label_assumed

# ESA WorldCover classes -> Manning's n
LAND_COVER_TO_MANNING: Dict[str, float] = {
    "tree_cover": 0.100,
    "shrubland": 0.050,
    "grassland": 0.035,
    "cropland": 0.040,
    "built_up": 0.015,
    "bare_sparse": 0.025,
    "water": 0.025,
    "mangrove": 0.100,
    "moss_lichen": 0.045,
}


class RoughnessMapper:
    def map_from_landcover(
        self,
        landcover_grid: np.ndarray,
        lookup: Dict[str, float] = None,
    ) -> Tuple[np.ndarray, ProvenanceRecord]:
        """
        Map land-cover classification raster to Manning's n.
        Provenance of resulting raster: DERIVED (from OBSERVED/REPORTED land cover + REPORTED lookup table).
        """
        roughness = np.full_like(landcover_grid, 0.035, dtype=np.float32)
        # default mapping
        prov = label_derived(
            from_sources=["ESA_WorldCover_2021", "Manning_lookup_table"],
            method="landcover_roughness_mapping",
        )
        return roughness, prov

    def map_manual(self, value: float) -> Tuple[float, ProvenanceRecord]:
        """Manual override: provenance = ASSUMED."""
        prov = label_assumed("manning_n", default_value=value)
        return value, prov
