"""
Flood product ORM model.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from floodlab.database.models.base import Base


class FloodProductModel(Base):
    __tablename__ = "flood_products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulations.id"), nullable=False)
    product_type = Column(String(100), nullable=False)
    file_path = Column(String(500), nullable=False)
    provenance_level = Column(String(50), nullable=False)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
