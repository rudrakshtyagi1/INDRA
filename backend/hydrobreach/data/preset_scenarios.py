"""
HydroBreach - Real Indian River and Dam Benchmark Preset Scenarios
Primary Benchmark: Tehri Dam on the Bhagirathi River (Uttarakhand)
Calibrated with real geographic coordinates, valley slope geometry,
reservoir capacity, and observed/modeled hydrological parameters.
"""

from typing import Dict, Any, List, Optional


INDIAN_PRESET_SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "tehri_dam_bhagirathi",
        "name": "Tehri Dam (Bhagirathi River, Uttarakhand)",
        "river": "Bhagirathi River / Upper Ganga Basin",
        "state": "Uttarakhand (Tehri Garhwal / Pauri / Dehradun / Haridwar)",
        "lat": 30.378,
        "lon": 78.481,
        "dam_type": "rockfill",
        "breach_mode": "overtopping",
        "dam_height_m": 260.5,
        "reservoir_volume_m3": 3540000000.0,  # 3.54 billion m³ (3,540 Mm³)
        "hydraulic_head_m": 260.0,
        "crest_length_m": 575.0,
        "reach_length_km": 100.0,  # From Tehri down to Haridwar
        "valley_width_m": 450.0,
        "bed_slope": 0.0055,  # 630m to 290m over 100km
        "manning_n": 0.042,   # Steep boulder gorge in Bhagirathi, transitioning to gravel/alluvial at Haridwar
        "valley_type": "mountain_gorge",
        "historical_event": False,
        "description": "Comprehensive simulation of extreme overtopping and progressive piping breach on Tehri Dam (260.5m, highest earth & rockfill dam in India). Outflow flood waves propagate along the Bhagirathi river through Koteshwar Dam, the Devprayag confluence, Rishikesh pilgrim centers, and the densely populated Haridwar plains.",
        "dam_specifications": {
            "operator": "THDC India Limited",
            "river_basin": "Bhagirathi / Ganga River Basin",
            "dam_type": "Zoned Earth & Rockfill Embankment",
            "structural_height_m": 260.5,
            "hydraulic_head_at_frl_m": 260.0,
            "crest_elevation_msl": 839.5,
            "full_reservoir_level_frl_msl": 830.0,
            "minimum_drawdown_level_mddl_msl": 740.0,
            "river_bed_elevation_msl": 570.0,
            "crest_length_m": 575.0,
            "crest_width_m": 20.0,
            "base_width_m": 1128.0,
            "gross_storage_capacity_m3": 3540000000.0,
            "live_storage_capacity_m3": 2615000000.0,
            "installed_hydropower_capacity_mw": 2400.0,
        },
        "downstream_river_stations": [
            {
                "id": "tehri_axis",
                "name": "Tehri Dam Axis",
                "chainage_km": 0.0,
                "lat": 30.3780,
                "lon": 78.4810,
                "elevation_msl": 570.0,
                "expected_arrival_min": 0.0,
                "estimated_peak_depth_m": 68.5,
                "critical_assets": "Dam Crest, Chute Spillway, Underground Powerhouse"
            },
            {
                "id": "koteshwar_dam",
                "name": "Koteshwar Dam & Reservoir (THDC)",
                "chainage_km": 22.0,
                "lat": 30.2830,
                "lon": 78.5040,
                "elevation_msl": 515.0,
                "expected_arrival_min": 32.0,
                "estimated_peak_depth_m": 42.0,
                "critical_assets": "97.5m Concrete Gravity Dam, 400 MW Hydropower Plant"
            },
            {
                "id": "devprayag_confluence",
                "name": "Devprayag (Bhagirathi + Alaknanda -> Holy Ganga)",
                "chainage_km": 42.0,
                "lat": 30.1460,
                "lon": 78.5980,
                "elevation_msl": 460.0,
                "expected_arrival_min": 68.0,
                "estimated_peak_depth_m": 28.5,
                "critical_assets": "Raghunathji Temple Ghats, Sangam Bridges, NH-58 Highway"
            },
            {
                "id": "shivpuri_gorge",
                "name": "Shivpuri Whitewater Gorge",
                "chainage_km": 62.0,
                "lat": 30.1130,
                "lon": 78.3960,
                "elevation_msl": 370.0,
                "expected_arrival_min": 92.0,
                "estimated_peak_depth_m": 22.0,
                "critical_assets": "River Rafting Hubs, Eco-tourism Camps, Suspension Footbridges"
            },
            {
                "id": "rishikesh_town",
                "name": "Rishikesh (Laxman Jhula / Triveni Ghat)",
                "chainage_km": 78.0,
                "lat": 30.0860,
                "lon": 78.2670,
                "elevation_msl": 340.0,
                "expected_arrival_min": 118.0,
                "estimated_peak_depth_m": 15.2,
                "critical_assets": "Laxman Jhula, Ram Jhula, Triveni Ghat, AIIMS Rishikesh, Railway Station"
            },
            {
                "id": "haridwar_plains",
                "name": "Haridwar (Har Ki Pauri & Bhimgoda Barrage)",
                "chainage_km": 100.0,
                "lat": 29.9450,
                "lon": 78.1640,
                "elevation_msl": 290.0,
                "expected_arrival_min": 175.0,
                "estimated_peak_depth_m": 9.4,
                "critical_assets": "Har Ki Pauri Ghats, Bhimgoda Barrage, Upper Ganga Canal Headworks, BHEL Industrial Complex"
            }
        ],
        "district_exposure_profile": {
            "districts_impacted": ["Tehri Garhwal", "Pauri Garhwal", "Dehradun", "Haridwar"],
            "total_population_at_risk": 284000,
            "high_risk_floodplain_dwellers": 118000,
            "critical_infra_count": 48,
            "major_highways": ["NH-58 (Rishikesh-Badrinath)", "NH-94 (Rishikesh-Yamunotri)", "NH-74"],
            "ndrf_response_nodes": [
                {"battalion": "8th Battalion NDRF (Ghaziabad / Jolly Grant Regional Response Centre)", "response_time_hrs": 1.5},
                {"battalion": "SDRF Uttarakhand (Jolly Grant Headquarters)", "response_time_hrs": 0.8},
                {"battalion": "Indian Army Central Command (Raiwala Military Station)", "response_time_hrs": 0.5}
            ]
        }
    },
    {
        "id": "rishi_ganga_2021",
        "name": "Rishi Ganga & Dhauliganga (Uttarakhand 2021 Disaster)",
        "river": "Rishi Ganga / Dhauliganga",
        "state": "Uttarakhand (Chamoli District)",
        "lat": 30.485,
        "lon": 79.738,
        "dam_type": "landslide_dam",
        "breach_mode": "landslide_outburst",
        "dam_height_m": 35.0,
        "reservoir_volume_m3": 5400000.0,  # 5.4 million m³
        "hydraulic_head_m": 32.0,
        "crest_length_m": 120.0,
        "reach_length_km": 25.0,
        "valley_width_m": 120.0,
        "bed_slope": 0.032,
        "manning_n": 0.055,
        "valley_type": "mountain_gorge",
        "historical_event": True,
        "description": "On 7 Feb 2021, a rock and ice avalanche triggered a massive debris surge and landslide dam breach along the Rishi Ganga river, devastating Raini village and the Tapovan Vishnugad HEP.",
        "key_impact_locations": [
            {"name": "Raini Village Bailey Bridge", "distance_km": 6.8, "observed_arrival_min": 12.0},
            {"name": "Tapovan Vishnugad HEP Barrage (NTPC)", "distance_km": 15.2, "observed_arrival_min": 26.0},
            {"name": "Vishnuprayag Confluence", "distance_km": 24.0, "observed_arrival_min": 42.0}
        ]
    },
    {
        "id": "bhakra_dam_sutlej",
        "name": "Bhakra Dam (Sutlej River, HP / Punjab)",
        "river": "Sutlej River",
        "state": "Himachal Pradesh / Punjab",
        "lat": 31.412,
        "lon": 76.435,
        "dam_type": "concrete_gravity",
        "breach_mode": "instantaneous",
        "dam_height_m": 226.0,
        "reservoir_volume_m3": 9620000000.0,  # 9,620 million m³
        "hydraulic_head_m": 210.0,
        "crest_length_m": 518.0,
        "reach_length_km": 60.0,
        "valley_width_m": 800.0,
        "bed_slope": 0.0025,
        "manning_n": 0.035,
        "valley_type": "semi_urban",
        "historical_event": False,
        "description": "Hypothetical catastrophic breach scenario of India's second tallest concrete gravity dam on the Sutlej river, propagating downstream through Nangal, Anandpur Sahib, and Ropar.",
        "key_impact_locations": [
            {"name": "Nangal Barrage & Township", "distance_km": 12.5, "observed_arrival_min": 18.0},
            {"name": "Anandpur Sahib Religious Complex", "distance_km": 28.0, "observed_arrival_min": 45.0},
            {"name": "Rupnagar (Ropar) Headworks", "distance_km": 54.0, "observed_arrival_min": 92.0}
        ]
    },
    {
        "id": "hirakud_dam_mahanadi",
        "name": "Hirakud Dam (Mahanadi River, Odisha)",
        "river": "Mahanadi River",
        "state": "Odisha",
        "lat": 21.530,
        "lon": 83.870,
        "dam_type": "earthen",
        "breach_mode": "overtopping",
        "dam_height_m": 60.96,
        "reservoir_volume_m3": 5896000000.0,  # 5,896 million m³
        "hydraulic_head_m": 55.0,
        "crest_length_m": 4800.0,
        "reach_length_km": 50.0,
        "valley_width_m": 2200.0,
        "bed_slope": 0.0012,
        "manning_n": 0.032,
        "valley_type": "plains_alluvial",
        "historical_event": False,
        "description": "Massive flood wave and spillway failure simulation on the longest earthen dam in the world, inundating the Mahanadi alluvial floodplain towards Sambalpur.",
        "key_impact_locations": [
            {"name": "Sambalpur City", "distance_km": 14.0, "observed_arrival_min": 28.0},
            {"name": "Burla Industrial Zone", "distance_km": 8.0, "observed_arrival_min": 16.0},
            {"name": "Sonepur Floodplain", "distance_km": 45.0, "observed_arrival_min": 105.0}
        ]
    }
]


def get_preset_by_id(preset_id: str) -> Optional[Dict[str, Any]]:
    """Fetches preset configuration by identifier."""
    for p in INDIAN_PRESET_SCENARIOS:
        if p["id"] == preset_id:
            return p
    return INDIAN_PRESET_SCENARIOS[0]
