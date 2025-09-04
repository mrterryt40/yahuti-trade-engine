# Yahuti Trade Engine Worker Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/contracts/package.json packages/contracts/
COPY apps/worker/package.json apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/db packages/db/
COPY packages/contracts packages/contracts/
COPY apps/worker apps/worker/

# Build the application
FROM base AS build
RUN pnpm build

# Generate Prisma client
RUN pnpm -C packages/db prisma generate

# Production stage
FROM node:18-alpine AS production

# Install pnpm and chromium for puppeteer
RUN npm install -g pnpm
RUN apk add --no-cache chromium

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worker -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=worker:nodejs package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY --chown=worker:nodejs packages/db/package.json packages/db/
COPY --chown=worker:nodejs packages/contracts/package.json packages/contracts/
COPY --chown=worker:nodejs apps/worker/package.json apps/worker/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --production

# Copy built application
COPY --from=build --chown=worker:nodejs /app/packages/db/dist packages/db/dist/
COPY --from=build --chown=worker:nodejs /app/packages/contracts/dist packages/contracts/dist/
COPY --from=build --chown=worker:nodejs /app/apps/worker/dist apps/worker/dist/
COPY --from=build --chown=worker:nodejs /app/packages/db/prisma packages/db/prisma/
COPY --from=build --chown=worker:nodejs /app/node_modules/.pnpm node_modules/.pnpm/
COPY --from=build --chown=worker:nodejs /app/node_modules/@prisma node_modules/@prisma/

# Switch to non-root user
USER worker

# Set Puppeteer to use installed chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Expose health check port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the worker system
CMD ["node", "apps/worker/dist/index.js"]