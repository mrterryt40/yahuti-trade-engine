# 🚀 Yahuti Trade Engine Quick Start

## Fix Build Errors

The build error you're seeing suggests the system is looking for files in the wrong location. Here's how to fix it:

### Option 1: Use the Makefile (Recommended)

```bash
# Start infrastructure
make docker-up

# Install dependencies (requires pnpm)
make install

# Setup database  
make migrate
make seed

# Start development
make dev
```

### Option 2: Manual Setup

If you don't have pnpm installed:

1. **Install pnpm globally:**
   ```bash
   npm install -g pnpm
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start Docker services:**
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

4. **Setup database:**
   ```bash
   pnpm -C packages/db prisma migrate dev
   pnpm -C packages/db prisma db seed
   ```

5. **Start development:**
   ```bash
   pnpm dev
   ```

### Option 3: Fix Path Resolution Issues

If you're still getting module resolution errors, try:

1. **Clean build cache:**
   ```bash
   rm -rf apps/web/.next
   rm -rf apps/web/node_modules/.cache
   ```

2. **Verify tsconfig paths in `apps/web/tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"],
         "@/components/*": ["./components/*"],
         "@/lib/*": ["./lib/*"]
       }
     }
   }
   ```

3. **Make sure all UI components exist in `apps/web/components/ui/`**

### Option 4: Standalone Web App

If the monorepo is causing issues, you can run just the web app:

1. **Navigate to web directory:**
   ```bash
   cd apps/web
   ```

2. **Install required dependencies:**
   ```bash
   npm install next@13.4.19 react@18.2.0 react-dom@18.2.0 typescript@5.1.6
   npm install tailwindcss@3.3.3 autoprefixer@10.4.15 postcss@8.4.28
   npm install @radix-ui/react-icons@1.3.0 lucide-react@0.263.1
   npm install clsx@2.0.0 tailwind-merge@1.14.0 class-variance-authority@0.7.0
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

## 🎯 What You Should See

Once running successfully:

- **Frontend**: http://localhost:3000 - Yahuti Command Deck
- **API**: http://localhost:3001/api/docs - Swagger documentation  
- **Worker Health**: http://localhost:3002/health - Worker status

## 🏛️ Architecture Overview

```
Frontend (Next.js) → API (NestJS) → Workers (BullMQ) → Database (PostgreSQL)
     ↓                  ↓              ↓                    ↓
   Port 3000        Port 3001      Port 3002            Port 5432
```

## 🛠️ Troubleshooting

### Module Resolution Errors
- Ensure you're in the project root when running commands
- Check that `@/` path aliases are properly configured
- Verify all UI components exist in `components/ui/`

### Database Connection Errors  
- Make sure Docker services are running: `docker compose -f infra/docker-compose.yml up -d`
- Check database URL in `.env` file

### Port Conflicts
- Web: 3000, API: 3001, Worker: 3002, PostgreSQL: 5432, Redis: 6379
- Stop conflicting services or change ports in configuration

### Package Manager Issues
- This is a pnpm workspace - npm won't work properly
- Install pnpm: `npm install -g pnpm`
- Use pnpm for all operations: `pnpm install`, `pnpm dev`

## 🎨 Features Available

✅ **Yahuti-branded Command Deck** - Maroon/Gold/Black theme  
✅ **Real-time KPI widgets** - P&L, bankroll, system health  
✅ **Complete API backend** - 12+ modules with Swagger docs  
✅ **Worker automation system** - 10+ specialized workers  
✅ **Database schema** - Complete trading lifecycle  
✅ **Docker infrastructure** - Local development environment  
✅ **CI/CD pipelines** - GitHub Actions deployment  

---

**Your Marketplace. Your Rules. Your Profit.** 👑