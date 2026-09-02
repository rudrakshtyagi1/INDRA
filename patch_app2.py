import re

with open("frontend/src/App.jsx", "r") as f:
    content = f.read()

# Replace ScenarioComparison import with ScenariosWorkspace
content = content.replace("import ScenarioComparison from './pages/ScenarioComparison';", "import ScenariosWorkspace from './pages/ScenariosWorkspace';\nimport ScenarioComparison from './pages/ScenarioComparison';")

# Change the case mapping
content = content.replace("case 'scenarios': return <ScenarioComparison />;", "case 'scenarios': return <ScenariosWorkspace onNavigate={setActiveTab} />;\n      case 'comparison': return <ScenarioComparison />;")

with open("frontend/src/App.jsx", "w") as f:
    f.write(content)

