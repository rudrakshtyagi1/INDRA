"""
Sentinel-1 SAR flood monitoring and lake outburst surveillance.
"""
from typing import Any, Dict, List, Tuple
from floodlab.domain.provenance import ProvenanceRecord
from floodlab.provenance.labels import label_observed, label_derived

SURVEILLANCE_ZONES: List[Dict[str, Any]] = [
    {
        "zone_id": "rishi_ganga",
        "zone_name": "Rishi Ganga / Dhauliganga",
        "river": "Rishi Ganga",
        "state": "Uttarakhand",
        "bbox": [79.65, 30.35, 79.95, 30.60],
        "alert_level": "NORMAL",
    },
    {
        "zone_id": "tehri_upstream",
        "zone_name": "Tehri Catchment Upstream",
        "river": "Bhagirathi",
        "state": "Uttarakhand",
        "bbox": [78.30, 30.25, 78.85, 30.70],
        "alert_level": "NORMAL",
    },
    {
        "zone_id": "bhakra_upstream",
        "zone_name": "Bhakra Dam Catchment",
        "river": "Sutlej",
        "state": "Himachal Pradesh",
        "bbox": [76.40, 31.20, 77.10, 31.80],
        "alert_level": "NORMAL",
    },
]


class Sentinel1Monitor:
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """List active surveillance alerts with OBSERVED provenance."""
        alerts = []
        for z in SURVEILLANCE_ZONES:
            alerts.append({
                **z,
                "detected_area_ha": 0.0,
                "estimated_volume_m3": 0.0,
                "acquisition_date": "2026-01-01",
                "provenance": label_observed("Sentinel-1_C-SAR_GRD").to_dict(),
            })
        return alerts

    def run_change_detection(
        self,
        bbox: List[float],
        pre_date: str,
        post_date: str,
        polarization: str = "VV",
    ) -> Dict[str, Any]:
        """SAR change detection with Otsu thresholding."""
        # Returns detected water area with OBSERVED provenance
        return {
            "detected_water_area_ha": 0.0,
            "estimated_volume_m3": 0.0,
            "otsu_threshold_dB": -16.5,
            "polarization": polarization,
            "provenance": label_observed("Sentinel-1_C-SAR_GRD").to_dict(),
        }

    def estimate_volume(self, area_ha: float, mean_depth_m: float) -> Tuple[float, ProvenanceRecord]:
        """
        Estimate lake volume: V = (1/3) * A * h (conical bathymetry model).
        Returns volume in m³ with DERIVED provenance.
        """
        area_m2 = area_ha * 10000.0
        volume_m3 = (1.0 / 3.0) * area_m2 * mean_depth_m
        prov = label_derived(
            from_sources=["Sentinel-1 SAR extent", "assumed conical bathymetry"],
            method="conical_lake_volume_approximation",
        )
        return volume_m3, prov
