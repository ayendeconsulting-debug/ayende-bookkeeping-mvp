# AYENDE CX BOOKKEEPING - DATABASE DESIGN DOCUMENTATION

## Philosophy

> **"The ledger is the source of truth. Everything flows through journal entries. Raw data is sacred. Double-entry is law."**

This database schema is designed with **accounting correctness** as the highest priority. Every design decision enforces these principles:

1. **Ledger Correctness** - Double-entry accounting is enforced at the database level
2. **Immutable Raw Data** - Source transactions can never be modified
3. **Single Source of Truth** - All reports derive from journal_lines only
4. **Multi-tenant Isolation** - Complete data separation per business

---

## Core Constraints (The Unbreakables)

### 1. Double-Entry Balance Enforcement

**Location**: `journal_lines` table + trigger `enforce_journal_entry_balance`

```sql
-- Every journal entry MUST balance
-- Total Debits = Total Credits
```

**How it works**:
- When a journal entry is marked as "posted", the trigger validates balance
- If debits ≠ credits (within 1 cent tolerance), the transaction is ROLLED BACK
- NO unbalanced entries can exist in the system

**Why it matters**: This is fundamental accounting law. If this breaks, all financial reports are meaningless.

---

### 2. Raw Transaction Immutability

**Location**: `raw_transactions` table + trigger `prevent_raw_transaction_update`

```sql
-- Once created, raw transactions CANNOT be modified
-- Only state transitions and duplicate marking allowed
```

**How it works**:
- Any UPDATE attempt on immutable fields raises an exception
- Only `state`, `is_duplicate`, and `duplicate_of_id` can change
- This preserves the original source data forever

**Why it matters**: Audit trails require immutable source records. If raw data changes, you lose traceability.

---

### 3. Split Transaction Validation

**Location**: `transaction_splits` table + trigger `check_split_totals`

```sql
-- Sum of all splits MUST equal raw transaction amount
```

**How it works**:
- After INSERT or UPDATE on splits, trigger calculates total
- If total ≠ raw transaction amount (within 1 cent), transaction is ROLLED BACK

**Why it matters**: Split transactions must allocate the full amount—no more, no less.

---

### 4. One-Sided Journal Lines

**Location**: `journal_lines` table + CHECK constraint

```sql
-- Each line is EITHER debit OR credit, never both
CHECK (
  (debit_amount > 0 AND credit_amount = 0) OR
  (debit_amount = 0 AND credit_amount > 0)
)
```

**Why it matters**: Double-entry accounting requires clear debit/credit sides. No ambiguity allowed.

---

### 5. Locked Entry Protection

**Location**: `journal_entries` + trigger `check_entry_not_locked`

```sql
-- Once locked, journal entries cannot be modified
```

**How it works**:
- When fiscal year is locked, entries in that period cannot be edited
- Prevents tampering with historical records
- Supports year-end close process

**Why it matters**: Tax compliance requires locked historical periods.

---

## Data Flow Architecture

### Transaction Lifecycle

```
┌─────────────┐
│ File Upload │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ import_batches  │ ← S3 file reference
└──────┬──────────┘
       │
       ▼ [Background Job: Parse File]
       │
┌──────────────────┐
│ raw_transactions │ ← IMMUTABLE storage
└──────┬───────────┘
       │
       ▼ [Deduplication via hash_signature]
       │
┌──────────────────────────┐
│ classified_transactions  │ ← Manual or auto classification
└──────┬───────────────────┘
       │
       ▼ [Validation: balanced, accounts exist]
       │
┌─────────────────┐
│ journal_entries │ ← Double-entry enforcement
│ journal_lines   │
└──────┬──────────┘
       │
       ▼ [Status: posted]
       │
┌──────────────────┐
│ FINANCIAL REPORTS│ ← Query journal_lines ONLY
└──────────────────┘
```

### Critical Rule: Report Data Source

