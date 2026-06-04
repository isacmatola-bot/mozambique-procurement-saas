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

### 📚 Database Schema

Key tables:
- `users` - System users with roles
- `suppliers` - Supplier registry (NIF required)
- `tenders` - Public tenders
- `bids` - Supplier bids
- `contracts` - Generated contracts (Decree No. 79/2022)
- `invoices` - Tax-compliant invoices (VAT 17%)
- `audit_logs` - Compliance tracking

### 🧪 Testing

```bash
# Run backend tests
cd backend
npm run test

# Run frontend tests
cd frontend
npm run test

# Generate coverage report
npm run test:coverage
```

### 📖 API Documentation

Full OpenAPI/Swagger documentation available at `http://localhost:3001/api/docs`

**Key Endpoints:**
- `POST /api/auth/login` - User authentication
- `POST /api/suppliers` - Register supplier
- `GET /api/suppliers` - List suppliers
- `POST /api/tenders` - Create tender
- `GET /api/tenders` - List tenders
- `POST /api/contracts` - Generate contract
- `GET /api/contracts` - List contracts
- `POST /api/invoices` - Create invoice (VAT compliant)
- `GET /api/invoices` - List invoices
- `GET /api/reports/compliance` - Compliance report

### 🌍 Localization

- **Language**: Portuguese (pt-MZ)
- **Currency**: Mozambican Metical (MZN)
- **Date Format**: DD/MM/YYYY
- **Tax**: VAT Law No. 32/2007 (17% standard rate)
- **Timezone**: Africa/Maputo

### 💼 Workflows

#### Procurement Workflow
1. Tender Creation
2. Supplier Registration/Validation
3. Bid Submission
4. Bid Evaluation & Scoring
5. Award Decision
6. Contract Generation
7. Contract Signing (Digital)
8. Order Confirmation

#### Invoice Workflow
1. Invoice Creation
2. Tax Compliance Validation (VAT, NIF)
3. Multi-step Approval
4. Payment Processing
5. 10-Year Archival & Retention

### 📊 Compliance Monitoring

- Real-time regulatory change alerts
- Automatic compliance checks
- Non-compliance warnings
- Audit readiness reports
- Tax filing assistance
- Local content margin tracking
- Beneficial ownership disclosure tracking

### 🚢 Deployment

See `DEPLOYMENT.md` for production deployment guide

### 📝 Environment Variables

See `.env.example` for complete configuration

### 🤝 Contributing

See `CONTRIBUTING.md` for guidelines

### 📄 License

Proprietary - Instituto de Formacao de Professores de Inhamizua

### 📞 Support

For support:
- 📧 Email: support@procurement-saas.mz
- 📚 Documentation: `/docs`
- 🐛 Issues: GitHub Issues

### 📋 Changelog

See `CHANGELOG.md` for version history

---

**Ready to Launch** ✅
- Complete source code
- Database schema migrations
- Docker containerization
- Production-ready configuration
- Full documentation
- API specification
- Deployment guide
