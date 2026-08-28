"""
Simulation ORM model.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from floodlab.database.models.base import Base


class SimulationModel(Base):
    __tablename__ = "simulations"

    id = Column(String(36), primary_key=True)  # run_id
    scenario_id = Column(String(36), nullable=False)
    status = Column(String(50), nullable=False)
    solver_type = Column(String(50), nullable=False)
    breach_model = Column(String(50), nullable=False)
    manifest_json = Column(Text, nullable=True)
    manifest_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
