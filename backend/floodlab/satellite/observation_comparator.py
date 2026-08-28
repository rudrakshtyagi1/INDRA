"""
Observation comparator: compares simulation inundation vs satellite observations.
"""
from typing import Any, Dict
import numpy as np
from floodlab.provenance.labels import label_derived
from floodlab.validation.metrics import SpatialMetrics


class ObservationComparator:
    def compare_to_satellite(
        self,
        model_inundation_mask: np.ndarray,
        satellite_flood_mask: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Compare model wet/dry grid with satellite flood mask.
        Provenance: DERIVED (from OBSERVED satellite + MODELLED flood grid).
        """
        metrics = SpatialMetrics.all_metrics(model_inundation_mask, satellite_flood_mask)
        prov = label_derived(
            from_sources=["Sentinel-1_SAR_flood_mask", "Delft3D_FM_inundation_mask"],
            method="spatial_extent_comparison",
        )
        return {
            "metrics": metrics,
            "provenance": prov.to_dict(),
        }
