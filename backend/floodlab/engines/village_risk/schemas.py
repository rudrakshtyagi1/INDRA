"""
Schemas and Data Contracts for Village Risk and Rescue Priority Engine.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DataSourceMode(str, Enum):
    DEMO = "DEMO"
    DATA_CONNECTED = "DATA_CONNECTED"


class PriorityTier(str, Enum):
    CRITICAL_IMMEDIATE = "CRITICAL_IMMEDIATE"   # RPI >= 75: Imminent breach inundation or immediate isolation
    HIGH_PRIORITY = "HIGH_PRIORITY"             # 50 <= RPI < 75: Impending cutoff or high vulnerability
    ELEVATED_WATCH = "ELEVATED_WATCH"           # 25 <= RPI < 50: Secondary risk or monitor
    SAFE_STANDBY = "SAFE_STANDBY"               # RPI < 25: Safe elevation or far downstream lead time


class IsolationStatus(str, Enum):
    ACCESSIBLE = "ACCESSIBLE"
    ROAD_CUTOFF_IMMINENT = "ROAD_CUTOFF_IMMINENT"
    ISOLATED_BY_FLOOD = "ISOLATED_BY_FLOOD"
    DIRECTLY_INUNDATED = "DIRECTLY_INUNDATED"


class DataProvenance(str, Enum):
    CANONICAL_OSM_GPKG = "CANONICAL_OSM_GPKG"
    SIMULATION_COUPLED = "SIMULATION_COUPLED"
    TERRAIN_INTERPOLATED = "TERRAIN_INTERPOLATED"
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"


class AlertStatus(str, Enum):
    DRAFT = "DRAFT"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DemographicBreakdown(BaseModel):
    total_population: int = 0
    children_under_12: int = 0
    elderly_over_65: int = 0
    hospital_patients_or_infirm: int = 0
    vulnerability_factor: float = 1.0


class SettlementRiskProfile(BaseModel):
    settlement_id: str
    name: str
    place_type: str = "village"
    latitude: float
    longitude: float
    elevation_m: float
    distance_from_dam_km: float

    # Exposure & Demographics
    population: int
    demographics: DemographicBreakdown
    critical_facilities: List[str] = Field(default_factory=list)

    # Flood Hydraulics (Separated from priority index)
    flood_arrival_time_s: Optional[float] = None
    flood_arrival_time_min: Optional[float] = None
    peak_depth_m: float = 0.0
    mean_depth_m: float = 0.0
    peak_velocity_ms: float = 0.0
    inundated_area_fraction: float = 0.0
    hazard_intensity_score: float = 0.0  # 0.0 to 1.0 based on depth x velocity

    # Road Network & Isolation
    road_cutoff_time_s: Optional[float] = None
    road_cutoff_time_min: Optional[float] = None
    isolation_status: IsolationStatus = IsolationStatus.ACCESSIBLE
    time_to_isolation_countdown_min: Optional[float] = None

    # Separate Scores (Requirement 3: keep likelihood, priority, quality distinct)
    flood_likelihood: float = 0.0       # 0.0 to 1.0 (Probabilistic hazard)
    response_priority_index: float = 0.0  # 0.0 to 100.0 (Actionable ranking)
    priority_tier: PriorityTier = PriorityTier.SAFE_STANDBY
    data_quality_score: float = 1.0     # 0.0 to 1.0 (Data completeness & veracity)

    # Rescue & Evacuation Assignment
    assigned_shelter_id: Optional[str] = None
    assigned_shelter_name: Optional[str] = None
    nearest_shelter_distance_km: Optional[float] = None
    evacuation_travel_time_min: Optional[float] = None
    evacuation_lead_time_min: Optional[float] = None
    route_status: str = "PENDING_ASSESSMENT"

    # Provenance & Honesty Flags
    provenance: DataProvenance
    missing_data_flags: List[str] = Field(default_factory=list)
    mode_label: str = "SYNTHETIC DEMO"


class ShelterStatus(BaseModel):
    shelter_id: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    capacity: int
    allocated_evacuees: int = 0
    surplus_capacity: int = 0
    occupancy_percent: float = 0.0
    is_at_capacity: bool = False
    is_safe_above_water: bool = True
    safety_margin_m: float = 25.0
    shelter_type: str = "Community Hall / School"
    provenance: DataProvenance


class EvacuationRouteSegment(BaseModel):
    route_id: str
    settlement_id: str
    settlement_name: str
    shelter_id: str
    shelter_name: str
    distance_km: float
    travel_time_min: float
    road_cutoff_time_s: Optional[float] = None
    is_passable_at_sim_time: bool = True
    traversability_state: str = "OPEN"
    flood_margin_min: Optional[float] = None
    path_coordinates: List[List[float]] = Field(default_factory=list)  # [[lon, lat], ...]


class AlertDraft(BaseModel):
    alert_id: str
    settlement_id: str
    settlement_name: str
    priority_tier: PriorityTier
    issue_time_utc: str
    scenario_assumptions: str
    affected_area_desc: str
    estimated_arrival_min: Optional[float]
    recommended_shelter: str
    recommended_action: str
    message_text: str
    review_status: AlertStatus = AlertStatus.DRAFT
    human_in_loop_warning: str = "HUMAN REVIEW REQUIRED - Automated public dispatch is disabled."
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None


class EnsembleScenario(BaseModel):
    scenario_id: str
    label: str
    breach_type: str
    probability_weight: float
    peak_discharge_m3s: float
    description: str


class UncertaintyPercentiles(BaseModel):
    metric: str
    p10_optimistic: float
    p50_median: float
    p90_conservative: float
    unit: str


class VillageRiskAssessment(BaseModel):
    assessment_id: str
    timestamp_utc: str
    mode: DataSourceMode
    mode_banner: str
    scenario_id: str
    sim_time_s: float
    sim_time_min: float

    # Core collections
    total_settlements: int
    critical_settlements_count: int
    isolated_settlements_count: int
    total_population_at_risk: int
    evacuees_allocated: int
    shelter_capacity_total: int
    shelter_surplus_total: int

    settlements: List[SettlementRiskProfile]
    shelters: List[ShelterStatus]
    evacuation_routes: List[EvacuationRouteSegment]
    alerts_queue: List[AlertDraft]
    uncertainty_bounds: List[UncertaintyPercentiles] = Field(default_factory=list)
    dataset_manifest: Dict[str, Any] = Field(default_factory=dict)
