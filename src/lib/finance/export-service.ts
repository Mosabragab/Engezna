/**
 * PDF/Excel Export Service for Financial Reports
 * خدمة تصدير التقارير المالية
 */

import { Money } from './money';
import type { Settlement, SettlementAuditLog } from '@/types/finance';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportOptions {
  locale: 'ar' | 'en';
  includeOrders?: boolean;
  includeAuditLog?: boolean;
  dateFormat?: 'short' | 'long';
}

export interface SettlementExportData {
  settlement: Settlement;
  providerName?: { ar: string; en: string };
  orders?: {
    id: string;
    orderNumber: string;
    total: number;
    commission: number;
    paymentMethod: string;
    createdAt: string;
  }[];
  auditLog?: SettlementAuditLog[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Formatters
// ═══════════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: number, locale: 'ar' | 'en'): string {
  return `${amount.toFixed(2)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`;
}

function formatDate(dateStr: string, locale: 'ar' | 'en', format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };

  return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', options);
}

function getStatusLabel(status: string, locale: 'ar' | 'en'): string {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: 'معلق', en: 'Pending' },
    partially_paid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    overdue: { ar: 'متأخر', en: 'Overdue' },
    disputed: { ar: 'نزاع', en: 'Disputed' },
    waived: { ar: 'معفى', en: 'Waived' },
  };
  return labels[status]?.[locale] || status;
}

