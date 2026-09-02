"""
DualSPHysics binary runner.

Executes DualSPHysics via subprocess:
  gencase -> dualsphysics_cpu/gpu -> PartVTK/MeasureTool

Discovers binary version at runtime; never hardcodes version numbers.
"""
from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class EngineNotAvailableError(RuntimeError):
    """Raised when a required solver binary is not found."""
    pass


class DualSPHysicsRunner:
    """
    Orchestrates DualSPHysics execution for a dam-break simulation.

    The runner expects binaries in bin_dir:
        gencase       - case file generator
        dualsphysics  - main SPH solver (CPU or GPU)
        measuretool   - gauge extraction
        partvtk       - particle VTK conversion
    """

    def __init__(self, bin_dir: Optional[Path] = None):
        self.bin_dir = Path(bin_dir) if bin_dir else None

    def is_available(self) -> bool:
        """Check whether DualSPHysics binaries are accessible."""
        if not self.bin_dir:
            return False
        gencase = self.bin_dir / "gencase"
        solver = self.bin_dir / "dualsphysics"
        return gencase.exists() and solver.exists()

    def discover_version(self) -> str:
        """
        Run `dualsphysics --version` and return version string.
        Records version at runtime — never hardcoded.
        """
        if not self.is_available():
            raise EngineNotAvailableError(
                f"DualSPHysics not found in {self.bin_dir}. "
                "Set DUALSPHYSICS_BIN_DIR in .env and install the binary."
            )
        solver = self.bin_dir / "dualsphysics"
        try:
            result = subprocess.run(
                [str(solver), "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            version_line = result.stdout.strip() or result.stderr.strip()
            return version_line.split("\n")[0] if version_line else "unknown"
        except (subprocess.TimeoutExpired, OSError) as e:
            logger.warning(f"Could not discover DualSPHysics version: {e}")
            return "unknown"

    def run_gencase(self, def_xml: Path, output_dir: Path) -> Path:
        """Run gencase to generate binary particle files from XML definition."""
        output_dir.mkdir(parents=True, exist_ok=True)
        case_name = def_xml.stem.replace("_Def", "")
        gencase = self.bin_dir / "gencase"
        cmd = [str(gencase), str(def_xml), str(output_dir / case_name), "-save:all"]
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise RuntimeError(f"gencase failed:\n{result.stderr}")
        return output_dir / f"{case_name}.bi4"

    def run_simulation(
        self,
        case_dir: Path,
        gpu: bool = False,
        cpu_cores: int = 4,
    ) -> Path:
        """
        Run DualSPHysics simulation.

        Args:
            case_dir: Directory containing .bi4 case files.
            gpu: Use GPU execution if available.
            cpu_cores: Number of CPU threads for CPU mode.

        Returns:
            Path to output particle directory.
        """
        solver = self.bin_dir / "dualsphysics"
        case_name = "FloodSim"
        cmd = [str(solver), str(case_dir / case_name), str(case_dir)]
        if not gpu:
            cmd.extend(["-cpu", f"-omp:{cpu_cores}"])
        logger.info(f"Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise RuntimeError(f"DualSPHysics simulation failed:\n{result.stderr}")
        return case_dir

    def run_measuretool(self, case_dir: Path, probes_file: Path) -> Path:
        """Run MeasureTool to extract gauge timeseries from particle output."""
        measuretool = self.bin_dir / "measuretool"
        output_csv = case_dir / "gauges_output.csv"
        cmd = [
            str(measuretool),
            f"-dirin {case_dir}",
            f"-filexml {probes_file}",
            f"-savevtk {output_csv}",
        ]
        subprocess.run(" ".join(cmd), shell=True, capture_output=True, text=True, timeout=600)
        return output_csv

    def run_partvtk(self, case_dir: Path, output_dir: Path) -> list[Path]:
        """Convert binary particle output to VTK for flux extraction."""
        partvtk = self.bin_dir / "partvtk"
        output_dir.mkdir(parents=True, exist_ok=True)
        cmd = [str(partvtk), f"-dirin {case_dir}", f"-savevtk {output_dir / 'Part'}"]
        subprocess.run(" ".join(cmd), shell=True, capture_output=True, text=True, timeout=600)
        return sorted(output_dir.glob("Part_*.vtk"))
