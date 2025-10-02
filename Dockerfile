# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Copy .env file for build-time environment variables (VITE_* vars are embedded during build)
# Note: .env is required for production builds to set VITE_API_BASE_URL and VITE_BOT_API_BASE_URL
COPY .env* ./

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

RUN npm install -g serve

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