function getDirectionLabel(direction: string, locale: 'ar' | 'en'): string {
  const labels: Record<string, { ar: string; en: string }> = {
    platform_pays_provider: { ar: 'المنصة تدفع للتاجر', en: 'Platform Pays Provider' },
    provider_pays_platform: { ar: 'التاجر يدفع للمنصة', en: 'Provider Pays Platform' },
    balanced: { ar: 'متوازن', en: 'Balanced' },
  };
  return labels[direction]?.[locale] || direction;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML Generator for PDF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate HTML content for a settlement report
 * This can be printed to PDF using the browser's print function
 */
export function generateSettlementHTML(data: SettlementExportData, options: ExportOptions): string {
  const { settlement, providerName, orders, auditLog } = data;
  const { locale, includeOrders = true, includeAuditLog = false, dateFormat = 'short' } = options;
  const isRTL = locale === 'ar';

  const labels = {
    title: locale === 'ar' ? 'تقرير التسوية' : 'Settlement Report',
    settlementId: locale === 'ar' ? 'رقم التسوية' : 'Settlement ID',
    provider: locale === 'ar' ? 'المزود' : 'Provider',
    period: locale === 'ar' ? 'الفترة' : 'Period',
    status: locale === 'ar' ? 'الحالة' : 'Status',
    direction: locale === 'ar' ? 'الاتجاه' : 'Direction',
    createdAt: locale === 'ar' ? 'تاريخ الإنشاء' : 'Created At',
    paidAt: locale === 'ar' ? 'تاريخ الدفع' : 'Paid At',
    paymentMethod: locale === 'ar' ? 'طريقة الدفع' : 'Payment Method',
    paymentReference: locale === 'ar' ? 'مرجع الدفع' : 'Payment Reference',

    financialSummary: locale === 'ar' ? 'الملخص المالي' : 'Financial Summary',
    grossRevenue: locale === 'ar' ? 'إجمالي الإيرادات' : 'Gross Revenue',
    platformCommission: locale === 'ar' ? 'عمولة المنصة' : 'Platform Commission',
    netPayout: locale === 'ar' ? 'صافي المزود' : 'Net Payout',
    netBalance: locale === 'ar' ? 'صافي الرصيد' : 'Net Balance',
    totalOrders: locale === 'ar' ? 'عدد الطلبات' : 'Total Orders',

    codBreakdown: locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery',
    onlineBreakdown: locale === 'ar' ? 'الدفع الإلكتروني' : 'Online Payment',
    ordersCount: locale === 'ar' ? 'عدد الطلبات' : 'Orders Count',
    revenue: locale === 'ar' ? 'الإيرادات' : 'Revenue',
    commissionOwed: locale === 'ar' ? 'العمولة المستحقة' : 'Commission Owed',
    payoutOwed: locale === 'ar' ? 'المستحق للمزود' : 'Payout Owed',

    ordersSection: locale === 'ar' ? 'الطلبات المضمنة' : 'Included Orders',
    orderNumber: locale === 'ar' ? 'رقم الطلب' : 'Order #',
    amount: locale === 'ar' ? 'المبلغ' : 'Amount',
    commission: locale === 'ar' ? 'العمولة' : 'Commission',
    date: locale === 'ar' ? 'التاريخ' : 'Date',

    auditSection: locale === 'ar' ? 'سجل التغييرات' : 'Audit Trail',
    action: locale === 'ar' ? 'الإجراء' : 'Action',
    changedBy: locale === 'ar' ? 'بواسطة' : 'Changed By',
    notes: locale === 'ar' ? 'ملاحظات' : 'Notes',

    generatedAt: locale === 'ar' ? 'تم التصدير في' : 'Generated at',
    poweredBy: locale === 'ar' ? 'إنجزنا' : 'Engezna',
  };

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${labels.title} - ${settlement.id.slice(0, 8).toUpperCase()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
      direction: ${isRTL ? 'rtl' : 'ltr'};
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #009DE0;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #009DE0;
    }
    .title {
      font-size: 18px;
      color: #1e293b;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .info-label {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-value {
      font-weight: 600;
      color: #1e293b;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .breakdown-box {
      border-radius: 8px;
      padding: 12px;
    }
    .breakdown-cod {
      background: #fef3c7;
      border: 1px solid #fbbf24;
    }
    .breakdown-online {
      background: #dbeafe;
      border: 1px solid #3b82f6;
    }
    .breakdown-title {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .summary-box {
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .summary-value {
      font-size: 16px;
      font-weight: bold;
    }
    .summary-value.positive { color: #16a34a; }
    .summary-value.negative { color: #dc2626; }
    .summary-label {
      font-size: 10px;
      color: #64748b;
    }
    .result-box {
      background: linear-gradient(135deg, #009DE0, #0080b8);
      color: white;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
      margin-top: 15px;
    }
    .result-label {
      font-size: 12px;
      opacity: 0.9;
    }
    .result-value {
      font-size: 24px;
      font-weight: bold;
    }
    .result-direction {
      font-size: 11px;
      opacity: 0.8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px;
      text-align: ${isRTL ? 'right' : 'left'};
    }
    th {
      background: #f1f5f9;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 500;
    }
    .status-paid { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef9c3; color: #854d0e; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${labels.poweredBy}</div>
    <div class="title">${labels.title}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">${labels.settlementId}</div>
      <div class="info-value">${settlement.id.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.provider}</div>
      <div class="info-value">${providerName?.[locale] || '-'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.period}</div>
      <div class="info-value">${formatDate(settlement.periodStart, locale, dateFormat)} - ${formatDate(settlement.periodEnd, locale, dateFormat)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.status}</div>
      <div class="info-value">
        <span class="status-badge status-${settlement.status}">${getStatusLabel(settlement.status, locale)}</span>
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.direction}</div>
      <div class="info-value">${getDirectionLabel(settlement.settlementDirection, locale)}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.createdAt}</div>
      <div class="info-value">${formatDate(settlement.createdAt, locale, 'long')}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${labels.financialSummary}</div>
    <div class="summary-grid">
      <div class="summary-box">
        <div class="summary-value">${formatCurrency(settlement.grossRevenue, locale)}</div>
        <div class="summary-label">${labels.grossRevenue}</div>
      </div>
      <div class="summary-box">
        <div class="summary-value negative">-${formatCurrency(settlement.platformCommission, locale)}</div>
        <div class="summary-label">${labels.platformCommission}</div>
      </div>
      <div class="summary-box">
        <div class="summary-value positive">${formatCurrency(settlement.netPayout, locale)}</div>
        <div class="summary-label">${labels.netPayout}</div>
      </div>
      <div class="summary-box">
        <div class="summary-value">${settlement.totalOrders}</div>
        <div class="summary-label">${labels.totalOrders}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="breakdown-grid">
      <div class="breakdown-box breakdown-cod">
        <div class="breakdown-title">${labels.codBreakdown}</div>
        <div class="breakdown-row">
          <span>${labels.ordersCount}</span>
          <span>${settlement.cod?.ordersCount || 0}</span>
        </div>
        <div class="breakdown-row">
          <span>${labels.revenue}</span>
          <span>${formatCurrency(settlement.cod?.revenue || 0, locale)}</span>
        </div>
        <div class="breakdown-row" style="font-weight: bold; border-top: 1px solid #fbbf24; padding-top: 4px; margin-top: 4px;">
          <span>${labels.commissionOwed}</span>
          <span>${formatCurrency(settlement.cod?.commissionOwed || 0, locale)}</span>
        </div>
      </div>
      <div class="breakdown-box breakdown-online">
        <div class="breakdown-title">${labels.onlineBreakdown}</div>
        <div class="breakdown-row">
          <span>${labels.ordersCount}</span>
          <span>${settlement.online?.ordersCount || 0}</span>
        </div>
        <div class="breakdown-row">
          <span>${labels.revenue}</span>
          <span>${formatCurrency(settlement.online?.revenue || 0, locale)}</span>
        </div>
        <div class="breakdown-row" style="font-weight: bold; border-top: 1px solid #3b82f6; padding-top: 4px; margin-top: 4px;">
          <span>${labels.payoutOwed}</span>
          <span>${formatCurrency(settlement.online?.payoutOwed || 0, locale)}</span>
        </div>
      </div>
    </div>

    <div class="result-box">
      <div class="result-label">${labels.netBalance}</div>
      <div class="result-value">${formatCurrency(Math.abs(settlement.netBalance), locale)}</div>
      <div class="result-direction">${getDirectionLabel(settlement.settlementDirection, locale)}</div>
    </div>
  </div>

  ${settlement.paidAt ? `
  <div class="info-grid" style="grid-template-columns: repeat(3, 1fr);">
    <div class="info-box">
      <div class="info-label">${labels.paidAt}</div>
      <div class="info-value">${formatDate(settlement.paidAt, locale, 'long')}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.paymentMethod}</div>
      <div class="info-value">${settlement.paymentMethod || '-'}</div>
    </div>
    <div class="info-box">
      <div class="info-label">${labels.paymentReference}</div>
      <div class="info-value">${settlement.paymentReference || '-'}</div>
    </div>
  </div>
  ` : ''}

  ${includeOrders && orders && orders.length > 0 ? `
  <div class="section">
    <div class="section-title">${labels.ordersSection} (${orders.length})</div>
    <table>
      <thead>
        <tr>
          <th>${labels.orderNumber}</th>
          <th>${labels.amount}</th>
          <th>${labels.commission}</th>
          <th>${labels.paymentMethod}</th>
          <th>${labels.date}</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => `
          <tr>
            <td>${order.orderNumber}</td>
            <td>${formatCurrency(order.total, locale)}</td>
            <td>${formatCurrency(order.commission, locale)}</td>
            <td>${order.paymentMethod === 'cash' ? (locale === 'ar' ? 'نقدي' : 'Cash') : (locale === 'ar' ? 'إلكتروني' : 'Online')}</td>
            <td>${formatDate(order.createdAt, locale, dateFormat)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${includeAuditLog && auditLog && auditLog.length > 0 ? `
  <div class="section">
    <div class="section-title">${labels.auditSection}</div>
    <table>
      <thead>
        <tr>
          <th>${labels.action}</th>
          <th>${labels.changedBy}</th>
          <th>${labels.notes}</th>
          <th>${labels.date}</th>
        </tr>
      </thead>
      <tbody>
        ${auditLog.map(entry => `
          <tr>
            <td>${entry.action}</td>
            <td>${entry.changedBy || '-'}</td>
            <td>${entry.notes || '-'}</td>
            <td>${formatDate(entry.createdAt, locale, 'long')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>${labels.generatedAt}: ${new Date().toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</p>
    <p>${labels.poweredBy} © ${new Date().getFullYear()}</p>
  </div>
</body>
</html>
`;

  return html;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Open settlement report in a new window for printing/saving as PDF
 */
export function exportSettlementToPDF(data: SettlementExportData, options: ExportOptions): void {
  const html = generateSettlementHTML(data, options);

  // Open in new window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Download settlement report as HTML file
 */
export function downloadSettlementAsHTML(data: SettlementExportData, options: ExportOptions): void {
  const html = generateSettlementHTML(data, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `settlement-${data.settlement.id.slice(0, 8)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export settlements to CSV
 */
export function exportSettlementsToCSV(
  settlements: Settlement[],
  options: { locale: 'ar' | 'en' }
): void {
  const { locale } = options;
  const headers = locale === 'ar'
    ? ['رقم التسوية', 'المزود', 'الفترة من', 'الفترة إلى', 'عدد الطلبات', 'الإيرادات', 'العمولة', 'صافي المزود', 'صافي الرصيد', 'الاتجاه', 'الحالة', 'تاريخ الدفع']
    : ['Settlement ID', 'Provider', 'Period Start', 'Period End', 'Orders', 'Revenue', 'Commission', 'Net Payout', 'Net Balance', 'Direction', 'Status', 'Paid At'];

  const rows = settlements.map(s => {
    // Handle both providerName object and string for backward compatibility
    const providerNameStr = typeof s.providerName === 'object' && s.providerName
      ? s.providerName[locale] || ''
      : String(s.providerName || '');

    // Handle paidAt with null safety
    const paidAtDate = (s as unknown as Record<string, unknown>).paidAt as string | null;
    const paymentDate = s.paymentDate || paidAtDate;

    // Handle netPayout which may not exist in strict Settlement type
    const netPayout = (s as unknown as Record<string, number | undefined>).netPayout ?? s.netAmountDue ?? 0;

    return [
      s.id.slice(0, 8).toUpperCase(),
      providerNameStr,
      formatDate(s.periodStart, locale),
      formatDate(s.periodEnd, locale),
      s.totalOrders.toString(),
      s.grossRevenue.toFixed(2),
      s.platformCommission.toFixed(2),
      netPayout.toFixed(2),
      s.netBalance.toFixed(2),
      getDirectionLabel(s.settlementDirection, locale),
      getStatusLabel(s.status, locale),
      paymentDate ? formatDate(paymentDate, locale) : '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Add BOM for Arabic support
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `settlements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
