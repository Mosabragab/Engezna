import type { AnySupabaseClient } from '@/lib/gifts/types';

export type { AnySupabaseClient };

export type ExpenseCategory =
  | 'saas'
  | 'salary'
  | 'office'
  | 'legal'
  | 'marketing_external'
  | 'other';

export interface OperationalExpense {
  id: string;
  category: ExpenseCategory;
  amount_piasters: number;
  description: string;
  incurred_date: string; // YYYY-MM-DD
  recorded_by: string | null;
  created_at: string;
}

export interface ExpensesByCategory {
  category: ExpenseCategory;
  total_piasters: number;
  count: number;
}

export interface MarketingBudgetRow {
  bucket: string;
  spent_piasters: number;
  allocated_piasters: number;
}

export interface RevenueSummary {
  commission_piasters: number;
  processing_fee_piasters: number;
  partner_gift_revenue_piasters: number;
  settled_orders_count: number;
  delivered_orders_count: number;
}

export interface ErpKpis {
  dau: number;
  wau: number;
  mau: number;
  total_completed_orders: number;
  avg_order_value_piasters: number;
  new_customers: number;
  conversion_rate_percent: number;
}

export interface CashFlowPoint {
  month_start: string;
  revenue_piasters: number;
  expenses_piasters: number;
  gift_spend_piasters: number;
  net_piasters: number;
}

export interface ErpOverview {
  /** Window start (inclusive) */
  windowStart: string;
  /** Window end (exclusive) */
  windowEnd: string;
  marketingBudget: MarketingBudgetRow[];
  monthlyTotalBudgetPiasters: number;
  revenue: RevenueSummary;
  expenses: ExpensesByCategory[];
  totalExpensesPiasters: number;
  kpis: ErpKpis;
  cashFlow: CashFlowPoint[];
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount_piasters: number;
  description: string;
  incurred_date: string; // YYYY-MM-DD
}
