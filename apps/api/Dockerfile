# Yahuti Trade Engine API Dockerfile
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/db/package.json packages/db/
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/db packages/db/
COPY packages/contracts packages/contracts/
COPY apps/api apps/api/

# Build the application
FROM base AS build
RUN pnpm build

# Generate Prisma client
RUN pnpm -C packages/db prisma generate

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nestjs:nodejs package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY --chown=nestjs:nodejs packages/db/package.json packages/db/
COPY --chown=nestjs:nodejs packages/contracts/package.json packages/contracts/
COPY --chown=nestjs:nodejs apps/api/package.json apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --production

# Copy built application
COPY --from=build --chown=nestjs:nodejs /app/packages/db/dist packages/db/dist/
COPY --from=build --chown=nestjs:nodejs /app/packages/contracts/dist packages/contracts/dist/
COPY --from=build --chown=nestjs:nodejs /app/apps/api/dist apps/api/dist/
COPY --from=build --chown=nestjs:nodejs /app/packages/db/prisma packages/db/prisma/
COPY --from=build --chown=nestjs:nodejs /app/node_modules/.pnpm node_modules/.pnpm/
COPY --from=build --chown=nestjs:nodejs /app/node_modules/@prisma node_modules/@prisma/

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "apps/api/dist/main.js"]