-- ============================================================================
-- AYENDE CX BOOKKEEPING - DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0 (MVP)
-- Database: PostgreSQL 14+
-- Philosophy: Ledger correctness, immutable raw data, double-entry enforcement
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Account Types (Balance Sheet & Income Statement)
CREATE TYPE account_type AS ENUM (
  'asset',
  'liability', 
  'equity',
  'revenue',
  'expense'
);

-- Account Subtypes (for specific business logic)
CREATE TYPE account_subtype AS ENUM (
  'bank',
  'credit_card',
  'accounts_receivable',
  'accounts_payable',
  'fixed_asset',
  'owner_contribution',
  'owner_draw',
  'retained_earnings',
  'tax_payable',
  'cost_of_goods_sold',
  'operating_expense',
  'other_income',
  'other_expense',
  'general'
);

-- Journal Entry Status
CREATE TYPE journal_entry_status AS ENUM (
  'draft',
  'posted',
  'locked'
);

-- User Roles
CREATE TYPE business_user_role AS ENUM (
  'owner',
  'accountant',
  'viewer'
);

-- Classification Method
CREATE TYPE classification_method AS ENUM (
  'auto',
  'manual',
  'split'
);

-- Tax Type
CREATE TYPE tax_type AS ENUM (
  'input',  -- Tax paid (deductible)
  'output'  -- Tax collected (payable)
);

-- Import Status
CREATE TYPE import_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Transaction State
CREATE TYPE transaction_state AS ENUM (
  'raw',
  'classified',
  'posted',
  'ignored'
);

-- ============================================================================
-- MULTI-TENANT: BUSINESSES & USERS
-- ============================================================================

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  tax_id VARCHAR(50), -- EIN, ABN, etc.
  currency_code VARCHAR(3) DEFAULT 'USD' NOT NULL,
  fiscal_year_end DATE NOT NULL DEFAULT '12-31', -- MM-DD format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  settings JSONB DEFAULT '{}'::jsonb,
  
  CONSTRAINT business_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_provider_id VARCHAR(255) UNIQUE NOT NULL, -- Auth0/Cognito ID
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role business_user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(business_id, user_id)
);

-- ============================================================================
-- CHART OF ACCOUNTS
-- ============================================================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Account Identity
  code VARCHAR(20) NOT NULL, -- e.g., "1000", "4100"
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Account Classification
  account_type account_type NOT NULL,
  account_subtype account_subtype NOT NULL DEFAULT 'general',
  
  -- Hierarchy (optional parent for sub-accounts)
  parent_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- System accounts cannot be deleted
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(business_id, code),
  CONSTRAINT account_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT no_self_parent CHECK (id != parent_account_id)
);

-- ============================================================================
-- TAX CODES
-- ============================================================================

CREATE TABLE tax_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  tax_type tax_type NOT NULL,
  rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.0750 for 7.5%
  
  -- Tax goes to this account
  tax_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(business_id, code),
  CONSTRAINT tax_rate_valid CHECK (rate >= 0 AND rate <= 1),
  CONSTRAINT tax_code_not_empty CHECK (LENGTH(TRIM(code)) > 0)
);

-- ============================================================================
-- IMPORT BATCHES
-- ============================================================================

CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(10) NOT NULL, -- 'csv', 'pdf'
  file_size BIGINT NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_bucket VARCHAR(255) NOT NULL,
  
  -- Processing
  status import_status DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  
  -- User context
  uploaded_by UUID NOT NULL REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  
  CONSTRAINT file_size_positive CHECK (file_size > 0)
);

-- ============================================================================
-- RAW TRANSACTIONS (IMMUTABLE)
-- ============================================================================

CREATE TABLE raw_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  import_batch_id UUID NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  
  -- Transaction Data (IMMUTABLE AFTER CREATION)
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  
  -- Source Information
  source_account_name VARCHAR(255), -- Bank account name from statement
  source_reference VARCHAR(255), -- Check number, reference ID, etc.
  
  -- Additional parsed data
  vendor_name VARCHAR(255),
  category VARCHAR(255),
  notes TEXT,
  
  -- Deduplication
  hash_signature VARCHAR(64) NOT NULL UNIQUE,
  
  -- State Management
  state transaction_state DEFAULT 'raw',
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES raw_transactions(id),
  
  -- Metadata
  raw_data JSONB, -- Original parsed data for reference
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT amount_not_zero CHECK (amount != 0),
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

