# Yahuti Trade Engine™

> Your Marketplace. Your Rules. Your Profit.

A sovereign digital arbitrage system that automatically hunts mispriced digital goods, executes purchases, creates optimized listings, and manages the complete trade lifecycle.

## 🏛️ Architecture

This is a production-ready monorepo built with modern tools:

- **Frontend**: Next.js 13+ with Yahuti branding (Maroon/Gold/Black)
- **Backend**: NestJS API with comprehensive modules
- **Workers**: BullMQ-powered automation system
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for queues and caching
- **Infrastructure**: Docker, Fly.io, Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/yahuti-trade-engine.git
   cd yahuti-trade-engine
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure**
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

4. **Setup database**
   ```bash
   cp .env.example .env
   pnpm -C packages/db prisma migrate dev
   pnpm -C packages/db prisma db seed
   ```

5. **Start all services**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001/api/docs
   - Worker Health: http://localhost:3002/health

## 📊 Command Deck

The sovereign control center where you monitor and command the system:

- **Today's Net**: Live earnings tracking
- **Bankroll**: Available capital cycling
- **Active Flips**: Current marketplace listings
- **Dispute Rate**: Risk monitoring
- **System Status**: Module health indicators

## 🏗️ System Architecture

### Core Modules

1. **Hunter** - Scans suppliers (G2A, Kinguin, GoDaddy, etc.)
2. **Evaluator** - Computes margins and applies rules
3. **Buyer** - Executes purchases automatically  
4. **Merchant** - Creates optimized marketplace listings
5. **Fulfillment** - Delivers digital goods instantly
6. **Collector** - Reconciles payments and fees
7. **Reprice** - Dynamic pricing optimization
8. **Allocator** - Budget distribution across niches
9. **Brains** - A/B experiments and learning
10. **Governor** - Risk management and kill switch

### Data Flow

```
Suppliers → Hunter → Evaluator → Buyer → Vault → Merchant → Marketplaces
                                           ↓
Customer ← Fulfillment ← Order ← Listings ←
```

## 🛡️ Security & Risk

- **Vault Encryption**: All keys/accounts encrypted at rest
- **Risk Governor**: Auto-throttles on dispute spikes
- **Kill Switch**: Emergency stop for all automation
- **Audit Trail**: Immutable ledger of all actions
- **2FA**: Required for sensitive operations

## 🔧 Configuration

### Playbooks (YAML)

```yaml
sourcing:
  min_net_margin: 0.30
  min_seller_score: 4.7
  daily_spend_cap_usd: 800

risk_governor:
  dispute_ceiling_7d: 0.015
  auto_pause_on_warning: true
```

### Environment Variables

See `.env.example` for all configuration options.

## 📈 Monitoring

- **KPIs**: Real-time profit/loss tracking
- **System Health**: Module status monitoring
- **Risk Metrics**: Dispute and refund rates
- **Performance**: Response times and throughput

## 🚢 Deployment

### Production (Automated CI/CD)

1. **Push to main branch**
2. **CI Pipeline runs** (lint, test, build)
3. **Deployment Pipeline**:
   - Web → Vercel
   - API → Fly.io
   - Worker → Fly.io
   - Database migrations → Automated

### Manual Deployment

```bash
# Deploy web
vercel --prod

# Deploy API
flyctl deploy --config apps/api/fly.toml

# Deploy worker
flyctl deploy --config apps/worker/fly.toml
```

## 📝 API Documentation

Interactive API documentation available at:
- Development: http://localhost:3001/api/docs
- Production: https://your-api-url.com/api/docs

## 🔍 Key Endpoints

- `GET /api/kpis/summary` - Command Deck KPIs
- `GET /api/hunt/candidates` - Deal candidates
- `POST /api/control/start` - Start automation
- `POST /api/control/kill` - Emergency stop
- `GET /api/risk/status` - Risk monitoring

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific app tests
pnpm -C apps/api test
pnpm -C apps/web test

# Run with coverage
pnpm test:cov
```

## 📦 Project Structure

```
yahuti-trade-engine/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS backend
│   └── worker/       # BullMQ workers
├── packages/
│   ├── db/           # Prisma schema
│   ├── contracts/    # Zod schemas
│   └── ui/           # Shared components
├── infra/
│   └── docker-compose.yml
└── .github/
    └── workflows/    # CI/CD pipelines
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is proprietary software of Yahuti Nation.

## 🔗 Links

- [User Manual](./MANUAL.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOY.md)

---

**Built with 🖤 by Yahuti Nation**

*"Your Marketplace. Your Rules. Your Profit."*