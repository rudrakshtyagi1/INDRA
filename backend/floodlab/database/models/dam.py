"""
Dam ORM model.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Float, Text, DateTime
from floodlab.database.models.base import Base


class DamModel(Base):
    __tablename__ = "dams"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, index=True)
    river = Column(String(255), nullable=False)
    state = Column(String(255), nullable=False)
    country = Column(String(100), default="India")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    dam_type = Column(String(100), default="rockfill_earthfill_composite")
    structural_height_m = Column(Float, nullable=False)
    hydraulic_head_m = Column(Float, nullable=False)
    reservoir_volume_m3 = Column(Float, nullable=False)
    crest_length_m = Column(Float, nullable=True)
    full_reservoir_level_msl = Column(Float, nullable=True)
    crest_elevation_msl = Column(Float, nullable=True)
    river_bed_elevation_msl = Column(Float, nullable=True)
    installed_capacity_mw = Column(Float, nullable=True)
    operator = Column(String(255), nullable=True)

    provenance_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
