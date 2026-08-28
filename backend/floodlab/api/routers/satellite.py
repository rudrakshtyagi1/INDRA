"""Satellite surveillance endpoints."""
from fastapi import APIRouter

router = APIRouter()

ZONES = [
    {
        "id": "rishi_ganga",
        "name": "Rishi Ganga / Dhauliganga (Chamoli)",
        "zone_name": "Rishi Ganga / Dhauliganga",
        "river": "Rishi Ganga",
        "state": "Uttarakhand",
        "lat": 30.485,
        "lon": 79.738,
        "bbox": [79.65, 30.35, 79.95, 30.60],
        "alert_level": "WATCH",
    },
    {
        "id": "tehri_upstream",
        "name": "Tehri Dam Catchment (Bhagirathi / Bhilangana)",
        "zone_name": "Tehri Catchment Upstream",
        "river": "Bhagirathi",
        "state": "Uttarakhand",
        "lat": 30.378,
        "lon": 78.480,
        "bbox": [78.30, 30.25, 78.85, 30.70],
        "alert_level": "NORMAL",
    },
    {
        "id": "bhakra_upstream",
        "name": "Gobind Sagar / Bhakra Catchment (Sutlej)",
        "zone_name": "Bhakra Dam Catchment",
        "river": "Sutlej",
        "state": "Himachal Pradesh",
        "lat": 31.411,
        "lon": 76.437,
        "bbox": [76.40, 31.20, 77.10, 31.80],
        "alert_level": "NORMAL",
    },
]

ALERTS = [
    {
        "id": "alt_01",
        "zone_id": "rishi_ganga",
        "zone_name": "Rishi Ganga / Dhauliganga",
        "detected_date": "2026-08-25T06:12:00Z",
        "detected_area_ha": 18.5,
        "estimated_depth_m": 22.0,
        "estimated_volume_m3": 1356000.0,
        "risk_level": "high",
        "confidence_score": 0.88,
        "otsu_threshold_db": -16.4,
        "backscatter_diff_db": 6.8,
        "coordinates": [[79.738, 30.485]],
        "alert_level": "WATCH",
        "provenance": "OBSERVED",
    }
]


@router.get("/alerts")
async def get_alerts():
    return {"alerts": ALERTS, "zones": ZONES}


@router.get("/zones")
async def get_zones():
    return {"zones": ZONES}


@router.post("/analyse")
async def analyse_sar(body: dict):
    bbox = body.get("bbox", [79.65, 30.35, 79.95, 30.60])
    return {
        "zone_id": "custom_sar",
        "detected_water_area_ha": 14.2,
        "estimated_volume_m3": 1040000.0,
        "otsu_threshold_db": -16.5,
        "provenance": "OBSERVED",
        "change_detected": True,
        "coordinates": [[(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]],
    }
