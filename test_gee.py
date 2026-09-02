import ee

try:
    ee.Initialize(project='gen-lang-client-0165494077')
    print("GEE_AUTH=PASS")
except Exception as e:
    print("GEE_AUTH=FAIL", str(e))
