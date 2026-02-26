# IMPLEMENTATION GUIDE - PHASE 0 COMPLETE

## Files Created

1. **database-schema-design.sql** - Complete PostgreSQL schema with constraints
2. **database-design-documentation.md** - Design decisions and explanations
3. **implementation-guide.md** - This file (setup instructions)

---

## Project Structure (Monorepo)

```
ayende-cx/
├── README.md
├── package.json
├── tsconfig.json
├── .gitignore
├── .env.example
│
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   │
│   │   │   ├── config/               # Configuration
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── auth.config.ts
│   │   │   │   └── s3.config.ts
│   │   │   │
│   │   │   ├── common/               # Shared utilities
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   │
│   │   │   ├── database/             # Database setup
│   │   │   │   ├── migrations/       # TypeORM migrations
│   │   │   │   ├── seeds/            # Seed data
│   │   │   │   └── database.module.ts
│   │   │   │
│   │   │   ├── auth/                 # Authentication
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── strategies/
│   │   │   │       ├── jwt.strategy.ts
│   │   │   │       └── auth0.strategy.ts
│   │   │   │
│   │   │   ├── businesses/           # Multi-tenant
│   │   │   │   ├── businesses.module.ts
│   │   │   │   ├── businesses.service.ts
│   │   │   │   ├── businesses.controller.ts
│   │   │   │   └── entities/
│   │   │   │       ├── business.entity.ts
│   │   │   │       └── business-user.entity.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   └── entities/
│   │   │   │       └── user.entity.ts
│   │   │   │
│   │   │   ├── accounting/           # CORE: Double-entry engine
│   │   │   │   ├── accounting.module.ts
│   │   │   │   │
│   │   │   │   ├── accounts/
│   │   │   │   │   ├── accounts.service.ts
│   │   │   │   │   ├── accounts.controller.ts
│   │   │   │   │   └── entities/
│   │   │   │   │       └── account.entity.ts
│   │   │   │   │
│   │   │   │   ├── journal-entries/
│   │   │   │   │   ├── journal-entries.service.ts
│   │   │   │   │   ├── journal-entries.controller.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── create-journal-entry.dto.ts
│   │   │   │   │   │   └── post-journal-entry.dto.ts
│   │   │   │   │   └── entities/
│   │   │   │   │       ├── journal-entry.entity.ts
│   │   │   │   │       └── journal-line.entity.ts
│   │   │   │   │
│   │   │   │   └── ledger/
│   │   │   │       ├── ledger.service.ts
│   │   │   │       └── ledger.controller.ts
│   │   │   │
│   │   │   ├── import/               # File import
│   │   │   │   ├── import.module.ts
│   │   │   │   ├── import.service.ts
│   │   │   │   ├── import.controller.ts
│   │   │   │   ├── parsers/
│   │   │   │   │   ├── csv-parser.service.ts
│   │   │   │   │   └── pdf-parser.service.ts
│   │   │   │   ├── processors/
│   │   │   │   │   └── import.processor.ts
│   │   │   │   └── entities/
│   │   │   │       ├── import-batch.entity.ts
│   │   │   │       └── raw-transaction.entity.ts
│   │   │   │
│   │   │   ├── classification/       # Classification engine
│   │   │   │   ├── classification.module.ts
│   │   │   │   ├── classification.service.ts
│   │   │   │   ├── classification.controller.ts
│   │   │   │   ├── rules/
│   │   │   │   │   └── rule-engine.service.ts
│   │   │   │   └── entities/
│   │   │   │       ├── classified-transaction.entity.ts
│   │   │   │       ├── transaction-split.entity.ts
│   │   │   │       └── classification-rule.entity.ts
│   │   │   │
│   │   │   ├── tax/                  # Tax handling
│   │   │   │   ├── tax.module.ts
│   │   │   │   ├── tax.service.ts
│   │   │   │   ├── tax.controller.ts
│   │   │   │   └── entities/
│   │   │   │       ├── tax-code.entity.ts
│   │   │   │       └── tax-transaction.entity.ts
│   │   │   │
│   │   │   ├── reporting/            # Financial reports
│   │   │   │   ├── reporting.module.ts
│   │   │   │   ├── reporting.service.ts
│   │   │   │   ├── reporting.controller.ts
│   │   │   │   ├── generators/
│   │   │   │   │   ├── income-statement.generator.ts
│   │   │   │   │   ├── balance-sheet.generator.ts
│   │   │   │   │   ├── trial-balance.generator.ts
│   │   │   │   │   └── general-ledger.generator.ts
│   │   │   │   └── exporters/
│   │   │   │       ├── pdf.exporter.ts
│   │   │   │       └── csv.exporter.ts
│   │   │   │
│   │   │   └── audit/                # Audit trail
│   │   │       ├── audit.module.ts
│   │   │       ├── audit.service.ts
│   │   │       └── entities/
│   │   │           └── audit-log.entity.ts
│   │   │
│   │   ├── test/                     # E2E tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (auth)/
│       │   │   │   ├── login/
│       │   │   │   └── register/
│       │   │   ├── (dashboard)/
│       │   │   │   ├── dashboard/
│       │   │   │   ├── import/
│       │   │   │   ├── transactions/
│       │   │   │   ├── accounts/
│       │   │   │   ├── reports/
│       │   │   │   └── settings/
│       │   │   └── api/
│       │   │
│       │   ├── components/           # Shared components
│       │   │   ├── ui/
│       │   │   ├── forms/
│       │   │   ├── tables/
│       │   │   └── charts/
│       │   │
│       │   ├── lib/                  # Utilities
│       │   │   ├── api-client.ts
│       │   │   ├── auth.ts
│       │   │   └── utils.ts
│       │   │
│       │   └── types/                # TypeScript types
│       │
│       ├── public/
│       ├── package.json
│       └── tsconfig.json
│
├── libs/                             # Shared libraries
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── entities/
│   │   │   ├── dtos/
│   │   │   └── enums/
│   │   └── package.json
│   │
│   └── validation/                   # Shared validators
│       ├── src/
│       └── package.json
│
└── docs/                             # Documentation
    ├── database/
    │   ├── schema-design.sql         ← Move file here
    │   └── design-documentation.md   ← Move file here
    ├── api/
    └── setup/
```

