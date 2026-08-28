"""
Delft3D FM worker process for executing D-Flow FM runs asynchronously.
"""
import logging
from floodlab.engines.delft3d.dflowfm_adapter import Delft3DFMAdapter

logger = logging.getLogger(__name__)


class Delft3DWorker:
    def __init__(self, bin_dir=None):
        self.adapter = Delft3DFMAdapter(bin_dir=bin_dir)

    def process_job(self, scenario_params, coupling_result, run_dir):
        logger.info(f"Processing Delft3D FM job for run in {run_dir}")
        return self.adapter.run(scenario_params, coupling_result, run_dir)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Delft3D FM worker initialized.")
