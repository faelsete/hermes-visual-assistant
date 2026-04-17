# ═══════════════════════════════════════════════════
# Hermes Visual Assistant — Dockerfile
# Multi-stage build for minimal image size
# ═══════════════════════════════════════════════════

FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Run
CMD ["npx", "tsx", "src/server.ts"]
