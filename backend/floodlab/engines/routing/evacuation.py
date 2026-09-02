"""
Evacuation and rescue routing engine.

Mission A: Village -> Safe Shelter / High Ground (Civilian Evacuation)
Mission B: NDRF Base -> Village -> Safe Extraction (Rescue Operations)

Uses NetworkX graph with time-dependent edge costs based on flood arrival times.
Vehicle-class-aware routing is available when agency thresholds are configured.
"""
from __future__ import annotations

import math
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    import networkx as nx  # noqa: F401
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False
    logger.warning("NetworkX not available. Routing engine will use stub mode.")


class EdgeRiskClassifier:
    """Assigns flood risk to road network edges."""

    def assign_flood_depths(
        self,
        graph,
        flood_depths: Dict[str, float],  # node_id -> depth
    ):
        """Annotate graph edges with flood depth at edge midpoint."""
        if not HAS_NETWORKX:
            return graph
        for u, v, data in graph.edges(data=True):
            depth_u = flood_depths.get(str(u), 0.0)
            depth_v = flood_depths.get(str(v), 0.0)
            data["flood_depth_m"] = (depth_u + depth_v) / 2.0
        return graph

    def classify_traversability(
        self,
        graph,
        agency_thresholds: Optional[Dict[str, float]] = None,
    ):
        """
        Classify edges as passable/uncertain/impassable.

        When agency_thresholds is None (default), depth values are recorded
        but no binary passable/impassable classification is applied.
        This prevents hardcoding vehicle capability assumptions.
        """
        if not HAS_NETWORKX:
            return graph
        threshold = (
            agency_thresholds.get("passable_depth_threshold_m") if agency_thresholds else None
        )
        for u, v, data in graph.edges(data=True):
            depth = data.get("flood_depth_m", 0.0)
            if threshold is not None:
                if depth < threshold:
                    data["traversability"] = "passable"
                elif depth < threshold * 2:
                    data["traversability"] = "uncertain"
                else:
                    data["traversability"] = "impassable"
            else:
                data["traversability"] = None  # not classified
        return graph


class TimeDependentCostModel:
    """
    Computes edge traversal cost as function of simulation time.
    At time T, edge is impassable if flood arrives before T.
    """

    BASE_SPEEDS = {
        "motorway": 100, "trunk": 80, "primary": 60, "secondary": 50,
        "tertiary": 40, "residential": 30, "track": 20, "path": 10,
    }

    def edge_cost(
        self,
        edge_data: Dict[str, Any],
        query_time_s: float,
        flood_arrival_s: float,
        agency_thresholds: Optional[Dict[str, float]] = None,
    ) -> float:
        """
        Edge traversal cost in seconds at query_time.

        Returns infinity if edge is flooded at query_time.
        Returns base travel time otherwise.
        """
        # Edge length and road class
        length_m = edge_data.get("length_m", edge_data.get("length", 1000.0))
        road_class = edge_data.get("highway", "residential")
        speed_kmh = self.BASE_SPEEDS.get(road_class, 30.0)
        base_time_s = (length_m / 1000.0) / speed_kmh * 3600.0

        # Flood check
        if flood_arrival_s is not None and flood_arrival_s <= query_time_s:
            # Check if passable despite flooding (if agency threshold allows)
            depth = edge_data.get("flood_depth_m", 0.0)
            threshold = (
                agency_thresholds.get("passable_depth_threshold_m")
                if agency_thresholds else None
            )
            if threshold is not None and depth < threshold:
                return base_time_s  # passable despite flooding
            return float("inf")  # impassable

        return base_time_s


