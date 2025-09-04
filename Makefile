# Yahuti Trade Engine - Development Commands

.PHONY: help dev build start stop clean test lint type-check migrate seed docker-up docker-down deploy-web deploy-api deploy-worker

# Default target
help:
	@echo "Yahuti Trade Engine™ - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start all services in development mode"
	@echo "  build        Build all applications"
	@echo "  start        Start all applications in production mode"
	@echo "  stop         Stop all running services"
	@echo ""
	@echo "Database:"
	@echo "  migrate      Run database migrations"
	@echo "  seed         Seed database with sample data"
	@echo "  db-reset     Reset database (migrate + seed)"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  test         Run all tests"
	@echo "  lint         Run linter on all packages"
	@echo "  type-check   Run TypeScript type checking"
	@echo "  audit        Run security audit"
	@echo ""
	@echo "Docker:"
	@echo "  docker-up    Start Docker services (Postgres, Redis, etc.)"
	@echo "  docker-down  Stop Docker services"
	@echo "  docker-logs  View Docker service logs"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-web   Deploy web app to Vercel"
	@echo "  deploy-api   Deploy API to Fly.io"
	@echo "  deploy-worker Deploy worker to Fly.io"
	@echo "  deploy       Deploy all services"
	@echo ""
	@echo "Utilities:"
	@echo "  clean        Clean all build artifacts"
	@echo "  install      Install dependencies"
	@echo "  update       Update dependencies"

# Development commands
dev:
	@echo "🚀 Starting Yahuti Trade Engine in development mode..."
	pnpm dev

build:
	@echo "🏗️  Building all applications..."
	pnpm build

start:
	@echo "▶️  Starting all applications..."
	pnpm start

stop:
	@echo "⏹️  Stopping all services..."
	pkill -f "pnpm dev" || true
	pkill -f "next dev" || true
	pkill -f "nest start" || true

# Database commands
migrate:
	@echo "🗃️  Running database migrations..."
	pnpm -C packages/db prisma migrate dev

seed:
	@echo "🌱 Seeding database..."
	pnpm -C packages/db prisma db seed

db-reset:
	@echo "🔄 Resetting database..."
	pnpm -C packages/db prisma migrate reset --force --skip-seed
	make seed

# Testing and quality commands
test:
	@echo "🧪 Running tests..."
	pnpm test

lint:
	@echo "🔍 Running linter..."
	pnpm lint

type-check:
	@echo "📝 Running TypeScript type checking..."
	pnpm type-check

audit:
	@echo "🔒 Running security audit..."
	pnpm audit

# Docker commands
docker-up:
	@echo "🐳 Starting Docker services..."
	docker compose -f infra/docker-compose.yml up -d
	@echo "Waiting for services to be ready..."
	@sleep 10

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker compose -f infra/docker-compose.yml down

docker-logs:
	@echo "📋 Docker service logs:"
	docker compose -f infra/docker-compose.yml logs -f

# Deployment commands
deploy-web:
	@echo "🌐 Deploying web app to Vercel..."
	cd apps/web && vercel --prod

deploy-api:
	@echo "🚀 Deploying API to Fly.io..."
	flyctl deploy --config apps/api/fly.toml

deploy-worker:
	@echo "⚙️  Deploying worker to Fly.io..."
	flyctl deploy --config apps/worker/fly.toml

deploy: deploy-web deploy-api deploy-worker
	@echo "✅ All services deployed successfully!"

# Utility commands
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf apps/*/dist
	rm -rf apps/*/.next
	rm -rf packages/*/dist
	rm -rf node_modules/.cache

install:
	@echo "📦 Installing dependencies..."
	pnpm install --frozen-lockfile

update:
	@echo "⬆️  Updating dependencies..."
	pnpm update

# Setup commands for new developers
setup: docker-up install migrate seed
	@echo ""
	@echo "🎉 Yahuti Trade Engine setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "1. Copy .env.example to .env and configure"
	@echo "2. Run 'make dev' to start development"
	@echo "3. Visit http://localhost:3000 for the frontend"
	@echo "4. Visit http://localhost:3001/api/docs for API docs"
	@echo ""
	@echo "Your Marketplace. Your Rules. Your Profit. 👑"

# CI commands (used in GitHub Actions)
ci-setup: install
	pnpm -C packages/db prisma generate

ci-test: ci-setup
	pnpm test

ci-build: ci-setup
	pnpm build