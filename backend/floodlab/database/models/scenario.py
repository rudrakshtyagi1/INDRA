"""
Scenario ORM model.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from floodlab.database.models.base import Base


class ScenarioModel(Base):
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    dam_id = Column(String(36), ForeignKey("dams.id"), nullable=True)
    config_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
