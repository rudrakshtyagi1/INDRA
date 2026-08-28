"""Unit tests for breach mechanics models."""
import pytest
from floodlab.config.constants import BreachModel
from floodlab.engines.breach.breach_models import BreachMechanicsEngine, DamBreachInput


def test_froehlich_2008():
    engine = BreachMechanicsEngine()
    inp = DamBreachInput(
        dam_height_m=260.5,
        hydraulic_head_m=260.0,
        reservoir_volume_m3=3.54e9,
        breach_mode="overtopping",
        breach_model=BreachModel.FROEHLICH_2008,
    )
    res = engine.evaluate(inp)
    assert res.avg_breach_width_m > 0
    assert res.peak_discharge_m3s > 0
    assert res.formation_time_hrs > 0
    assert len(res.hydrograph_times_hrs) == len(res.hydrograph_flows_m3s)
    assert res.provenance_map["peak_discharge_m3s"] == "MODELLED:froehlich_2008"


def test_all_breach_models():
    engine = BreachMechanicsEngine()
    for model in [
        BreachModel.FROEHLICH_2008,
        BreachModel.MACDONALD_1984,
        BreachModel.VON_THUN_1990,
        BreachModel.RITTER_INSTANTANEOUS,
        BreachModel.LDOF_COSTA_SCHUSTER,
    ]:
        inp = DamBreachInput(
            dam_height_m=100.0,
            hydraulic_head_m=90.0,
            reservoir_volume_m3=1e8,
            breach_mode="overtopping",
            breach_model=model,
        )
        res = engine.evaluate(inp, model=model)
        assert res.peak_discharge_m3s > 0
        assert res.model_used == model.value