---

## Setup Commands

### 1. Download Files from Chat

The files created are currently in `/home/claude/`. You mentioned you download to `~/Downloads/`.

**Run these commands to move the files to your project:**

```bash
# Create project directories
mkdir -p ~/Projects/ayende-cx
cd ~/Projects/ayende-cx

# Create documentation directory
mkdir -p docs/database

# Move database files from Downloads to project
# (After you download them from this chat)
mv ~/Downloads/database-schema-design.sql docs/database/
mv ~/Downloads/database-design-documentation.md docs/database/
mv ~/Downloads/implementation-guide.md docs/
```

---

## Phase 0: Complete Setup

### Step 1: Initialize Monorepo

```bash
cd ~/Projects/ayende-cx

# Initialize package.json
npm init -y

# Install workspace tools
npm install -D nx @nx/workspace

# Or use pnpm/yarn for better monorepo support
pnpm init
pnpm add -D nx @nx/workspace
```

### Step 2: Setup NestJS Backend

```bash
# Create apps directory
mkdir -p apps

# Generate NestJS app
npx @nestjs/cli new api
# Choose pnpm/npm/yarn
# Move to apps/api

mv api apps/
```

### Step 3: Install Backend Dependencies

```bash
cd apps/api

# Core NestJS
npm install @nestjs/common @nestjs/core @nestjs/platform-express

# Database (TypeORM + PostgreSQL)
npm install @nestjs/typeorm typeorm pg

# Auth (Auth0 or Cognito)
npm install @nestjs/passport passport passport-jwt jwks-rsa
npm install @nestjs/jwt

# File handling
npm install multer @nestjs/platform-express
npm install pdf-parse

# AWS S3
npm install @aws-sdk/client-s3

# Queue (Redis + BullMQ)
npm install @nestjs/bull bullmq ioredis

# Validation
npm install class-validator class-transformer

# Development
npm install -D @types/node @types/multer @types/passport-jwt
npm install -D typescript ts-node

cd ../..
```

### Step 4: Setup PostgreSQL Database

```bash
# Install PostgreSQL (if not already installed)
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14

# Start PostgreSQL service
sudo service postgresql start

# Create database
createdb ayende_bookkeeping

# Run schema
psql -U postgres -d ayende_bookkeeping -f docs/database/database-schema-design.sql

# Verify schema
psql -U postgres -d ayende_bookkeeping -c "\dt"
```

### Step 5: Setup Redis (for Queue)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo service redis-server start

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 6: Setup Environment Variables

```bash
# Create .env file in project root
cat > .env << 'EOF'
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=ayende_bookkeeping

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth0 (or Cognito)
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://your-api-identifier

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=ayende-bookkeeping-uploads

# Application
NODE_ENV=development
PORT=3000
JWT_SECRET=your-jwt-secret-change-this
EOF

# Add .env to .gitignore
echo ".env" >> .gitignore
```

### Step 7: Configure TypeORM

Create `apps/api/src/config/database.config.ts`:

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'ayende_bookkeeping',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // NEVER use in production
  logging: process.env.NODE_ENV === 'development',
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
};
```

---

## Phase 0 Deliverables ✅

- [x] Complete database schema with constraints
- [x] Documentation of design decisions
- [x] Implementation roadmap
- [x] Folder structure defined
- [x] Setup commands provided

---

## What You Have Now

1. **Database Schema** (`database-schema-design.sql`)
   - 16 tables with full constraints
   - Double-entry enforcement
   - Immutability triggers
   - Performance indexes
   - Helper functions

2. **Documentation** (`database-design-documentation.md`)
   - Constraint explanations
   - Data flow architecture
   - Security model
   - Common queries
   - Testing guidelines

3. **Project Structure** (This file)
   - Complete monorepo layout
   - Setup commands
   - Environment configuration
   - Next steps

---

## Next Steps (Phase 1)

**OPTION A: Manual Setup**
1. Create project structure manually
2. Run setup commands above
3. Create TypeORM entities from schema
4. Build accounting engine

**OPTION B: Automated Setup (Recommended)**
I can generate:
1. Complete project scaffold with all folders
2. TypeORM entities matching the schema
3. Migration files
4. Basic NestJS modules
5. Configuration files

---

## Decision Point

**How would you like to proceed?**

**A)** Download these 3 files, run setup commands manually, then we build Phase 1 together

**B)** I generate the complete NestJS project structure with:
   - All folders created
   - TypeORM entities
   - Basic modules scaffolded
   - Configuration files
   - Migration files
   - You download the entire package at once

**Let me know which approach you prefer, and I'll proceed accordingly.** 🎯
