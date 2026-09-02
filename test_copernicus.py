import requests
import sys

client_id = "sh-091d8855-726c-4d6f-a766-2c00895489a7"
client_secret = "xSootttHjMsV0K3qOhzdhaka8pZGSSfpQ"

token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
data = {
    "grant_type": "client_credentials",
    "client_id": client_id,
    "client_secret": client_secret
}

resp = requests.post(token_url, data=data)
if resp.status_code == 200:
    print("COPERNICUS_AUTH=PASS")
else:
    print(f"COPERNICUS_AUTH=FAIL. HTTP {resp.status_code}: {resp.text}")
