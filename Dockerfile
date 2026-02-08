# ============================================================================
# FRONTEND DOCKER BUILD
# ============================================================================
# Multi-stage build: React SPA with Vite, served by nginx
# Stateless frontend consuming backend APIs
# ============================================================================


# ============================================================================
# BUILD STAGE
# ============================================================================
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build with VITE_* env vars
COPY . .

ARG VITE_DATABASE_API_URL
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_DATABASE_API_URL=${VITE_DATABASE_API_URL}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build


# ============================================================================
# PRODUCTION STAGE
# ============================================================================
FROM nginx:1.25-alpine

LABEL description="React Frontend SPA"
LABEL version="1.0.0"

# Install curl for health checks
RUN apk add --no-cache curl

# Create nginx user (consistency across environments)
RUN addgroup -g 101 -S nginx || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx 2>/dev/null || true

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories with proper permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    chmod -R 755 /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 644 /usr/share/nginx/html/* && \
    find /usr/share/nginx/html -type d -exec chmod 755 {} \;

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Non-root user
USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
