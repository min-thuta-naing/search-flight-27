# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Verify and fix entrypoint script
RUN ls -la docker-entrypoint.sh && \
    sed -i 's/\r$//' docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install system dependencies for the flight scraper
RUN apk add --no-cache \
    postgresql-client \
    python3 \
    py3-pip \
    chromium \
    chromium-chromedriver \
    xvfb \
    xvfb-run \
    dbus \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Create and activate a virtual environment for Python to avoid PEP 668 issues
ENV VIRTUAL_ENV=/app/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Copy migrations SQL files to both locations (for compiled and tsx usage)
COPY --from=builder /app/src/database/migrations ./dist/database/migrations
COPY --from=builder /app/src/database/migrations ./src/database/migrations
# Copy source TypeScript files and dependencies for running with tsx
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
# Copy service account JSON
COPY --from=builder /app/flight-data-import-f13fe24a45ef.json ./
# Copy entrypoint script from builder stage
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Verify file exists and make executable (should already be executable from builder)
RUN ls -la ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
