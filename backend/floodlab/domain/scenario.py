"""
Scenario domain model.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from floodlab.domain.provenance import ProvenanceRecord


@dataclass
class DownstreamStationDomain:
    id: str
    name: str
    chainage_km: float
    landmark: Optional[str] = None


@dataclass
class ScenarioDomain:
    scenario_id: str
    name: str
    dam_name: str
    river: str
    state: str
    country: str = "India"
    latitude: float = 0.0
    longitude: float = 0.0

    # Structural parameters
    dam_type: str = "rockfill_earthfill_composite"
    breach_mode: str = "overtopping"
    structural_height_m: float = 0.0
    hydraulic_head_m: float = 0.0
    reservoir_volume_m3: float = 0.0
    crest_length_m: float = 0.0
    full_reservoir_level_msl: float = 0.0
    crest_elevation_msl: float = 0.0
    river_bed_elevation_msl: float = 0.0
    installed_capacity_mw: Optional[float] = None
    operator: Optional[str] = None

    # Valley & reach geometry
    reach_length_km: float = 100.0
    valley_width_m: float = 450.0
    bed_slope: float = 0.0055
    valley_type: str = "mountain_gorge"
    manning_n: float = 0.042

    # Breach selection
    breach_model: str = "froehlich_2008"

    # Stations & validation
    downstream_stations: List[DownstreamStationDomain] = field(default_factory=list)
    observation_validation_status: str = "NOT_AVAILABLE"
    observation_validation_note: str = ""
    is_hypothetical: bool = True

    # Provenance tracking
    provenance_map: Dict[str, ProvenanceRecord] = field(default_factory=dict)
