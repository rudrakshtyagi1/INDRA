with open("frontend/src/App.jsx", "r") as f:
    content = f.read()

content = content.replace("import Infrastructure from './pages/Infrastructure';", "import Exposure from './pages/Exposure';")
content = content.replace("case 'infrastructure': return <Infrastructure />;", "case 'exposure': return <Exposure />;")

with open("frontend/src/App.jsx", "w") as f:
    f.write(content)

with open("frontend/src/layout/NavigationRail.jsx", "r") as f:
    content = f.read()

content = content.replace("id: 'infrastructure'", "id: 'exposure'")
content = content.replace("label: 'Infrastructure'", "label: 'Exposure'")
# We need to make sure ShieldAlert is imported if we use it, but NavigationRail might just use Building2. I'll leave the icon as Building2 or change it.
content = content.replace("Building2", "ShieldAlert")

with open("frontend/src/layout/NavigationRail.jsx", "w") as f:
    f.write(content)
