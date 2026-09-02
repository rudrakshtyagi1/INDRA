import re

with open("frontend/src/pages/Overview.jsx", "r") as f:
    content = f.read()

# Replace the text
old_text = "Study Domain: 145 km • Grid: 30 m"
new_text = """Study corridor: ~145 km &bull; V3 hydrodynamic domain: 15 km &bull; Grid resolution: 30 m &bull; Simulation window: 800 s"""
content = content.replace(old_text, new_text)

with open("frontend/src/pages/Overview.jsx", "w") as f:
    f.write(content)

