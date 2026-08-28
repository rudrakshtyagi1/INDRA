"""
Coordinate Reference System utilities.
"""
import math

WGS84_EPSG = 4326
UTM44N_EPSG = 32644  # Uttarakhand UTM Zone 44N


def degrees_to_metres_lat(degrees: float) -> float:
    """Approximate distance in metres for a difference in latitude."""
    return degrees * 111132.954


def degrees_to_metres_lon(degrees: float, lat: float) -> float:
    """Approximate distance in metres for a difference in longitude at given latitude."""
    return degrees * 111412.84 * math.cos(math.radians(lat))


def bbox_area_km2(bbox: tuple[float, float, float, float]) -> float:
    """
    Compute approximate area of bounding box (min_lon, min_lat, max_lon, max_lat) in km².
    """
    min_lon, min_lat, max_lon, max_lat = bbox
    mean_lat = (min_lat + max_lat) / 2.0
    dx_km = degrees_to_metres_lon(max_lon - min_lon, mean_lat) / 1000.0
    dy_km = degrees_to_metres_lat(max_lat - min_lat) / 1000.0
    return abs(dx_km * dy_km)
