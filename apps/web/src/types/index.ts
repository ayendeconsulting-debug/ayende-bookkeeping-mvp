/* ── Business & Auth ─────────────────────────────────────────────────────── */

export interface Business {
  id: string;
  name: string;
  created_at: string;
}

/* ── Accounts ────────────────────────────────────────────────────────────── */

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export type AccountSubtype =
  | 'bank'
  | 'credit_card'
  | 'owner_contribution'
  | 'owner_draw'
  | 'tax_payable'
  | 'accounts_receivable'
  | 'accounts_payable'
  | null;

export interface Account {
  id: string;
  business_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  is_active: boolean;
  balance?: number;
  created_at: string;
}

/* ── Transactions ────────────────────────────────────────────────────────── */

export type TransactionSource = 'plaid' | 'csv' | 'pdf' | 'manual';
export type TransactionStatus = 'pending' | 'classified' | 'posted' | 'ignored';

export interface RawTransaction {
  id: string;
  business_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  source: TransactionSource;
  status: TransactionStatus;
  plaid_transaction_id?: string;
  plaid_account_id?: string;
  plaid_category?: string;
  created_at: string;
}

/* ── Journal Entries ────────────────────────────────────────────────────── */

export type JournalEntryStatus = 'draft' | 'posted' | 'locked';

export interface JournalLine {
  id: string;
  account_id: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  is_tax_line: boolean;
}

export interface JournalEntry {
  id: string;
  business_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: JournalEntryStatus;
  journal_lines: JournalLine[];
  created_at: string;
}

/* ── Tax Codes ───────────────────────────────────────────────────────────── */

export type TaxType = 'input' | 'output';

export interface TaxCode {
  id: string;
  business_id: string;
  code: string;
  name: string;
  rate: number;
  tax_type: TaxType;
  tax_account_id: string;
  is_active: boolean;
}

/* ── Plaid / Bank Connections ─────────────────────────────────────────────── */

export type PlaidItemStatus = 'active' | 'error' | 'disconnected';

export interface PlaidItem {
  id: string;
  business_id: string;
  item_id: string;
  institution_name: string;
  institution_id: string;
  status: PlaidItemStatus;
  last_synced_at?: string;
  created_at: string;
}

export interface PlaidAccount {
  id: string;
  plaid_item_id: string;
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype?: string;
  current_balance?: number;
  available_balance?: number;
  currency_code: string;
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export interface ReportLine {
  account_id: string;
  account_code: string;
  account_name: string;
  amount: number;
}

export interface IncomeStatement {
  business_id: string;
  start_date: string;
  end_date: string;
  revenue: ReportLine[];
  expenses: ReportLine[];
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}

export interface BalanceSheet {
  business_id: string;
  as_of_date: string;
  assets: ReportLine[];
  liabilities: ReportLine[];
  equity: ReportLine[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}

export interface TrialBalanceLine {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  total_debits: number;
  total_credits: number;
}

export interface TrialBalance {
  business_id: string;
  as_of_date: string;
  lines: TrialBalanceLine[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
}

/* ── Classification ─────────────────────────────────────────────────────── */

export interface ClassificationRule {
  id: string;
  business_id: string;
  match_type: 'keyword' | 'vendor' | 'account';
  match_value: string;
  target_account_id: string;
  priority: number;
  is_active: boolean;
}

/* ── AI ──────────────────────────────────────────────────────────────────── */

export interface AiClassificationSuggestion {
  raw_transaction_id: string;
  suggested_account_id: string;
  suggested_account_name: string;
  suggested_tax_code_id?: string;
  suggested_tax_code_name?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ── API Responses ───────────────────────────────────────────────────────── */

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}

