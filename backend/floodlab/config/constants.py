"""
FloodLab constants and enumerations.
"""
from enum import Enum


class ProvenanceLevel(str, Enum):
    OBSERVED = "OBSERVED"
    REPORTED = "REPORTED"
    MODELLED = "MODELLED"
    ASSUMED = "ASSUMED"
    DERIVED = "DERIVED"


class ExecutionStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED_BINARY = "COMPLETED_BINARY"
    COMPLETED_ADAPTER = "COMPLETED_ADAPTER"
    FAILED = "FAILED"


class BreachModel(str, Enum):
    FROEHLICH_2008 = "froehlich_2008"
    MACDONALD_1984 = "macdonald_1984"
    VON_THUN_1990 = "von_thun_1990"
    RITTER_INSTANTANEOUS = "ritter_instantaneous"
    LDOF_COSTA_SCHUSTER = "ldof_costa_schuster"


class ValleyType(str, Enum):
    MOUNTAIN_GORGE = "mountain_gorge"
    SEMI_URBAN = "semi_urban"
    PLAINS_ALLUVIAL = "plains_alluvial"


class SolverType(str, Enum):
    SPH_ONLY = "sph_only"
    DELFT3D_ONLY = "delft3d_only"
    COUPLED = "coupled"


class HazardLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    SIGNIFICANT = "SIGNIFICANT"
    EXTREME = "EXTREME"


# Physical constants
G: float = 9.81          # Gravitational acceleration [m/s^2]
RHO0: float = 1000.0     # Reference water density [kg/m^3]
GAMMA: float = 7.0        # Tait EOS exponent