-- CRITICAL: Prevent updates to raw transactions (IMMUTABILITY ENFORCEMENT)
CREATE OR REPLACE FUNCTION prevent_raw_transaction_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow state transitions and duplicate marking
  IF (OLD.state != NEW.state) OR 
     (OLD.is_duplicate != NEW.is_duplicate) OR
     (OLD.duplicate_of_id IS DISTINCT FROM NEW.duplicate_of_id) THEN
    RETURN NEW;
  END IF;
  
  -- Block all other updates
  RAISE EXCEPTION 'Raw transactions are immutable. Create a new transaction instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_raw_transaction_immutability
  BEFORE UPDATE ON raw_transactions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_raw_transaction_update();

-- ============================================================================
-- CLASSIFICATION RULES
-- ============================================================================

CREATE TABLE classification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Rule Matching
  match_type VARCHAR(20) NOT NULL, -- 'keyword', 'vendor', 'account', 'amount_range'
  match_value TEXT NOT NULL, -- The pattern to match
  match_pattern VARCHAR(50), -- 'contains', 'equals', 'starts_with', 'regex'
  
  -- Classification Action
  target_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tax_code_id UUID REFERENCES tax_codes(id) ON DELETE SET NULL,
  
  -- Priority (lower number = higher priority)
  priority INTEGER DEFAULT 100,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT priority_positive CHECK (priority >= 0)
);

-- ============================================================================
-- CLASSIFIED TRANSACTIONS
-- ============================================================================

CREATE TABLE classified_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  raw_transaction_id UUID NOT NULL UNIQUE REFERENCES raw_transactions(id) ON DELETE CASCADE,
  
  -- Classification
  classification_method classification_method NOT NULL,
  applied_rule_id UUID REFERENCES classification_rules(id) ON DELETE SET NULL,
  
  -- Account Assignment
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  tax_code_id UUID REFERENCES tax_codes(id) ON DELETE SET NULL,
  
  -- Override original amount if needed (rare, but supported)
  override_amount DECIMAL(15, 2),
  
  -- User context
  classified_by UUID NOT NULL REFERENCES users(id),
  
  -- Posting status
  is_posted BOOLEAN DEFAULT FALSE,
  posted_journal_entry_id UUID, -- Set after posting
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRANSACTION SPLITS
-- ============================================================================

CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  raw_transaction_id UUID NOT NULL REFERENCES raw_transactions(id) ON DELETE CASCADE,
  
  -- Split Details
  split_number INTEGER NOT NULL, -- 1, 2, 3...
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  
  -- Account Assignment
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  tax_code_id UUID REFERENCES tax_codes(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(raw_transaction_id, split_number),
  CONSTRAINT split_amount_not_zero CHECK (amount != 0),
  CONSTRAINT split_number_positive CHECK (split_number > 0)
);

-- Validation: Sum of splits must equal raw transaction amount
CREATE OR REPLACE FUNCTION validate_split_totals()
RETURNS TRIGGER AS $$
DECLARE
  raw_amount DECIMAL(15, 2);
  split_total DECIMAL(15, 2);
BEGIN
  -- Get the raw transaction amount
  SELECT amount INTO raw_amount
  FROM raw_transactions
  WHERE id = NEW.raw_transaction_id;
  
  -- Calculate total of all splits
  SELECT COALESCE(SUM(amount), 0) INTO split_total
  FROM transaction_splits
  WHERE raw_transaction_id = NEW.raw_transaction_id;
  
  -- Check if totals match (allowing for small rounding differences)
  IF ABS(split_total - raw_amount) > 0.01 THEN
    RAISE EXCEPTION 'Split total (%) does not match raw transaction amount (%)', 
      split_total, raw_amount;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_split_totals
  AFTER INSERT OR UPDATE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION validate_split_totals();

-- ============================================================================
-- JOURNAL ENTRIES (DOUBLE-ENTRY CORE)
-- ============================================================================

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Entry Details
  entry_number VARCHAR(50) UNIQUE, -- Auto-generated: JE-2024-00001
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  
  -- Source Reference
  reference_type VARCHAR(50), -- 'transaction', 'adjustment', 'opening_balance'
  reference_id UUID, -- Could be raw_transaction_id or other
  
  -- Status
  status journal_entry_status DEFAULT 'draft',
  
  -- User context
  created_by UUID NOT NULL REFERENCES users(id),
  posted_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  posted_at TIMESTAMP WITH TIME ZONE,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0)
);

CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Line Details
  line_number INTEGER NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  
  -- Amounts (ONE must be non-zero, other must be zero)
  debit_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  credit_amount DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  
  -- Description (can override entry description)
  description TEXT,
  
  -- Tax Information
  is_tax_line BOOLEAN DEFAULT FALSE,
  tax_code_id UUID REFERENCES tax_codes(id) ON DELETE SET NULL,
  related_line_id UUID REFERENCES journal_lines(id), -- Link to the line this tax applies to
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(journal_entry_id, line_number),
  CONSTRAINT line_number_positive CHECK (line_number > 0),
  CONSTRAINT amounts_non_negative CHECK (debit_amount >= 0 AND credit_amount >= 0),
  CONSTRAINT one_side_only CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- CRITICAL: Enforce balanced journal entries
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debits DECIMAL(15, 2);
  total_credits DECIMAL(15, 2);
  entry_status journal_entry_status;
BEGIN
  -- Only validate when entry is being posted
  SELECT status INTO entry_status
  FROM journal_entries
  WHERE id = NEW.journal_entry_id;
  
  IF entry_status = 'posted' OR entry_status = 'locked' THEN
    -- Calculate totals
    SELECT 
      COALESCE(SUM(debit_amount), 0),
      COALESCE(SUM(credit_amount), 0)
    INTO total_debits, total_credits
    FROM journal_lines
    WHERE journal_entry_id = NEW.journal_entry_id;
    
    -- Check balance (allowing for small rounding differences)
    IF ABS(total_debits - total_credits) > 0.01 THEN
      RAISE EXCEPTION 'Journal entry % is not balanced. Debits: %, Credits: %',
        NEW.journal_entry_id, total_debits, total_credits;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_journal_entry_balance
  AFTER INSERT OR UPDATE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION validate_journal_entry_balance();

-- Prevent editing posted or locked entries
CREATE OR REPLACE FUNCTION prevent_posted_entry_modification()
RETURNS TRIGGER AS $$
DECLARE
  entry_status journal_entry_status;
BEGIN
  SELECT status INTO entry_status
  FROM journal_entries
  WHERE id = NEW.journal_entry_id;
  
  IF entry_status = 'locked' THEN
    RAISE EXCEPTION 'Cannot modify lines of a locked journal entry';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_entry_not_locked
  BEFORE UPDATE OR DELETE ON journal_lines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_posted_entry_modification();

-- ============================================================================
-- TAX TRANSACTIONS (Link between journal lines and tax codes)
-- ============================================================================

CREATE TABLE tax_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  journal_line_id UUID NOT NULL REFERENCES journal_lines(id) ON DELETE CASCADE,
  tax_code_id UUID NOT NULL REFERENCES tax_codes(id) ON DELETE RESTRICT,
  
  -- Tax Calculation
  net_amount DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) NOT NULL,
  gross_amount DECIMAL(15, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT tax_calculation_valid CHECK (
    ABS((net_amount + tax_amount) - gross_amount) < 0.01
  )
);

-- ============================================================================
-- FISCAL YEARS (Year Locking)
-- ============================================================================

