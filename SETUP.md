# Setup Guide - AYENDE CX Bookkeeping MVP

## Quick Start for Developers

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Git

### 2. Clone Repository
```bash
git clone https://github.com/ayendeconsulting-debug/ayende-bookkeeping-mvp.git
cd ayende-bookkeeping-mvp
```

### 3. Database Setup
```bash
# Create database
createdb ayende_bookkeeping_multitenant

# Run schema
psql -U postgres -d ayende_bookkeeping_multitenant -f docs/database/database-schema-design.sql
```

### 4. Backend Setup
```bash
cd apps/api
npm install
cp .env.example .env

# Edit .env with your database credentials
# Then start the server
npm run start:dev
```

Server will run at: http://localhost:3000

### 5. Test the API

#### Create test business and user:
```sql
psql -U postgres -d ayende_bookkeeping_multitenant

INSERT INTO businesses (id, name, currency_code, fiscal_year_end)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Company', 'USD', '2024-12-31');

INSERT INTO users (id, auth_provider_id, email, full_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'test-auth-id', 'test@example.com', 'Test User');
```

#### Seed chart of accounts:
```bash
curl -X POST "http://localhost:3000/accounts/seed?businessId=00000000-0000-0000-0000-000000000001"
```

#### Create a journal entry:
```bash
curl -X POST "http://localhost:3000/journal-entries?userId=00000000-0000-0000-0000-000000000002" \
  -H "Content-Type: application/json" \
  -d "{\"business_id\":\"00000000-0000-0000-0000-000000000001\",\"entry_date\":\"2024-01-15\",\"description\":\"Test entry\",\"lines\":[{\"line_number\":1,\"account_id\":\"CASH_ID\",\"debit_amount\":1000,\"credit_amount\":0},{\"line_number\":2,\"account_id\":\"REVENUE_ID\",\"debit_amount\":0,\"credit_amount\":1000}]}"
```

## Available Endpoints

- `GET /` - Hello World
- `POST /accounts/seed` - Seed default accounts
- `GET /accounts` - List accounts
- `POST /journal-entries` - Create entry (validates balance!)
- `GET /ledger/trial-balance` - View trial balance
- `GET /ledger/verify` - Verify integrity

## Features to Test

 Double-entry validation (try creating unbalanced entry - it will fail!)
 Trial balance calculation
 Multi-tenant data isolation
 Auto-generated entry numbers

## Issues or Questions?

Open an issue on GitHub: https://github.com/ayendeconsulting-debug/ayende-bookkeeping-mvp/issues
