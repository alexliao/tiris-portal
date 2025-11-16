# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Accept environment file as build argument (default: .env)
# Usage: docker build --build-arg ENV_FILE=.env.production ...
ARG ENV_FILE=.env

COPY package*.json ./
RUN npm ci

COPY . .

# Copy the specified .env file for build-time environment variables (VITE_* vars are embedded during build)
# Note: .env file is required for production builds to set VITE_API_BASE_URL and VITE_BOT_API_BASE_URL
COPY ${ENV_FILE} .env

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

RUN npm install -g serve

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
