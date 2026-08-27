"""
HydroBreach - Multi-Format Geospatial Exporter Engine
Generates:
1. ESRI Shapefile Package (.shp, .shx, .dbf, .prj packaged into .zip)
2. Google Earth KML / KMZ (.kml with 3D polygon extrusions and hazard styling)
3. GeoJSON FeatureCollections
4. HADR Disaster Damage Situation Reports (CSV & JSON)
"""

import io
import os
import math
import zipfile
import shapefile
from typing import Dict, Any, List, Optional, Tuple


# Authentic high-resolution polyline coordinates for the Bhagirathi & Ganga river corridor from Tehri Dam to Haridwar
TEHRI_BHAGIRATHI_RIVER_PATH: List[Tuple[float, float]] = [
    (78.4810, 30.3780), # Tehri Dam Axis (0 km)
    (78.4880, 30.3450), # Bhagirathi gorge bend
    (78.5040, 30.2830), # Koteshwar Dam (22 km)
    (78.5200, 30.2450), # Below Koteshwar tailrace
    (78.5420, 30.2100), # Chham village reach
    (78.5720, 30.1750), # Approaching Devprayag
    (78.5980, 30.1460), # Devprayag Confluence (Bhagirathi + Alaknanda) (42 km)
    (78.5600, 30.1320), # Ganga gorge below Devprayag
    (78.4900, 30.1180), # Byasi / Kaudiyala
    (78.4350, 30.1080), # Marine Drive rapids
    (78.3960, 30.1130), # Shivpuri Gorge (62 km)
    (78.3550, 30.1280), # Brahmpuri
    (78.3250, 30.1260), # Tapovan / Muni Ki Reti
    (78.2980, 30.1050), # Laxman Jhula & Ram Jhula
    (78.2670, 30.0860), # Rishikesh Triveni Ghat (78 km)
    (78.2450, 30.0520), # Pashulok Barrage / Chilla canal intake
    (78.2200, 30.0100), # Raiwala army area
    (78.1920, 29.9800), # Motichur / Rajaji National Park corridor
    (78.1640, 29.9450), # Haridwar Har Ki Pauri & Bhimgoda Barrage (100 km)
    (78.1450, 29.9150), # Kankhal heritage ghats
    (78.1280, 29.8800), # Upper Ganga Canal floodplain
]


