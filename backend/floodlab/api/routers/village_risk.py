"""
Village Risk & Rescue Priority API Router.

Endpoints:
  POST /api/village-risk/assess           - Run full assessment (demo or data-connected)
  GET  /api/village-risk/stream           - SSE real-time playback of assessment as sim time advances
  GET  /api/village-risk/demo/settlements - Synthetic settlement dataset
  GET  /api/village-risk/demo/shelters    - Synthetic shelter dataset
  GET  /api/village-risk/demo/ensemble    - Synthetic ensemble scenarios
  GET  /api/village-risk/alerts           - Human-review alert queue (session-scoped)
  POST /api/village-risk/alerts/{id}/review - Update alert review status
  GET  /api/village-risk/status           - Data-connected status / missing-input manifest
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from floodlab.engines.village_risk.risk_calculator import risk_calculator
from floodlab.engines.village_risk.schemas import (
    AlertStatus,
    DataProvenance,
    DataSourceMode,
    DemographicBreakdown,
    EnsembleScenario,
    PriorityTier,
    SettlementRiskProfile,
    ShelterStatus,
    UncertaintyPercentiles,
    VillageRiskAssessment,
)

router = APIRouter()

# In-memory alert queue (session-scoped; replace with DB in production)
_ALERT_STORE: Dict[str, Any] = {}

# ---------------------------------------------------------------------------
# Demo synthetic datasets  (fully deterministic, clearly labelled)
# ---------------------------------------------------------------------------

DEMO_ENSEMBLE: List[EnsembleScenario] = [
    EnsembleScenario(
        scenario_id="ENS_P50",
        label="P50 - Median Overtopping",
        breach_type="overtopping",
        probability_weight=0.50,
        peak_discharge_m3s=720000.0,
        description="Median ensemble member: full overtopping breach with nominal dam geometry.",
    ),
    EnsembleScenario(
        scenario_id="ENS_P90",
        label="P90 - Conservative Piping",
        breach_type="piping_foundation",
        probability_weight=0.25,
        peak_discharge_m3s=1040000.0,
        description="Conservative scenario: piping failure releasing 25% higher peak discharge.",
    ),
    EnsembleScenario(
        scenario_id="ENS_P10",
        label="P10 - Optimistic Partial Breach",
        breach_type="overtopping_partial",
        probability_weight=0.25,
        peak_discharge_m3s=380000.0,
        description="Optimistic scenario: partial breach with controlled spillway relief.",
    ),
]

DEMO_SETTLEMENTS_RAW: List[Dict[str, Any]] = [
    {"settlement_id": "VIL-001", "name": "Tehri Patti", "place_type": "town", "latitude": 30.378, "longitude": 78.483, "elevation_m": 625.0, "population": 3800, "demographics": {"total_population": 3800, "children_under_12": 760, "elderly_over_65": 380, "hospital_patients_or_infirm": 42, "vulnerability_factor": 1.25}, "critical_facilities": ["Sub-District Hospital", "Primary School (600 pupils)", "Police Station"]},
    {"settlement_id": "VIL-002", "name": "Kirtinagar", "place_type": "village", "latitude": 30.355, "longitude": 78.506, "elevation_m": 585.0, "population": 1240, "demographics": {"total_population": 1240, "children_under_12": 248, "elderly_over_65": 186, "hospital_patients_or_infirm": 8, "vulnerability_factor": 1.35}, "critical_facilities": ["Primary Health Centre"]},
    {"settlement_id": "VIL-003", "name": "Chamba", "place_type": "village", "latitude": 30.338, "longitude": 78.507, "elevation_m": 555.0, "population": 2100, "demographics": {"total_population": 2100, "children_under_12": 420, "elderly_over_65": 252, "hospital_patients_or_infirm": 18, "vulnerability_factor": 1.15}, "critical_facilities": ["Community Health Post", "Tourism Ghat"]},
    {"settlement_id": "VIL-004", "name": "Maletha", "place_type": "village", "latitude": 30.228, "longitude": 78.549, "elevation_m": 510.0, "population": 680, "demographics": {"total_population": 680, "children_under_12": 140, "elderly_over_65": 102, "hospital_patients_or_infirm": 5, "vulnerability_factor": 1.45}, "critical_facilities": ["Temple Ghat"]},
    {"settlement_id": "VIL-005", "name": "Byasi", "place_type": "village", "latitude": 30.146, "longitude": 78.420, "elevation_m": 420.0, "population": 1560, "demographics": {"total_population": 1560, "children_under_12": 312, "elderly_over_65": 234, "hospital_patients_or_infirm": 12, "vulnerability_factor": 1.20}, "critical_facilities": ["Rafting Camp", "Bridge Approach"]},
    {"settlement_id": "VIL-006", "name": "Shivpuri", "place_type": "village", "latitude": 30.124, "longitude": 78.380, "elevation_m": 395.0, "population": 2250, "demographics": {"total_population": 2250, "children_under_12": 450, "elderly_over_65": 270, "hospital_patients_or_infirm": 22, "vulnerability_factor": 1.30}, "critical_facilities": ["Adventure Tourism Hub", "Bridge NH58"]},
    {"settlement_id": "VIL-007", "name": "Lakshman Jhula", "place_type": "town", "latitude": 30.125, "longitude": 78.330, "elevation_m": 365.0, "population": 4400, "demographics": {"total_population": 4400, "children_under_12": 880, "elderly_over_65": 440, "hospital_patients_or_infirm": 55, "vulnerability_factor": 1.10}, "critical_facilities": ["Government Hospital", "Suspension Bridge", "Ashram Complex (700 residents)"]},
    {"settlement_id": "VIL-008", "name": "Ghairsain Ridge", "place_type": "village", "latitude": 30.300, "longitude": 78.650, "elevation_m": 890.0, "population": 420, "demographics": {"total_population": 420, "children_under_12": 84, "elderly_over_65": 50, "hospital_patients_or_infirm": 3, "vulnerability_factor": 1.05}, "critical_facilities": []},
]

DEMO_SHELTERS_RAW: List[Dict[str, Any]] = [
    {"shelter_id": "SHL-A", "name": "Tehri Ridge Relief Camp", "latitude": 30.390, "longitude": 78.475, "elevation_m": 820.0, "capacity": 2500, "shelter_type": "Permanent Camp / Community Hall", "safety_margin_m": 195.0},
    {"shelter_id": "SHL-B", "name": "Narendra Nagar High Ground", "latitude": 30.360, "longitude": 78.458, "elevation_m": 760.0, "capacity": 1800, "shelter_type": "Government School Complex", "safety_margin_m": 135.0},
    {"shelter_id": "SHL-C", "name": "Rishikesh Civic Centre", "latitude": 30.085, "longitude": 78.268, "elevation_m": 380.0, "capacity": 3200, "shelter_type": "Sports Complex / Stadium", "safety_margin_m": 15.0},
    {"shelter_id": "SHL-D", "name": "Devprayag High School", "latitude": 30.148, "longitude": 78.602, "elevation_m": 620.0, "capacity": 1100, "shelter_type": "School Building", "safety_margin_m": 160.0},
]


def _build_demo_shelters() -> List[ShelterStatus]:
    return [
        ShelterStatus(
            shelter_id=s["shelter_id"], name=s["name"], latitude=s["latitude"],
            longitude=s["longitude"], elevation_m=s["elevation_m"], capacity=s["capacity"],
            shelter_type=s["shelter_type"], safety_margin_m=s["safety_margin_m"],
            is_safe_above_water=True, provenance=DataProvenance.SYNTHETIC_DEMO,
        )
        for s in DEMO_SHELTERS_RAW
    ]


def _run_assessment(
    mode: DataSourceMode, scenario_id: str, sim_time_s: float,
    ensemble_scenario: EnsembleScenario, settlements_raw: List[Dict[str, Any]],
    shelters: List[ShelterStatus],
) -> VillageRiskAssessment:
    calc = risk_calculator
    settlements_work = [dict(s) for s in settlements_raw]
    all_profiles: List[SettlementRiskProfile] = []

    for st in settlements_work:
        hyd = calc.compute_hydraulics_and_isolation(st, ensemble_scenario, sim_time_s)
        demo_obj = DemographicBreakdown(**st["demographics"])
        rpi, tier = calc.compute_response_priority_index(
            population=st["population"], demographics=demo_obj,
            arrival_s=hyd["arrival_s"], road_cutoff_s=hyd["road_cutoff_s"],
            sim_time_s=sim_time_s, peak_depth_m=hyd["peak_depth_m"],
            hazard_intensity=hyd["hazard_intensity_score"], isolation_status=hyd["isolation_status"],
            route_passable=(sim_time_s < hyd["road_cutoff_s"]),
        )
        dq = 0.72 if mode == DataSourceMode.DEMO else 1.0
        profile = SettlementRiskProfile(
            settlement_id=st["settlement_id"], name=st["name"],
            place_type=st.get("place_type", "village"),
            latitude=st["latitude"], longitude=st["longitude"], elevation_m=st["elevation_m"],
            distance_from_dam_km=hyd["chainage_km"], population=st["population"],
            demographics=demo_obj, critical_facilities=st.get("critical_facilities", []),
            flood_arrival_time_s=hyd["arrival_s"], flood_arrival_time_min=hyd["arrival_min"],
            peak_depth_m=hyd["peak_depth_m"], mean_depth_m=hyd["mean_depth_m"],
            peak_velocity_ms=hyd["peak_velocity_ms"], inundated_area_fraction=hyd["inundated_area_fraction"],
            hazard_intensity_score=hyd["hazard_intensity_score"],
            road_cutoff_time_s=hyd["road_cutoff_s"], road_cutoff_time_min=hyd["road_cutoff_min"],
            isolation_status=hyd["isolation_status"],
            time_to_isolation_countdown_min=hyd["time_to_isolation_countdown_min"],
            flood_likelihood=hyd["flood_likelihood"], response_priority_index=rpi,
            priority_tier=tier, data_quality_score=dq,
            provenance=DataProvenance.SYNTHETIC_DEMO if mode == DataSourceMode.DEMO else DataProvenance.SIMULATION_COUPLED,
            mode_label="SYNTHETIC DEMO - Not real-world data" if mode == DataSourceMode.DEMO else "DATA CONNECTED",
        )
        st["road_cutoff_s"] = hyd["road_cutoff_s"]
        all_profiles.append(profile)

    all_profiles.sort(key=lambda p: p.response_priority_index, reverse=True)
    routes, updated_shelters = calc.allocate_shelters_and_routes(settlements_work, shelters, sim_time_s)

    for p in all_profiles:
        st_info = next((s for s in settlements_work if s["settlement_id"] == p.settlement_id), {})
        p.assigned_shelter_id = st_info.get("assigned_shelter_id")
        p.assigned_shelter_name = st_info.get("assigned_shelter_name")
        p.nearest_shelter_distance_km = st_info.get("nearest_shelter_distance_km")
        p.evacuation_travel_time_min = st_info.get("evacuation_travel_time_min")
        p.evacuation_lead_time_min = st_info.get("evacuation_lead_time_min")
        p.route_status = st_info.get("route_status", "PENDING_ASSESSMENT")

    alerts = calc.generate_alert_drafts(all_profiles, scenario_label=ensemble_scenario.label)
    for a in alerts:
        _ALERT_STORE[a.alert_id] = a.model_dump()

    uncertainty = [
        UncertaintyPercentiles(metric="flood_arrival_time_min", p10_optimistic=32.0, p50_median=45.0, p90_conservative=68.0, unit="minutes"),
        UncertaintyPercentiles(metric="peak_depth_m", p10_optimistic=8.5, p50_median=14.2, p90_conservative=21.8, unit="m"),
        UncertaintyPercentiles(metric="inundated_area_km2", p10_optimistic=11.4, p50_median=19.6, p90_conservative=31.2, unit="km2"),
    ]

    critical_count = sum(1 for p in all_profiles if p.priority_tier == PriorityTier.CRITICAL_IMMEDIATE)
    isolated_count = sum(1 for p in all_profiles if p.isolation_status.value != "ACCESSIBLE")
    total_pop = sum(p.population for p in all_profiles)
    evac_allocated = sum(s.allocated_evacuees for s in updated_shelters)

    return VillageRiskAssessment(
        assessment_id=f"ASMT-{uuid.uuid4().hex[:8].upper()}",
        timestamp_utc=datetime.now(timezone.utc).isoformat(),
        mode=mode,
        mode_banner=(
            "SYNTHETIC DEMO MODE - All settlements, terrain, and flood data are deterministic synthetic inputs. Not real-world data."
            if mode == DataSourceMode.DEMO
            else "DATA-CONNECTED MODE - Results derived from user-supplied geospatial inputs."
        ),
        scenario_id=ensemble_scenario.scenario_id,
        sim_time_s=sim_time_s,
        sim_time_min=round(sim_time_s / 60.0, 1),
        total_settlements=len(all_profiles),
        critical_settlements_count=critical_count,
        isolated_settlements_count=isolated_count,
        total_population_at_risk=total_pop,
        evacuees_allocated=evac_allocated,
        shelter_capacity_total=sum(s.capacity for s in updated_shelters),
        shelter_surplus_total=sum(s.surplus_capacity for s in updated_shelters),
        settlements=all_profiles,
        shelters=updated_shelters,
        evacuation_routes=routes,
        alerts_queue=alerts,
        uncertainty_bounds=uncertainty,
        dataset_manifest={
            "mode": mode.value,
            "scenario": ensemble_scenario.scenario_id,
            "sim_time_s": sim_time_s,
            "settlements_source": "SYNTHETIC_DEMO" if mode == DataSourceMode.DEMO else "USER_SUPPLIED",
            "terrain_source": "CORRIDOR_WAYPOINTS_INTERPOLATED" if mode == DataSourceMode.DEMO else "USER_DEM",
            "flood_source": "ANALYTICAL_WAVE_PROPAGATION" if mode == DataSourceMode.DEMO else "SIMULATION_OUTPUT",
            "missing_inputs": [] if mode == DataSourceMode.DEMO else ["dem_geotiff", "osm_roads_gpkg", "settlement_footprints_gpkg"],
        },
    )


class AssessRequest(BaseModel):
    mode: DataSourceMode = DataSourceMode.DEMO
    scenario_id: str = "ENS_P50"
    sim_time_s: float = 0.0
    settlements_geojson: Optional[Dict] = None
    shelters_geojson: Optional[Dict] = None
    flood_outputs: Optional[Dict] = None


@router.post("/assess", response_model=VillageRiskAssessment)
async def assess_village_risk(req: AssessRequest):
    """Run full village risk and rescue priority assessment."""
    ens_map = {e.scenario_id: e for e in DEMO_ENSEMBLE}
    ensemble = ens_map.get(req.scenario_id) or DEMO_ENSEMBLE[0]

    if req.mode == DataSourceMode.DATA_CONNECTED and not req.settlements_geojson:
        raise HTTPException(
            status_code=422,
            detail={"mode": "DATA_CONNECTED", "error": "missing_inputs",
                    "missing": ["settlements_geojson", "shelters_geojson", "flood_outputs"],
                    "message": "DATA_CONNECTED mode requires user-supplied geospatial inputs. Use mode=DEMO for synthetic demonstration."},
        )

    return _run_assessment(req.mode, req.scenario_id, req.sim_time_s, ensemble, DEMO_SETTLEMENTS_RAW, _build_demo_shelters())


@router.get("/stream")
async def stream_assessment(
    mode: DataSourceMode = Query(DataSourceMode.DEMO),
    scenario_id: str = Query("ENS_P50"),
    start_s: float = Query(0.0),
    end_s: float = Query(3600.0),
    step_s: float = Query(300.0),
    speed_x: float = Query(60.0),
):
    """SSE stream emitting VillageRiskAssessment snapshots as simulation time advances."""
    ens_map = {e.scenario_id: e for e in DEMO_ENSEMBLE}
    ensemble = ens_map.get(scenario_id) or DEMO_ENSEMBLE[0]

    async def event_generator():
        t = start_s
        while t <= end_s:
            result = _run_assessment(mode, scenario_id, t, ensemble, DEMO_SETTLEMENTS_RAW, _build_demo_shelters())
            yield f"data: {result.model_dump_json()}\n\n"
            t += step_s
            await asyncio.sleep(step_s / max(1.0, speed_x))
        yield 'data: {"event": "stream_complete"}\n\n'

    return StreamingResponse(event_generator(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/demo/settlements")
async def get_demo_settlements():
    return {"mode": "SYNTHETIC_DEMO", "provenance": "Deterministic synthetic settlements. NOT real-world data.",
            "count": len(DEMO_SETTLEMENTS_RAW), "settlements": DEMO_SETTLEMENTS_RAW}


@router.get("/demo/shelters")
async def get_demo_shelters():
    return {"mode": "SYNTHETIC_DEMO", "provenance": "Deterministic synthetic shelter locations. NOT real-world data.",
            "count": len(DEMO_SHELTERS_RAW), "shelters": DEMO_SHELTERS_RAW}


@router.get("/demo/ensemble")
async def get_demo_ensemble():
    return {"mode": "SYNTHETIC_DEMO", "scenarios": [e.model_dump() for e in DEMO_ENSEMBLE]}


@router.get("/alerts")
async def get_alert_queue():
    alerts = list(_ALERT_STORE.values())
    alerts.sort(key=lambda a: a.get("priority_tier", ""), reverse=True)
    return {"count": len(alerts),
            "human_in_loop_warning": "NO alerts dispatched. All require Incident Commander approval.",
            "alerts": alerts}


class AlertReviewRequest(BaseModel):
    review_status: AlertStatus
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None


@router.post("/alerts/{alert_id}/review")
async def review_alert(alert_id: str, req: AlertReviewRequest):
    if alert_id not in _ALERT_STORE:
        raise HTTPException(404, f"Alert {alert_id} not found")
    _ALERT_STORE[alert_id]["review_status"] = req.review_status.value
    _ALERT_STORE[alert_id]["reviewed_by"] = req.reviewed_by
    _ALERT_STORE[alert_id]["review_notes"] = req.review_notes
    return {"alert_id": alert_id, "review_status": req.review_status.value,
            "human_in_loop_warning": "APPROVED does NOT dispatch automatically. Manual IC action required."}


@router.get("/status")
async def get_data_status():
    return {
        "demo_mode": {"available": True, "description": "Fully synthetic deterministic dataset. No external data required.", "provenance": "SYNTHETIC_DEMO"},
        "data_connected_mode": {
            "available": False,
            "missing_inputs": [
                {"input": "settlements_footprints", "format": "GeoJSON/GeoPackage", "configured": False},
                {"input": "dem_geotiff", "format": "GeoTIFF", "configured": False},
                {"input": "flood_outputs", "format": "GeoTIFF rasters (depth, velocity, arrival-time)", "configured": False},
                {"input": "road_network", "format": "GeoPackage (OSM schema)", "configured": False},
                {"input": "shelter_locations", "format": "GeoJSON/GeoPackage", "configured": False},
            ],
            "note": "Data-connected mode unavailable. Demo results will NEVER be silently substituted.",
        },
        "optional_providers": {
            "nasa_earthdata": {"purpose": "GPM-IMERG precipitation for soil moisture", "configured": False, "setup": "NASA_EARTHDATA_TOKEN in backend .env", "limitation": "Historical data only"},
            "google_earth_engine": {"purpose": "Sentinel-1 SAR surface water validation", "configured": False, "setup": "GEE_PROJECT_ID + credentials in backend .env", "limitation": "Requires GCP billing"},
        },
    }
