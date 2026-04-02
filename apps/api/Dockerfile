# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy from apps/api/ since Railway builds from repo root
COPY apps/api/package*.json ./
RUN npm install

COPY apps/api/ .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY apps/api/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3005

CMD ["node", "dist/main"]