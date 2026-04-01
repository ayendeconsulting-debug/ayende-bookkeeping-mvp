# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install PRODUCTION dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Railway injects PORT at runtime — do not hardcode
ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "dist/main"]
