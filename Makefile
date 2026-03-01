.PHONY: demo up down logs clean

## One-command demo start — all services in parallel
demo:
	@echo "🔍 Starting FraudGraph demo..."
	docker compose up -d
	@echo ""
	@echo "════════════════════════════════════════════════"
	@echo "  FraudGraph is running:"
	@echo ""
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:8000/docs"
	@echo "  Neo4j:     http://localhost:7474 (optional)"
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

## Tail backend + frontend logs
logs:
	docker compose logs -f backend frontend

## Stop all and remove data volumes
clean:
	docker compose down -v
	@echo "All data volumes removed."