CREATE TABLE fiscal_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  year_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES users(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(business_id, year_number),
  CONSTRAINT start_before_end CHECK (start_date < end_date),
  CONSTRAINT year_number_positive CHECK (year_number > 0)
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  -- Actor
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Action
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'post', 'lock'
  entity_type VARCHAR(50) NOT NULL, -- 'journal_entry', 'account', 'transaction'
  entity_id UUID NOT NULL,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Multi-tenant isolation
CREATE INDEX idx_businesses_deleted ON businesses(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_business_users_business ON business_users(business_id);
CREATE INDEX idx_business_users_user ON business_users(user_id);

-- Accounts
CREATE INDEX idx_accounts_business ON accounts(business_id);
CREATE INDEX idx_accounts_type ON accounts(business_id, account_type);
CREATE INDEX idx_accounts_active ON accounts(business_id, is_active);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id) WHERE parent_account_id IS NOT NULL;

-- Import batches
CREATE INDEX idx_import_batches_business ON import_batches(business_id);
CREATE INDEX idx_import_batches_status ON import_batches(business_id, status);
CREATE INDEX idx_import_batches_created ON import_batches(business_id, created_at DESC);

-- Raw transactions (critical for deduplication)
CREATE INDEX idx_raw_transactions_business ON raw_transactions(business_id);
CREATE INDEX idx_raw_transactions_date ON raw_transactions(business_id, transaction_date);
CREATE INDEX idx_raw_transactions_state ON raw_transactions(business_id, state);
CREATE INDEX idx_raw_transactions_hash ON raw_transactions(hash_signature);
CREATE INDEX idx_raw_transactions_batch ON raw_transactions(import_batch_id);

-- Classified transactions
CREATE INDEX idx_classified_transactions_business ON classified_transactions(business_id);
CREATE INDEX idx_classified_transactions_raw ON classified_transactions(raw_transaction_id);
CREATE INDEX idx_classified_transactions_posted ON classified_transactions(business_id, is_posted);

-- Transaction splits
CREATE INDEX idx_transaction_splits_business ON transaction_splits(business_id);
CREATE INDEX idx_transaction_splits_raw ON transaction_splits(raw_transaction_id);

-- Journal entries (MOST CRITICAL FOR REPORTING)
CREATE INDEX idx_journal_entries_business ON journal_entries(business_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(business_id, entry_date);
CREATE INDEX idx_journal_entries_status ON journal_entries(business_id, status);
CREATE INDEX idx_journal_entries_number ON journal_entries(entry_number);

-- Journal lines (USED BY ALL REPORTS)
CREATE INDEX idx_journal_lines_business ON journal_lines(business_id);
CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX idx_journal_lines_date_account ON journal_lines(business_id, account_id, id); -- For account balance queries

-- Composite index for report queries
CREATE INDEX idx_journal_lines_reporting ON journal_lines(business_id, account_id) 
  INCLUDE (debit_amount, credit_amount);

-- Tax transactions
CREATE INDEX idx_tax_transactions_business ON tax_transactions(business_id);
CREATE INDEX idx_tax_transactions_line ON tax_transactions(journal_line_id);
CREATE INDEX idx_tax_transactions_code ON tax_transactions(tax_code_id);

-- Fiscal years
CREATE INDEX idx_fiscal_years_business ON fiscal_years(business_id);
CREATE INDEX idx_fiscal_years_dates ON fiscal_years(business_id, start_date, end_date);

-- Audit logs
CREATE INDEX idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);

-- ============================================================================
-- MATERIALIZED VIEW: ACCOUNT BALANCES (For Performance)
-- ============================================================================

CREATE MATERIALIZED VIEW account_balances AS
SELECT 
  jl.business_id,
  jl.account_id,
  a.account_type,
  SUM(jl.debit_amount) as total_debits,
  SUM(jl.credit_amount) as total_credits,
  -- Calculate balance based on account type normal balance
  CASE 
    WHEN a.account_type IN ('asset', 'expense') THEN 
      SUM(jl.debit_amount) - SUM(jl.credit_amount)
    ELSE 
      SUM(jl.credit_amount) - SUM(jl.debit_amount)
  END as balance
FROM journal_lines jl
JOIN journal_entries je ON jl.journal_entry_id = je.id
JOIN accounts a ON jl.account_id = a.id
WHERE je.status = 'posted'
GROUP BY jl.business_id, jl.account_id, a.account_type;

CREATE UNIQUE INDEX idx_account_balances_unique ON account_balances(business_id, account_id);

-- Function to refresh balances
CREATE OR REPLACE FUNCTION refresh_account_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate journal entry number
CREATE OR REPLACE FUNCTION generate_entry_number(
  p_business_id UUID,
  p_entry_date DATE
)
RETURNS VARCHAR AS $$
DECLARE
  v_year VARCHAR(4);
  v_sequence INTEGER;
  v_entry_number VARCHAR(50);
BEGIN
  v_year := EXTRACT(YEAR FROM p_entry_date)::VARCHAR;
  
  -- Get next sequence for this year
  SELECT COALESCE(MAX(
    SUBSTRING(entry_number FROM '\d+$')::INTEGER
  ), 0) + 1
  INTO v_sequence
  FROM journal_entries
  WHERE business_id = p_business_id
    AND entry_number LIKE 'JE-' || v_year || '-%';
  
  v_entry_number := 'JE-' || v_year || '-' || LPAD(v_sequence::VARCHAR, 5, '0');
  
  RETURN v_entry_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate trial balance (must always = 0)
CREATE OR REPLACE FUNCTION calculate_trial_balance(
  p_business_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  v_total_debits DECIMAL(15, 2);
  v_total_credits DECIMAL(15, 2);
BEGIN
  SELECT 
    COALESCE(SUM(jl.debit_amount), 0),
    COALESCE(SUM(jl.credit_amount), 0)
  INTO v_total_debits, v_total_credits
  FROM journal_lines jl
  JOIN journal_entries je ON jl.journal_entry_id = je.id
  WHERE jl.business_id = p_business_id
    AND je.status = 'posted'
    AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
    AND (p_end_date IS NULL OR je.entry_date <= p_end_date);
  
  -- Return difference (should always be 0)
  RETURN v_total_debits - v_total_credits;
END;
$$ LANGUAGE plpgsql;

-- Generate hash signature for raw transaction
CREATE OR REPLACE FUNCTION generate_transaction_hash(
  p_business_id UUID,
  p_transaction_date DATE,
  p_description TEXT,
  p_amount DECIMAL(15, 2),
  p_source_account_name VARCHAR(255)
)
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(
    digest(
      p_business_id::TEXT || 
      p_transaction_date::TEXT || 
      LOWER(TRIM(p_description)) ||
      p_amount::TEXT ||
      COALESCE(LOWER(TRIM(p_source_account_name)), ''),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA FUNCTIONS
-- ============================================================================

-- Create default chart of accounts for a new business
CREATE OR REPLACE FUNCTION seed_default_chart_of_accounts(p_business_id UUID)
RETURNS void AS $$
BEGIN
  -- ASSETS
  INSERT INTO accounts (business_id, code, name, account_type, account_subtype, is_system) VALUES
  (p_business_id, '1000', 'Cash', 'asset', 'bank', true),
  (p_business_id, '1200', 'Accounts Receivable', 'asset', 'accounts_receivable', true),
  (p_business_id, '1500', 'Inventory', 'asset', 'general', true),
  (p_business_id, '1700', 'Equipment', 'asset', 'fixed_asset', true);
  
  -- LIABILITIES
  INSERT INTO accounts (business_id, code, name, account_type, account_subtype, is_system) VALUES
  (p_business_id, '2000', 'Accounts Payable', 'liability', 'accounts_payable', true),
  (p_business_id, '2100', 'Credit Card Payable', 'liability', 'credit_card', true),
  (p_business_id, '2200', 'Sales Tax Payable', 'liability', 'tax_payable', true);
  
  -- EQUITY
  INSERT INTO accounts (business_id, code, name, account_type, account_subtype, is_system) VALUES
  (p_business_id, '3000', 'Owner Contribution', 'equity', 'owner_contribution', true),
  (p_business_id, '3100', 'Owner Draw', 'equity', 'owner_draw', true),
  (p_business_id, '3900', 'Retained Earnings', 'equity', 'retained_earnings', true);
  
  -- REVENUE
  INSERT INTO accounts (business_id, code, name, account_type, account_subtype, is_system) VALUES
  (p_business_id, '4000', 'Sales Revenue', 'revenue', 'general', true),
  (p_business_id, '4100', 'Service Revenue', 'revenue', 'general', true);
  
  -- EXPENSES
  INSERT INTO accounts (business_id, code, name, account_type, account_subtype, is_system) VALUES
  (p_business_id, '5000', 'Cost of Goods Sold', 'expense', 'cost_of_goods_sold', true),
  (p_business_id, '6000', 'Rent Expense', 'expense', 'operating_expense', true),
  (p_business_id, '6100', 'Utilities Expense', 'expense', 'operating_expense', true),
  (p_business_id, '6200', 'Office Supplies', 'expense', 'operating_expense', true),
  (p_business_id, '6300', 'Professional Fees', 'expense', 'operating_expense', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATABASE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE raw_transactions IS 'Immutable storage of imported transactions. Never modify after creation.';
COMMENT ON TABLE journal_entries IS 'Core double-entry journal. All financial impact flows through here.';
COMMENT ON TABLE journal_lines IS 'Individual debit/credit lines. Total debits must equal total credits per entry.';
COMMENT ON TABLE accounts IS 'Chart of accounts. Defines where money comes from and goes to.';

COMMENT ON FUNCTION validate_journal_entry_balance() IS 'CRITICAL: Prevents unbalanced journal entries. Debits must equal credits.';
COMMENT ON FUNCTION prevent_raw_transaction_update() IS 'CRITICAL: Enforces immutability of raw transaction data.';
COMMENT ON FUNCTION calculate_trial_balance(UUID, DATE, DATE) IS 'Returns trial balance. Should ALWAYS be zero if accounting is correct.';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
