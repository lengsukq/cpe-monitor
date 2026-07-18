# ============================================================
# Stage 1: Install all dependencies (including devDependencies for build)
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage 2: Build application
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

ARG JWT_SECRET
ENV JWT_SECRET=${JWT_SECRET}
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ============================================================
# Stage 3: Production runner (standalone)
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output (includes server.js + pruned node_modules + compiled app)
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public folder
COPY --from=builder /app/public ./public

# Create data directory for SQLite at /app/data (app uses process.cwd() + '/data')
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
