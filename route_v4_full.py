import json
import networkx as nx
import math
import os
import sqlite3

# We will read edges from the raw GPKG using sqlite3 for speed since we don't have osgeo on host,
# wait, the host doesn't have osgeo, but we can run this inside the floodlab_backend container which has osgeo, geopandas, osmnx!
