"""
SPH worker process for executing DualSPHysics runs asynchronously.
"""
import logging
from floodlab.engines.sph.dualsphysics_adapter import DualSPHysicsAdapter

logger = logging.getLogger(__name__)


class SPHWorker:
    def __init__(self, bin_dir=None):
        self.adapter = DualSPHysicsAdapter(bin_dir=bin_dir)

    def process_job(self, scenario_params, breach_result, run_dir):
        logger.info(f"Processing SPH job for run in {run_dir}")
        return self.adapter.run(scenario_params, breach_result, run_dir)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("DualSPHysics worker initialized.")
