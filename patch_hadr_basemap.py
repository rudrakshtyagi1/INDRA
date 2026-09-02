import re

with open("frontend/src/pages/HADRDashboard.jsx", "r") as f:
    content = f.read()

# 1. Update Basemap
basemap_old = "L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {"
basemap_new = "L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {"
content = content.replace(basemap_old, basemap_new)

with open("frontend/src/pages/HADRDashboard.jsx", "w") as f:
    f.write(content)

