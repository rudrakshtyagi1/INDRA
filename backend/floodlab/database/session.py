"""
SQLAlchemy database session.
PostgreSQL/PostGIS primary; SQLite fallback for dev/testing.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from floodlab.config.settings import get_settings

settings = get_settings()

DATABASE_URL = settings.database_url

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.app_env == "development" and settings.debug,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining async DB sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
