import { SeedSavingsGoalEntry } from './freelancer-enriched';

// ─────────────────────────────────────────────────────────────────────────────
// Alex Chen — Toronto, ON  |  Personal mode  |  Starter plan
// Tech employee, rents downtown, occasional freelance side income
// Oct 2025 – Apr 2026
//
// POSTING RULE:
//   Oct 2025 – Mar 2026 → raw tx + personal_category_id assigned
//   Apr 2026            → raw tx PENDING, no category (shows in inbox)
//
// DASHBOARD (categorized Oct–Mar):
//   Monthly avg income   ~$4,680
//   Monthly avg expenses ~$4,140
//   Net monthly surplus  ~$540
//   Pending Apr:          ~18 tx
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedBudgetCategory {
  name: string;
  category_type: 'income' | 'expense';
  monthly_target: number | null;
  color: string;
  icon: string;
  sort_order: number;
}

export interface SeedPersonalTx {
  date: string;
  description: string;
  amount: number;
  categoryName: string; // must match a SeedBudgetCategory.name exactly
}

export interface SeedPersonalRecurring {
  description: string;
  amount: number;
  frequency: 'monthly';
  start_date: string;
  next_run_date: string;
}

export interface PersonalEnrichedDataset {
  budgetCategories: SeedBudgetCategory[];
  transactions: SeedPersonalTx[];
  savingsGoals: SeedSavingsGoalEntry[];
  recurringItems: SeedPersonalRecurring[];
}

