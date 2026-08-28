"""
Provenance label factory functions.

These helpers create ProvenanceRecord instances with consistent labelling.
"""
from floodlab.config.constants import ProvenanceLevel
from floodlab.domain.provenance import ProvenanceRecord


def label_observed(source: str, notes: str = "") -> ProvenanceRecord:
    """
    Direct sensor or Earth Observation measurement.
    Examples: Sentinel-1 acquisition, rain gauge reading.
    """
    return ProvenanceRecord(level=ProvenanceLevel.OBSERVED, source=source, notes=notes)


def label_reported(source: str, notes: str = "") -> ProvenanceRecord:
    """
    Official published specification from government body or technical reference.
    Examples: THDC dam height, CWC reach length.
    """
    return ProvenanceRecord(level=ProvenanceLevel.REPORTED, source=source, notes=notes)


def label_modelled(solver: str, version: str = "", notes: str = "") -> ProvenanceRecord:
    """
    Physics-solver or empirical-formula output.
    Examples: Delft3D FM flood depth, Froehlich breach discharge.
    """
    src = solver if not version else f"{solver} {version}"
    return ProvenanceRecord(level=ProvenanceLevel.MODELLED, source=src, notes=notes)


def label_assumed(parameter: str, default_value=None, notes: str = "") -> ProvenanceRecord:
    """
    Manually specified parameter without observational or official backing.
    Examples: analyst-entered breach width, manually set Manning's n.
    """
    note = notes or (f"Default value: {default_value}" if default_value is not None else "")
    return ProvenanceRecord(level=ProvenanceLevel.ASSUMED, source=f"analyst_input:{parameter}", notes=note)


def label_derived(from_sources: list[str], method: str, notes: str = "") -> ProvenanceRecord:
    """
    Computed from other provenance levels.
    Examples: exposed population (MODELLED extent + OBSERVED WorldPop),
              Manning's n raster (OBSERVED land-cover + REPORTED lookup).
    """
    source = f"derived_from:[{', '.join(from_sources)}] method:{method}"
    return ProvenanceRecord(level=ProvenanceLevel.DERIVED, source=source, notes=notes)
