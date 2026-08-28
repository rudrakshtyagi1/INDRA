"""
Scenario repository.
"""
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from floodlab.database.models.scenario import ScenarioModel


class ScenarioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, scenario: ScenarioModel) -> ScenarioModel:
        self.session.add(scenario)
        await self.session.commit()
        await self.session.refresh(scenario)
        return scenario

    async def get(self, scenario_id: str) -> Optional[ScenarioModel]:
        stmt = select(ScenarioModel).where(ScenarioModel.id == scenario_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> List[ScenarioModel]:
        stmt = select(ScenarioModel).order_by(ScenarioModel.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
