// ─── Shared interfaces (also imported by business-enriched.ts) ───────────────

export interface EnrichedSeedTx {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;        // positive = income, negative = expense
  accountCode: string;   // account_code in the business chart of accounts
}

export interface SeedMileageEntry {
  trip_date: string;
  start_location: string;
  end_location: string;
  purpose: string;
  distance_km: number;
  rate_per_km: number;
  deduction_value: number;
}

export interface SeedHstPeriodEntry {
  period_start: string;
  period_end: string;
  status: 'open' | 'filed' | 'locked';
  total_hst_collected: number | null;
  total_itc_claimed: number | null;
  net_tax_owing: number | null;
  filed_at: string | null;
}

export interface SeedSavingsGoalEntry {
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: 'active' | 'completed';
}

export interface SeedInvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface SeedInvoiceEntry {
  invoice_number: string;
  client_name: string;
  client_email: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  lines: SeedInvoiceLine[];
}

export interface FreelancerEnrichedDataset {
  transactions: EnrichedSeedTx[];
  mileage: SeedMileageEntry[];
  hstPeriods: SeedHstPeriodEntry[];
  savingsGoals: SeedSavingsGoalEntry[];
  invoices: SeedInvoiceEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Ayende Pro — UX/Product Consultant, Toronto ON, HST# 123456789 RT0001
// Oct 2025 – Apr 2026  |  Freelancer mode  |  Pro plan
//
// POSTING RULE (enforced in seedEnrichedData):
//   Transactions dated < 2026-04-01 → classified + posted journal entry
//   Transactions dated ≥ 2026-04-01 → raw PENDING only  (shows in inbox)
//
// DASHBOARD (Oct–Mar posted):
//   Revenue       $74,241.44
//   Bus. Expenses  $4,835.46  (5xxx / 6xxx only — draws & HST excluded)
//   Net Income    $69,405.98
//   Pending            16 tx  (April)
// ─────────────────────────────────────────────────────────────────────────────

export const FREELANCER_ENRICHED: FreelancerEnrichedDataset = {

  // ─── TRANSACTIONS ──────────────────────────────────────────────────────────
  transactions: [

    // ── October 2025 ─────────────────────────────────────────────────────────
    { date: '2025-10-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2025-10-02', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  4500.00, accountCode: '4000' },
    { date: '2025-10-05', description: 'CONSULTING INVOICE INV-001',          amount:  1850.00, accountCode: '4000' },
    { date: '2025-10-14', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2025-10-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2025-10-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2025-10-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2025-10-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2025-10-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2025-10-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2025-10-18', description: 'HOME OFFICE SUPPLIES STAPLES',        amount:   -87.45, accountCode: '5300' },
    { date: '2025-10-20', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2025-10-22', description: 'VIA RAIL TORONTO OTTAWA',             amount:  -214.00, accountCode: '5800' },
    { date: '2025-10-24', description: 'CLIENT LUNCH CANOE RESTAURANT',       amount:  -127.40, accountCode: '5000' },
    { date: '2025-10-25', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2025-10-31', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── November 2025 ────────────────────────────────────────────────────────
    { date: '2025-11-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2025-11-03', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  4500.00, accountCode: '4000' },
    { date: '2025-11-05', description: 'FINARA LABS PROJECT PAYMENT',         amount:  8500.00, accountCode: '4000' },
    { date: '2025-11-15', description: 'CONSULTING INVOICE INV-002',          amount:  2200.00, accountCode: '4000' },
    { date: '2025-11-28', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2025-11-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2025-11-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2025-11-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2025-11-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2025-11-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2025-11-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2025-11-14', description: 'CLIENT LUNCH CANOE RESTAURANT',       amount:  -156.80, accountCode: '5000' },
    { date: '2025-11-18', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2025-11-20', description: 'PROFESSIONAL DEVELOPMENT UDEMY',      amount:   -29.99, accountCode: '5000' },
    { date: '2025-11-25', description: 'HST REMITTANCE CRA Q3 2025',          amount:  -487.50, accountCode: '2100' },
    { date: '2025-11-29', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2025-11-30', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── December 2025 ────────────────────────────────────────────────────────
    { date: '2025-12-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2025-12-03', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  4500.00, accountCode: '4000' },
    { date: '2025-12-05', description: 'CONSULTING INVOICE INV-003',          amount:  3100.00, accountCode: '4000' },
    { date: '2025-12-28', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2025-12-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2025-12-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2025-12-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2025-12-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2025-12-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2025-12-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2025-12-15', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2025-12-18', description: 'ACCOUNTANT FEE YEAR END',             amount:  -450.00, accountCode: '5200' },
    { date: '2025-12-20', description: 'YEAR END CLIENT GIFTS AMAZON',        amount:  -156.00, accountCode: '5000' },
    { date: '2025-12-22', description: 'HOME OFFICE CHAIR WAYFAIR',           amount:  -329.00, accountCode: '5300' },
    { date: '2025-12-31', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2025-12-31', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── January 2026 ─────────────────────────────────────────────────────────
    { date: '2026-01-02', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2026-01-04', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  4500.00, accountCode: '4000' },
    { date: '2026-01-06', description: 'CONSULTING INVOICE INV-004',          amount:  1750.00, accountCode: '4000' },
    { date: '2026-01-14', description: 'HARBOUR CO CONSULTING PAYMENT',       amount:  3200.00, accountCode: '4000' },
    { date: '2026-01-16', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2026-01-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2026-01-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2026-01-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2026-01-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2026-01-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2026-01-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2026-01-15', description: 'CLIENT MEETING LUNCH CANOE',          amount:   -98.60, accountCode: '5000' },
    { date: '2026-01-18', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2026-01-20', description: 'HOME OFFICE MONITOR AMAZON',          amount:  -389.00, accountCode: '5300' },
    { date: '2026-01-25', description: 'HST REMITTANCE CRA Q4 2025',          amount: -1144.00, accountCode: '2100' },
    { date: '2026-01-31', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2026-01-31', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── February 2026 ────────────────────────────────────────────────────────
    { date: '2026-02-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2026-02-03', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  5400.00, accountCode: '4000' },
    { date: '2026-02-05', description: 'CONSULTING INVOICE INV-005',          amount:  2450.00, accountCode: '4000' },
    { date: '2026-02-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2026-02-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2026-02-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2026-02-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2026-02-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2026-02-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2026-02-14', description: 'PROFESSIONAL DEVELOPMENT COURSERA',   amount:   -49.00, accountCode: '5000' },
    { date: '2026-02-18', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2026-02-20', description: 'CLIENT COFFEE MEETING BALZAC',        amount:   -28.40, accountCode: '5000' },
    { date: '2026-02-22', description: 'VIA RAIL TORONTO OTTAWA',             amount:  -189.00, accountCode: '5800' },
    { date: '2026-02-28', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2026-02-28', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── March 2026 ───────────────────────────────────────────────────────────
    { date: '2026-03-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2026-03-03', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  5400.00, accountCode: '4000' },
    { date: '2026-03-05', description: 'CONSULTING INVOICE INV-006',          amount:  1980.00, accountCode: '4000' },
    { date: '2026-03-15', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2026-03-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2026-03-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2026-03-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2026-03-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2026-03-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2026-03-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2026-03-14', description: 'CLIENT LUNCH CANOE RESTAURANT',       amount:  -142.20, accountCode: '5000' },
    { date: '2026-03-18', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2026-03-20', description: 'PROFESSIONAL DEVELOPMENT CONFERENCE', amount:  -395.00, accountCode: '5000' },
    { date: '2026-03-25', description: 'HST REMITTANCE CRA Q1 2026',          amount: -1325.00, accountCode: '2100' },
    { date: '2026-03-31', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
    { date: '2026-03-31', description: 'CST SAVINGS TRANSFER',                amount:   -50.00, accountCode: '5000' },

    // ── April 2026 (PENDING — raw transactions only, no journal entries) ─────
    { date: '2026-04-01', description: 'EMPLOYER DIRECT DEPOSIT',             amount:  2610.24, accountCode: '4000' },
    { date: '2026-04-03', description: 'CLEARVIEW AGENCY STRIPE TRANSFER',    amount:  5400.00, accountCode: '4000' },
    { date: '2026-04-05', description: 'CONSULTING INVOICE INV-007',          amount:  2750.00, accountCode: '4000' },
    { date: '2026-04-14', description: 'CLIENT RETAINER PAYMENT',             amount:   950.00, accountCode: '4000' },
    { date: '2026-04-07', description: 'ADOBE CREATIVE CLOUD',                amount:   -82.49, accountCode: '5000' },
    { date: '2026-04-07', description: 'NOTION SUBSCRIPTION',                 amount:   -20.00, accountCode: '5000' },
    { date: '2026-04-08', description: 'ROGERS WIRELESS',                     amount:   -78.50, accountCode: '5000' },
    { date: '2026-04-10', description: 'GITHUB SUBSCRIPTION',                 amount:   -21.00, accountCode: '5000' },
    { date: '2026-04-12', description: 'MICROSOFT 365 SUBSCRIPTION',          amount:   -22.00, accountCode: '5000' },
    { date: '2026-04-13', description: 'AUDIBLE SUBSCRIPTION',                amount:   -15.70, accountCode: '5000' },
    { date: '2026-04-18', description: 'FORESTERS LIFE INSURANCE',            amount:   -42.58, accountCode: '5400' },
    { date: '2026-04-20', description: 'HOME OFFICE SUPPLIES STAPLES',        amount:   -94.20, accountCode: '5300' },
    { date: '2026-04-22', description: 'CLIENT MEETING LUNCH CANOE',          amount:   -71.40, accountCode: '5000' },
    { date: '2026-04-25', description: 'PROFESSIONAL DEVELOPMENT COURSERA',   amount:   -49.00, accountCode: '5000' },
    { date: '2026-04-28', description: 'TD BANK MONTHLY FEE',                 amount:   -14.95, accountCode: '5100' },
    { date: '2026-04-30', description: 'OWNER DRAW TRANSFER',                 amount: -2500.00, accountCode: '3200' },
  ],

  // ─── MILEAGE LOGS (28 trips, Oct 2025 – Apr 2026) ─────────────────────────
  // CRA rate: 2025 = $0.7200/km | 2026 = $0.7400/km (first 5,000 km)
  mileage: [
    // October 2025
    { trip_date: '2025-10-03', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Client kickoff meeting — Q4 sprint planning',            distance_km: 42, rate_per_km: 0.7200, deduction_value: 30.24 },
    { trip_date: '2025-10-09', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Coworking day — client discovery calls',                  distance_km: 38, rate_per_km: 0.7200, deduction_value: 27.36 },
    { trip_date: '2025-10-15', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Staples, 1370 Victoria Park Ave, Toronto',           purpose: 'Office supplies — printer paper and toner',               distance_km: 12, rate_per_km: 0.7200, deduction_value:  8.64 },
    { trip_date: '2025-10-22', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Sprint review and stakeholder presentation',              distance_km: 42, rate_per_km: 0.7200, deduction_value: 30.24 },
    // November 2025
    { trip_date: '2025-11-06', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Finara Labs, 7100 Woodbine Ave, Markham',            purpose: 'Discovery workshop — mobile onboarding UX',               distance_km: 52, rate_per_km: 0.7200, deduction_value: 37.44 },
    { trip_date: '2025-11-13', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Mid-sprint design review',                                distance_km: 42, rate_per_km: 0.7200, deduction_value: 30.24 },
    { trip_date: '2025-11-19', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Focused work day — prototype delivery',                   distance_km: 38, rate_per_km: 0.7200, deduction_value: 27.36 },
    { trip_date: '2025-11-26', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Finara Labs, 7100 Woodbine Ave, Markham',            purpose: 'UX research synthesis and handoff',                       distance_km: 52, rate_per_km: 0.7200, deduction_value: 37.44 },
    // December 2025
    { trip_date: '2025-12-04', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Q4 retrospective and Q1 planning',                        distance_km: 42, rate_per_km: 0.7200, deduction_value: 30.24 },
    { trip_date: '2025-12-11', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'CF Toronto Eaton Centre, 220 Yonge St, Toronto',    purpose: 'Year-end client gift purchasing',                          distance_km: 28, rate_per_km: 0.7200, deduction_value: 20.16 },
    { trip_date: '2025-12-16', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Year-end client wrap-up calls',                           distance_km: 38, rate_per_km: 0.7200, deduction_value: 27.36 },
    { trip_date: '2025-12-19', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Harbour & Co, 2500 Argentia Rd, Mississauga',       purpose: 'Q1 project scoping meeting',                              distance_km: 61, rate_per_km: 0.7200, deduction_value: 43.92 },
    // January 2026
    { trip_date: '2026-01-08', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Q1 design sprint kickoff',                                distance_km: 42, rate_per_km: 0.7400, deduction_value: 31.08 },
    { trip_date: '2026-01-14', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Harbour & Co, 2500 Argentia Rd, Mississauga',       purpose: 'Contract signing and brand workshop kickoff',             distance_km: 61, rate_per_km: 0.7400, deduction_value: 45.14 },
    { trip_date: '2026-01-21', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Client presentation prep and deep work',                  distance_km: 38, rate_per_km: 0.7400, deduction_value: 28.12 },
    { trip_date: '2026-01-28', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Staples, 1370 Victoria Park Ave, Toronto',           purpose: 'Monitor stand and cables — home office upgrade',          distance_km: 12, rate_per_km: 0.7400, deduction_value:  8.88 },
    // February 2026
    { trip_date: '2026-02-04', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Design system workshop with dev team',                    distance_km: 42, rate_per_km: 0.7400, deduction_value: 31.08 },
    { trip_date: '2026-02-11', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Finara Labs, 7100 Woodbine Ave, Markham',            purpose: 'Prototype usability testing sessions',                    distance_km: 52, rate_per_km: 0.7400, deduction_value: 38.48 },
    { trip_date: '2026-02-18', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Proposal writing and client communications',              distance_km: 38, rate_per_km: 0.7400, deduction_value: 28.12 },
    { trip_date: '2026-02-24', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Harbour & Co, 2500 Argentia Rd, Mississauga',       purpose: 'Project milestone review — brand direction approval',     distance_km: 61, rate_per_km: 0.7400, deduction_value: 45.14 },
    // March 2026
    { trip_date: '2026-03-04', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'UI handoff to development team',                          distance_km: 42, rate_per_km: 0.7400, deduction_value: 31.08 },
    { trip_date: '2026-03-11', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Metro Toronto Convention Centre, 255 Front St W',   purpose: 'UX Canada Conference — speaking engagement',              distance_km: 35, rate_per_km: 0.7400, deduction_value: 25.90 },
    { trip_date: '2026-03-17', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Client calls and Q2 proposal review',                    distance_km: 38, rate_per_km: 0.7400, deduction_value: 28.12 },
    { trip_date: '2026-03-25', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Finara Labs, 7100 Woodbine Ave, Markham',            purpose: 'Phase 2 design sprint kickoff',                           distance_km: 52, rate_per_km: 0.7400, deduction_value: 38.48 },
    // April 2026
    { trip_date: '2026-04-02', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Clearview Agency, 150 King St W, Toronto',          purpose: 'Q2 strategy session',                                     distance_km: 42, rate_per_km: 0.7400, deduction_value: 31.08 },
    { trip_date: '2026-04-09', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'BlueSky Digital, 1 Yonge St, Toronto',              purpose: 'New client discovery meeting',                            distance_km: 44, rate_per_km: 0.7400, deduction_value: 32.56 },
    { trip_date: '2026-04-16', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'WeWork, 240 King St W, Toronto',                     purpose: 'Product design sprint — full day',                        distance_km: 38, rate_per_km: 0.7400, deduction_value: 28.12 },
    { trip_date: '2026-04-23', start_location: '14 Compton Cres, Scarborough, ON M1K 2P4',    end_location: 'Finara Labs, 7100 Woodbine Ave, Markham',            purpose: 'Stakeholder review — Phase 2 progress demo',              distance_km: 52, rate_per_km: 0.7400, deduction_value: 38.48 },
  ],

  // ─── HST PERIODS ───────────────────────────────────────────────────────────
  hstPeriods: [
    {
      period_start:          '2025-10-01',
      period_end:            '2025-12-31',
      status:                'locked',
      total_hst_collected:   2150.00,
      total_itc_claimed:      412.50,
      net_tax_owing:         1737.50,
      filed_at:              '2026-01-28',
    },
    {
      period_start:          '2026-01-01',
      period_end:            '2026-03-31',
      status:                'filed',
      total_hst_collected:   2385.00,
      total_itc_claimed:      387.25,
      net_tax_owing:         1997.75,
      filed_at:              '2026-04-14',
    },
    {
      period_start:          '2026-04-01',
      period_end:            '2026-06-30',
      status:                'open',
      total_hst_collected:    842.00,
      total_itc_claimed:      156.00,
      net_tax_owing:          686.00,
      filed_at:              null,
    },
  ],

  // ─── SAVINGS GOALS ─────────────────────────────────────────────────────────
  savingsGoals: [
    {
      name:           'Tax Reserve Fund',
      target_amount:  12000.00,
      current_amount:  7840.00,
      target_date:    '2026-12-31',
      status:         'active',
    },
    {
      name:           'Equipment Upgrade',
      target_amount:   4500.00,
      current_amount:  1200.00,
      target_date:    '2026-09-30',
      status:         'active',
    },
    {
      name:           'Emergency Fund',
      target_amount:  15000.00,
      current_amount: 15000.00,
      target_date:    null,
      status:         'completed',
    },
  ],

  // ─── INVOICES ──────────────────────────────────────────────────────────────
  invoices: [
    {
      invoice_number: 'INV-2025-001',
      client_name:    'Clearview Agency',
      client_email:   'billing@clearviewagency.ca',
      issue_date:     '2025-10-15',
      due_date:       '2025-11-15',
      status:         'paid',
      subtotal:        4500.00,
      tax_amount:       585.00,
      total:           5085.00,
      amount_paid:     5085.00,
      balance_due:        0.00,
      notes: 'UX Consulting Retainer — October 2025',
      lines: [
        { description: 'UX Consulting Retainer — October 2025',      quantity: 1, unit_price: 4500.00, line_total: 4500.00, sort_order: 1 },
      ],
    },
    {
      invoice_number: 'INV-2025-002',
      client_name:    'Finara Labs Inc.',
      client_email:   'ap@finaralabs.com',
      issue_date:     '2025-11-05',
      due_date:       '2025-12-05',
      status:         'paid',
      subtotal:        8500.00,
      tax_amount:      1105.00,
      total:           9605.00,
      amount_paid:     9605.00,
      balance_due:        0.00,
      notes: 'Mobile onboarding UX project — all phases complete',
      lines: [
        { description: 'UX Research & Discovery (Phase 1)',           quantity: 1, unit_price: 3500.00, line_total: 3500.00, sort_order: 1 },
        { description: 'Wireframing & Interactive Prototype',         quantity: 1, unit_price: 3000.00, line_total: 3000.00, sort_order: 2 },
        { description: 'Final Deliverables & Developer Handoff',      quantity: 1, unit_price: 2000.00, line_total: 2000.00, sort_order: 3 },
      ],
    },
    {
      invoice_number: 'INV-2025-003',
      client_name:    'Clearview Agency',
      client_email:   'billing@clearviewagency.ca',
      issue_date:     '2025-11-15',
      due_date:       '2025-12-15',
      status:         'paid',
      subtotal:        4500.00,
      tax_amount:       585.00,
      total:           5085.00,
      amount_paid:     5085.00,
      balance_due:        0.00,
      notes: 'UX Consulting Retainer — November 2025',
      lines: [
        { description: 'UX Consulting Retainer — November 2025',     quantity: 1, unit_price: 4500.00, line_total: 4500.00, sort_order: 1 },
      ],
    },
    {
      invoice_number: 'INV-2026-001',
      client_name:    'Harbour & Co',
      client_email:   'finance@harbourandco.ca',
      issue_date:     '2026-01-15',
      due_date:       '2026-02-15',
      status:         'paid',
      subtotal:        3200.00,
      tax_amount:       416.00,
      total:           3616.00,
      amount_paid:     3616.00,
      balance_due:        0.00,
      notes: 'Brand strategy consulting — workshop + direction deck',
      lines: [
        { description: 'Brand Strategy Workshop (2 full days)',       quantity: 2, unit_price: 1200.00, line_total: 2400.00, sort_order: 1 },
        { description: 'Design Direction Deck',                       quantity: 1, unit_price:  800.00, line_total:  800.00, sort_order: 2 },
      ],
    },
    {
      invoice_number: 'INV-2026-002',
      client_name:    'Clearview Agency',
      client_email:   'billing@clearviewagency.ca',
      issue_date:     '2026-02-01',
      due_date:       '2026-03-01',
      status:         'paid',
      subtotal:        5400.00,
      tax_amount:       702.00,
      total:           6102.00,
      amount_paid:     6102.00,
      balance_due:        0.00,
      notes: 'UX Consulting Retainer — February 2026 (revised rate $5,400/mo)',
      lines: [
        { description: 'UX Consulting Retainer — February 2026',     quantity: 1, unit_price: 5400.00, line_total: 5400.00, sort_order: 1 },
      ],
    },
    {
      invoice_number: 'INV-2026-003',
      client_name:    'Finara Labs Inc.',
      client_email:   'ap@finaralabs.com',
      issue_date:     '2026-03-05',
      due_date:       '2026-04-05',
      status:         'sent',
      subtotal:        3999.00,
      tax_amount:       519.87,
      total:           4518.87,
      amount_paid:        0.00,
      balance_due:     4518.87,
      notes: 'Phase 2 — Mobile design system and component library',
      lines: [
        { description: 'Design System Component Library (50 components)', quantity: 1, unit_price: 2499.00, line_total: 2499.00, sort_order: 1 },
        { description: 'Developer Handoff Documentation',             quantity: 1, unit_price: 1500.00, line_total: 1500.00, sort_order: 2 },
      ],
    },
    {
      invoice_number: 'INV-2026-004',
      client_name:    'Clearview Agency',
      client_email:   'billing@clearviewagency.ca',
      issue_date:     '2026-04-01',
      due_date:       '2026-04-30',
      status:         'overdue',
      subtotal:        5400.00,
      tax_amount:       702.00,
      total:           6102.00,
      amount_paid:        0.00,
      balance_due:     6102.00,
      notes: 'UX Consulting Retainer — April 2026. Payment overdue — please remit.',
      lines: [
        { description: 'UX Consulting Retainer — April 2026',        quantity: 1, unit_price: 5400.00, line_total: 5400.00, sort_order: 1 },
      ],
    },
    {
      invoice_number: 'INV-2026-005',
      client_name:    'BlueSky Digital',
      client_email:   'accounts@blueskydigital.ca',
      issue_date:     '2026-04-15',
      due_date:       '2026-05-15',
      status:         'draft',
      subtotal:        2000.00,
      tax_amount:       260.00,
      total:           2260.00,
      amount_paid:        0.00,
      balance_due:     2260.00,
      notes: 'Discovery and audit phase — new client onboarding',
      lines: [
        { description: 'UX Audit & Competitive Analysis',            quantity: 1, unit_price: 1200.00, line_total: 1200.00, sort_order: 1 },
        { description: 'User Research Interviews (5 sessions × $160)', quantity: 5, unit_price:  160.00, line_total:  800.00, sort_order: 2 },
      ],
    },
  ],
};
