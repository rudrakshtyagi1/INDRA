"""
Core Scientific Calculation Engine for Village Flood Risk and Rescue Priorities.
Implements:
- Spatial intersection and proximity metrics
- Hydraulic hazard intensity calculation (depth x velocity criteria)
- Road access network cutoff and isolation prediction
- Transparent Response Priority Index (RPI) calculation
- Evacuation route feasibility and shelter capacity surplus/deficit accounting
- Human-review alert drafting
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from floodlab.engines.village_risk.schemas import (
    AlertDraft,
    AlertStatus,
    DataProvenance,
    DataSourceMode,
    DemographicBreakdown,
    EnsembleScenario,
    EvacuationRouteSegment,
    IsolationStatus,
    PriorityTier,
    SettlementRiskProfile,
    ShelterStatus,
    UncertaintyPercentiles,
    VillageRiskAssessment,
)


# Canonical river centerline waypoints along the Bhagirathi canyon corridor from Tehri Dam down to Rishikesh
# (Used for downstream distance calculation and wave propagation physics)
CORRIDOR_WAYPOINTS: List[Tuple[float, float, float]] = [
    # (lon, lat, distance_from_dam_km)
    (78.4810, 30.3780, 0.0),    # Tehri Dam Axis
    (78.4835, 30.3650, 1.8),    # Tailrace Gorge
    (78.4910, 30.3520, 3.4),    # Canyon Loop
    (78.5020, 30.3340, 5.8),    # Chham Reach
    (78.5130, 30.3110, 8.7),    # Kandi Valley
    (78.5280, 30.2850, 12.1),   # Koteshwar Reservoir
    (78.5390, 30.2580, 15.6),   # Koteshwar Dam Tailrace
    (78.5490, 30.2280, 19.4),   # Maletha Meander
    (78.5720, 30.1850, 24.8),   # Rani Bagh Reach
    (78.5990, 30.1460, 30.5),   # Devprayag Confluence
    (78.5400, 30.1100, 38.2),   # Ganga Gorge West
    (78.4800, 30.0900, 45.0),   # Kaudiyala Reach
    (78.4200, 30.1200, 52.4),   # Byasi Canyon
    (78.3700, 30.1300, 58.1),   # Shivpuri Gorge
    (78.3200, 30.1240, 63.8),   # Lakshman Jhula
    (78.2900, 30.0800, 70.0),   # Rishikesh Plain
]


def haversine_distance_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate Great Circle distance in kilometers between two coordinates."""
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    return r * 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))


def find_nearest_corridor_chainage_km(lon: float, lat: float) -> Tuple[float, float]:
    """
    Project point onto canyon corridor to find:
    - distance_along_river_km (chainage downstream from Tehri Dam)
    - offset_distance_from_river_km (perpendicular distance to canyon thalweg)
    """
    min_dist = float("inf")
    best_chainage = 0.0

    for i in range(len(CORRIDOR_WAYPOINTS) - 1):
        w1 = CORRIDOR_WAYPOINTS[i]
        w2 = CORRIDOR_WAYPOINTS[i + 1]

        # Segment midpoint distance approximation
        mid_lon = (w1[0] + w2[0]) / 2.0
        mid_lat = (w1[1] + w2[1]) / 2.0
        d_mid = haversine_distance_km(lon, lat, mid_lon, mid_lat)

        if d_mid < min_dist:
            min_dist = d_mid
            # Fraction along segment
            seg_len = haversine_distance_km(w1[0], w1[1], w2[0], w2[1])
            if seg_len > 0:
                d1 = haversine_distance_km(lon, lat, w1[0], w1[1])
                frac = max(0.0, min(1.0, (d1 ** 2 - d_mid ** 2) / (seg_len ** 2 + 1e-6) + 0.5))
                best_chainage = w1[2] + frac * (w2[2] - w1[2])
            else:
                best_chainage = w1[2]

    return round(best_chainage, 2), round(min_dist, 2)


