with open('docker-compose.yml', 'r') as f:
    content = f.read()

content = content.replace(
    'test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen(\\"http://localhost:8000/health\\")"]',
    'test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen(\'http://localhost:8000/health\')"]'
)

with open('docker-compose.yml', 'w') as f:
    f.write(content)
