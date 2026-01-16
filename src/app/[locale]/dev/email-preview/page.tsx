import { merchantWelcomeTemplate } from '@/lib/email/templates/merchant-welcome';
import { storeApprovedTemplate } from '@/lib/email/templates/store-approved';
import { settlementTemplate } from '@/lib/email/templates/settlement';
import { storeRejectionTemplate } from '@/lib/email/templates/store-rejection';
import { orderReceivedTemplate } from '@/lib/email/templates/order-received';
import { staffInvitationTemplate } from '@/lib/email/templates/staff-invitation';
import { storeSuspendedTemplate } from '@/lib/email/templates/store-suspended';
import { redirect } from 'next/navigation';

// Environment protection - only accessible in development
const isDevelopment = process.env.NODE_ENV === 'development';
const PREVIEW_SECRET = process.env.EMAIL_PREVIEW_SECRET; // Optional secret for production access

// Preview page for email templates
export default function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; secret?: string }>;
}) {
  return <EmailPreview searchParamsPromise={searchParams} />;
}

async function EmailPreview({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ template?: string; secret?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const template = searchParams.template || 'welcome';
  const secret = searchParams.secret;

  // Protection: Only allow in development OR with valid secret
  if (!isDevelopment) {
    if (!PREVIEW_SECRET || secret !== PREVIEW_SECRET) {
      redirect('/ar');
    }
  }

  // Sample data for previews
  const welcomeData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطاعم',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  };

  const approvedData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    storeUrl: 'https://www.engezna.com/ar/store/el-sharq',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard',
  };

  const settlementData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    amount: 15750.5,
    settlementId: 'STL-2024-001234',
    settlementDate: new Date().toISOString(),
    ordersCount: 47,
    period: '1 - 15 يناير 2024',
    dashboardUrl: 'https://www.engezna.com/ar/provider/dashboard/settlements',
  };

  const rejectionData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    rejectionReason: 'الصور المقدمة غير واضحة. يرجى تقديم صور عالية الجودة للمتجر والمنتجات.',
    supportUrl: 'https://www.engezna.com/ar/provider/help',
  };

  const orderData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    orderId: 'ord_123456',
    orderNumber: '1234',
    customerName: 'محمد علي',
    itemsCount: 3,
    totalAmount: 285.5,
    deliveryAddress: 'شارع التحرير، المنصورة، الدقهلية',
    orderUrl: 'https://www.engezna.com/ar/provider/orders/ord_123456',
  };

  const invitationData = {
    to: 'staff@example.com',
    staffName: 'سارة أحمد',
    storeName: 'مطعم الشرق',
    merchantName: 'أحمد محمد',
    role: 'cashier',
    inviteUrl: 'https://www.engezna.com/ar/invite/abc123',
  };

  const suspendedData = {
    to: 'merchant@example.com',
    merchantName: 'أحمد محمد',
    storeName: 'مطعم الشرق',
    suspensionReason:
      'تلقينا عدة شكاوى من العملاء بخصوص جودة الطعام وتأخر التوصيل. يرجى مراجعة معايير الجودة والالتزام بأوقات التحضير.',
    suspensionDate: new Date().toISOString(),
    supportUrl: 'https://www.engezna.com/ar/provider/help',
  };

  const templates = [
    { id: 'welcome', name: 'ترحيب', icon: '🎉', color: 'blue' },
    { id: 'approved', name: 'تفعيل المتجر', icon: '✅', color: 'green' },
    { id: 'rejection', name: 'رفض المتجر', icon: '❌', color: 'red' },
    { id: 'order', name: 'طلب جديد', icon: '🔔', color: 'green' },
    { id: 'invitation', name: 'دعوة موظف', icon: '👋', color: 'blue' },
    { id: 'suspended', name: 'إيقاف المتجر', icon: '⚠️', color: 'red' },
    { id: 'settlement', name: 'التسوية', icon: '💰', color: 'amber' },
  ];

  let html = '';
  let title = '';

  switch (template) {
    case 'welcome':
      html = merchantWelcomeTemplate(welcomeData);
      title = 'ترحيب بالتاجر الجديد';
      break;
    case 'approved':
      html = storeApprovedTemplate(approvedData);
      title = 'تفعيل المتجر';
      break;
    case 'rejection':
      html = storeRejectionTemplate(rejectionData);
      title = 'رفض المتجر';
      break;
    case 'order':
      html = orderReceivedTemplate(orderData);
      title = 'طلب جديد';
      break;
    case 'invitation':
      html = staffInvitationTemplate(invitationData);
      title = 'دعوة موظف';
      break;
    case 'suspended':
      html = storeSuspendedTemplate(suspendedData);
      title = 'إيقاف المتجر';
      break;
    case 'settlement':
      html = settlementTemplate(settlementData);
      title = 'إشعار التسوية';
      break;
    default:
      html = merchantWelcomeTemplate(welcomeData);
      title = 'ترحيب بالتاجر الجديد';
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Navigation */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900">معاينة تمبلتات الإيميل</h1>
            {isDevelopment && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                Development Mode
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {templates.map((t) => (
              <a
                key={t.id}
                href={`?template=${t.id}${secret ? `&secret=${secret}` : ''}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  template === t.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.icon} {t.name}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <strong>📧 التمبلت الحالي:</strong> {title}
          </p>
        </div>
      </div>

      {/* Email Preview */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <iframe
            srcDoc={html}
            className="w-full border-0"
            style={{ height: '900px' }}
            title={`Preview: ${title}`}
          />
        </div>
      </div>
    </div>
  );
}
