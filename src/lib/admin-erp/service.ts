import type {
  AnySupabaseClient,
  CashFlowPoint,
  CreateExpenseInput,
  ErpKpis,
  ErpOverview,
  ExpensesByCategory,
  MarketingBudgetRow,
  OperationalExpense,
  RevenueSummary,
} from './types';

/**
 * AdminErpService — operational/financial reporting for /admin/erp.
 *
 * Reads call SECURITY DEFINER RPCs that are GRANTed to service_role only,
 * so the route layer must use the service-role Supabase client. Writes
 * (operational_expenses CRUD) go through the same client and are guarded
 * by the route-layer auth/permission check.
 */
export class AdminErpService {
  private supabase: AnySupabaseClient;

  constructor(supabase: AnySupabaseClient) {
    this.supabase = supabase;
  }

  /** Composes the dashboard payload in a single round-trip-fan-out. */
  async getOverview(monthStart: Date): Promise<ErpOverview> {
    const startStr = monthStart.toISOString().slice(0, 10);
    const monthEnd = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
    );
    const endStr = monthEnd.toISOString().slice(0, 10);

    const [budgetRes, revenueRes, kpisRes, cashFlowRes, expensesRes, settingsRes] =
      await Promise.all([
        this.supabase.rpc('erp_marketing_budget', { p_month_start: startStr }),
        this.supabase.rpc('erp_revenue', { p_start: startStr, p_end: endStr }),
        this.supabase.rpc('erp_kpis', { p_start: startStr, p_end: endStr }),
        this.supabase.rpc('erp_cash_flow', { p_months: 12 }),
        this.supabase.rpc('erp_expenses_by_category', { p_start: startStr, p_end: endStr }),
        this.supabase
          .from('retention_settings')
          .select('monthly_total_budget_piasters')
          .eq('id', 1)
          .maybeSingle(),
      ]);

    const marketingBudget = (budgetRes.data || []) as MarketingBudgetRow[];
    const revenueRow = Array.isArray(revenueRes.data) ? revenueRes.data[0] : revenueRes.data;
    const revenue: RevenueSummary = revenueRow ?? {
      commission_piasters: 0,
      processing_fee_piasters: 0,
      partner_gift_revenue_piasters: 0,
      settled_orders_count: 0,
      delivered_orders_count: 0,
    };
    const kpisRow = Array.isArray(kpisRes.data) ? kpisRes.data[0] : kpisRes.data;
    const kpis: ErpKpis = kpisRow ?? {
      dau: 0,
      wau: 0,
      mau: 0,
      total_completed_orders: 0,
      avg_order_value_piasters: 0,
      new_customers: 0,
      conversion_rate_percent: 0,
    };
    const cashFlow = (cashFlowRes.data || []) as CashFlowPoint[];
    const expenses = (expensesRes.data || []) as ExpensesByCategory[];
    const totalExpensesPiasters = expenses.reduce(
      (sum, row) => sum + Number(row.total_piasters || 0),
      0
    );

    return {
      windowStart: startStr,
      windowEnd: endStr,
      marketingBudget,
      monthlyTotalBudgetPiasters: Number(settingsRes.data?.monthly_total_budget_piasters) || 0,
      revenue: {
        commission_piasters: Number(revenue.commission_piasters) || 0,
        processing_fee_piasters: Number(revenue.processing_fee_piasters) || 0,
        partner_gift_revenue_piasters: Number(revenue.partner_gift_revenue_piasters) || 0,
        settled_orders_count: Number(revenue.settled_orders_count) || 0,
        delivered_orders_count: Number(revenue.delivered_orders_count) || 0,
      },
      expenses,
      totalExpensesPiasters,
      kpis: {
        dau: Number(kpis.dau) || 0,
        wau: Number(kpis.wau) || 0,
        mau: Number(kpis.mau) || 0,
        total_completed_orders: Number(kpis.total_completed_orders) || 0,
        avg_order_value_piasters: Number(kpis.avg_order_value_piasters) || 0,
        new_customers: Number(kpis.new_customers) || 0,
        conversion_rate_percent: Number(kpis.conversion_rate_percent) || 0,
      },
      cashFlow,
    };
  }

  // ─── Expenses CRUD ─────────────────────────────────────────────────────
  async listExpenses(monthStart: Date): Promise<OperationalExpense[]> {
    const startStr = monthStart.toISOString().slice(0, 10);
    const monthEnd = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1)
    );
    const endStr = monthEnd.toISOString().slice(0, 10);

    const { data, error } = await this.supabase
      .from('operational_expenses')
      .select('*')
      .gte('incurred_date', startStr)
      .lt('incurred_date', endStr)
      .order('incurred_date', { ascending: false });

    if (error) {
      throw new Error(`AdminErpService.listExpenses failed: ${error.message}`);
    }
    return (data || []) as OperationalExpense[];
  }

  async createExpense(
    input: CreateExpenseInput,
    actorId: string
  ): Promise<OperationalExpense | null> {
    const { data, error } = await this.supabase
      .from('operational_expenses')
      .insert({
        category: input.category,
        amount_piasters: input.amount_piasters,
        description: input.description.trim(),
        incurred_date: input.incurred_date,
        recorded_by: actorId,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[AdminErpService] createExpense failed:', error);
      return null;
    }
    return (data as OperationalExpense) || null;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('operational_expenses')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) {
      console.error('[AdminErpService] deleteExpense failed:', error);
      return false;
    }
    return Array.isArray(data) && data.length > 0;
  }
}

export function createAdminErpService(supabase: AnySupabaseClient): AdminErpService {
  return new AdminErpService(supabase);
}
