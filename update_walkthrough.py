import re

with open('/Users/rudrakshtyagi/.gemini/antigravity/brain/5944cbf1-2aca-4100-802a-5975b0d44ff3/walkthrough.md', 'r') as f:
    content = f.read()

implementation_add = """
### Implementation Details
- **Inlet & Resolution Configuration**:
  - particle spacing = 0.5 m
  - The domain was modelled at `COARSE` resolution to ensure rapid integration testing.
  - The numerical inlet injected the Froude-scaled discharge directly via an external velocity distribution (`inlet_velocity.csv`).
- **Execution**:
  - simulation duration = 80 s model scale
  - Docker linux/amd64 CPU execution
  - exit code = 0
"""

content = re.sub(r"### Implementation Details\n.*?\n\n", implementation_add + "\n", content, flags=re.DOTALL)

outputs_add = """
### Outputs & Coupling Files
- 41 BI4 outputs and 41 VTK outputs were successfully generated.
- Complete 3D `.bi4` and `.vtk` datasets were generated per output timeout step.
- The downstream checkpoint flow was successfully captured, aggregated, and explicitly separated into two coupling boundary files:
  - `data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_model_scale.csv`
  - `data/processed/tehri_simulations/dualsphysics/coupling/dualsphysics_to_delft3d_boundary_prototype_equivalent.csv`

*(The prototype-equivalent CSV is the confirmed candidate input for the next prototype-scale Delft3D integration test).*
"""

content = re.sub(r"### Outputs & Coupling Files\n.*?\n\n", outputs_add + "\n", content, flags=re.DOTALL)

# Ensure m3/s instead of m³/s
content = content.replace("m³/s", "m3/s")

with open('/Users/rudrakshtyagi/.gemini/antigravity/brain/5944cbf1-2aca-4100-802a-5975b0d44ff3/walkthrough.md', 'w') as f:
    f.write(content)

print("Walkthrough updated successfully.")
