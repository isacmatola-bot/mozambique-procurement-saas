# Mozambique Procurement & Invoice Generation SaaS

## Platform for Instituto de Formacao de Professores de Inhamizua

A comprehensive contract and invoice generation SaaS tool designed to streamline procurement processes, supplier management, and contract administration in compliance with Mozambique's **Decree No. 79/2022** and tax regulations **(Law No. 32/2007)**.

### 🎯 Key Features

#### Procurement Management
- **Supplier Registry**: Complete supplier database with validation against Mozambique's Single Registry requirements
- **Tender Management**: Create, publish, and manage competitive tenders
- **Bid Evaluation**: Automated scoring and evaluation matrices
- **Local Content Tracking**: Monitor preferential margins (15% for services/works, 20% for goods)
- **Beneficial Ownership Disclosure**: Track ownership for contracts >60M meticais

#### Contract Generation
- **Smart Templates**: Pre-configured contract templates compliant with Decree No. 79/2022
- **Auto-Population**: Automatic field population from tender and supplier data
- **Version Control**: Track contract versions and revisions
- **Digital Signatures**: E-signature integration for legally binding contracts
- **Approval Workflows**: Multi-stage approval process

#### Invoice Management
- **Tax-Compliant Invoices**: Full compliance with VAT Law No. 32/2007
- **Mandatory Fields**: NIF, VAT 17%, unique sequential numbers
- **Electronic Invoicing**: Integration-ready for e-SISTAFE platform
- **10-Year Audit Trail**: Automatic retention and archival
- **PDF Generation**: Professional invoice PDF generation

#### Compliance & Reporting
- **Audit Logs**: Complete activity tracking
- **Compliance Dashboard**: Real-time regulatory compliance monitoring
- **Reporting**: Procurement spend, supplier performance, local content compliance

### ✅ Compliance Features

✅ **Decree No. 79/2022 Compliance**  
✅ **Tax Compliance (Law No. 32/2007)**  
✅ **Transparency & Governance**  
✅ **Audit Trails for all Transactions**

### 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/isacmatola-bot/mozambique-procurement-saas.git
cd mozambique-procurement-saas

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Run with Docker
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Docs: http://localhost:3001/api/docs
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
```

### 📁 Project Structure

```
backend/          # Node.js/Express API
frontend/         # React/TypeScript UI
docker-compose.yml
nginx.conf
.env.example
docs/             # Complete documentation
```

### 🔐 Security

- JWT + OAuth2 authentication
- Role-based access control (RBAC)
- Data encryption at rest and in transit
- SQL injection prevention
- Audit logging
- Rate limiting

### 👥 User Roles

1. **Admin** - Full system access
2. **Procurement Officer** - Tender & bid management
3. **Finance Officer** - Invoice management
4. **Supplier** - Self-registration & bidding
5. **Approver** - Contract/invoice approval
6. **Auditor** - Read-only compliance review

### 🛠️ Tech Stack

- **Backend**: Node.js 18+, Express, TypeScript, PostgreSQL, Redis
- **Frontend**: React 18+, TypeScript, TailwindCSS, Axios, React Query
- **Infrastructure**: Docker, Docker Compose, Nginx, MinIO
- **Database**: PostgreSQL 15
- **File Storage**: MinIO (S3 compatible)
- **Caching**: Redis 7
- **API Documentation**: Swagger/OpenAPI

### 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment
- **[docs/API.md](./docs/API.md)** - API documentation
- **[docs/COMPLIANCE.md](./docs/COMPLIANCE.md)** - Mozambique compliance guide
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture
- **[docs/TESTING.md](./docs/TESTING.md)** - Testing guide
- **[docs/SETUP.md](./docs/SETUP.md)** - Detailed setup guide

### 📊 Default Login Credentials

After running migrations and seeds:

**Admin Account**
- Email: `admin@procurement.mz`
- Password: `admin123`

**Procurement Officer**
- Email: `procurement@institute.mz`
- Password: `user123`

**Finance Officer**
- Email: `finance@institute.mz`
- Password: `user123`

### 🔄 Database Migrations

```bash
# Run migrations
docker exec mozproc_api npm run migrate

# Seed sample data
docker exec mozproc_api npm run seed

# Rollback
docker exec mozproc_api npm run migrate:rollback
```

### 🧪 Testing

```bash
# Run all tests
npm run test

# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Coverage report
npm run test:coverage
```

### 📈 API Endpoints

Full API documentation at `http://localhost:3001/api/docs`

**Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

**Suppliers**
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get supplier details
- `PUT /api/suppliers/:id` - Update supplier

**Tenders**
- `GET /api/tenders` - List tenders
- `POST /api/tenders` - Create tender

**Contracts**
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Generate contract

**Invoices** (VAT Compliant)
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice

**Reports**
- `GET /api/reports/compliance` - Compliance report

### 🌍 Localization

- **Language**: Portuguese (pt-MZ)
- **Currency**: Mozambican Metical (MZN)
- **Date Format**: DD/MM/YYYY
- **Tax**: VAT Law No. 32/2007 (17% standard rate)
- **Timezone**: Africa/Maputo

### 📋 Features Checklist

- ✅ Supplier Management
- ✅ Tender Management
- ✅ Contract Generation
- ✅ Invoice Generation (VAT compliant)
- ✅ Digital Signatures
- ✅ Audit Logging
- ✅ Role-Based Access Control
- ✅ Compliance Reporting
- ✅ Electronic Invoicing Ready
- ✅ 10-Year Invoice Retention
- ✅ Docker Containerization
- ✅ PostgreSQL Database
- ✅ Redis Caching
- ✅ File Storage (MinIO)
- ✅ Nginx Reverse Proxy
- ✅ CI/CD Pipeline
- ✅ Full Documentation

### 📞 Support

- **Issues**: https://github.com/isacmatola-bot/mozambique-procurement-saas/issues
- **Email**: support@procurement-saas.mz
- **Documentation**: See `/docs` folder

### 📄 License

Proprietary - Instituto de Formacao de Professores de Inhamizua

### 🎉 Status

**Ready to Launch** ✅
- Complete source code
- Database schema migrations
- Docker containerization
- Production-ready configuration
- Full documentation
- API specification
- Deployment guide
- CI/CD pipeline

---

**Created**: January 2024  
**Version**: 1.0.0  
**Status**: Production Ready 🚀
