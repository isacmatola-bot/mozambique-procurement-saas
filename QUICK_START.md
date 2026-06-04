# Quick Start Guide

## 🚀 Start in 5 Minutes

### Prerequisites
- Docker & Docker Compose
- Git

### Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/isacmatola-bot/mozambique-procurement-saas.git
   cd mozambique-procurement-saas
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

3. **Start Docker**
   ```bash
   docker-compose up -d
   ```

4. **Run Migrations**
   ```bash
   docker exec mozproc_api npm run migrate
   docker exec mozproc_api npm run seed
   ```

5. **Access Application**
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:3001
   - **MinIO**: http://localhost:9001 (minioadmin/minioadmin)
   - **Database**: localhost:5432

### Login Credentials

**Admin**
- Email: `admin@procurement.mz`
- Password: `admin123`

**Procurement Officer**
- Email: `procurement@institute.mz`
- Password: `user123`

**Finance Officer**
- Email: `finance@institute.mz`
- Password: `user123`

## 📋 Next Steps

1. Read the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide
2. Check [API documentation](./docs/API.md)
3. Review [Compliance requirements](./docs/COMPLIANCE.md)
4. Setup production environment

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Change ports in docker-compose.yml or .env
PORT=3001  # Change backend port
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker ps

# View logs
docker logs mozproc_db
```

### Migration Failed
```bash
# Run migrations manually
docker exec mozproc_api npm run migrate

# Rollback
docker exec mozproc_api npm run migrate:rollback
```

## 📞 Support

- Issues: https://github.com/isacmatola-bot/mozambique-procurement-saas/issues
- Documentation: See `/docs` folder
- Email: support@procurement-saas.mz
