.PHONY: install backend frontend dev start clean

install:
	@echo "Installing backend dependencies..."
	cd ../backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

backend:
	cd ../backend && uvicorn main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	@echo "Start backend in one terminal:   cd backend && uvicorn main:app --reload --port 8000"
	@echo "Start frontend in another:       cd frontend && npm run dev"
	@echo "Open http://localhost:3000"

start:
	cd ../backend && uvicorn main:app --port 8000 &
	cd frontend && npm run dev

clean:
	rm -rf ../backend/__pycache__ ../backend/uploads
	rm -rf frontend/node_modules frontend/.next
