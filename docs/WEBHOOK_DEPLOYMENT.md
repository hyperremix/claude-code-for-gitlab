# Webhook Deployment Guide

This comprehensive guide covers advanced webhook server deployment options, configuration, monitoring, and maintenance for production environments.

## Table of Contents

- [Overview](#overview)
- [Deployment Options](#deployment-options)
- [Configuration](#configuration)
- [Production Deployment](#production-deployment)
- [Security Configuration](#security-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

The Claude Code webhook server provides a reliable, scalable solution for GitLab integration with these key features:

- **Single Endpoint**: One webhook server handles multiple GitLab projects
- **Real-time Response**: Immediate triggering when @claude is mentioned
- **Automatic Branch Creation**: Creates branches for issue-triggered workflows
- **Built-in Rate Limiting**: Protection against abuse (configurable)
- **Security**: HMAC webhook validation and secure token handling
- **Discord Integration**: Optional notifications for monitoring
- **High Availability**: Supports clustering and load balancing

## Deployment Options

### 1. Docker Deployment

#### Simple Docker Run

For quick testing or development:

```bash
docker run -d \
  --name gitlab-claude-webhook \
  -p 3000:3000 \
  -e GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  -e WEBHOOK_SECRET=your-webhook-secret-here \
  -e GITLAB_URL=https://gitlab.com \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

#### Production Docker Deployment

With persistent storage and proper configuration:

```bash
# Create data directory
mkdir -p /opt/claude-webhook/data

# Create configuration file
cat > /opt/claude-webhook/.env << EOF
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
WEBHOOK_SECRET=$(openssl rand -hex 32)
GITLAB_URL=https://gitlab.com
PORT=3000
REDIS_URL=redis://redis:6379
RATE_LIMIT_MAX=3
RATE_LIMIT_WINDOW=900
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
NODE_ENV=production
EOF

# Deploy with proper networking
docker run -d \
  --name gitlab-claude-webhook \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /opt/claude-webhook/.env \
  -v /opt/claude-webhook/data:/app/data \
  --network claude-network \
  ghcr.io/hyperremix/claude-code-gitlab-app:latest
```

### 2. Docker Compose Deployment

#### Basic Docker Compose

Create `docker-compose.yml`:

```yaml
version: "3.8"

services:
  webhook:
    image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
    container_name: gitlab-claude-webhook
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - GITLAB_URL=${GITLAB_URL}
      - REDIS_URL=redis://redis:6379
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
    depends_on:
      - redis
    networks:
      - claude-network

  redis:
    image: redis:7-alpine
    container_name: claude-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - claude-network

volumes:
  redis_data:

networks:
  claude-network:
    driver: bridge
```

#### Advanced Docker Compose with Monitoring

Create `docker-compose.production.yml`:

```yaml
version: "3.8"

services:
  webhook:
    image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
    container_name: gitlab-claude-webhook
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - GITLAB_URL=${GITLAB_URL}
      - REDIS_URL=redis://redis:6379
      - DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL}
      - NODE_ENV=production
      - RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-3}
      - RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-900}
    depends_on:
      - redis
    networks:
      - claude-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    container_name: claude-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/etc/redis/redis.conf:ro
    command: redis-server /etc/redis/redis.conf
    networks:
      - claude-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: claude-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - webhook
    networks:
      - claude-network

volumes:
  redis_data:

networks:
  claude-network:
    driver: bridge
```

### 3. Cloudflare Tunnel Deployment

For secure deployment without exposing ports:

```yaml
version: "3.8"

services:
  webhook:
    image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
    container_name: gitlab-claude-webhook
    restart: unless-stopped
    environment:
      - GITLAB_TOKEN=${GITLAB_TOKEN}
      - WEBHOOK_SECRET=${WEBHOOK_SECRET}
      - GITLAB_URL=${GITLAB_URL}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    networks:
      - claude-network

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: claude-tunnel
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    depends_on:
      - webhook
    networks:
      - claude-network

  redis:
    image: redis:7-alpine
    container_name: claude-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - claude-network

volumes:
  redis_data:

networks:
  claude-network:
    driver: bridge
```

### 4. Kubernetes Deployment

#### Basic Kubernetes Manifests

Create `webhook-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitlab-claude-webhook
  labels:
    app: gitlab-claude-webhook
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gitlab-claude-webhook
  template:
    metadata:
      labels:
        app: gitlab-claude-webhook
    spec:
      containers:
        - name: webhook
          image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: GITLAB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: claude-secrets
                  key: gitlab-token
            - name: WEBHOOK_SECRET
              valueFrom:
                secretKeyRef:
                  name: claude-secrets
                  key: webhook-secret
            - name: GITLAB_URL
              value: "https://gitlab.com"
            - name: REDIS_URL
              value: "redis://redis-service:6379"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-service
spec:
  selector:
    app: gitlab-claude-webhook
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
---
apiVersion: v1
kind: Secret
metadata:
  name: claude-secrets
type: Opaque
data:
  gitlab-token: <base64-encoded-token>
  webhook-secret: <base64-encoded-secret>
```

## Configuration

### Environment Variables

#### Required Variables

```env
# GitLab Configuration
GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx  # GitLab Personal Access Token
WEBHOOK_SECRET=your-webhook-secret-here   # Webhook validation secret

# Server Configuration
PORT=3000                                 # Server port (default: 3000)
```

#### Optional Variables

```env
# GitLab Instance
GITLAB_URL=https://gitlab.com            # GitLab instance URL

# Redis Configuration
REDIS_URL=redis://localhost:6379         # Redis connection string

# Rate Limiting
RATE_LIMIT_MAX=3                         # Max requests per window
RATE_LIMIT_WINDOW=900                    # Window in seconds (15 minutes)

# Features
CANCEL_OLD_PIPELINES=true                # Cancel older pending pipelines
TRIGGER_PHRASE=@claude                   # Custom trigger phrase

# Admin Features
ADMIN_TOKEN=your-admin-token             # Optional admin endpoints token

# Notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Development
NODE_ENV=production                      # Environment mode
DEBUG=false                              # Debug logging
```

### Redis Configuration

Create `redis.conf` for production Redis:

```conf
# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Memory
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your-redis-password

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Performance
tcp-keepalive 300
timeout 0
```

### Nginx Configuration

Create `nginx.conf` for reverse proxy:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream webhook_backend {
        server webhook:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/s;

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

        # Webhook endpoint
        location /webhook {
            limit_req zone=webhook burst=20 nodelay;
            proxy_pass http://webhook_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Webhook-specific settings
            proxy_read_timeout 30s;
            proxy_connect_timeout 10s;
            client_max_body_size 10M;
        }

        # Health check endpoint
        location /health {
            proxy_pass http://webhook_backend;
            access_log off;
        }

        # Admin endpoints (optional)
        location /admin {
            allow 192.168.1.0/24;  # Restrict to internal network
            deny all;
            proxy_pass http://webhook_backend;
        }
    }
}
```

## Production Deployment

### 1. Server Preparation

#### System Requirements

- **CPU**: 1-2 cores (lightweight application)
- **Memory**: 512MB-1GB RAM
- **Storage**: 10GB (for logs and Redis data)
- **Network**: Public IP or Cloudflare Tunnel
- **OS**: Linux (Ubuntu/CentOS/Alpine recommended)

#### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/claude-webhook
sudo chown $USER:$USER /opt/claude-webhook
cd /opt/claude-webhook
```

### 2. SSL Certificate Setup

#### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates for Docker
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*
```

#### Certificate Renewal

Add to crontab for automatic renewal:

```bash
# Add to crontab (crontab -e)
0 2 * * 1 /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

### 3. Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

DEPLOY_DIR="/opt/claude-webhook"
BACKUP_DIR="/opt/claude-webhook/backups"

# Create backup
mkdir -p $BACKUP_DIR
timestamp=$(date +%Y%m%d_%H%M%S)
docker-compose down
tar -czf "$BACKUP_DIR/backup_$timestamp.tar.gz" -C $DEPLOY_DIR .env docker-compose.yml

# Pull latest image
docker-compose pull

# Deploy
docker-compose up -d

# Verify deployment
sleep 10
if curl -f http://localhost:3000/health; then
    echo "Deployment successful!"
else
    echo "Deployment failed, rolling back..."
    docker-compose down
    tar -xzf "$BACKUP_DIR/backup_$timestamp.tar.gz" -C $DEPLOY_DIR
    docker-compose up -d
    exit 1
fi

# Cleanup old backups (keep last 5)
ls -t $BACKUP_DIR/backup_*.tar.gz | tail -n +6 | xargs -r rm
```

## Security Configuration

### 1. Network Security

#### Firewall Configuration

```bash
# UFW firewall rules
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Fail2ban for webhook endpoint protection
sudo apt install fail2ban
cat > /etc/fail2ban/jail.local << EOF
[webhook-dos]
enabled = true
port = http,https
filter = webhook-dos
logpath = /var/log/nginx/access.log
maxretry = 10
findtime = 60
bantime = 3600
EOF
```

#### Docker Security

```yaml
# In docker-compose.yml
services:
  webhook:
    # Run as non-root user
    user: "1001:1001"

    # Read-only root filesystem
    read_only: true

    # Temporary filesystems
    tmpfs:
      - /tmp
      - /var/cache

    # Security options
    security_opt:
      - no-new-privileges:true

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "0.5"
```

### 2. Secrets Management

#### Using Docker Secrets

```yaml
version: "3.8"

services:
  webhook:
    image: ghcr.io/hyperremix/claude-code-gitlab-app:latest
    secrets:
      - gitlab_token
      - webhook_secret
    environment:
      - GITLAB_TOKEN_FILE=/run/secrets/gitlab_token
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret

secrets:
  gitlab_token:
    file: ./secrets/gitlab_token.txt
  webhook_secret:
    file: ./secrets/webhook_secret.txt
```

#### Using External Secret Management

```bash
# Example with HashiCorp Vault
vault kv put secret/claude-webhook \
  gitlab_token="glpat-xxxxxxxxxxxxxxxxxxxx" \
  webhook_secret="$(openssl rand -hex 32)"

# Retrieve in deployment script
export GITLAB_TOKEN=$(vault kv get -field=gitlab_token secret/claude-webhook)
export WEBHOOK_SECRET=$(vault kv get -field=webhook_secret secret/claude-webhook)
```

### 3. Monitoring and Alerting

#### Prometheus Metrics

Add monitoring to `docker-compose.yml`:

```yaml
services:
  webhook:
    # ... existing configuration
    environment:
      - ENABLE_METRICS=true
      - METRICS_PORT=9090

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

#### Health Check Script

Create `health-check.sh`:

```bash
#!/bin/bash

WEBHOOK_URL="https://your-domain.com"
ALERT_WEBHOOK="https://discord.com/api/webhooks/..."

# Check webhook server health
if ! curl -f "$WEBHOOK_URL/health" > /dev/null 2>&1; then
    echo "Webhook server health check failed"

    # Send Discord alert
    curl -X POST "$ALERT_WEBHOOK" \
         -H "Content-Type: application/json" \
         -d "{\"content\": \"🚨 Claude webhook server is down! $WEBHOOK_URL/health failed\"}"

    # Restart service
    cd /opt/claude-webhook
    docker-compose restart webhook

    exit 1
fi

# Check Redis connectivity
if ! docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "Redis health check failed"
    docker-compose restart redis
fi

echo "Health check passed"
```

## Monitoring and Maintenance

### 1. Log Management

#### Centralized Logging

```yaml
# Add to docker-compose.yml
services:
  webhook:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: localhost:24224
        tag: claude.webhook

  fluentd:
    image: fluent/fluentd:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
```

#### Log Rotation

```bash
# Add to /etc/logrotate.d/claude-webhook
/opt/claude-webhook/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    sharedscripts
    postrotate
        docker-compose -f /opt/claude-webhook/docker-compose.yml kill -s USR1 webhook
    endscript
}
```

### 2. Backup Strategy

#### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/claude-webhook/backups"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup configuration and data
timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="$BACKUP_DIR/claude_backup_$timestamp.tar.gz"

tar -czf "$backup_file" \
    --exclude='backups' \
    --exclude='logs/*.log' \
    -C /opt/claude-webhook .

# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
docker cp $(docker-compose ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis_$timestamp.rdb"

# Upload to S3 (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    aws s3 cp "$backup_file" "s3://$AWS_S3_BUCKET/claude-webhook/"
    aws s3 cp "$BACKUP_DIR/redis_$timestamp.rdb" "s3://$AWS_S3_BUCKET/claude-webhook/"
fi

# Cleanup old backups
find $BACKUP_DIR -name "claude_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "redis_*.rdb" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $backup_file"
```

### 3. Update Procedures

#### Rolling Update Script

Create `update.sh`:

```bash
#!/bin/bash
set -e

cd /opt/claude-webhook

# Pre-update checks
echo "Running pre-update checks..."
curl -f http://localhost:3000/health || exit 1

# Create backup
./backup.sh

# Pull new image
echo "Pulling latest image..."
docker-compose pull webhook

# Rolling update (zero downtime)
echo "Performing rolling update..."
docker-compose up -d --no-deps --scale webhook=2 webhook
sleep 30

# Health check on new container
new_container=$(docker-compose ps -q webhook | head -1)
if docker exec $new_container curl -f http://localhost:3000/health; then
    echo "New container healthy, removing old container..."
    docker-compose up -d --no-deps --scale webhook=1 webhook
else
    echo "New container unhealthy, rolling back..."
    docker-compose up -d --no-deps webhook
    exit 1
fi

echo "Update completed successfully!"
```

## Troubleshooting

### Common Issues

#### 1. Webhook Server Won't Start

```bash
# Check logs
docker-compose logs webhook

# Common issues:
# - Invalid environment variables
# - Redis connection failure
# - Port conflicts

# Debug steps:
docker-compose exec webhook sh
env | grep -E "(GITLAB|WEBHOOK|REDIS)"
```

#### 2. GitLab Webhook Delivery Failures

```bash
# Check webhook server logs
docker-compose logs webhook | grep webhook

# Test webhook endpoint manually
curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -H "X-Gitlab-Token: your-webhook-secret" \
     -d '{"object_kind":"note","note":{"body":"@claude test"}}'

# Check GitLab webhook logs in project settings
```

#### 3. Rate Limiting Issues

```bash
# Check Redis for rate limit keys
docker-compose exec redis redis-cli
> KEYS rate_limit:*
> TTL rate_limit:user:123:issue:456

# Adjust rate limits
echo "
```
