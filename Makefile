.PHONY: setup-backend run-backend run-frontend test test-unit test-integration build-frontend clean

setup-backend:
	cd backend && pip install -r requirements.txt

run-backend:
	cd backend && uvicorn floodlab.api.main:app --reload --port 8000

run-frontend:
	cd frontend && npm run dev

test:
	cd backend && python3 -m pytest tests/ -v

test-unit:
	cd backend && python3 -m pytest tests/unit/ -v

test-integration:
	cd backend && python3 -m pytest tests/integration/ -v

build-frontend:
	cd frontend && npm run build

clean:
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; true
	rm -rf frontend/dist frontend/node_modules/.vite 2>/dev/null; true
