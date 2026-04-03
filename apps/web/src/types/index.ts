/* ── Business & Auth ─────────────────────────────────────────────────────────── */

export type BusinessMode = 'business' | 'freelancer' | 'personal';

export interface Business {
  id: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  currency_code: string;
  fiscal_year_end: string;
  mode: BusinessMode;
  country: string;
  settings: Record<string, any>;
  created_at: string;
}

/* ── Accounts ────────────────────────────────────────────────────────────────── */

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
  currency_code?: string;
  balance?: number;
  created_at: string;
}

/* ── Transactions ────────────────────────────────────────────────────────────── */

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
  is_personal: boolean;
  currency_code?: string;
  original_amount?: number;
  plaid_transaction_id?: string;
  source_account_name?: string;
  plaid_account_id?: string;
  plaid_category?: string;
  created_at: string;
}

/* ── Journal Entries ─────────────────────────────────────────────────────────── */

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

/* ── Tax Codes ───────────────────────────────────────────────────────────────── */

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

/* ── Plaid / Bank Connections ────────────────────────────────────────────────── */

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

/* ── Reports ─────────────────────────────────────────────────────────────────── */

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

/* ── Classification ──────────────────────────────────────────────────────────── */

export interface ClassificationRule {
  id: string;
  business_id: string;
  match_type: 'keyword' | 'vendor' | 'account';
  match_value: string;
  target_account_id: string;
  priority: number;
  is_active: boolean;
}

/* ── AI ──────────────────────────────────────────────────────────────────────── */

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

/* ── Phase 5 — Invoices ──────────────────────────────────────────────────────── */

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void';

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_code_id?: string;
  line_total: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes?: string;
  linked_journal_entry_id?: string;
  line_items: InvoiceLineItem[];
  created_at: string;
}

/* ── Phase 5 — AR/AP ─────────────────────────────────────────────────────────── */

export type ArApType = 'receivable' | 'payable';
export type ArApStatus = 'outstanding' | 'partially_paid' | 'paid' | 'overdue' | 'void';

export interface ArApRecord {
  id: string;
  business_id: string;
  type: ArApType;
  party_name: string;
  party_email?: string;
  amount: number;
  amount_paid: number;
  due_date: string;
  description?: string;
  status: ArApStatus;
  linked_journal_entry_id?: string;
  created_at: string;
}

/* ── Phase 5 — Recurring Transactions ───────────────────────────────────────── */

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type RecurringStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface RecurringTransaction {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  currency_code: string;
  debit_account_id: string;
  credit_account_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  next_run_date?: string;
  status: RecurringStatus;
  is_personal: boolean;
  last_posted_at?: string;
  created_at: string;
}

/* ── Phase 5 — Budget Categories ────────────────────────────────────────────── */

export interface BudgetCategory {
  id: string;
  business_id: string;
  name: string;
  monthly_target?: number | null;
  color: string;
  icon?: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface BudgetCategoryWithSpending extends BudgetCategory {
  spent_this_month: number;
  remaining: number | null;
  over_budget: boolean;
  percentage_spent: number | null;
}

/* ── Phase 5 — Savings Goals ─────────────────────────────────────────────────── */

export type SavingsGoalStatus = 'active' | 'paused' | 'completed';

export interface SavingsGoal {
  id: string;
  business_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  linked_account_id?: string;
  status: SavingsGoalStatus;
  created_at: string;
}

export interface SavingsGoalWithProgress extends SavingsGoal {
  percentage_complete: number;
  projected_completion_date: string | null;
  required_monthly_contribution: number | null;
}

/* ── Phase 5 — Mileage Logs ──────────────────────────────────────────────────── */

export interface MileageLog {
  id: string;
  business_id: string;
  user_id: string;
  trip_date: string;
  start_location: string;
  end_location: string;
  purpose: string;
  distance_km: number;
  rate_per_km: number;
  deduction_value: number;
  country: string;
  created_at: string;
}

export interface MileageLogResult {
  data: MileageLog[];
  total_distance: number;
  total_deduction: number;
  unit: string;
}

/* ── Phase 5 — Payment Reminders ────────────────────────────────────────────── */

export type PaymentReminderStatus = 'pending' | 'paid' | 'dismissed' | 'snoozed';

export interface PaymentReminder {
  id: string;
  business_id: string;
  recurring_transaction_id: string;
  due_date: string;
  estimated_amount: number;
  status: PaymentReminderStatus;
  snoozed_until?: string;
  matched_raw_transaction_id?: string;
  created_at: string;
}

/* ── Phase 5 — Tax Estimate ──────────────────────────────────────────────────── */

export interface QuarterEstimate {
  quarter: number;
  label: string;
  due_date: string;
  start_date: string;
  end_date: string;
  net_income: number;
  estimated_tax: number;
  breakdown: Record<string, number>;
}

export interface TaxEstimateResult {
  year: number;
  country: string;
  annual_net_income: number;
  annual_estimated_tax: number;
  quarters: QuarterEstimate[];
  disclaimer: string;
}

/* ── Phase 5 — Net Worth ─────────────────────────────────────────────────────── */

export interface PlaidAccountBalance {
  name: string;
  type: string;
  subtype: string;
  current_balance: number;
  currency_code: string;
}

export interface CoaAccountBalance {
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  balance: number;
}

export interface NetWorthResult {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  plaid_assets: PlaidAccountBalance[];
  plaid_liabilities: PlaidAccountBalance[];
  coa_assets: CoaAccountBalance[];
  coa_liabilities: CoaAccountBalance[];
}

/* ── API Responses ───────────────────────────────────────────────────────────── */

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}
