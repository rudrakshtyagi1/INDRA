import ee
import os

try:
    ee.Initialize(project='gen-lang-client-0165494077')
    print("GEE_AUTH=PASS")
except Exception as e:
    print(f"GEE_AUTH=FAIL. Exception: {e}")