export const PERSONAL_ENRICHED: PersonalEnrichedDataset = {

  // ─── BUDGET CATEGORIES ─────────────────────────────────────────────────────
  budgetCategories: [
    { name: 'Income',        category_type: 'income',  monthly_target: null,    color: '#16A34A', icon: 'trending-up',   sort_order: 0 },
    { name: 'Housing',       category_type: 'expense', monthly_target: 2500.00, color: '#1E40AF', icon: 'home',          sort_order: 1 },
    { name: 'Groceries',     category_type: 'expense', monthly_target:  500.00, color: '#059669', icon: 'shopping-cart', sort_order: 2 },
    { name: 'Dining Out',    category_type: 'expense', monthly_target:  300.00, color: '#D97706', icon: 'utensils',      sort_order: 3 },
    { name: 'Transportation',category_type: 'expense', monthly_target:  250.00, color: '#7C3AED', icon: 'car',           sort_order: 4 },
    { name: 'Subscriptions', category_type: 'expense', monthly_target:  150.00, color: '#0891B2', icon: 'monitor',       sort_order: 5 },
    { name: 'Entertainment', category_type: 'expense', monthly_target:  200.00, color: '#DB2777', icon: 'star',          sort_order: 6 },
    { name: 'Personal Care', category_type: 'expense', monthly_target:  120.00, color: '#65A30D', icon: 'heart',         sort_order: 7 },
  ],

  // ─── TRANSACTIONS ──────────────────────────────────────────────────────────
  // Oct 2025 – Mar 2026: categorized (personal_category_id will be set)
  // Apr 2026: pending (no category assigned)
  transactions: [

    // ── October 2025 ─────────────────────────────────────────────────────────
    { date: '2025-10-01', description: 'TD PAYROLL DIRECT DEPOSIT',       amount:  4200.00, categoryName: 'Income' },
    { date: '2025-10-18', description: 'ETRANSFER FREELANCE PROJECT',      amount:   850.00, categoryName: 'Income' },
    { date: '2025-10-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2025-10-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -148.40, categoryName: 'Housing' },
    { date: '2025-10-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2025-10-04', description: 'SOBEYS GROCERY STORE',             amount:  -124.30, categoryName: 'Groceries' },
    { date: '2025-10-12', description: 'LOBLAWS SUPERMARKET',              amount:   -98.75, categoryName: 'Groceries' },
    { date: '2025-10-22', description: 'NO FRILLS GROCERY',                amount:   -76.40, categoryName: 'Groceries' },
    { date: '2025-10-09', description: 'TERRONI RESTAURANT',               amount:   -67.80, categoryName: 'Dining Out' },
    { date: '2025-10-17', description: 'BURRITO BANDITS',                  amount:   -18.50, categoryName: 'Dining Out' },
    { date: '2025-10-24', description: 'CAFE DIPLOMATICO',                 amount:   -24.60, categoryName: 'Dining Out' },
    { date: '2025-10-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2025-10-14', description: 'UBER TRIP',                        amount:   -18.75, categoryName: 'Transportation' },
    { date: '2025-10-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2025-10-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2025-10-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2025-10-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2025-10-20', description: 'TIFF LIGHTBOX CINEMA',             amount:   -32.00, categoryName: 'Entertainment' },
    { date: '2025-10-26', description: 'STEAM GAME PURCHASE',              amount:   -29.99, categoryName: 'Entertainment' },
    { date: '2025-10-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2025-10-19', description: 'SHOPPERS DRUG MART',               amount:   -43.20, categoryName: 'Personal Care' },

    // ── November 2025 ────────────────────────────────────────────────────────
    { date: '2025-11-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: 'Income' },
    { date: '2025-11-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2025-11-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -162.80, categoryName: 'Housing' },
    { date: '2025-11-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2025-11-06', description: 'SOBEYS GROCERY STORE',             amount:  -136.45, categoryName: 'Groceries' },
    { date: '2025-11-14', description: 'LOBLAWS SUPERMARKET',              amount:  -108.20, categoryName: 'Groceries' },
    { date: '2025-11-25', description: 'METRO GROCERY',                    amount:   -82.60, categoryName: 'Groceries' },
    { date: '2025-11-07', description: 'GUSTO 101 RESTAURANT',             amount:   -84.30, categoryName: 'Dining Out' },
    { date: '2025-11-15', description: 'CHIPOTLE MEXICAN GRILL',           amount:   -21.45, categoryName: 'Dining Out' },
    { date: '2025-11-22', description: 'MOMOFUKU NOODLE BAR',              amount:   -56.80, categoryName: 'Dining Out' },
    { date: '2025-11-28', description: 'TIM HORTONS',                      amount:    -8.75, categoryName: 'Dining Out' },
    { date: '2025-11-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2025-11-10', description: 'UBER TRIP',                        amount:   -22.40, categoryName: 'Transportation' },
    { date: '2025-11-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2025-11-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2025-11-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2025-11-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2025-11-16', description: 'CONCERT TICKETS TICKETMASTER',     amount:   -89.00, categoryName: 'Entertainment' },
    { date: '2025-11-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2025-11-20', description: 'REXALL PHARMACY',                  amount:   -38.60, categoryName: 'Personal Care' },

    // ── December 2025 ────────────────────────────────────────────────────────
    { date: '2025-12-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: 'Income' },
    { date: '2025-12-15', description: 'TD PAYROLL YEAR END BONUS',        amount:  1500.00, categoryName: 'Income' },
    { date: '2025-12-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2025-12-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -198.70, categoryName: 'Housing' },
    { date: '2025-12-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2025-12-05', description: 'SOBEYS GROCERY STORE',             amount:  -152.30, categoryName: 'Groceries' },
    { date: '2025-12-13', description: 'LOBLAWS SUPERMARKET',              amount:  -118.90, categoryName: 'Groceries' },
    { date: '2025-12-20', description: 'COSTCO WHOLESALE',                 amount:  -187.45, categoryName: 'Groceries' },
    { date: '2025-12-06', description: 'CANOE RESTAURANT',                 amount:  -124.50, categoryName: 'Dining Out' },
    { date: '2025-12-13', description: 'PIZZERIA LIBRETTO',                amount:   -48.20, categoryName: 'Dining Out' },
    { date: '2025-12-20', description: 'HOLIDAY PARTY RESTAURANT',         amount:   -95.60, categoryName: 'Dining Out' },
    { date: '2025-12-24', description: 'ST LAWRENCE MARKET FOOD',          amount:   -36.80, categoryName: 'Dining Out' },
    { date: '2025-12-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2025-12-22', description: 'UBER TRIP AIRPORT',                amount:   -44.90, categoryName: 'Transportation' },
    { date: '2025-12-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2025-12-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2025-12-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2025-12-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2025-12-12', description: 'CF TORONTO EATON CENTRE',          amount:  -145.00, categoryName: 'Entertainment' },
    { date: '2025-12-18', description: 'INDIGO BOOKS AND MUSIC',           amount:   -62.40, categoryName: 'Entertainment' },
    { date: '2025-12-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2025-12-10', description: 'SEPHORA',                          amount:   -78.30, categoryName: 'Personal Care' },

    // ── January 2026 ─────────────────────────────────────────────────────────
    { date: '2026-01-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: 'Income' },
    { date: '2026-01-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2026-01-06', description: 'HYDRO ONE ELECTRICITY',            amount:  -211.40, categoryName: 'Housing' },
    { date: '2026-01-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2026-01-04', description: 'SOBEYS GROCERY STORE',             amount:  -113.60, categoryName: 'Groceries' },
    { date: '2026-01-11', description: 'LOBLAWS SUPERMARKET',              amount:   -94.30, categoryName: 'Groceries' },
    { date: '2026-01-24', description: 'NO FRILLS GROCERY',                amount:   -81.20, categoryName: 'Groceries' },
    { date: '2026-01-09', description: 'MILDRED TEMPLE KITCHEN',           amount:   -72.40, categoryName: 'Dining Out' },
    { date: '2026-01-16', description: 'QUICK SERVICE LUNCH',              amount:   -16.80, categoryName: 'Dining Out' },
    { date: '2026-01-23', description: 'OSMOW SHAWARMA',                   amount:   -22.50, categoryName: 'Dining Out' },
    { date: '2026-01-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2026-01-17', description: 'UBER TRIP',                        amount:   -19.30, categoryName: 'Transportation' },
    { date: '2026-01-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2026-01-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2026-01-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2026-01-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2026-01-21', description: 'SCOTIABANK ARENA EVENT',           amount:   -95.00, categoryName: 'Entertainment' },
    { date: '2026-01-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2026-01-28', description: 'SHOPPERS DRUG MART',               amount:   -31.40, categoryName: 'Personal Care' },

    // ── February 2026 ────────────────────────────────────────────────────────
    { date: '2026-02-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: 'Income' },
    { date: '2026-02-22', description: 'ETRANSFER FREELANCE PROJECT',       amount:   620.00, categoryName: 'Income' },
    { date: '2026-02-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2026-02-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -187.30, categoryName: 'Housing' },
    { date: '2026-02-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2026-02-05', description: 'SOBEYS GROCERY STORE',             amount:  -127.80, categoryName: 'Groceries' },
    { date: '2026-02-14', description: 'LOBLAWS SUPERMARKET',              amount:  -103.40, categoryName: 'Groceries' },
    { date: '2026-02-22', description: 'METRO GROCERY',                    amount:   -68.90, categoryName: 'Groceries' },
    { date: '2026-02-07', description: 'THE KEG STEAKHOUSE',               amount:  -112.60, categoryName: 'Dining Out' },
    { date: '2026-02-14', description: 'VALENTINES DINNER',                amount:  -148.20, categoryName: 'Dining Out' },
    { date: '2026-02-20', description: 'FOOD DELIVERY DOORDASH',           amount:   -38.40, categoryName: 'Dining Out' },
    { date: '2026-02-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2026-02-11', description: 'UBER TRIP',                        amount:   -24.60, categoryName: 'Transportation' },
    { date: '2026-02-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2026-02-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2026-02-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2026-02-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2026-02-25', description: 'CHAPTERS INDIGO',                  amount:   -44.99, categoryName: 'Entertainment' },
    { date: '2026-02-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2026-02-19', description: 'LONDON DRUGS PHARMACY',            amount:   -52.80, categoryName: 'Personal Care' },

    // ── March 2026 ───────────────────────────────────────────────────────────
    { date: '2026-03-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: 'Income' },
    { date: '2026-03-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: 'Housing' },
    { date: '2026-03-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -174.60, categoryName: 'Housing' },
    { date: '2026-03-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: 'Housing' },
    { date: '2026-03-06', description: 'SOBEYS GROCERY STORE',             amount:  -119.40, categoryName: 'Groceries' },
    { date: '2026-03-15', description: 'LOBLAWS SUPERMARKET',              amount:   -96.70, categoryName: 'Groceries' },
    { date: '2026-03-25', description: 'NO FRILLS GROCERY',                amount:   -72.30, categoryName: 'Groceries' },
    { date: '2026-03-06', description: 'CLUNY BISTRO RESTAURANT',          amount:   -89.40, categoryName: 'Dining Out' },
    { date: '2026-03-13', description: 'QUICK LUNCH DOWNTOWN',             amount:   -19.60, categoryName: 'Dining Out' },
    { date: '2026-03-20', description: 'FOOD DELIVERY UBEREATS',           amount:   -42.30, categoryName: 'Dining Out' },
    { date: '2026-03-28', description: 'BIRTHDAY DINNER FRIENDS',          amount:   -76.40, categoryName: 'Dining Out' },
    { date: '2026-03-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: 'Transportation' },
    { date: '2026-03-19', description: 'UBER TRIP',                        amount:   -21.80, categoryName: 'Transportation' },
    { date: '2026-03-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: 'Subscriptions' },
    { date: '2026-03-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: 'Subscriptions' },
    { date: '2026-03-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: 'Subscriptions' },
    { date: '2026-03-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: 'Subscriptions' },
    { date: '2026-03-14', description: 'TORONTO RAPTORS GAME TICKETS',     amount:  -118.00, categoryName: 'Entertainment' },
    { date: '2026-03-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: 'Personal Care' },
    { date: '2026-03-22', description: 'SHOPPERS DRUG MART',               amount:   -46.70, categoryName: 'Personal Care' },

    // ── April 2026 (PENDING — no category assigned) ───────────────────────────
    { date: '2026-04-01', description: 'TD PAYROLL DIRECT DEPOSIT',        amount:  4200.00, categoryName: '' },
    { date: '2026-04-01', description: 'RENT PAYMENT E-TRANSFER',          amount: -2200.00, categoryName: '' },
    { date: '2026-04-04', description: 'SOBEYS GROCERY STORE',             amount:  -108.40, categoryName: '' },
    { date: '2026-04-05', description: 'HYDRO ONE ELECTRICITY',            amount:  -156.20, categoryName: '' },
    { date: '2026-04-08', description: 'NETFLIX SUBSCRIPTION',             amount:   -20.99, categoryName: '' },
    { date: '2026-04-08', description: 'SPOTIFY PREMIUM',                  amount:   -11.99, categoryName: '' },
    { date: '2026-04-08', description: 'ROGERS INTERNET',                  amount:   -89.00, categoryName: '' },
    { date: '2026-04-10', description: 'LOBLAWS SUPERMARKET',              amount:   -94.60, categoryName: '' },
    { date: '2026-04-01', description: 'TTC PRESTO MONTHLY PASS',          amount:  -156.00, categoryName: '' },
    { date: '2026-04-12', description: 'RESTAURANT DINNER',                amount:   -68.40, categoryName: '' },
    { date: '2026-04-13', description: 'UBER TRIP',                        amount:   -16.50, categoryName: '' },
    { date: '2026-04-15', description: 'ROGERS WIRELESS',                  amount:   -78.50, categoryName: '' },
    { date: '2026-04-15', description: 'AMAZON PRIME MEMBERSHIP',          amount:    -9.99, categoryName: '' },
    { date: '2026-04-05', description: 'GOODLIFE FITNESS',                 amount:   -49.99, categoryName: '' },
    { date: '2026-04-17', description: 'FOOD DELIVERY DOORDASH',           amount:   -34.80, categoryName: '' },
    { date: '2026-04-18', description: 'SHOPPERS DRUG MART',               amount:   -41.20, categoryName: '' },
    { date: '2026-04-20', description: 'CINEMA TICKET',                    amount:   -18.00, categoryName: '' },
    { date: '2026-04-22', description: 'NO FRILLS GROCERY',                amount:   -76.30, categoryName: '' },
  ],

  // ─── SAVINGS GOALS ─────────────────────────────────────────────────────────
  savingsGoals: [
    {
      name:           'Emergency Fund',
      target_amount:  15000.00,
      current_amount:  8400.00,
      target_date:    '2026-12-31',
      status:         'active',
    },
    {
      name:           'Vacation Fund',
      target_amount:   5000.00,
      current_amount:  2100.00,
      target_date:    '2026-08-31',
      status:         'active',
    },
    {
      name:           'New Laptop',
      target_amount:   2000.00,
      current_amount:   800.00,
      target_date:    '2026-06-30',
      status:         'active',
    },
  ],

  // ─── RECURRING PAYMENTS ────────────────────────────────────────────────────
  recurringItems: [
    { description: 'Rent Payment',       amount: -2200.00, frequency: 'monthly', start_date: '2025-10-01', next_run_date: '2026-05-01' },
    { description: 'Rogers Wireless',    amount:   -78.50, frequency: 'monthly', start_date: '2025-10-15', next_run_date: '2026-05-15' },
    { description: 'Netflix',            amount:   -20.99, frequency: 'monthly', start_date: '2025-10-08', next_run_date: '2026-05-08' },
    { description: 'Spotify Premium',    amount:   -11.99, frequency: 'monthly', start_date: '2025-10-08', next_run_date: '2026-05-08' },
    { description: 'GoodLife Fitness',   amount:   -49.99, frequency: 'monthly', start_date: '2025-10-05', next_run_date: '2026-05-05' },
    { description: 'Amazon Prime',       amount:    -9.99, frequency: 'monthly', start_date: '2025-10-15', next_run_date: '2026-05-15' },
  ],
};
