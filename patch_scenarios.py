with open("backend/floodlab/api/routers/scenarios.py", "r") as f:
    lines = f.readlines()
with open("backend/floodlab/api/routers/scenarios.py", "w") as f:
    for line in lines:
        if line.strip() == "def":
            continue
        f.write(line)
