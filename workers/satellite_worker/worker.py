"""
Satellite surveillance worker for scheduled Sentinel-1 SAR change detection.
"""
import logging
from floodlab.satellite.sentinel1 import Sentinel1Monitor

logger = logging.getLogger(__name__)


class SatelliteWorker:
    def __init__(self):
        self.monitor = Sentinel1Monitor()

    def run_surveillance_cycle(self):
        logger.info("Executing satellite surveillance cycle...")
        return self.monitor.get_active_alerts()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Satellite worker initialized.")