class GeospatialExporter:
    """Exports flood simulation results into standard GIS formats."""

    @classmethod
    def generate_geojson(
        cls,
        scenario_name: str,
        dam_coords: Tuple[float, float], # (lat, lon)
        reach_length_km: float,
        inundation_width_m: float = 800.0,
        hazard_zones: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generates authentic GeoJSON polygon features representing the flood inundation
        envelope and HADR hazard zones along the Bhagirathi/Ganga River corridor.
        """
        dam_lat, dam_lon = dam_coords
        features = []

        # 1. Dam Axis Point Feature
        features.append({
            "type": "Feature",
            "properties": {
                "name": f"{scenario_name} - Dam Axis",
                "feature_type": "Dam / Breach Origin",
                "latitude": dam_lat,
                "longitude": dam_lon,
                "dam_height_m": 260.5,
                "structure": "Earth & Rockfill Embankment",
                "river": "Bhagirathi River"
            },
            "geometry": {
                "type": "Point",
                "coordinates": [round(dam_lon, 5), round(dam_lat, 5)]
            }
        })

        # 2. Key Monitoring Stations along River Reach
        stations = [
            {"name": "Tehri Dam Axis (0 km)", "coords": [78.4810, 30.3780], "depth_m": 68.5, "arr_min": 0.0},
            {"name": "Koteshwar Dam (22 km)", "coords": [78.5040, 30.2830], "depth_m": 42.0, "arr_min": 32.0},
            {"name": "Devprayag Confluence (42 km)", "coords": [78.5980, 30.1460], "depth_m": 28.5, "arr_min": 68.0},
            {"name": "Shivpuri Gorge (62 km)", "coords": [78.3960, 30.1130], "depth_m": 22.0, "arr_min": 92.0},
            {"name": "Rishikesh Laxman Jhula (78 km)", "coords": [78.2670, 30.0860], "depth_m": 15.2, "arr_min": 118.0},
            {"name": "Haridwar Har Ki Pauri (100 km)", "coords": [78.1640, 29.9450], "depth_m": 9.4, "arr_min": 175.0},
        ]

        for st in stations:
            features.append({
                "type": "Feature",
                "properties": {
                    "station_name": st["name"],
                    "feature_type": "Hydrodynamic Monitoring Station",
                    "peak_water_depth_m": st["depth_m"],
                    "surge_arrival_time_min": st["arr_min"]
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": st["coords"]
                }
            })

        # 3. Authentic Hazard Zone Polygons along Bhagirathi path
        # Generate 3 buffer zones (Red: Extreme, Orange: High, Yellow: Moderate)
        path = TEHRI_BHAGIRATHI_RIVER_PATH

        zones_meta = [
            {"name": "RED ZONE: Extreme Hazard / Immediate Evacuation", "start_idx": 0, "end_idx": 7, "width_km": 0.6, "color": "#ef4444", "hazard": "EXTREME", "lead_time": "< 45 min"},
            {"name": "ORANGE ZONE: High Hazard / Shelter Relocation", "start_idx": 6, "end_idx": 15, "width_km": 1.1, "color": "#f97316", "hazard": "HIGH", "lead_time": "45 - 120 min"},
            {"name": "YELLOW ZONE: Moderate Hazard / Alluvial Floodplain", "start_idx": 14, "end_idx": len(path)-1, "width_km": 2.2, "color": "#eab308", "hazard": "MODERATE", "lead_time": "120 - 240 min"}
        ]

        for z in zones_meta:
            sub_path = path[z["start_idx"]:z["end_idx"]+1]
            left_bank = []
            right_bank = []
            width_deg = z["width_km"] / 111.0

            for i in range(len(sub_path)):
                lon, lat = sub_path[i]
                # Tangent / normal vector
                if i < len(sub_path) - 1:
                    dlon = sub_path[i+1][0] - lon
                    dlat = sub_path[i+1][1] - lat
                else:
                    dlon = lon - sub_path[i-1][0]
                    dlat = lat - sub_path[i-1][1]

                mag = math.sqrt(dlon**2 + dlat**2) + 1e-6
                nx = -dlat / mag
                ny = dlon / mag

                # Offset perpendicular to river flow
                left_bank.append([round(lon + nx * width_deg * 0.5, 5), round(lat + ny * width_deg * 0.5, 5)])
                right_bank.append([round(lon - nx * width_deg * 0.5, 5), round(lat - ny * width_deg * 0.5, 5)])

            # Polygon loop
            poly_coords = left_bank + right_bank[::-1] + [left_bank[0]]

            features.append({
                "type": "Feature",
                "properties": {
                    "scenario": scenario_name,
                    "zone_name": z["name"],
                    "hazard_rating": z["hazard"],
                    "lead_time": z["lead_time"],
                    "river_basin": "Bhagirathi - Ganga Corridor",
                    "color": z["color"],
                    "fill_opacity": 0.55
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly_coords]
                }
            })

        return {
            "type": "FeatureCollection",
            "name": f"HydroBreach_Tehri_Bhagirathi_Inundation",
            "features": features
        }

    @classmethod
    def generate_kml(cls, geojson_data: Dict[str, Any]) -> str:
        """
        Generates standard OGC KML 2.2 XML with 3D styled polygon styling for Google Earth.
        """
        name = geojson_data.get("name", "Tehri Dam Inundation Extent")
        features = geojson_data.get("features", [])

        kml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<kml xmlns="http://www.opengis.net/kml/2.2">',
            '  <Document>',
            f'    <name>{name}</name>',
            '    <description>Tehri Dam Break &amp; Bhagirathi Flash Flood Simulation (HADR Framework)</description>',
            '    <!-- Styles -->',
            '    <Style id="redZoneStyle">',
            '      <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>',
            '      <PolyStyle><color>7f0000ff</color><fill>1</fill><outline>1</outline></PolyStyle>',
            '    </Style>',
            '    <Style id="orangeZoneStyle">',
            '      <LineStyle><color>ff00a5ff</color><width>2</width></LineStyle>',
            '      <PolyStyle><color>7f00a5ff</color><fill>1</fill><outline>1</outline></PolyStyle>',
            '    </Style>',
            '    <Style id="yellowZoneStyle">',
            '      <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>',
            '      <PolyStyle><color>7f00ffff</color><fill>1</fill><outline>1</outline></PolyStyle>',
            '    </Style>',
            '    <Style id="damPointStyle">',
            '      <IconStyle><scale>1.3</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/caution.png</href></Icon></IconStyle>',
            '    </Style>',
            '    <Style id="gaugePointStyle">',
            '      <IconStyle><scale>1.0</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle>',
            '    </Style>'
        ]

        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            f_name = props.get("name") or props.get("station_name") or props.get("zone_name", "Flood Hazard Area")
            f_hazard = props.get("hazard_rating", "N/A")

            if geom.get("type") == "Point":
                coords = geom.get("coordinates", [0, 0])
                style_url = "#damPointStyle" if "Dam" in f_name else "#gaugePointStyle"
                kml_lines.extend([
                    '    <Placemark>',
                    f'      <name>{f_name}</name>',
                    f'      <description><![CDATA[<b>Peak Depth:</b> {props.get("peak_water_depth_m", "N/A")} m<br/><b>Arrival Time:</b> {props.get("surge_arrival_time_min", "0")} min]]></description>',
                    f'      <styleUrl>{style_url}</styleUrl>',
                    '      <Point>',
                    f'        <coordinates>{coords[0]},{coords[1]},10</coordinates>',
                    '      </Point>',
                    '    </Placemark>'
                ])
            elif geom.get("type") == "Polygon":
                style_url = "#redZoneStyle" if "RED" in f_name else ("#orangeZoneStyle" if "ORANGE" in f_name else "#yellowZoneStyle")
                coords_list = geom.get("coordinates", [[]])[0]
                coord_str = " ".join([f"{c[0]},{c[1]},25" for c in coords_list])

                kml_lines.extend([
                    '    <Placemark>',
                    f'      <name>{f_name}</name>',
                    f'      <description><![CDATA[<b>Hazard Level:</b> {f_hazard}<br/><b>Evacuation Lead Time:</b> {props.get("lead_time", "N/A")}<br/><b>River Reach:</b> Bhagirathi to Ganga Corridor]]></description>',
                    f'      <styleUrl>{style_url}</styleUrl>',
                    '      <Polygon>',
                    '        <extrude>1</extrude>',
                    '        <altitudeMode>relativeToGround</altitudeMode>',
                    '        <outerBoundaryIs>',
                    '          <LinearRing>',
                    f'            <coordinates>{coord_str}</coordinates>',
                    '          </LinearRing>',
                    '        </outerBoundaryIs>',
                    '      </Polygon>',
                    '    </Placemark>'
                ])

        kml_lines.extend([
            '  </Document>',
            '</kml>'
        ])

        return "\n".join(kml_lines)

    @classmethod
    def generate_shapefile_zip(cls, geojson_data: Dict[str, Any]) -> bytes:
        """
        Generates standard ESRI Shapefile package (.shp, .shx, .dbf, .prj)
        compressed into an in-memory ZIP byte buffer.
        """
        zip_buf = io.BytesIO()
        features = [f for f in geojson_data.get("features", []) if f.get("geometry", {}).get("type") == "Polygon"]

        shp_io = io.BytesIO()
        shx_io = io.BytesIO()
        dbf_io = io.BytesIO()

        with shapefile.Writer(shp=shp_io, shx=shx_io, dbf=dbf_io) as w:
            w.field("SCENARIO", "C", size=50)
            w.field("ZONE_NAME", "C", size=60)
            w.field("HAZARD", "C", size=20)
            w.field("LEAD_TIME", "C", size=20)
            w.field("RIVER", "C", size=30)

            for feat in features:
                props = feat.get("properties", {})
                coords = feat.get("geometry", {}).get("coordinates", [[]])[0]
                w.poly([coords])
                w.record(
                    SCENARIO=str(props.get("scenario", "Tehri_Dam_Breach"))[:50],
                    ZONE_NAME=str(props.get("zone_name", "Hazard Zone"))[:60],
                    HAZARD=str(props.get("hazard_rating", "EXTREME"))[:20],
                    LEAD_TIME=str(props.get("lead_time", "< 45 min"))[:20],
                    RIVER=str(props.get("river_basin", "Bhagirathi"))[:30]
                )

        prj_content = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]'

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("tehri_bhagirathi_inundation.shp", shp_io.getvalue())
            zf.writestr("tehri_bhagirathi_inundation.shx", shx_io.getvalue())
            zf.writestr("tehri_bhagirathi_inundation.dbf", dbf_io.getvalue())
            zf.writestr("tehri_bhagirathi_inundation.prj", prj_content)

        zip_buf.seek(0)
        return zip_buf.getvalue()

    @classmethod
    def generate_hadr_situation_report_csv(cls, damage_data: Dict[str, Any]) -> str:
        """Generates tabulated HADR Disaster Impact Summary in CSV format for Tehri Dam scenario."""
        exp = damage_data.get("exposure_and_loss", {})
        haz = damage_data.get("hazard_metrics", {})
        res = damage_data.get("resource_allocation", {})

        csv_lines = [
            "NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA) & UTTARAKHAND SDMA",
            "TEHRI DAM BREACH & BHAGIRATHI FLASH FLOOD HADR SITUATION REPORT",
            f"Dam Name,Tehri Dam (260.5m Earth & Rockfill Embankment)",
            f"River Basin,Bhagirathi River down to Rishikesh & Haridwar (100 km reach)",
            f"Reservoir Volume at Failure,3.54 Billion Cubic Meters (3540 Mm3)",
            "",
            "HYDRODYNAMIC HAZARD METRICS",
            f"Hazard Level,{haz.get('hazard_level', 'EXTREME')}",
            f"Hazard Rating (HR),{haz.get('hazard_rating_hr', 2.85)}",
            f"Max Breach Flood Depth (m),{haz.get('max_flood_depth_m', 68.5)}",
            f"Peak Wave Velocity (m/s),{haz.get('peak_velocity_ms', 24.2)}",
            "",
            "DISTRICT-WISE EXPOSURE AND LOSS ESTIMATES",
            f"Impacted Districts,Tehri Garhwal | Pauri Garhwal | Dehradun | Haridwar",
            f"Total Population at Risk,{exp.get('population_at_risk', 284000)}",
            f"Estimated Displaced Persons,{exp.get('displaced_persons', 198000)}",
            f"Total Structures Exposed,{exp.get('total_buildings_exposed', 42000)}",
            f"Destroyed Structures,{exp.get('destroyed_structures', 24500)}",
            f"Submerged Structures,{exp.get('submerged_structures', 17500)}",
            f"Inundated Agricultural Land (ha),{exp.get('inundated_agricultural_ha', 4850.0)}",
            f"Total Estimated Economic Loss (INR Crores),{exp.get('total_economic_loss_crores_inr', 4820.0)}",
            "",
            "EMERGENCY HADR LOGISTICS ALLOCATION",
            f"Inflatable Rescue Motorboats Required,{res.get('inflatable_rescue_boats', 120)}",
            f"NDRF & SDRF Battalions Mobilized,{res.get('ndrf_sdrf_battalions', 8)}",
            f"Designated Emergency Relief Shelters,{res.get('emergency_relief_shelters', 45)}",
            f"Food and Drinking Water Packets / Day,{res.get('food_water_packets_per_day', 594000)}",
            f"Air Evacuation Helipads (IAF / Army Aviation),{res.get('air_evacuation_helipads_needed', 6)}"
        ]

        return "\n".join(csv_lines)
