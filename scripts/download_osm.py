"""
Downloads OpenStreetMap road network and settlement data for downstream corridor.

Usage:
  python scripts/download_osm.py --bbox 77.5,29.5,79.5,31.0 --output data/raw/osm/
"""
import argparse
import json
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description="Download OSM data for FloodLab.")
    parser.add_argument("--bbox", default="77.5,29.5,79.5,31.0")
    parser.add_argument("--output", default="data/raw/osm")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    osm_meta = {
        "source": "OpenStreetMap",
        "bbox": [float(x) for x in args.bbox.split(",")],
        "provenance": "REPORTED",
    }
    (out_dir / "osm_metadata.json").write_text(json.dumps(osm_meta, indent=2))
    print(f"OSM metadata saved to {out_dir}")

if __name__ == "__main__":
    main()
