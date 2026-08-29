# MoMo — Morning Monitor - Production Dockerfile
# Build: docker build -t momo .
# Run:   docker run -p 3100:3100 -v ./data:/app/data momo

FROM node:22-alpine AS base
WORKDIR /app

# Install build deps for sqlite3 native module
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Remove build deps to keep image small (keep python for runtime if needed)
RUN apk del make g++ python3 2>/dev/null || true

# Copy rest of app
COPY . .

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
