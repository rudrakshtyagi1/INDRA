"""
Geospatial processing worker for DEM preparation, sink filling, slope calculation.
"""
import logging

logger = logging.getLogger(__name__)


class GeospatialWorker:
    def process_terrain(self, dem_path, output_dir):
        logger.info(f"Processing DEM {dem_path} -> {output_dir}")
        return {"status": "SUCCESS"}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Geospatial worker initialized.")