**ALL financial reports MUST query only `journal_lines`**

Never query:
- ❌ `raw_transactions`
- ❌ `classified_transactions`
- ❌ `transaction_splits`

These are intermediate states. The ledger (`journal_lines`) is the single source of truth.

---

## Multi-Tenant Architecture

### Isolation Strategy

Every business-specific table includes:
```sql
business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
```

### Row-Level Security (RLS) Strategy

Option 1: **Application-Level Filtering** (Recommended for MVP)
```typescript
// Every query includes business context
const accounts = await accountRepository.find({
  where: { businessId: currentBusiness.id }
});
```

Option 2: **PostgreSQL RLS** (Future enhancement)
```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_isolation ON accounts
  USING (business_id = current_setting('app.current_business_id')::uuid);
```

**Decision**: Start with application-level filtering for simplicity. Add RLS in Phase 5 if needed.

---

## Account Type System

### Account Types (5 Core Types)

| Type | Normal Balance | Appears On |
|------|---------------|------------|
| `asset` | Debit | Balance Sheet |
| `liability` | Credit | Balance Sheet |
| `equity` | Credit | Balance Sheet |
| `revenue` | Credit | Income Statement |
| `expense` | Debit | Income Statement |

### Account Subtypes (Business Logic)

Used for special handling:

- `bank` → Used for cash flow tracking
- `credit_card` → Identifies credit card accounts
- `owner_contribution` → Equity from owner investments
- `owner_draw` → Equity from owner withdrawals
- `tax_payable` → Tax liability accounts
- `accounts_receivable` → Customer invoices
- `accounts_payable` → Vendor bills

### Balance Calculation Logic

```sql
-- Assets and Expenses: Debit increases, Credit decreases
balance = SUM(debit_amount) - SUM(credit_amount)

-- Liabilities, Equity, Revenue: Credit increases, Debit decreases
balance = SUM(credit_amount) - SUM(debit_amount)
```

---

## Owner Contribution & Draw Logic

### Owner Contribution (Personal money → Business expense)

**Scenario**: Owner pays $500 business expense from personal account

**Journal Entry**:
```
Dr. Office Supplies (Expense)     $500
  Cr. Owner Contribution (Equity)  $500
```

**Effect**: 
- Expense increases
- Owner equity increases
- Balance sheet still balances

### Owner Draw (Business money → Owner personal)

**Scenario**: Owner withdraws $1,000 from business

**Journal Entry**:
```
Dr. Owner Draw (Equity)       $1,000
  Cr. Cash (Asset)             $1,000
```

**Effect**: 
- Equity decreases
- Cash decreases
- Balance sheet still balances

---

## Tax Handling

### Tax Code Setup

```sql
-- Example: 7.5% Sales Tax
INSERT INTO tax_codes (business_id, code, name, tax_type, rate, tax_account_id)
VALUES (
  '...',
  'SALES-TAX',
  'Sales Tax',
  'output',  -- Tax we collect
  0.075,     -- 7.5%
  (SELECT id FROM accounts WHERE code = '2200')  -- Sales Tax Payable
);
```

### Tax Application Logic

**Sale with Tax**: $100 + 7.5% tax = $107.50

**Journal Entry**:
```
Dr. Cash (Asset)                    $107.50
  Cr. Sales Revenue (Revenue)        $100.00
  Cr. Sales Tax Payable (Liability)   $7.50
```

**Implementation**: 
- `tax_transactions` table links the tax calculation
- `journal_lines` includes both the net and tax lines
- Tax line marked with `is_tax_line = true`

---

## Transfer Detection

### The Problem

If you have two bank accounts and transfer $500 between them:

**❌ WRONG (counts as revenue)**:
```
Dr. Bank Account B    $500
  Cr. Revenue          $500  ← This inflates income!
```

**✅ CORRECT (asset-to-asset)**:
```
Dr. Bank Account B    $500
  Cr. Bank Account A   $500  ← No P&L impact
```