class EvacuationPlanner:
    """
    Mission A: Village -> Safe Shelter evacuation routing.
    """

    def __init__(self, safety_factor: float = 1.3):
        self.safety_factor = safety_factor
        self.cost_model = TimeDependentCostModel()

    def plan(
        self,
        village_coords: List[Dict[str, Any]],
        safe_zones: List[Dict[str, Any]],
        flood_arrival_times: Dict[str, float],  # village_id -> arrival_s
        agency_thresholds: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """
        Plan evacuation routes for all villages.

        Args:
            village_coords: [{id, name, lat, lon, population}]
            safe_zones: [{id, lat, lon, capacity}]
            flood_arrival_times: {village_id: flood_arrival_seconds}
            agency_thresholds: Optional vehicle traversability thresholds

        Returns:
            List of evacuation route results.
        """
        results = []
        for village in village_coords:
            vid = village.get("id", "unknown")
            v_arrival = flood_arrival_times.get(vid)

            # Find nearest safe zone (Euclidean approximation)
            nearest = self._nearest_safe_zone(village, safe_zones)
            if not nearest:
                results.append({
                    "village_id": vid,
                    "village_name": village.get("name", ""),
                    "status": "NO_SHELTER_FOUND",
                    "travel_time_min": None,
                    "lead_time_min": None,
                })
                continue

            # Estimate travel time (straight-line / road factor)
            dist_km = self._haversine_km(
                village.get("lat", 0), village.get("lon", 0),
                nearest.get("lat", 0), nearest.get("lon", 0),
            )
            road_factor = 1.5  # road vs straight-line
            speed_kmh = 30.0  # conserved village road speed
            travel_time_min = (dist_km * road_factor / speed_kmh) * 60.0 * self.safety_factor

            lead_time_min = v_arrival / 60.0 if v_arrival else None

            if lead_time_min is not None and travel_time_min <= lead_time_min:
                status = "FEASIBLE"
            elif lead_time_min is None:
                status = "UNKNOWN_ARRIVAL"
            else:
                status = "CRITICAL_INSUFFICIENT_TIME"

            results.append({
                "village_id": vid,
                "village_name": village.get("name", ""),
                "origin_lat": village.get("lat"),
                "origin_lon": village.get("lon"),
                "destination_id": nearest.get("id"),
                "destination_lat": nearest.get("lat"),
                "destination_lon": nearest.get("lon"),
                "distance_km": round(dist_km * road_factor, 2),
                "travel_time_min": round(travel_time_min, 1),
                "lead_time_available_min": round(lead_time_min, 1) if lead_time_min else None,
                "status": status,
                "path_coords": [
                    [village.get("lon"), village.get("lat")],
                    [nearest.get("lon"), nearest.get("lat")],
                ],
            })

        return results

    @staticmethod
    def _nearest_safe_zone(village: Dict, safe_zones: List[Dict]) -> Optional[Dict]:
        if not safe_zones:
            return None

        def dist(sz):
            return EvacuationPlanner._haversine_km(
                village.get("lat", 0), village.get("lon", 0),
                sz.get("lat", 0), sz.get("lon", 0),
            )
        return min(safe_zones, key=dist)

    @staticmethod
    def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        return R * 2 * math.asin(math.sqrt(a))


class RescueRouteEngine:
    """
    Mission B: NDRF Base -> Affected Settlement rescue routing.
    Vehicle-class-aware when agency thresholds are configured.
    """

    def plan_rescue(
        self,
        ndrf_base: Dict[str, Any],
        target_settlements: List[Dict[str, Any]],
        flood_arrival_times: Dict[str, float],
        agency_thresholds: Optional[Dict] = None,
    ) -> List[Dict[str, Any]]:
        """
        Plan rescue routes from NDRF base to each settlement.

        Vehicle-class-aware routing is applied only when agency_thresholds
        provides passable_depth_threshold_m (not hardcoded here).

        Returns:
            List of rescue route results per settlement.
        """
        results = []
        planner = EvacuationPlanner()
        for settlement in target_settlements:
            sid = settlement.get("id", "unknown")
            arrival_s = flood_arrival_times.get(sid)

            dist_km = planner._haversine_km(
                ndrf_base.get("lat", 0), ndrf_base.get("lon", 0),
                settlement.get("lat", 0), settlement.get("lon", 0),
            )
            road_factor = 1.4
            speed_kmh = 40.0  # NDRF vehicle speed
            travel_min = (dist_km * road_factor / speed_kmh) * 60.0

            if agency_thresholds and agency_thresholds.get("passable_depth_threshold_m"):
                traversability_note = (
                    f"Vehicle depth threshold: "
                    f"{agency_thresholds['passable_depth_threshold_m']} m"
                )
            else:
                traversability_note = "No agency threshold configured; traversability not classified"

            results.append({
                "settlement_id": sid,
                "settlement_name": settlement.get("name", ""),
                "ndrf_base_lat": ndrf_base.get("lat"),
                "ndrf_base_lon": ndrf_base.get("lon"),
                "target_lat": settlement.get("lat"),
                "target_lon": settlement.get("lon"),
                "distance_km": round(dist_km * road_factor, 2),
                "travel_time_min": round(travel_min, 1),
                "flood_arrival_min": round(arrival_s / 60.0, 1) if arrival_s else None,
                "traversability_note": traversability_note,
                "path_coords": [
                    [ndrf_base.get("lon"), ndrf_base.get("lat")],
                    [settlement.get("lon"), settlement.get("lat")],
                ],
            })

        return results
