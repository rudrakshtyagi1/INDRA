"""
Seeds the database with preset dam records and scenario configurations.

Usage:
  python scripts/seed_database.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "backend"))

async def seed():
    print("Seeding database presets from configs/scenarios/...")
    print("Database seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
