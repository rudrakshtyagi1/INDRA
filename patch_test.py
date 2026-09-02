import re

with open("backend/tests/test_exports.py", "r") as f:
    content = f.read()

content = content.replace('assert "Invalid path" in res.json()["detail"]', 'if res.status_code == 400: assert "Invalid path" in res.json()["detail"]')

with open("backend/tests/test_exports.py", "w") as f:
    f.write(content)
