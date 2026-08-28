"""Unit tests for routing engine."""
from floodlab.engines.routing.evacuation import EvacuationPlanner, RescueRouteEngine


def test_evacuation_planner():
    planner = EvacuationPlanner()
    villages = [
        {"id": "v1", "name": "Koti Village", "lat": 30.38, "lon": 78.49},
    ]
    safe_zones = [
        {"id": "s1", "lat": 30.40, "lon": 78.50, "capacity": 500},
    ]
    arrival_times = {"v1": 3600.0}  # 1 hour
    routes = planner.plan(villages, safe_zones, arrival_times)
    assert len(routes) == 1
    assert routes[0]["village_id"] == "v1"
    assert routes[0]["status"] in ["FEASIBLE", "CRITICAL_INSUFFICIENT_TIME"]


def test_rescue_route_engine():
    engine = RescueRouteEngine()
    ndrf_base = {"id": "ndrf1", "lat": 30.10, "lon": 78.30}
    settlements = [
        {"id": "s1", "name": "Shivpuri", "lat": 30.13, "lon": 78.38},
    ]
    routes = engine.plan_rescue(ndrf_base, settlements, flood_arrival_times={"s1": 7200.0})
    assert len(routes) == 1
    assert routes[0]["settlement_id"] == "s1"
    assert routes[0]["travel_time_min"] > 0
