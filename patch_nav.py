import re

def replace_in_file(file, old, new):
    with open(file, 'r') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(file, 'w') as f:
        f.write(content)

replace_in_file("frontend/src/layout/NavigationRail.jsx", "id: 'infrastructure', label: 'Infrastructure'", "id: 'exposure', label: 'Exposure'")
replace_in_file("frontend/src/layout/NavigationRail.jsx", "icon: <Building2", "icon: <ShieldAlert")

replace_in_file("frontend/src/App.jsx", "import yot from \"./pages/Infrastructure.jsx\";", "")
replace_in_file("frontend/src/App.jsx", "case \"infrastructure\":\n      return /* @__PURE__ */ dt.jsx(yot, {});", "case \"exposure\":\n      return /* @__PURE__ */ dt.jsx(Exposure, {});")
# Wait, App.jsx was already compiled or is it raw? 
# The user's App.jsx in the src/ is raw React code, but the grep output in my history was from dist!
