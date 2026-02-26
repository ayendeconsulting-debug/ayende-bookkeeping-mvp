# AYENDE CX Bookkeeping - Tax-Ready Reporting Application

Multi-tenant bookkeeping system with double-entry accounting enforcement.

## Features

 **Double-Entry Accounting Engine**
- Automatic balance validation (debits MUST equal credits)
- Multi-tenant support
- Auto-generated journal entry numbers (JE-YYYY-00001)
- Trial balance calculation
- Accounting integrity verification

 **Chart of Accounts**
- 17 default accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- Account hierarchy support
- System and custom accounts

 **API Endpoints**
- Account management (6 endpoints)
- Journal entries (5 endpoints)
- Ledger & reporting (4 endpoints)

## Tech Stack

- **Backend:** NestJS + TypeScript
- **Database:** PostgreSQL 16
- **ORM:** TypeORM

## Quick Start

See full documentation in `/docs` folder.

### Installation
```bash
cd apps/api
npm install
cp .env.example .env
npm run start:dev
```

## Development Status

 Phase 1 Complete - Double-entry accounting engine working
 Phase 2 Planned - Import & classification
 Phase 3 Planned - Tax & reporting
 Phase 4 Planned - Frontend

## License

MIT
