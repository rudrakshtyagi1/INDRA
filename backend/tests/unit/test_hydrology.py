"""Unit tests for SCS-CN and unit hydrograph."""
import pytest
from floodlab.engines.hydrology.scs_cn import SCSCN
from floodlab.engines.hydrology.unit_hydrograph import UnitHydrograph
from floodlab.engines.hydrology.inflow_hydrograph import HydrologyEngine, HydrologyInput


def test_scs_cn_retention():
    scs = SCSCN()
    # CN = 100 -> S = 0
    assert scs.retention_S(100.0) == 0.0
    # CN = 50 -> S = 254 mm
    assert pytest.approx(scs.retention_S(50.0), 0.1) == 254.0


def test_scs_cn_direct_runoff():
    scs = SCSCN(ia_coefficient=0.2)
    S = scs.retention_S(78.0)
    Ia = scs.initial_abstraction(S)
    # Rainfall below initial abstraction -> zero runoff
    assert scs.direct_runoff(Ia - 1.0, S, Ia) == 0.0
    # Rainfall above initial abstraction -> positive runoff
    assert scs.direct_runoff(Ia + 50.0, S, Ia) > 0.0


def test_hydrology_engine():
    inp = HydrologyInput(
        catchment_area_km2=500.0,
        curve_number_cn=78.0,
        rainfall_24h_mm=120.0,
        time_of_concentration_hrs=6.0,
    )
    result = HydrologyEngine.calculate(inp)
    assert result.runoff_depth_mm > 0.0
    assert result.peak_inflow_m3s > 0.0
    assert len(result.inflow_hydrograph_m3s) > 0
    assert result.provenance_level == "MODELLED"
