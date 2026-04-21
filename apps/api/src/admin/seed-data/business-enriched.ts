import { EnrichedSeedTx, SeedHstPeriodEntry } from './freelancer-enriched';

// ─────────────────────────────────────────────────────────────────────────────
// Ayende CX — Digital Marketing Agency, Toronto ON, HST# 987654321 RT0001
// Oct 2025 – Apr 2026  |  Business mode  |  Pro plan (client slot)
//
// POSTING RULE (enforced in seedEnrichedData):
//   Transactions dated < 2026-04-01 → classified + posted journal entry
//   Transactions dated ≥ 2026-04-01 → raw PENDING only  (shows in inbox)
//
// DASHBOARD (Oct–Mar posted):
//   Revenue      $133,500.00
//   Bus. Expenses $87,959.30  (5xxx / 6xxx only — draws & HST excluded)
//   Net Income    $45,540.70
//   Pending            15 tx  (April)
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessEnrichedDataset {
  transactions: EnrichedSeedTx[];
  hstPeriods: SeedHstPeriodEntry[];
}

export const BUSINESS_ENRICHED: BusinessEnrichedDataset = {

  // ─── TRANSACTIONS ──────────────────────────────────────────────────────────
  transactions: [

    // ── October 2025 ─────────────────────────────────────────────────────────
    // Revenue
    { date: '2025-10-01', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2025-10-05', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4200.00, accountCode: '4000' },
    { date: '2025-10-10', description: 'OWNER CONTRIBUTION INITIAL CAPITAL',  amount: 10000.00, accountCode: '3100' },
    { date: '2025-10-28', description: 'CLIENT PAYMENT MERIDIAN GROUP',       amount:  6300.00, accountCode: '4000' },
    // Expenses
    { date: '2025-10-01', description: 'OFFICE RENT OCTOBER',                 amount: -3200.00, accountCode: '5700' },
    { date: '2025-10-03', description: 'HYDRO ONE UTILITIES',                 amount:  -187.50, accountCode: '6100' },
    { date: '2025-10-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2025-10-10', description: 'AWS CLOUD SERVICES',                  amount:  -234.80, accountCode: '5800' },
    { date: '2025-10-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2025-10-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2025-10-18', description: 'GOOGLE ADS OCTOBER',                  amount: -2840.00, accountCode: '5100' },
    { date: '2025-10-20', description: 'META ADS Q4 CAMPAIGN',                amount: -1200.00, accountCode: '5100' },
    { date: '2025-10-22', description: 'PROFESSIONAL SERVICES LEGAL',         amount: -1200.00, accountCode: '5600' },
    { date: '2025-10-25', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2025-10-27', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2025-10-31', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── November 2025 ────────────────────────────────────────────────────────
    { date: '2025-11-03', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2025-11-05', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4200.00, accountCode: '4000' },
    { date: '2025-11-08', description: 'HARBOUR BRAND PROJECT PAYMENT',       amount: 22000.00, accountCode: '4000' },
    { date: '2025-11-01', description: 'OFFICE RENT NOVEMBER',                amount: -3200.00, accountCode: '5700' },
    { date: '2025-11-05', description: 'HYDRO ONE UTILITIES',                 amount:  -201.30, accountCode: '6100' },
    { date: '2025-11-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2025-11-10', description: 'AWS CLOUD SERVICES',                  amount:  -256.40, accountCode: '5800' },
    { date: '2025-11-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2025-11-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2025-11-18', description: 'GOOGLE ADS NOVEMBER',                 amount: -2840.00, accountCode: '5100' },
    { date: '2025-11-20', description: 'TEAM LUNCH MEETING EARL RESTAURANT',  amount:  -287.60, accountCode: '5400' },
    { date: '2025-11-25', description: 'HST REMITTANCE CRA NOVEMBER',         amount: -2340.00, accountCode: '2200' },
    { date: '2025-11-28', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2025-11-29', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2025-11-30', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── December 2025 ────────────────────────────────────────────────────────
    { date: '2025-12-02', description: 'CLIENT PAYMENT MERIDIAN GROUP',       amount:  7800.00, accountCode: '4000' },
    { date: '2025-12-03', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2025-12-01', description: 'OFFICE RENT DECEMBER',                amount: -3200.00, accountCode: '5700' },
    { date: '2025-12-05', description: 'HYDRO ONE UTILITIES',                 amount:  -224.80, accountCode: '6100' },
    { date: '2025-12-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2025-12-10', description: 'AWS CLOUD SERVICES',                  amount:  -241.20, accountCode: '5800' },
    { date: '2025-12-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2025-12-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2025-12-18', description: 'GOOGLE ADS DECEMBER',                 amount: -2840.00, accountCode: '5100' },
    { date: '2025-12-20', description: 'YEAR END STAFF GIFTS AMAZON',         amount:  -480.00, accountCode: '6900' },
    { date: '2025-12-22', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2025-12-29', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2025-12-31', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── January 2026 ─────────────────────────────────────────────────────────
    { date: '2026-01-03', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2026-01-06', description: 'CLIENT PAYMENT BLUESKY DIGITAL',      amount:  3500.00, accountCode: '4000' },
    { date: '2026-01-10', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4200.00, accountCode: '4000' },
    { date: '2026-01-01', description: 'OFFICE RENT JANUARY',                 amount: -3200.00, accountCode: '5700' },
    { date: '2026-01-05', description: 'HYDRO ONE UTILITIES',                 amount:  -198.60, accountCode: '6100' },
    { date: '2026-01-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2026-01-10', description: 'AWS CLOUD SERVICES',                  amount:  -267.90, accountCode: '5800' },
    { date: '2026-01-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2026-01-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2026-01-18', description: 'GOOGLE ADS JANUARY',                  amount: -2840.00, accountCode: '5100' },
    { date: '2026-01-22', description: 'PROFESSIONAL SERVICES LEGAL',         amount:  -900.00, accountCode: '5600' },
    { date: '2026-01-25', description: 'HST REMITTANCE CRA Q4 2025',          amount: -4473.00, accountCode: '2200' },
    { date: '2026-01-28', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2026-01-30', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2026-01-31', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── February 2026 ────────────────────────────────────────────────────────
    { date: '2026-02-03', description: 'CLIENT PAYMENT MERIDIAN GROUP',       amount:  6600.00, accountCode: '4000' },
    { date: '2026-02-06', description: 'CLIENT PAYMENT BLUESKY DIGITAL',      amount:  3500.00, accountCode: '4000' },
    { date: '2026-02-12', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2026-02-15', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4200.00, accountCode: '4000' },
    { date: '2026-02-01', description: 'OFFICE RENT FEBRUARY',                amount: -3200.00, accountCode: '5700' },
    { date: '2026-02-05', description: 'HYDRO ONE UTILITIES',                 amount:  -176.40, accountCode: '6100' },
    { date: '2026-02-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2026-02-10', description: 'AWS CLOUD SERVICES',                  amount:  -248.50, accountCode: '5800' },
    { date: '2026-02-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2026-02-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2026-02-18', description: 'GOOGLE ADS FEBRUARY',                 amount: -2840.00, accountCode: '5100' },
    { date: '2026-02-20', description: 'META ADS Q1 CAMPAIGN',                amount: -1200.00, accountCode: '5100' },
    { date: '2026-02-25', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2026-02-27', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2026-02-28', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── March 2026 ───────────────────────────────────────────────────────────
    { date: '2026-03-03', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2026-03-07', description: 'CLIENT PAYMENT BLUESKY DIGITAL',      amount:  3500.00, accountCode: '4000' },
    { date: '2026-03-10', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4900.00, accountCode: '4000' },
    { date: '2026-03-01', description: 'OFFICE RENT MARCH',                   amount: -3200.00, accountCode: '5700' },
    { date: '2026-03-05', description: 'HYDRO ONE UTILITIES',                 amount:  -189.20, accountCode: '6100' },
    { date: '2026-03-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2026-03-10', description: 'AWS CLOUD SERVICES',                  amount:  -259.30, accountCode: '5800' },
    { date: '2026-03-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2026-03-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2026-03-18', description: 'GOOGLE ADS MARCH',                    amount: -2840.00, accountCode: '5100' },
    { date: '2026-03-25', description: 'HST REMITTANCE CRA Q1 2026',          amount: -4992.00, accountCode: '2200' },
    { date: '2026-03-28', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2026-03-30', description: 'OWNER DRAW TRANSFER',                 amount: -4500.00, accountCode: '3200' },
    { date: '2026-03-31', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },

    // ── April 2026 (PENDING — raw transactions only, no journal entries) ─────
    { date: '2026-04-03', description: 'CLIENT PAYMENT ACME CORP',            amount:  8500.00, accountCode: '4000' },
    { date: '2026-04-09', description: 'CLIENT PAYMENT NEXUS INC',            amount:  4200.00, accountCode: '4000' },
    { date: '2026-04-14', description: 'CLIENT PAYMENT MERIDIAN GROUP',       amount:  6300.00, accountCode: '4000' },
    { date: '2026-04-20', description: 'CLIENT PAYMENT BLUESKY DIGITAL',      amount:  3500.00, accountCode: '4000' },
    { date: '2026-04-01', description: 'OFFICE RENT APRIL',                   amount: -3200.00, accountCode: '5700' },
    { date: '2026-04-05', description: 'HYDRO ONE UTILITIES',                 amount:  -194.30, accountCode: '6100' },
    { date: '2026-04-07', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 1',   amount: -3850.00, accountCode: '6000' },
    { date: '2026-04-10', description: 'AWS CLOUD SERVICES',                  amount:  -241.60, accountCode: '5800' },
    { date: '2026-04-12', description: 'GOOGLE WORKSPACE',                    amount:   -72.00, accountCode: '5800' },
    { date: '2026-04-15', description: 'PAYROLL DIRECT DEPOSIT EMPLOYEE 2',   amount: -3200.00, accountCode: '6000' },
    { date: '2026-04-18', description: 'GOOGLE ADS APRIL',                    amount: -2840.00, accountCode: '5100' },
    { date: '2026-04-22', description: 'TEAM LUNCH MEETING EARL RESTAURANT',  amount:  -312.40, accountCode: '5400' },
    { date: '2026-04-25', description: 'ROGERS BUSINESS PHONE',               amount:  -145.00, accountCode: '5800' },
    { date: '2026-04-28', description: 'PROFESSIONAL SERVICES LEGAL',         amount: -1200.00, accountCode: '5600' },
    { date: '2026-04-30', description: 'TD BANK MONTHLY FEE',                 amount:   -29.95, accountCode: '5200' },
  ],

  // ─── HST PERIODS ───────────────────────────────────────────────────────────
  hstPeriods: [
    {
      period_start:          '2025-10-01',
      period_end:            '2025-12-31',
      status:                'locked',
      total_hst_collected:   8320.00,
      total_itc_claimed:     3847.00,
      net_tax_owing:         4473.00,
      filed_at:              '2026-01-29',
    },
    {
      period_start:          '2026-01-01',
      period_end:            '2026-03-31',
      status:                'filed',
      total_hst_collected:   9114.00,
      total_itc_claimed:     4122.00,
      net_tax_owing:         4992.00,
      filed_at:              '2026-04-15',
    },
    {
      period_start:          '2026-04-01',
      period_end:            '2026-06-30',
      status:                'open',
      total_hst_collected:   2860.00,
      total_itc_claimed:     1197.00,
      net_tax_owing:         1663.00,
      filed_at:              null,
    },
  ],
};
