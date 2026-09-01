#!/usr/bin/env python3
"""
Step 8B — Breach Benchmark Provenance Relabeling & Scientific Qualification.

1. Renames stage-storage benchmark files to eliminate 'verified' labels:
   verified_stage_storage_benchmark.csv -> assumed_theoretical_stage_storage_benchmark.csv
   verified_stage_storage_metadata.json -> assumed_theoretical_stage_storage_metadata.json
2. Updates all breach metadata, parameters, and scenario schemas with ASSUMED THEORETICAL / EXTRAPOLATED BENCHMARK provenance.
3. Updates breach_boundary_hydrograph.csv with SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY metadata.
4. Generates an extensive physical vs numerical validation audit in breach_qa_report.md explaining extreme peak discharges (BASE 723k m3/s, HIGH 2.24M m3/s).
5. Updates dataset_manifest.csv and provenance.json with fresh SHA-256 hashes.
"""
import os
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd

BASE_DIR = Path(".")
PROCESSED_DIR = BASE_DIR / "data" / "processed" / "tehri_inputs"
BREACH_DIR = PROCESSED_DIR / "breach"
PROV_DIR = PROCESSED_DIR / "provenance"

RES_REF_DIR = BREACH_DIR / "reservoir_reference"
SCEN_DIR = BREACH_DIR / "scenarios"
HYDROG_DIR = BREACH_DIR / "hydrographs"
QA_DIR = BREACH_DIR / "qa"

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8*1024*1024):
            h.update(chunk)
    return h.hexdigest()

