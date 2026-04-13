/* â”€â”€ Business & Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
  anomaly_flags?: string[] | null; // Phase 15 â€“ persisted from AI explain job
  personal_category_id?: string | null; // Phase 17 â€“ manual budget category assignment
  classified_id?: string | null;
  classified_account_id?: string | null;
  classified_source_account_id?: string | null;
  created_at: string;
}

/* â”€â”€ Split Lines (Phase 14) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface TransactionSplitLine {
  id: string;
  split_number: number;
  amount: number;
  description: string | null;
  account_id: string;
  account?: Account;
}

/* â”€â”€ Journal Entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Tax Codes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Plaid / Bank Connections â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface ClassificationRule {
  id: string;
  business_id: string;
  name?: string;
  match_type: 'keyword' | 'vendor' | 'account';
  match_value: string;
  target_account_id: string;
  priority: number;
  is_active: boolean;
  source?: string; // 'user_learned' | 'manual' | undefined
  tax_code_id?: string;
}

/* â”€â”€ AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export type InvoiceStatus =
  | 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'void';

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
  lineItems?: InvoiceLineItem[];
  created_at: string;
  is_recurring?: boolean;
  recurring_frequency?: string;
  recurring_next_date?: string;
  auto_send?: boolean;
}

/* â”€â”€ Phase 5 â€“ AR/AP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Recurring Transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Budget Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
  category_type?: 'expense' | 'income';
}

export interface BudgetCategoryWithSpending extends BudgetCategory {
  spent_this_month: number;
  remaining: number | null;
  over_budget: boolean;
  percentage_spent: number | null;
}

/* â”€â”€ Phase 5 â€“ Savings Goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Mileage Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Payment Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Tax Estimate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Net Worth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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

/* â”€â”€ Phase 5 â€“ Recurring Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface RecurringDetectionCandidate {
  key: string;
  merchant: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  last_date: string;
  next_date: string;
  occurrence_count: number;
  type: string;
}

export interface ConfirmedRecurring extends RecurringDetectionCandidate {
  is_due_soon: boolean;
}

/* â”€â”€ API Responses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface ApiError {
  message: string;
  error: string;
  statusCode: number;
}

/* â”€â”€ Phase 5 â€“ Upcoming Reminders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface UpcomingReminder {
  key: string;
  merchant: string;
  amount: number;
  frequency: string;
  due_date: string;
  type: string;
  days_until: number;
  is_due_soon: boolean;
}

export interface UpcomingRemindersResult {
  reminders: UpcomingReminder[];
  total_due_7_days: number;
  total_due_30_days: number;
  current_balance: number;
  balance_warning: boolean;
  balance_shortfall: number;
}

/* -- Phase 17 ï¿½ Personal Cashflow -------------------------------------------------------------- */

export interface PersonalCashflow {
  money_in: number;
  money_out: number;
  net: number;
  start_date: string;
  end_date: string;
}

export interface PersonalRule {
  id: string;
  business_id: string;
  match_type: string;
  match_value: string;
  budget_category_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
