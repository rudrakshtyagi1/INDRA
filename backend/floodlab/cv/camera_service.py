"""
Camera Management and Real-time CV Pipeline Service for INDRA.
"""
from datetime import datetime
from typing import Dict, List, Optional

from floodlab.cv.detector import DamBreachDetector
from floodlab.cv.schemas import (
    BreachStatus,
    CameraPose,
    CameraStatus,
    CVEvidenceFrame,
    CVSimulationSyncRequest,
)


class DamCameraService:
    """
    Coordinates edge/remote cameras, streams detection evidence,
    and bridges CV breach states directly into the simulation lab.
    """

    def __init__(self):
        self.cameras: Dict[str, CameraPose] = {
            "CAM-TEHRI-CREST-01": CameraPose(
                camera_id="CAM-TEHRI-CREST-01",
                name="Tehri Crest Left Abutment (Primary)",
                location="Tehri Dam Crest West Ridge",
                latitude=30.378,
                longitude=78.481,
                elevation_m=850.0,
                crest_elevation_m=839.5,
                heading_deg=135.0,
                tilt_deg=-15.0,
                status=CameraStatus.ONLINE,
            ),
            "CAM-TEHRI-SPILL-02": CameraPose(
                camera_id="CAM-TEHRI-SPILL-02",
                name="Chute Spillway & Radial Gates",
                location="Spillway Control Pier East",
                latitude=30.380,
                longitude=78.484,
                elevation_m=844.0,
                crest_elevation_m=839.5,
                heading_deg=180.0,
                tilt_deg=-20.0,
                status=CameraStatus.ONLINE,
            ),
            "CAM-TEHRI-RESERVOIR-03": CameraPose(
                camera_id="CAM-TEHRI-RESERVOIR-03",
                name="Bhagirathi Gorge Upstream Gauge",
                location="Koti Colony Reservoir Pier",
                latitude=30.395,
                longitude=78.472,
                elevation_m=840.0,
                crest_elevation_m=839.5,
                heading_deg=90.0,
                tilt_deg=-10.0,
                status=CameraStatus.ONLINE,
            ),
        }
        self.active_camera_id = "CAM-TEHRI-CREST-01"
        self.active_scenario = "normal_ops"
        self.detector = DamBreachDetector(self.cameras[self.active_camera_id])
        self.simulation_sync_state = {
            "cv_breach_detected": False,
            "cv_breach_confirmed_at": None,
            "cv_synced_to_simulation": False,
            "simulation_inflow_override_m3s": 2113.0,
            "recommended_solver": "LISFLOOD-FP 2D",
            "active_scenario": self.active_scenario,
        }

    def list_cameras(self) -> List[CameraPose]:
        return list(self.cameras.values())

    def get_camera(self, camera_id: str) -> Optional[CameraPose]:
        return self.cameras.get(camera_id)

    def set_active_scenario(self, scenario_id: str) -> str:
        self.active_scenario = scenario_id
        is_breach = scenario_id == "structural_breach"
        self.simulation_sync_state["active_scenario"] = scenario_id
        self.simulation_sync_state["cv_breach_detected"] = is_breach
        if is_breach:
            self.simulation_sync_state["cv_breach_confirmed_at"] = datetime.utcnow().isoformat()
            self.simulation_sync_state["simulation_inflow_override_m3s"] = 723705.5
        else:
            self.simulation_sync_state["simulation_inflow_override_m3s"] = 2113.0
        return self.active_scenario

    def get_current_frame(
        self,
        camera_id: Optional[str] = None,
        scenario_id: Optional[str] = None,
    ) -> CVEvidenceFrame:
        cam_id = camera_id or self.active_camera_id
        scen_id = scenario_id or self.active_scenario
        pose = self.cameras.get(cam_id, self.cameras[self.active_camera_id])
        detector = DamBreachDetector(pose)
        frame = detector.analyze_scenario(scen_id)

        # Update sync state
        self.simulation_sync_state["cv_breach_detected"] = frame.metrics.is_breached
        if frame.metrics.is_breached:
            self.simulation_sync_state["cv_breach_confirmed_at"] = frame.timestamp.isoformat()
            self.simulation_sync_state["simulation_inflow_override_m3s"] = frame.metrics.estimated_breach_outflow_m3s or 723705.5

        return frame

    def sync_to_simulation(self, req: CVSimulationSyncRequest) -> Dict:
        """
        Synchronizes the CV detection output to the active flood simulation engine.
        Updates downstream hydraulic boundary conditions and triggers breach scenario.
        """
        frame = self.get_current_frame()
        self.simulation_sync_state["cv_synced_to_simulation"] = True
        self.simulation_sync_state["selected_run_id"] = req.selected_run_id

        if frame.metrics.is_breached:
            self.simulation_sync_state["applied_hydrograph"] = "FROEHLICH_BREACH_723K"
            self.simulation_sync_state["peak_discharge_m3s"] = frame.metrics.estimated_breach_outflow_m3s or 723705.5
            message = (
                f"CV BREACH CONFIRMED ({frame.metrics.breach_width_m}m notch). "
                f"Boundary inflow updated to peak {self.simulation_sync_state['peak_discharge_m3s']:,.1f} m³/s. "
                "Downstream LISFLOOD-FP flood propagation synchronized."
            )
        else:
            self.simulation_sync_state["applied_hydrograph"] = "HYDROLOGIC_INFLOW_BASE"
            self.simulation_sync_state["peak_discharge_m3s"] = 2113.0
            message = (
                f"CV reports {frame.status.value}. Water level {frame.metrics.water_elevation_m:.2f}m AMSL. "
                "Base hydrologic flow retained."
            )

        return {
            "status": "SUCCESS",
            "message": message,
            "frame_id": frame.frame_id,
            "cv_status": frame.status.value,
            "metrics": frame.metrics.dict(),
            "sync_state": self.simulation_sync_state,
        }

    def get_simulation_sync_state(self) -> Dict:
        return self.simulation_sync_state


# Global singleton service
camera_service = DamCameraService()