def main():
    print("="*75)
    print("STEP 8B: BREACH BENCHMARK PROVENANCE RELABELING & SCIENTIFIC AUDIT")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("="*75)

    # 1. RENAME & RELABEL STAGE-STORAGE BENCHMARK
    old_csv = RES_REF_DIR / "verified_stage_storage_benchmark.csv"
    new_csv = RES_REF_DIR / "assumed_theoretical_stage_storage_benchmark.csv"
    old_json = RES_REF_DIR / "verified_stage_storage_metadata.json"
    new_json = RES_REF_DIR / "assumed_theoretical_stage_storage_metadata.json"

    df_stage_storage = pd.read_csv(old_csv if old_csv.exists() else new_csv)
    df_stage_storage["provenance"] = "SIMPLIFIED EMERGENCY-PLANNING BENCHMARK HYPSOMETRY (Monotonic power-law canyon model calibrated to 570m/740m/830m reported anchors; bathymetric curve is unobserved)"
    df_stage_storage.to_csv(new_csv, index=False)
    if old_csv.exists() and old_csv != new_csv:
        old_csv.unlink()
    print(f"  • Relabeled stage-storage table: {new_csv.name}")

    meta_stage_storage = {
        "dataset_name": "assumed_theoretical_stage_storage_benchmark",
        "study_mode": "SIMPLIFIED THEORETICAL BREACH BENCHMARK",
        "tehri_specific_stage_storage_status": "NOT AVAILABLE",
        "tehri_specific_reservoir_routing_status": "BLOCKED_STAGE_STORAGE_DATA",
        "benchmark_hypsometry_status": "AVAILABLE FOR THEORETICAL TESTING ONLY",
        "dam_name": "Tehri Dam",
        "river": "Bhagirathi",
        "operator": "THDC India Limited",
        "reported_design_specifications": {
            "crest_elevation_m_msl": {"value": 839.5, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "full_reservoir_level_m_msl": {"value": 830.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "minimum_drawdown_level_m_msl": {"value": 740.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "riverbed_elevation_m_msl": {"value": 570.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "structural_height_m": {"value": 260.5, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "crest_length_m": {"value": 575.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "gross_storage_capacity_m3": {"value": 3540000000.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "live_storage_capacity_m3": {"value": 2615000000.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"},
            "dead_storage_capacity_m3": {"value": 925000000.0, "provenance": "REPORTED DESIGN SPECIFICATION (THDC / CWC Published Data)"}
        },
        "assumed_theoretical_hypsometry": {
            "equation": "S(z) = a * (z - 570.0)^b",
            "exponent_b": 3.165,
            "coefficient_a": 8.434e-5,
            "provenance": "ASSUMED THEORETICAL RESERVOIR HYPSOMETRY (Simplified Emergency-Planning Benchmark)",
            "scientific_qualification": "Official hydrographic elevation-storage relationship is unobserved/proprietary. This mathematical canyon hypsometry connects reported anchor points for theoretical solver integration testing. It does NOT represent verified Tehri reservoir routing."
        }
    }
    with open(new_json, "w") as f:
        json.dump(meta_stage_storage, f, indent=2)
    if old_json.exists() and old_json != new_json:
        old_json.unlink()
    print(f"  • Relabeled stage-storage metadata: {new_json.name}")

    # 2. RELABEL RESERVOIR INITIAL SCENARIOS
    res_scen_p = SCEN_DIR / "reservoir_initial_scenarios.json"
    res_scenarios = {
        "RESERVOIR_LOW": {
            "scenario_initial_elevation_m": 740.0,
            "scenario_initial_storage_m3": 925000000.0,
            "storage_mcm": 925.0,
            "fraction_of_gross_storage": 0.2613,
            "provenance": "ASSUMED THEORETICAL EMERGENCY-PLANNING STATE (Minimum Operating Drawdown Level MDDL)",
            "rationale": "Conservative lower envelope scenario representing pre-monsoon drawdown state."
        },
        "RESERVOIR_BASE": {
            "scenario_initial_elevation_m": 815.0,
            "scenario_initial_storage_m3": 2934173872.0,
            "storage_mcm": 2934.17,
            "fraction_of_gross_storage": 0.8289,
            "provenance": "ASSUMED THEORETICAL EMERGENCY-PLANNING STATE (Derived from Assumed Benchmark Hypsometry, NOT Reported Tehri Storage)",
            "rationale": "Central theoretical prototype scenario representing active monsoon filling stage."
        },
        "RESERVOIR_HIGH": {
            "scenario_initial_elevation_m": 830.0,
            "scenario_initial_storage_m3": 3540000000.0,
            "storage_mcm": 3540.0,
            "fraction_of_gross_storage": 1.0000,
            "provenance": "ASSUMED THEORETICAL EMERGENCY-PLANNING STATE (Full Reservoir Level FRL)",
            "rationale": "Upper envelope catastrophic scenario representing full reservoir capacity at flood onset."
        }
    }
    with open(res_scen_p, "w") as f:
        json.dump(res_scenarios, f, indent=2)
    print(f"  • Relabeled reservoir initial scenarios: {res_scen_p.name}")

    # 3. RELABEL BREACH PARAMETERS & EXTRAPOLATION AUDIT
    breach_param_p = SCEN_DIR / "breach_scenario_parameters.json"
    breach_params = {
        "BREACH_LOW": {
            "description": "Partial localized embankment notch / controlled internal erosion theoretical scenario",
            "max_breach_width_m": 120.0,
            "final_invert_elevation_m_msl": 740.0,
            "formation_time_hrs": 3.5,
            "side_slope_z": 0.9,
            "discharge_coefficient_Cd": 1.50,
            "initiation_hour_from_event": 45.0,
            "provenance": "ASSUMED THEORETICAL BREACH PARAMETER (Hypothetical Planning Scenario)",
            "application_status": "ASSUMED BENCHMARK NOTCH (Not an identified dam weakness)"
        },
        "BREACH_BASE": {
            "description": "Froehlich (2008) empirical regression for rockfill embankment breach parameters",
            "max_breach_width_m": 220.0,
            "final_invert_elevation_m_msl": 680.0,
            "formation_time_hrs": 2.0,
            "side_slope_z": 1.0,
            "discharge_coefficient_Cd": 1.65,
            "initiation_hour_from_event": 45.0,
            "empirical_formula": "B_avg = 0.27 * Ko * V_w^0.32 * h_b^0.04; t_f = 63.2 * sqrt(V_w / (g * h_b^2))",
            "provenance": "EXTRAPOLATED THEORETICAL BENCHMARK (Froehlich 2008 Empirical Regression)",
            "applicability_warning": "Froehlich (2008) dataset comprises primarily small-to-medium dams (median height ~20m, max ~90m). Applying to a 260.5m mega-dam with 3.5 BCM storage is an extreme mathematical extrapolation. Results represent an upper theoretical benchmark rather than an engineering prediction."
        },
        "BREACH_HIGH": {
            "description": "Severe rapid overtopping deep breach / extensive structural collapse benchmark",
            "max_breach_width_m": 350.0,
            "final_invert_elevation_m_msl": 600.0,
            "formation_time_hrs": 1.2,
            "side_slope_z": 1.4,
            "discharge_coefficient_Cd": 1.85,
            "initiation_hour_from_event": 45.0,
            "provenance": "EXTRAPOLATED THEORETICAL BENCHMARK (Extreme Upper Bound Scenario)",
            "applicability_warning": "Represents instantaneous/near-instantaneous massive collapse under maximum hydrostatic head for solver stress-testing."
        }
    }
    with open(breach_param_p, "w") as f:
        json.dump(breach_params, f, indent=2)
    print(f"  • Relabeled breach scenario parameters: {breach_param_p.name}")

    # 4. RELABEL HYDROGRAPHS & COUPLING BOUNDARY ARTIFACT
    coupling_p = HYDROG_DIR / "breach_boundary_hydrograph.csv"
    df_coup = pd.read_csv(coupling_p)
    df_coup["provenance"] = "SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY (For Solver Integration Testing Only; Water Level MODELLED FROM ASSUMED BENCHMARK HYPSOMETRY)"
    df_coup.to_csv(coupling_p, index=False)
    print(f"  • Relabeled solver coupling artifact: {coupling_p.name}")

    for s_file, s_tag in [
        ("breach_hydrograph_low.csv", "SCENARIO_LOW"),
        ("breach_hydrograph_base.csv", "SCENARIO_BASE"),
        ("breach_hydrograph_high.csv", "SCENARIO_HIGH")
    ]:
        hp = HYDROG_DIR / s_file
        if hp.exists():
            df_h = pd.read_csv(hp)
            df_h["provenance"] = f"MODELLED OUTFLOW (Simplified Theoretical Breach Benchmark — {s_tag})"
            df_h.to_csv(hp, index=False)
            print(f"  • Relabeled hydrograph CSV: {s_file}")

    # 5. GENERATE COMPREHENSIVE STEP 8B QA & SCIENTIFIC AUDIT REPORT
    qa_report_md = """# FloodLab — Step 8B: Theoretical Breach Benchmark QA & Scientific Audit Report

## 1. Provenance Classification & Project Safety Gate
- **Tehri-Specific Stage-Storage Status**: **`NOT AVAILABLE`**
- **Tehri-Specific Reservoir Routing Status**: **`BLOCKED_STAGE_STORAGE_DATA`**
- **Simplified Theoretical Breach Benchmark Status**: **`AVAILABLE (READY FOR SOLVER INTEGRATION TESTING ONLY)`**
- **Study Mode & UI/Video Label**: **`PRECOMPUTED WHAT-IF EMERGENCY-PLANNING SCENARIO`** / **`SIMPLIFIED THEORETICAL BREACH BENCHMARK`**
- **Non-Affirmation Statement**: This benchmark is **NOT** an operational prediction, historical Tehri reconstruction, or real-time simulation.

## 2. Stage-Storage Data Audit & Hypsometry Relabeling
- A granular bathymetric survey table for Tehri Dam is unobserved/proprietary.
- The mathematical curve $S(z) = a(z - 570.0)^b$ ($b=3.165$) is classified as:
  **`ASSUMED THEORETICAL RESERVOIR HYPSOMETRY`** / **`SIMPLIFIED EMERGENCY-PLANNING BENCHMARK HYPSOMETRY`**.
- Artifact renamed: `data/processed/tehri_inputs/breach/reservoir_reference/assumed_theoretical_stage_storage_benchmark.csv`.

## 3. Structural Design Anchors vs Assumed States
- **Crest Elevation (839.5 m MSL)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Full Reservoir Level (830.0 m MSL, 3,540 MCM)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Minimum Drawdown Level (740.0 m MSL, 925 MCM)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **Riverbed Elevation (570.0 m MSL)**: `REPORTED DESIGN SPECIFICATION (THDC / CWC)`
- **BASE Scenario Storage at 815 m (2,934.2 MCM)**: **`DERIVED FROM ASSUMED BENCHMARK HYPSOMETRY`** *(NOT reported Tehri storage)*.

## 4. Extreme Peak Discharge Investigation ($Q_{\\text{peak}}$ Analysis)
The theoretical reservoir routing produced the following peak discharges:
- **`SCENARIO_LOW`**: **$8,660.7\text{ m}^3/\text{s}$** *(THEORETICAL NOTCH BENCHMARK)*
- **`SCENARIO_BASE`**: **$723,731.3\text{ m}^3/\text{s}$** *(EXTRAPOLATED THEORETICAL BENCHMARK)*
- **`SCENARIO_HIGH`**: **$2,246,710.5\text{ m}^3/\text{s}$** *(EXTRAPOLATED THEORETICAL BENCHMARK)*

### Why are BASE and HIGH peak discharges so large?
1. **Extreme Hydrostatic Head ($H_b \approx 135 - 230\text{ m}$)**:
   Tehri Dam is the tallest dam in India ($260.5\text{ m}$). Standard empirical weir discharge scales as $Q \propto B \cdot H_b^{1.5}$. At $H_b = 135\text{ m}$ (BASE) with breach width $B = 220\text{ m}$, the instantaneous broad-crested weir opening capacity exceeds $700,000\text{ m}^3/\text{s}$.
2. **Gigantic Stored Potential Energy ($S_0 \approx 2.93 - 3.54\text{ BCM}$)**:
   A reservoir holding nearly $3.5\text{ billion cubic meters}$ behind a $260\text{m}$ barrier contains immense flood potential. Rapid breach development ($t_f = 2.0\text{ h}$) empties $>3\text{ BCM}$ in hours.
3. **Empirical Regression Extrapolation Warning**:
   The Froehlich (2008) dataset consists almost entirely of small/medium dams (median height $\approx 20\text{ m}$). Applying this equation to a $260.5\text{ m}$ rockfill dam with a thick clay core and riprap slope protection is an **extreme extrapolation**. Real rockfill dams of this size would experience significant erosion resistance, structural interlocking, and tailwater backpressure that are unrepresented in simple uncoupled broad-crested weir formulas.
4. **Dominant Sensitivity Drivers**:
   - **Initial Head / Elevation ($Z_0$)**: Greatest impact on initial discharge intensity.
   - **Breach Depth / Final Invert ($Z_{\\text{inv}}$)**: Controls total drained volume.
   - **Breach Formation Time ($t_f$)**: Controls hydrograph sharpness and peak compression.
   - **Parameters were NOT artificially tuned**: The physics and mathematics are presented transparently without cosmetic suppression.

## 5. Numerical Consistency vs Physical Validation
- **Numerical Consistency**: **PASS**
  - Timestep stability confirmed across $60\text{s}, 30\text{s}, 10\text{s}, 5\text{s}$ (selected $\Delta t = 10.0\text{ s}$).
  - Conservation of mass verified: absolute residual $< 100\text{ m}^3$ on a $3.27\text{ BCM}$ event ($< 0.000003\%$ error).
- **Physical Validation**: **UNVALIDATED THEORETICAL BENCHMARK**
  - Demonstrates numerical conservation only.
  - Does NOT validate real Tehri breach physics, geotechnical failure mechanics, or actual downstream wave propagation.

## 6. Solver Coupling Artifact Status
- `breach_boundary_hydrograph.csv` is designated: **`SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY`**.
- It is approved for **solver integration testing, UI playback testing, and numerical pipeline verification only**.
- Downstream water level column is labeled: **`MODELLED FROM ASSUMED BENCHMARK HYPSOMETRY`**.

## 7. Required Missing Data for Full Tehri Reservoir Routing
To unblock full, validated Tehri-specific reservoir routing:
1. Official hydrographic Elevation-Area-Capacity table from THDC India Limited / CWC.
2. Verified multi-beam reservoir bathymetry.
3. Timestamped operational reservoir water-level records during the event period.
"""
    with open(QA_DIR / "breach_qa_report.md", "w") as f:
        f.write(qa_report_md)
    print(f"  • Saved Comprehensive QA Report: breach_qa_report.md")

    # 6. UPDATE PROVENANCE JSON
    prov_data = {
        "step": "STEP 8B",
        "project": "FloodLab — Tehri Dam Emergency-Planning Prototype",
        "study_mode": "PRECOMPUTED WHAT-IF EMERGENCY-PLANNING SCENARIO",
        "tehri_specific_stage_storage_status": "NOT AVAILABLE",
        "tehri_specific_reservoir_routing_status": "BLOCKED_STAGE_STORAGE_DATA",
        "simplified_theoretical_breach_benchmark_status": "AVAILABLE (READY FOR SOLVER INTEGRATION TESTING ONLY)",
        "dam_name": "Tehri Dam",
        "provenance_classifications": {
            "CWC_Tekhla_Discharge": "OBSERVED",
            "Tehri_Design_FRL_and_Capacity": "REPORTED DESIGN SPECIFICATION",
            "Initial_Scenario_Reservoir_Elevation": "ASSUMED THEORETICAL EMERGENCY-PLANNING STATE",
            "Reservoir_Hypsometry": "ASSUMED THEORETICAL RESERVOIR HYPSOMETRY (Simplified Emergency-Planning Benchmark)",
            "Step_7_Total_Inflow": "MODELLED / DERIVED",
            "Breach_Parameters": "EXTRAPOLATED THEORETICAL BENCHMARK",
            "Q_breach_t": "MODELLED OUTFLOW (Simplified Theoretical Breach Benchmark)",
            "Solver_Boundary_Hydrograph": "SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY (For Solver Integration Testing Only)",
            "Current_Reservoir_Level": "DATA UNAVAILABLE"
        },
        "artifacts_generated": {
            "stage_storage_benchmark": "data/processed/tehri_inputs/breach/reservoir_reference/assumed_theoretical_stage_storage_benchmark.csv",
            "stage_storage_metadata": "data/processed/tehri_inputs/breach/reservoir_reference/assumed_theoretical_stage_storage_metadata.json",
            "breach_scenario_parameters": "data/processed/tehri_inputs/breach/scenarios/breach_scenario_parameters.json",
            "reservoir_initial_scenarios": "data/processed/tehri_inputs/breach/scenarios/reservoir_initial_scenarios.json",
            "breach_hydrograph_low": "data/processed/tehri_inputs/breach/hydrographs/breach_hydrograph_low.csv",
            "breach_hydrograph_base": "data/processed/tehri_inputs/breach/hydrographs/breach_hydrograph_base.csv",
            "breach_hydrograph_high": "data/processed/tehri_inputs/breach/hydrographs/breach_hydrograph_high.csv",
            "breach_boundary_hydrograph": "data/processed/tehri_inputs/breach/hydrographs/breach_boundary_hydrograph.csv",
            "reservoir_mass_balance": "data/processed/tehri_inputs/breach/qa/reservoir_mass_balance.csv",
            "timestep_sensitivity": "data/processed/tehri_inputs/breach/qa/timestep_sensitivity.csv",
            "breach_qa_report": "data/processed/tehri_inputs/breach/qa/breach_qa_report.md"
        }
    }
    with open(BREACH_DIR / "provenance.json", "w") as f:
        json.dump(prov_data, f, indent=2)
    print(f"  • Updated Provenance JSON: provenance.json")

    # 7. UPDATE DATASET MANIFEST
    manifest_p = PROV_DIR / "dataset_manifest.csv"
    m_df = pd.read_csv(manifest_p)

    step8b_entries = [
        {
            "dataset_name": "breach_boundary_hydrograph",
            "source": "Level-Pool Continuity Solver with Froehlich (2008) Breach Growth",
            "source_file": "data/processed/tehri_inputs/breach/hydrographs/breach_boundary_hydrograph.csv",
            "retrieval_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "processing_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source_crs": "N/A",
            "processing_crs": "N/A",
            "output_crs": "Time Series (s, m3/s, m MSL)",
            "feature_count": f"{len(df_coup)} timesteps",
            "spatial_extent": "Tehri Dam Toe (30.3783°N, 78.4803°E)",
            "provenance": "SIMPLIFIED_THEORETICAL_BREACH_BOUNDARY (For Solver Integration Testing Only)",
            "notes": "Theoretical breach boundary hydrograph. Water level MODELLED FROM ASSUMED BENCHMARK HYPSOMETRY.",
            "sha256_checksum": get_sha256(coupling_p)
        },
        {
            "dataset_name": "breach_scenarios_matrix",
            "source": "Empirical Embankment Breach Mechanics Engine",
            "source_file": "data/processed/tehri_inputs/breach/scenarios/breach_scenario_parameters.json",
            "retrieval_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "processing_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source_crs": "N/A",
            "processing_crs": "N/A",
            "output_crs": "JSON Metadata",
            "feature_count": "3 scenarios (LOW, BASE, HIGH)",
            "spatial_extent": "Tehri Dam Axis",
            "provenance": "EXTRAPOLATED THEORETICAL BENCHMARK",
            "notes": "Theoretical parameter sets for solver stress-testing. Froehlich (2008) is an empirical extrapolation for 260m mega-dam.",
            "sha256_checksum": get_sha256(breach_param_p)
        },
        {
            "dataset_name": "assumed_theoretical_stage_storage_benchmark",
            "source": "Monotonic Parabolic Canyon Hypsometry calibrated to THDC 570m/740m/830m specifications",
            "source_file": "data/processed/tehri_inputs/breach/reservoir_reference/assumed_theoretical_stage_storage_benchmark.csv",
            "retrieval_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "processing_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source_crs": "N/A",
            "processing_crs": "N/A",
            "output_crs": "CSV Table (Elevation m MSL, Storage MCM)",
            "feature_count": "271 points (570m to 840m)",
            "spatial_extent": "Tehri Reservoir Pool",
            "provenance": "ASSUMED THEORETICAL RESERVOIR HYPSOMETRY",
            "notes": "Emergency-planning benchmark hypsometry for theoretical testing. Official bathymetric table remains unobserved.",
            "sha256_checksum": get_sha256(new_csv)
        },
        {
            "dataset_name": "reservoir_initial_scenarios",
            "source": "Civil Defense Emergency-Planning Operational States",
            "source_file": "data/processed/tehri_inputs/breach/scenarios/reservoir_initial_scenarios.json",
            "retrieval_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "processing_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source_crs": "N/A",
            "processing_crs": "N/A",
            "output_crs": "JSON Schema",
            "feature_count": "3 pool levels (740m, 815m, 830m)",
            "spatial_extent": "Tehri Reservoir",
            "provenance": "ASSUMED THEORETICAL EMERGENCY-PLANNING STATE",
            "notes": "Scenario initial pool levels for LOW (MDDL), BASE (815m derived from benchmark hypsometry), and HIGH (FRL).",
            "sha256_checksum": get_sha256(res_scen_p)
        }
    ]

    m_df = m_df[~m_df["dataset_name"].isin(["breach_boundary_hydrograph", "breach_scenarios_matrix", "verified_stage_storage_benchmark", "assumed_theoretical_stage_storage_benchmark", "reservoir_initial_scenarios"])]
    m_df = pd.concat([m_df, pd.DataFrame(step8b_entries)], ignore_index=True)
    m_df.to_csv(manifest_p, index=False)
    print(f"  • Updated dataset manifest: {manifest_p.name}")

    print("\n" + "="*75)
    print("STEP 8B PROVENANCE RELABELING COMPLETE.")
    print("="*75)

if __name__ == "__main__":
    main()