### Detection Logic

```typescript
// Pseudocode
if (sourceAccount.accountType === 'asset' && 
    destinationAccount.accountType === 'asset') {
  // This is a transfer, not revenue
  createTransferEntry();
}
```

---

## Deduplication Strategy

### Hash Signature Generation

```sql
hash_signature = SHA256(
  business_id ||
  transaction_date ||
  LOWER(TRIM(description)) ||
  amount ||
  source_account_name
)
```

### Deduplication Flow

1. Parse new transaction
2. Generate hash signature
3. Check if signature exists
4. If exists:
   - Mark new transaction `is_duplicate = true`
   - Set `duplicate_of_id` to original
   - Set `state = 'ignored'`
5. If not exists:
   - Proceed to classification

**Important**: Duplicates are kept for audit purposes but never posted.

---

## Performance Optimization

### Critical Indexes

**Most Important (Used by every report)**:
```sql
-- Journal lines by business and date
CREATE INDEX idx_journal_lines_reporting 
ON journal_lines(business_id, account_id) 
INCLUDE (debit_amount, credit_amount);
```

**Deduplication Performance**:
```sql
-- Hash lookup must be instant
CREATE INDEX idx_raw_transactions_hash 
ON raw_transactions(hash_signature);
```

### Materialized View: Account Balances

```sql
CREATE MATERIALIZED VIEW account_balances AS
SELECT 
  business_id,
  account_id,
  SUM(debit_amount) - SUM(credit_amount) as balance
FROM journal_lines
WHERE status = 'posted'
GROUP BY business_id, account_id;
```

**Refresh Strategy**:
- Refresh after posting entries
- Refresh on-demand for reports
- Consider scheduled refresh (nightly)

---

## Security Model

### Multi-Tenant Data Isolation

**Every query MUST include business context**:

```typescript
// Good
const accounts = await this.accountRepository.find({
  where: { businessId: req.user.currentBusinessId }
});

// Bad (security risk!)
const accounts = await this.accountRepository.find(); // All businesses!
```

### Role-Based Access Control

| Role | Can Create | Can Edit | Can Delete | Can Post | Can Lock |
|------|-----------|----------|-----------|----------|----------|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `accountant` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `viewer` | ❌ | ❌ | ❌ | ❌ | ❌ |

### Authentication Flow

```
User Login (Auth0/Cognito)
    ↓
Get user_id from auth provider
    ↓
Lookup user in users table
    ↓
Get businesses from business_users
    ↓
Set current business context
    ↓
All queries filtered by business_id
```

---

## Migration Strategy

### Initial Setup

```bash
# Run the schema
psql -U postgres -d ayende_bookkeeping < database-schema-design.sql

# Verify constraints
SELECT * FROM pg_trigger WHERE tgname LIKE '%journal%';
SELECT * FROM pg_constraint WHERE conname LIKE '%amount%';
```

### Seed Default Data

```sql
-- Create test business
INSERT INTO businesses (name, legal_name, currency_code)
VALUES ('Acme Corp', 'Acme Corporation LLC', 'USD')
RETURNING id;

-- Seed chart of accounts
SELECT seed_default_chart_of_accounts('<business_id>');
```

---

## Validation & Testing

### Database-Level Tests

```sql
-- Test 1: Unbalanced entry should fail
BEGIN;
  INSERT INTO journal_entries (business_id, entry_date, description, created_by, status)
  VALUES ('...', '2024-01-01', 'Test Entry', '...', 'posted')
  RETURNING id;
  
  INSERT INTO journal_lines (journal_entry_id, line_number, account_id, debit_amount, credit_amount)
  VALUES 
    (..., 1, ..., 100, 0),  -- Debit $100
    (..., 2, ..., 0, 50);   -- Credit $50 (UNBALANCED!)
  
  -- This should FAIL with exception
ROLLBACK;

-- Test 2: Raw transaction update should fail
BEGIN;
  INSERT INTO raw_transactions (...)
  VALUES (...);
  
  UPDATE raw_transactions 
  SET amount = 500  -- Should FAIL
  WHERE id = ...;
ROLLBACK;

-- Test 3: Trial balance should be zero
SELECT calculate_trial_balance('<business_id>');
-- Expected: 0.00
```

