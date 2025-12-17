# Multi-stage build for Fazner AI Platform
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install all dependencies
RUN npm ci --only=production && \
    cd frontend && npm ci --only=production && \
    cd ../backend && npm ci --only=production

# Copy source code
COPY . .

# Build applications
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built applications and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nextjs:nodejs /app/backend/package.json ./backend/package.json
COPY --from=builder --chown=nextjs:nodejs /app/docker-compose.yml ./docker-compose.yml
COPY --from=builder --chown=nextjs:nodejs /app/docker-compose.prod.yml ./docker-compose.prod.yml

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["dumb-init", "node", "backend/dist/server.js"]