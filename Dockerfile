# Multi-stage Dockerfile for Crypto Review Lab (Vite + Express SSR/API)
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build Vite client and Express server bundle
ENV NODE_ENV=production
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled distribution artifacts and runtime data
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/crypto_reviews.json ./
COPY --from=builder /app/pro_orders.json ./
COPY --from=builder /app/avf_category_memory.json ./

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
