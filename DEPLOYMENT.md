# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 14+
- Node.js 18+
- AWS S3 account (optional)

## Local Development

```bash
# Install dependencies
npm install

# Start services
docker-compose up -d

# Run migrations
npm run db:migrate

# Start dev servers
npm run dev
```

## Production Deployment

### Using Docker Compose

```bash
# Copy environment file
cp .env.example .env

# Update .env with production values
vim .env

# Start all services
docker-compose -f docker-compose.yml up -d

# Run migrations
docker exec mozproc_api npm run migrate

# Check status
docker-compose ps
```

### Environment Variables
```bash
NODE_ENV=production
DB_PASSWORD=strong_password
JWT_SECRET=strong_secret_key
S3_ACCESS_KEY=your_aws_key
S3_SECRET_KEY=your_aws_secret
```

### SSL/TLS
Configure in `nginx.conf` with your certificate paths

### Monitoring
- Check logs: `docker-compose logs -f backend`
- Monitor database: Connect via pgAdmin or psql
- View Redis: `redis-cli monitor`

## Backup Strategy

```bash
# Backup database
docker exec mozproc_db pg_dump -U postgres mozambique_procurement > backup.sql

# Restore database
docker exec -i mozproc_db psql -U postgres mozambique_procurement < backup.sql
```

## Scaling
- Increase DB pool connections
- Add Redis instances
- Use load balancer (nginx)
- Implement CDN for static assets