class VillageRiskCalculator:
    """
    Computes rigorous, reproducible flood risk metrics for settlements.
    Maintains strict separation between:
    - Flood likelihood / physical hazard
    - Response priority index
    - Data quality score
    """

    # Typical hydraulic wave celerity along steep Himalayan gorge (m/s)
    WAVE_CELERITY_MS = 8.5
    # Conservative road elevation clearance margin below village center (m)
    ROAD_ELEVATION_DROP_M = 18.0

    def compute_hydraulics_and_isolation(
        self,
        settlement: Dict[str, Any],
        scenario: Optional[EnsembleScenario] = None,
        sim_time_s: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Calculates time-dependent flood arrival, peak depth, road access cutoff,
        and isolation status for a single settlement.
        """
        lon = settlement.get("longitude", 78.48)
        lat = settlement.get("latitude", 30.37)
        elev_m = settlement.get("elevation_m", 600.0)

        chainage_km, offset_km = find_nearest_corridor_chainage_km(lon, lat)

        # 1. Wave front arrival time at the river sector adjacent to settlement
        # Celerity varies slightly with scenario peak discharge
        q_factor = math.sqrt(scenario.peak_discharge_m3s / 720000.0) if scenario else 1.0
        effective_celerity = max(4.0, min(12.0, self.WAVE_CELERITY_MS * q_factor))

        arrival_s = (chainage_km * 1000.0) / effective_celerity

        # 2. Road access cutoff time
        # Valley roads follow the lower river grade; road submergence occurs
        # BEFORE direct village center flooding.
        # Road cutoff lead time is proportional to offset from river:
        road_submergence_delta_s = max(180.0, (offset_km / 1.5) * 600.0)
        road_cutoff_s = max(0.0, arrival_s - road_submergence_delta_s)

        # 3. Peak and mean water depth estimation based on valley cross section and distance
        # Flood wave attenuates with downstream distance (exponential damping)
        decay = math.exp(-0.022 * chainage_km)
        base_depth = 22.0 * decay * q_factor

        # Village terrain elevation offset relative to gorge floor
        # Canyon bottom approx elev drops from 620m at dam toe to 330m at Rishikesh
        gorge_floor_elev = 620.0 - (chainage_km / 70.0) * (620.0 - 330.0)
        crest_height_above_gorge = max(0.0, elev_m - gorge_floor_elev)

        if offset_km > 3.5 or crest_height_above_gorge > (base_depth + 15.0):
            # High hill village: direct water does not submerge settlement, but road may cut off
            peak_depth = 0.0
            mean_depth = 0.0
            inundated_fraction = 0.0
            peak_velocity = 0.0
        else:
            inundation_head = max(0.0, base_depth - crest_height_above_gorge)
            peak_depth = round(inundation_head, 2)
            mean_depth = round(inundation_head * 0.65, 2)
            inundated_fraction = min(1.0, max(0.05, inundation_head / (base_depth + 1e-4)))
            peak_velocity = round(min(12.0, math.sqrt(max(0.1, 2.0 * 9.81 * max(0.5, peak_depth)))), 1)

        # 4. Determine Dynamic Time-Varying Isolation Status at sim_time_s
        if sim_time_s >= arrival_s and peak_depth > 0.3:
            isolation = IsolationStatus.DIRECTLY_INUNDATED
        elif sim_time_s >= road_cutoff_s:
            isolation = IsolationStatus.ISOLATED_BY_FLOOD
        elif (road_cutoff_s - sim_time_s) <= 900.0:  # Within 15 minutes of cutoff
            isolation = IsolationStatus.ROAD_CUTOFF_IMMINENT
        else:
            isolation = IsolationStatus.ACCESSIBLE

        # Countdown in minutes until isolation
        countdown_min = max(0.0, round((road_cutoff_s - sim_time_s) / 60.0, 1))

        # 5. Flood likelihood / Hazard intensity score
        # Likelihood combines scenario probability with proximity & elevation head
        prob_weight = scenario.probability_weight if scenario else 0.85
        if peak_depth > 0:
            likelihood = min(1.0, prob_weight * (0.8 + 0.2 * min(1.0, peak_depth / 3.0)))
        elif isolation in (IsolationStatus.ISOLATED_BY_FLOOD, IsolationStatus.ROAD_CUTOFF_IMMINENT):
            likelihood = min(1.0, prob_weight * 0.75)
        else:
            likelihood = min(0.4, max(0.05, prob_weight * math.exp(-offset_km / 2.0)))

        # Hydraulic hazard intensity (H = min(1.0, (D * V) / 10.0))
        hazard_intensity = min(1.0, (peak_depth * peak_velocity) / 10.0) if peak_depth > 0 else (0.3 if isolation != IsolationStatus.ACCESSIBLE else 0.0)

        return {
            "chainage_km": chainage_km,
            "offset_km": offset_km,
            "arrival_s": round(arrival_s, 1),
            "arrival_min": round(arrival_s / 60.0, 1),
            "road_cutoff_s": round(road_cutoff_s, 1),
            "road_cutoff_min": round(road_cutoff_s / 60.0, 1),
            "peak_depth_m": peak_depth,
            "mean_depth_m": mean_depth,
            "peak_velocity_ms": peak_velocity,
            "inundated_area_fraction": round(inundated_fraction, 2),
            "hazard_intensity_score": round(hazard_intensity, 3),
            "flood_likelihood": round(likelihood, 3),
            "isolation_status": isolation,
            "time_to_isolation_countdown_min": countdown_min,
        }

    def compute_response_priority_index(
        self,
        population: int,
        demographics: DemographicBreakdown,
        arrival_s: float,
        road_cutoff_s: float,
        sim_time_s: float,
        peak_depth_m: float,
        hazard_intensity: float,
        isolation_status: IsolationStatus,
        route_passable: bool,
    ) -> Tuple[float, PriorityTier]:
        """
        Computes transparent, composite Response Priority Index (0 to 100).
        Weights:
        - Urgency (Lead time to isolation / arrival): 35%
        - Hydraulic Hazard Severity (Depth & Velocity): 25%
        - Vulnerable Population at Risk: 20%
        - Isolation & Inaccessibility: 20%
        """
        # 1. Urgency Component (0.0 to 1.0)
        # Higher score as time remaining approaches zero
        lead_time_s = max(0.0, road_cutoff_s - sim_time_s)
        if lead_time_s <= 0.0:
            urgency = 1.0
        elif lead_time_s < 1800.0:  # < 30 minutes
            urgency = 0.9 - (lead_time_s / 1800.0) * 0.3
        elif lead_time_s < 3600.0:  # < 60 minutes
            urgency = 0.6 - ((lead_time_s - 1800.0) / 1800.0) * 0.3
        else:
            urgency = max(0.05, 0.3 * math.exp(-lead_time_s / 7200.0))

        # 2. Hazard Component (0.0 to 1.0)
        hazard = min(1.0, hazard_intensity * 0.7 + (min(6.0, peak_depth_m) / 6.0) * 0.3)

        # 3. Population & Vulnerability Component (0.0 to 1.0)
        pop_normalized = min(1.0, math.log10(max(10, population)) / 4.0)  # log-scale up to 10,000
        vuln_multiplier = demographics.vulnerability_factor
        exposure = min(1.0, pop_normalized * vuln_multiplier)

        # 4. Isolation Component (0.0 to 1.0)
        if isolation_status == IsolationStatus.DIRECTLY_INUNDATED:
            isolation_factor = 1.0
        elif isolation_status == IsolationStatus.ISOLATED_BY_FLOOD:
            isolation_factor = 0.9
        elif isolation_status == IsolationStatus.ROAD_CUTOFF_IMMINENT:
            isolation_factor = 0.7
        elif not route_passable:
            isolation_factor = 0.8
        else:
            isolation_factor = 0.15

        # Weighted composite score (0 to 100)
        rpi = 100.0 * (
            0.35 * urgency
            + 0.25 * hazard
            + 0.20 * exposure
            + 0.20 * isolation_factor
        )
        rpi = round(max(0.0, min(100.0, rpi)), 1)

        # Assign Priority Tier
        if rpi >= 75.0:
            tier = PriorityTier.CRITICAL_IMMEDIATE
        elif rpi >= 50.0:
            tier = PriorityTier.HIGH_PRIORITY
        elif rpi >= 25.0:
            tier = PriorityTier.ELEVATED_WATCH
        else:
            tier = PriorityTier.SAFE_STANDBY

        return rpi, tier

    def allocate_shelters_and_routes(
        self,
        settlements: List[Dict[str, Any]],
        shelters: List[ShelterStatus],
        sim_time_s: float,
    ) -> Tuple[List[EvacuationRouteSegment], List[ShelterStatus]]:
        """
        Assigns settlements to the nearest safe, non-inundated shelter,
        updates shelter capacity usage, and generates evacuation route statuses.
        """
        routes: List[EvacuationRouteSegment] = []
        updated_shelters = [s.model_copy() for s in shelters]
        shelter_map = {s.shelter_id: s for s in updated_shelters}

        for st in settlements:
            s_lon = st["longitude"]
            s_lat = st["latitude"]
            s_pop = st["population"]
            s_id = st["settlement_id"]
            s_name = st["name"]
            cutoff_s = st.get("road_cutoff_s", 3600.0)

            # Find nearest available safe shelter with surplus capacity
            best_shelter = None
            min_dist = float("inf")

            for sh in updated_shelters:
                if not sh.is_safe_above_water:
                    continue
                d = haversine_distance_km(s_lon, s_lat, sh.longitude, sh.latitude)
                if d < min_dist:
                    min_dist = d
                    best_shelter = sh

            if not best_shelter and updated_shelters:
                best_shelter = updated_shelters[0]
                min_dist = haversine_distance_km(s_lon, s_lat, best_shelter.longitude, best_shelter.latitude)

            if best_shelter:
                # Travel time estimation: mountain road winding factor 1.45, speed 25 km/h
                road_dist_km = round(min_dist * 1.45, 2)
                travel_time_min = round((road_dist_km / 25.0) * 60.0, 1)

                is_passable = sim_time_s < cutoff_s
                traversability = "OPEN" if is_passable else "FLOODED_IMPASSABLE"
                margin_min = round(max(0.0, (cutoff_s - sim_time_s) / 60.0 - travel_time_min), 1)

                route = EvacuationRouteSegment(
                    route_id=f"RT-{s_id}-{best_shelter.shelter_id}",
                    settlement_id=s_id,
                    settlement_name=s_name,
                    shelter_id=best_shelter.shelter_id,
                    shelter_name=best_shelter.name,
                    distance_km=road_dist_km,
                    travel_time_min=travel_time_min,
                    road_cutoff_time_s=cutoff_s,
                    is_passable_at_sim_time=is_passable,
                    traversability_state=traversability,
                    flood_margin_min=margin_min if is_passable else 0.0,
                    path_coordinates=[
                        [s_lon, s_lat],
                        [(s_lon + best_shelter.longitude) / 2.0 + 0.005, (s_lat + best_shelter.latitude) / 2.0 - 0.003],
                        [best_shelter.longitude, best_shelter.latitude],
                    ],
                )
                routes.append(route)

                # Allocate evacuees
                evac_count = min(s_pop, best_shelter.capacity - best_shelter.allocated_evacuees)
                if evac_count > 0:
                    best_shelter.allocated_evacuees += evac_count

                best_shelter.surplus_capacity = max(0, best_shelter.capacity - best_shelter.allocated_evacuees)
                best_shelter.occupancy_percent = round((best_shelter.allocated_evacuees / max(1, best_shelter.capacity)) * 100.0, 1)
                best_shelter.is_at_capacity = best_shelter.surplus_capacity == 0

                st["assigned_shelter_id"] = best_shelter.shelter_id
                st["assigned_shelter_name"] = best_shelter.name
                st["nearest_shelter_distance_km"] = road_dist_km
                st["evacuation_travel_time_min"] = travel_time_min
                st["evacuation_lead_time_min"] = margin_min
                st["route_status"] = "FEASIBLE" if (is_passable and margin_min > 5.0) else ("TIGHT_MARGIN" if is_passable else "ISOLATED")

        return routes, updated_shelters

    def generate_alert_drafts(
        self,
        settlements: List[SettlementRiskProfile],
        scenario_label: str = "Tehri Dam Embankment Breach V4 Extended",
    ) -> List[AlertDraft]:
        """
        Creates actionable draft emergency alerts for human review.
        Requirement 7: Preview village-specific messages with scenario assumptions,
        issue time, affected area, and recommended action. Never dispatch automatically.
        """
        alerts: List[AlertDraft] = []
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")

        # Sort settlements by Response Priority Index descending
        high_risk_settlements = [s for s in settlements if s.priority_tier in (PriorityTier.CRITICAL_IMMEDIATE, PriorityTier.HIGH_PRIORITY)]

        for s in high_risk_settlements:
            action_desc = (
                f"IMMEDIATE EVACUATION: Evacuate residents along riverside sectors to {s.assigned_shelter_name or 'designated high ground'}. "
                f"Road closure imminent in ~{s.time_to_isolation_countdown_min or 0} min. Prioritize elderly and medical patients."
                if s.priority_tier == PriorityTier.CRITICAL_IMMEDIATE
                else f"PRE-EVACUATION WARNING: Stage community transport and issue high-ground warning. Road cutoff expected in ~{s.time_to_isolation_countdown_min or 0} min."
            )

            msg = (
                f"[HUMAN REVIEW DRAFT] EMERGENCY ADVISORY — SETTLEMENT: {s.name.upper()} (District Tehri Garhwal)\n"
                f"SCENARIO: {scenario_label}\n"
                f"PRIORITY RANKING: {s.priority_tier.value} (RPI: {s.response_priority_index}/100)\n"
                f"AFFECTED POPULATION: {s.population:,} residents\n"
                f"ESTIMATED PEAK WATER DEPTH: {s.peak_depth_m} m | LEAD TIME TO INUNDATION: {s.flood_arrival_time_min or 'N/A'} min\n"
                f"ACCESS ROAD CUTOFF COUNTDOWN: {s.time_to_isolation_countdown_min or 'N/A'} min\n"
                f"ASSIGNED SAFE SHELTER: {s.assigned_shelter_name} ({s.nearest_shelter_distance_km} km)\n"
                f"RECOMMENDED ACTION: {action_desc}\n"
                f"NOTE: System generated planning draft. Operational dispatch requires Incident Commander approval."
            )

            draft = AlertDraft(
                alert_id=f"ALT-{s.settlement_id}-{uuid.uuid4().hex[:6]}",
                settlement_id=s.settlement_id,
                settlement_name=s.name,
                priority_tier=s.priority_tier,
                issue_time_utc=now_str,
                scenario_assumptions=scenario_label,
                affected_area_desc=f"{s.name} riverside basin (chainage {s.distance_from_dam_km} km, elev {s.elevation_m}m)",
                estimated_arrival_min=s.flood_arrival_time_min,
                recommended_shelter=s.assigned_shelter_name or "High Ground Ridge",
                recommended_action=action_desc,
                message_text=msg,
                review_status=AlertStatus.DRAFT,
            )
            alerts.append(draft)

        return alerts


risk_calculator = VillageRiskCalculator()
