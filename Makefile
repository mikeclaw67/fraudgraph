.PHONY: demo up down seed logs clean

## One-command demo start: infrastructure → seed → backend + frontend
demo:
	@echo "🔍 Starting FraudGraph demo..."
	@echo ""
	@echo "Step 1/3: Starting infrastructure (PostgreSQL, Neo4j, Redis)..."
	docker compose up -d postgres neo4j redis
	@echo "Waiting for databases to be healthy..."
	@sleep 5
	@echo ""
	@echo "Step 2/3: Seeding demo data..."
	docker compose up seed
	@echo ""
	@echo "Step 3/3: Starting backend + frontend..."
	docker compose up -d backend frontend
	@echo ""
	@echo "════════════════════════════════════════════════"
	@echo "  FraudGraph is running:"
	@echo ""
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:8000/docs"
	@echo "  Neo4j:     http://localhost:7474"
	@echo ""
	@echo "  Stop:      make down"
	@echo "  Logs:      make logs"
	@echo "  Reset:     make clean"
	@echo "════════════════════════════════════════════════"

## Start all services
up:
	docker compose up -d

## Stop all services
down:
	docker compose down

## Run seed container (re-seed demo data)
seed:
	docker compose run --rm seed

## Tail backend + frontend logs
logs:
	docker compose logs -f backend frontend

## Stop all and remove data volumes
clean:
	docker compose down -v
	@echo "All data volumes removed."
