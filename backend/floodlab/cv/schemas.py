"""
Data schemas for Computer Vision Dam Monitoring and Breach Detection.
"""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class BreachStatus(str, Enum):
    INTACT = "INTACT"
    MONITORING_RISING = "MONITORING_RISING"
    OVERTOPPING_ALERT = "OVERTOPPING_ALERT"
    BREACH_CONFIRMED = "BREACH_CONFIRMED"


class CameraStatus(str, Enum):
    ONLINE = "ONLINE"
    DEGRADED = "DEGRADED"
    OFFLINE = "OFFLINE"


class CameraPose(BaseModel):
    camera_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    elevation_m: float
    crest_elevation_m: float = 839.5
    focal_length_mm: float = 50.0
    field_of_view_deg: float = 65.0
    heading_deg: float = 145.0
    tilt_deg: float = -12.0
    resolution: str = "1920x1080"
    datum: str = "WGS84 / EGM96"
    calibration_version: str = "cv-calib-v2.1"
    status: CameraStatus = CameraStatus.ONLINE
    last_ping_utc: datetime = Field(default_factory=datetime.utcnow)


class CVDetectionMetrics(BaseModel):
    water_elevation_m: float
    crest_elevation_m: float = 839.5
    freeboard_m: float
    rate_of_rise_m_hr: float
    is_overtopping: bool
    is_breached: bool
    breach_width_m: Optional[float] = None
    breach_depth_m: Optional[float] = None
    estimated_breach_outflow_m3s: Optional[float] = None
    confidence: float
    turbidity_score: float
    visibility_score: float
    optical_flow_velocity_ms: float
    quality_flags: List[str]


class CVEvidenceFrame(BaseModel):
    frame_id: str
    camera_id: str
    scenario_id: str
    timestamp: datetime
    metrics: CVDetectionMetrics
    status: BreachStatus
    alert_level: str
    overlay_svg: str
    bounding_boxes: List[Dict]
    recommendation: str


class CVSimulationSyncRequest(BaseModel):
    apply_to_solver: bool = True
    override_boundary_inflow: bool = True
    selected_run_id: str = "v4_extended"
    target_outflow_m3s: Optional[float] = None
