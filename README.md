# AI-Powered Multi-Tenant Workflow Management System

A comprehensive, LOS/LMS-ready workflow management system with AI integration, multi-tenancy, and role-based access control.

## 🚀 Features

### Core Workflow Engine
- **Config-driven workflows** with JSON-based stage and transition definitions
- **Role-based access control** (Admin, Maker, Checker, Underwriter, DisbursementOfficer, Auditor)
- **Multi-tenant architecture** with tenant-scoped data isolation
- **SLA management** with configurable time limits per stage
- **Conditional routing** with expression-based business rules

### LOS/LMS Ready
- **Loan case entities** with specialized schemas for lending workflows
- **Borrower management** with KYC status tracking
- **Document management** with AI-powered extraction
- **Repayment scheduling** (placeholder for LMS functionality)
- **Credit scoring integration** with explainable AI features

### AI Integration
- **Model run logging** for MLOps and audit trails
- **Document parsing hooks** for automated data extraction
- **Credit scoring APIs** with confidence metrics and explainability
- **Autonomy action tracking** for automated workflow decisions

### Security & Compliance
- **JWT-based authentication** with tenant-scoped tokens
- **Comprehensive audit logging** for all user actions and data changes
- **Data encryption** support for sensitive fields
- **Rate limiting** and security headers

### Analytics & Monitoring
- **Real-time dashboard** with workflow metrics
- **SLA monitoring** with breach detection
- **AI model performance** tracking and confidence distribution
- **Case status analytics** with visual charts

## 🏗️ Architecture

### Backend
- **Node.js + Express** with TypeScript
- **PostgreSQL** for primary data storage (via Supabase)
- **JWT authentication** with role-based authorization
- **OpenAPI 3.0** documentation at `/api/docs`
- **Modular architecture** with clear separation of concerns

### Frontend
- **Next.js 13+** with App Router
- **React + TypeScript** for type safety
- **Tailwind CSS** for responsive, modern UI
- **Recharts** for data visualization
- **Lucide React** for consistent iconography

### Database Schema
- **Multi-tenant data model** with proper foreign key relationships
- **Workflow configuration** stored as JSON with versioning
- **Comprehensive audit trail** for all business operations
- **Optimized indexes** for query performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (or local PostgreSQL)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your database and JWT settings:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

4. **Seed demo data**
   ```bash
   npm run db:seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api/docs

## 🔑 Demo Credentials

After seeding the database, you can use these credentials:

- **Tenant:** `demo`
- **Admin:** `admin@demo.com` / `admin123`
- **Maker:** `maker@demo.com` / `maker123`
- **Checker:** `checker@demo.com` / `checker123`
- **Underwriter:** `underwriter@demo.com` / `underwriter123`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login with tenant context

### Workflows
- `GET /api/{tenant}/workflows` - List all workflows
- `POST /api/{tenant}/workflows` - Create new workflow
- `GET /api/{tenant}/workflows/{id}` - Get workflow by ID

### Cases
- `GET /api/{tenant}/cases` - List cases with filtering
- `POST /api/{tenant}/cases` - Create new case
- `GET /api/{tenant}/cases/{id}` - Get case details
- `POST /api/{tenant}/cases/{id}/action` - Perform workflow action

### AI Services
- `POST /api/{tenant}/ai/score` - Get AI credit score
- `POST /api/{tenant}/ai/parse` - Parse document with AI

### Dashboard
- `GET /api/{tenant}/dashboard/stats` - Dashboard statistics
- `GET /api/{tenant}/dashboard/ai` - AI model performance

## 🔧 Workflow Configuration

Workflows are defined in JSON format:

```json
{
  "workflowId": "micro_loan_v1",
  "version": 1,
  "name": "Micro Loan Processing",
  "stages": [
    {
      "id": "draft",
      "label": "Draft",
      "slaHours": 48,
      "requiredFields": ["borrower_id", "requested_amount"]
    }
  ],
  "transitions": [
    {
      "from": "draft",
      "to": "doc_verify",
      "condition": "true",
      "roles": ["Maker"],
      "actions": ["validate_basic_info"]
    }
  ],
  "autoRules": [
    {
      "stage": "doc_verify",
      "trigger": "onEnter",
      "action": "call:ai/score",
      "condition": "documents_complete == true"
    }
  ]
}
```

## 🤖 AI Integration

The system includes mock AI services that simulate:

### Credit Scoring
```javascript
// Returns PD score with explainability
{
  "pd_score": 0.08,
  "confidence": 0.92,
  "recommendation": "Manual Review",
  "explainability": {
    "top_features": [
      {"feature": "credit_score", "importance": 0.35},
      {"feature": "monthly_income", "importance": 0.25}
    ]
  }
}
```

### Document Parsing
```javascript
// Extracts structured data from documents
{
  "extracted_data": {
    "pan_number": "ABCDE1234F",
    "name": "John Doe",
    "date_of_birth": "01/01/1990"
  },
  "confidence": 0.95
}
```

## 🔍 Security Features

- **Multi-tenant isolation** - Complete data separation between tenants
- **Role-based permissions** - Granular access control for each workflow stage
- **Audit logging** - All actions tracked with user, timestamp, and IP
- **JWT token security** - Secure token-based authentication
- **Rate limiting** - API protection against abuse
- **Input validation** - Comprehensive request validation with Joi

## 📈 Monitoring & Analytics

The system provides comprehensive monitoring:

- **Case flow analytics** - Track cases through workflow stages
- **SLA monitoring** - Real-time breach detection and alerts
- **AI model performance** - Confidence scores and accuracy metrics
- **User activity** - Detailed audit trails for compliance

## 🚧 Development

### Running Tests
```bash
npm test
npm run test:watch
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a demonstration project. For production use, please ensure:
1. Replace mock AI services with real implementations
2. Add comprehensive error handling
3. Implement proper security measures
4. Add extensive testing coverage
5. Configure production monitoring

## 📞 Support

For questions or support, please contact the development team.