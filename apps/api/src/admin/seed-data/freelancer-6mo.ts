export interface SeedTransaction {
  date: string;
  description: string;
  amount: number; // positive = income, negative = expense
}

// 6 months of freelancer transactions: Oct 2025 – Mar 2026
// Mix of employment income, consulting, business expenses, personal expenses
export const FREELANCER_6MO: SeedTransaction[] = [
  // October 2025
  { date: '2025-10-01', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2025-10-03', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2025-10-05', description: 'CONSULTING INVOICE INV-001',       amount:  1850.00 },
  { date: '2025-10-07', description: 'SHOPIFY SUBSCRIPTION',             amount:   -39.00 },
  { date: '2025-10-08', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2025-10-10', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2025-10-12', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2025-10-14', description: 'CLIENT RETAINER PAYMENT',          amount:   950.00 },
  { date: '2025-10-15', description: 'UBER EATS TORONTO',                amount:   -42.30 },
  { date: '2025-10-18', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2025-10-20', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2025-10-22', description: 'HOME OFFICE SUPPLIES STAPLES',     amount:   -87.45 },
  { date: '2025-10-25', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2025-10-28', description: 'CLIENT MEETING LUNCH SYMPOSIUM',   amount:   -64.80 },
  { date: '2025-10-31', description: 'CST SAVINGS REP',                  amount:   -50.00 },

  // November 2025
  { date: '2025-11-01', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2025-11-03', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2025-11-04', description: 'CONSULTING INVOICE INV-002',       amount:  2200.00 },
  { date: '2025-11-05', description: 'POPULAR CAR WAS V',                amount:   -33.89 },
  { date: '2025-11-07', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2025-11-10', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2025-11-12', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2025-11-14', description: 'SHOPIFY SUBSCRIPTION',             amount:   -39.00 },
  { date: '2025-11-15', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2025-11-18', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2025-11-20', description: 'PROFESSIONAL DEVELOPMENT UDEMY',   amount:   -29.99 },
  { date: '2025-11-22', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2025-11-25', description: 'HST REMITTANCE CRA',               amount:  -287.50 },
  { date: '2025-11-28', description: 'CLIENT RETAINER PAYMENT',          amount:   950.00 },
  { date: '2025-11-30', description: 'CST SAVINGS REP',                  amount:   -50.00 },

  // December 2025
  { date: '2025-12-01', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2025-12-03', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2025-12-05', description: 'CONSULTING INVOICE INV-003',       amount:  3100.00 },
  { date: '2025-12-08', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2025-12-10', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2025-12-12', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2025-12-15', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2025-12-18', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2025-12-20', description: 'YEAR END CLIENT GIFT AMAZON',      amount:  -156.00 },
  { date: '2025-12-22', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2025-12-28', description: 'CST SAVINGS REP',                  amount:   -50.00 },

  // January 2026
  { date: '2026-01-02', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2026-01-04', description: 'CONSULTING INVOICE INV-004',       amount:  1750.00 },
  { date: '2026-01-05', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2026-01-07', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2026-01-09', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2026-01-10', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2026-01-12', description: 'SHOPIFY SUBSCRIPTION',             amount:   -39.00 },
  { date: '2026-01-15', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2026-01-18', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2026-01-20', description: 'HOME OFFICE CHAIR WAYFAIR',        amount:  -329.00 },
  { date: '2026-01-22', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2026-01-25', description: 'HST REMITTANCE CRA',               amount:  -354.25 },
  { date: '2026-01-28', description: 'CLIENT RETAINER PAYMENT',          amount:   950.00 },
  { date: '2026-01-31', description: 'CST SAVINGS REP',                  amount:   -50.00 },

  // February 2026
  { date: '2026-02-01', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2026-02-03', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2026-02-05', description: 'CONSULTING INVOICE INV-005',       amount:  2450.00 },
  { date: '2026-02-07', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2026-02-10', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2026-02-12', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2026-02-14', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2026-02-18', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2026-02-20', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2026-02-22', description: 'PROFESSIONAL DEVELOPMENT COURSERA', amount:  -49.00 },
  { date: '2026-02-28', description: 'CST SAVINGS REP',                  amount:   -50.00 },

  // March 2026
  { date: '2026-03-01', description: 'EMPLOYER DIRECT DEPOSIT',          amount:  2610.24 },
  { date: '2026-03-03', description: 'NETFLIX STREAMING',                amount:   -15.99 },
  { date: '2026-03-05', description: 'CONSULTING INVOICE INV-006',       amount:  1980.00 },
  { date: '2026-03-07', description: 'ROGERS WIRELESS',                  amount:   -78.50 },
  { date: '2026-03-10', description: 'AUDIBLE SUBSCRIPTION',             amount:   -15.70 },
  { date: '2026-03-12', description: 'CONCERT REAL MSP',                 amount: -2719.00 },
  { date: '2026-03-14', description: 'SHOPIFY SUBSCRIPTION',             amount:   -39.00 },
  { date: '2026-03-15', description: 'MICROSOFT 365 SUBSCRIPTION',       amount:   -22.00 },
  { date: '2026-03-18', description: 'FORESTERS LIFE INS',               amount:   -42.58 },
  { date: '2026-03-20', description: 'YOUTUBE PREMIUM',                  amount:   -12.99 },
  { date: '2026-03-25', description: 'HST REMITTANCE CRA',               amount:  -318.75 },
  { date: '2026-03-28', description: 'CLIENT RETAINER PAYMENT',          amount:   950.00 },
  { date: '2026-03-31', description: 'CST SAVINGS REP',                  amount:   -50.00 },
];
