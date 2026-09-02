import re

with open('frontend/src/data/prototype/tehriDomainConfig.js', 'r') as f:
    content = f.read()

content = content.replace("PRECOMPUTED PROTOTYPE", "WHAT-IF HYDRODYNAMIC BENCHMARK")
content = content.replace("PROTOTYPE_STUDY_CUTOFF", "WHAT-IF_STUDY_CUTOFF")
content = content.replace("PROTOTYPE STUDY DOMAIN BOUNDARY", "STUDY CORRIDOR BOUNDARY")

new_summary = "STUDY CORRIDOR: 0–100 km Bhagirathi corridor | V3 MODEL DOMAIN: 15 km | SIMULATION WINDOW: 800 s | MODELLED WAVE REACH WITHIN CURRENT RUN: approximately 8–9 km"
content = re.sub(r"corridorSummary: '.*?',", f"corridorSummary: '{new_summary}',", content)

with open('frontend/src/data/prototype/tehriDomainConfig.js', 'w') as f:
    f.write(content)
