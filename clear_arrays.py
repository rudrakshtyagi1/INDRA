import re

# Clear INFRA
with open('frontend/src/data/prototype/tehriInfrastructure.js', 'r') as f:
    text = f.read()
text = re.sub(r'export const PROTOTYPE_INFRASTRUCTURE = \[.*?\];', 'export const PROTOTYPE_INFRASTRUCTURE = [];', text, flags=re.DOTALL)
with open('frontend/src/data/prototype/tehriInfrastructure.js', 'w') as f:
    f.write(text)

# Clear SETTLEMENTS
with open('frontend/src/data/prototype/tehriPrototypeSettlements.js', 'r') as f:
    text = f.read()
text = re.sub(r'export const PROTOTYPE_SETTLEMENTS = \[.*?\];', 'export const PROTOTYPE_SETTLEMENTS = [];', text, flags=re.DOTALL)
with open('frontend/src/data/prototype/tehriPrototypeSettlements.js', 'w') as f:
    f.write(text)

