"""
Simulation repository.
"""
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from floodlab.database.models.simulation import SimulationModel


class SimulationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_run(self, simulation: SimulationModel) -> SimulationModel:
        self.session.add(simulation)
        await self.session.commit()
        await self.session.refresh(simulation)
        return simulation

    async def get_run(self, run_id: str) -> Optional[SimulationModel]:
        stmt = select(SimulationModel).where(SimulationModel.id == run_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_status(self, run_id: str, status: str) -> None:
        stmt = update(SimulationModel).where(SimulationModel.id == run_id).values(status=status)
        await self.session.execute(stmt)
        await self.session.commit()

    async def list_runs(self, limit: int = 50, offset: int = 0) -> List[SimulationModel]:
        stmt = select(SimulationModel).order_by(SimulationModel.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