---

## Common Queries

### Generate Income Statement

```sql
SELECT 
  a.name as account_name,
  SUM(jl.credit_amount - jl.debit_amount) as amount
FROM journal_lines jl
JOIN journal_entries je ON jl.journal_entry_id = je.id
JOIN accounts a ON jl.account_id = a.id
WHERE jl.business_id = :businessId
  AND je.status = 'posted'
  AND je.entry_date BETWEEN :startDate AND :endDate
  AND a.account_type IN ('revenue', 'expense')
GROUP BY a.id, a.name, a.account_type
ORDER BY a.account_type, a.code;
```

### Generate Balance Sheet

```sql
SELECT 
  a.account_type,
  a.name as account_name,
  CASE 
    WHEN a.account_type IN ('asset', 'expense') THEN
      SUM(jl.debit_amount - jl.credit_amount)
    ELSE
      SUM(jl.credit_amount - jl.debit_amount)
  END as balance
FROM journal_lines jl
JOIN journal_entries je ON jl.journal_entry_id = je.id
JOIN accounts a ON jl.account_id = a.id
WHERE jl.business_id = :businessId
  AND je.status = 'posted'
  AND je.entry_date <= :asOfDate
  AND a.account_type IN ('asset', 'liability', 'equity')
GROUP BY a.id, a.name, a.account_type
ORDER BY a.account_type, a.code;
```

### Verify Trial Balance

```sql
-- Should ALWAYS return 0.00
SELECT 
  SUM(debit_amount) - SUM(credit_amount) as trial_balance
FROM journal_lines jl
JOIN journal_entries je ON jl.journal_entry_id = je.id
WHERE jl.business_id = :businessId
  AND je.status = 'posted';
```

---

## Future Enhancements (Post-MVP)

### 1. PostgreSQL Row-Level Security (RLS)

```sql
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_entries_isolation 
ON journal_entries
USING (business_id = current_setting('app.current_business_id')::uuid);
```

### 2. Audit Trail Triggers

Auto-populate `audit_logs` on all mutations:

```sql
CREATE TRIGGER audit_account_changes
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

### 3. Partitioning for Scale

```sql
-- Partition journal_entries by year
CREATE TABLE journal_entries_2024 
  PARTITION OF journal_entries
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 4. Advanced Reporting Views

```sql
CREATE VIEW profit_and_loss AS ...
CREATE VIEW cash_flow_statement AS ...
```

---

## Acceptance Criteria Checklist

- [x] Double-entry balance enforced at database level
- [x] Raw transactions are immutable
- [x] Journal entries must be balanced
- [x] Multi-tenant isolation via business_id
- [x] Chart of accounts supports all account types
- [x] Tax handling with tax_codes and tax_transactions
- [x] Owner contribution and draw logic supported
- [x] Transfer detection logic in place
- [x] Deduplication via hash_signature
- [x] Fiscal year locking supported
- [x] Audit trail table ready
- [x] Performance indexes on critical queries
- [x] Trial balance calculation function
- [x] Seed data function for default chart of accounts

---

## Next Steps

1. **Review Schema** - Approve the design
2. **Create Migration Files** - Convert to TypeORM or Prisma migrations
3. **Build Domain Models** - Create NestJS entities
4. **Write Unit Tests** - Test all constraints
5. **Implement Services** - Build the accounting engine

---

**Status**: ✅ **SCHEMA DESIGN COMPLETE**

**Awaiting Approval to Proceed to Implementation**
