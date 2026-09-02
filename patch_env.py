import re

with open("backend/.env", "r") as f:
    content = f.read()

# Replace placeholders
content = re.sub(r'GEE_PROJECT_ID=.*', 'GEE_PROJECT_ID=gen-lang-client-0165494077', content)
content = re.sub(r'COPERNICUS_CLIENT_ID=.*', 'COPERNICUS_CLIENT_ID=sh-091d8855-726c-4d6f-a766-2c00895489a7', content)
content = re.sub(r'COPERNICUS_CLIENT_SECRET=.*', 'COPERNICUS_CLIENT_SECRET=xSoottHjMsV0K3qOhzdhaka8pZGSSfpQ', content)

with open("backend/.env", "w") as f:
    f.write(content)
